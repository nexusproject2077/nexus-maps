/* ============================================================
   Nexus Maps — Temps réel TCAT (GTFS-RT)
   ------------------------------------------------------------
   - 81543 : positions GPS des véhicules
   - 81544 : mises à jour des trajets / prochains passages
   - Accès direct puis relais CORS si nécessaire
   - API publique conservée : arrivals(), vehicles(), etc.
   ============================================================ */
const NexusRT = (() => {
  let vehicleUrl = null, tripUrl = null, proxy = '', timer = null;
  let intervalMs = 15000, freshnessMs = 90000;
  let byStop = {}, vehicles = [], lastOk = 0, lastVehicleOk = 0, lastTripOk = 0;
  let lastError = null, listeners = [], vehicleCandIdx = 0, tripCandIdx = 0;

  function cfg() { return (typeof NEXUS_CONFIG !== 'undefined') ? NEXUS_CONFIG : {}; }

  function candidates(url) {
    if (!url) return [];
    if (proxy) return [proxy + encodeURIComponent(url)];
    const enc = encodeURIComponent(url);
    return [
      url,
      'https://corsproxy.io/?url=' + enc,
      'https://api.allorigins.win/raw?url=' + enc,
    ];
  }

  async function tryFetch(u) {
    const res = await fetch(u, {
      cache: 'no-store',
      headers: { 'Accept': 'application/x-protobuf, application/octet-stream, */*' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.arrayBuffer();
  }

  async function fetchFeed(url, preferredIdx) {
    const cands = candidates(url);
    if (!cands.length) throw new Error('Flux TCAT non configuré');
    const order = [preferredIdx, ...cands.map((_, i) => i).filter(i => i !== preferredIdx)];
    let lastErr = null;
    for (const i of order) {
      try {
        return { parsed: NexusGTFSRT.parse(await tryFetch(cands[i])), index: i };
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Impossible de récupérer le flux TCAT');
  }

  function indexTrips(tripUpdates) {
    const idx = {};
    for (const tu of (tripUpdates || [])) {
      for (const s of (tu.stops || [])) {
        if (!s.stopId || !s.time) continue;
        (idx[s.stopId] = idx[s.stopId] || []).push({
          route: tu.routeId, tripId: tu.tripId, time: s.time, delay: s.delay
        });
      }
    }
    for (const k in idx) idx[k].sort((a, b) => (a.time || 0) - (b.time || 0));
    return idx;
  }

  function notify() {
    listeners.forEach(f => { try { f(); } catch (e) {} });
  }

  async function refresh() {
    if (!vehicleUrl && !tripUrl) return false;

    const results = await Promise.allSettled([
      vehicleUrl ? fetchFeed(vehicleUrl, vehicleCandIdx) :
        Promise.reject(new Error('Positions TCAT non configurées')),
      tripUrl ? fetchFeed(tripUrl, tripCandIdx) :
        Promise.reject(new Error('Passages TCAT non configurés'))
    ]);

    let success = false;
    const errors = [];

    if (results[0].status === 'fulfilled') {
      const r = results[0].value;
      vehicleCandIdx = r.index;
      vehicles = (r.parsed.vehicles || []).filter(v =>
        Number.isFinite(v.lat) && Number.isFinite(v.lon)
      );
      lastVehicleOk = Date.now();
      success = true;
    } else {
      errors.push('véhicules: ' + (results[0].reason?.message || results[0].reason));
      if (lastVehicleOk && Date.now() - lastVehicleOk > freshnessMs) vehicles = [];
    }

    if (results[1].status === 'fulfilled') {
      const r = results[1].value;
      tripCandIdx = r.index;
      byStop = indexTrips(r.parsed.tripUpdates);
      lastTripOk = Date.now();
      success = true;
    } else {
      errors.push('passages: ' + (results[1].reason?.message || results[1].reason));
    }

    if (success) {
      lastOk = Date.now();
      lastError = errors.length ? new Error(errors.join(' | ')) : null;
    } else {
      lastError = new Error(errors.join(' | ') || 'Flux TCAT indisponibles');
    }

    notify();
    return success;
  }

  function start(opts) {
    opts = opts || {};
    vehicleUrl = opts.vehicleUrl || cfg().TCAT_VEHICLE_URL || null;
    tripUrl = opts.tripUrl || cfg().TCAT_TRIP_URL || opts.url || cfg().TCAT_RT_URL || null;
    proxy = opts.proxy ?? cfg().TCAT_RT_PROXY ?? '';
    intervalMs = opts.intervalMs || cfg().TCAT_RT_INTERVAL || 15000;
    freshnessMs = opts.freshnessMs || cfg().TCAT_RT_FRESHNESS || 90000;

    stop();
    if (!vehicleUrl && !tripUrl) return;
    refresh();
    timer = setInterval(refresh, intervalMs);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  return {
    start, stop, refresh,
    arrivals: (stopId) => byStop[stopId] || [],
    vehicles: () => vehicles,
    hasVehicles: () => vehicles.length > 0,
    enabled: () => !!(vehicleUrl || tripUrl),
    isFresh: () => lastOk > 0 && (Date.now() - lastOk) < freshnessMs,
    vehicleIsFresh: () => lastVehicleOk > 0 && (Date.now() - lastVehicleOk) < freshnessMs,
    tripIsFresh: () => lastTripOk > 0 && (Date.now() - lastTripOk) < freshnessMs,
    lastError: () => lastError,
    onUpdate: (f) => { if (typeof f === 'function') listeners.push(f); },
  };
})();

/* ============================================================
   Nexus Maps — Temps réel TCAT (GTFS-RT)
   ------------------------------------------------------------
   Récupère périodiquement le flux GTFS-RT du réseau TCAT, le
   décode (gtfsrt.js) et expose :
   - arrivals(stopId) : prochains passages temps réel d'un arrêt
   - vehicles()       : positions GPS des bus (si le flux en publie)
   Tolérant aux pannes (CORS / réseau) : dégrade en silence.
   ============================================================ */
const NexusRT = (() => {
  let url = null, proxy = '', timer = null, intervalMs = 30000;
  let byStop = {}, vehicles = [], lastOk = 0, lastError = null, listeners = [];

  function cfg() { return (typeof NEXUS_CONFIG !== 'undefined') ? NEXUS_CONFIG : {}; }
  function feedURL() {
    if (!url) return null;
    return proxy ? proxy + encodeURIComponent(url) : url;
  }

  async function refresh() {
    const u = feedURL(); if (!u) return false;
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ab = await res.arrayBuffer();
      const { tripUpdates, vehicles: veh } = NexusGTFSRT.parse(ab);
      const idx = {};
      for (const tu of tripUpdates) {
        for (const s of tu.stops) {
          if (!s.stopId || !s.time) continue;
          (idx[s.stopId] = idx[s.stopId] || []).push({ route: tu.routeId, tripId: tu.tripId, time: s.time, delay: s.delay });
        }
      }
      for (const k in idx) idx[k].sort((a, b) => (a.time || 0) - (b.time || 0));
      byStop = idx; vehicles = veh || []; lastOk = Date.now(); lastError = null;
      listeners.forEach(f => { try { f(); } catch (e) {} });
      return true;
    } catch (e) {
      lastError = e;
      listeners.forEach(f => { try { f(); } catch (e2) {} });
      return false;
    }
  }

  function start(opts) {
    opts = opts || {};
    url = opts.url || cfg().TCAT_RT_URL || null;
    proxy = opts.proxy || cfg().TCAT_RT_PROXY || '';
    intervalMs = opts.intervalMs || cfg().TCAT_RT_INTERVAL || 30000;
    stop();
    if (!url) return;
    refresh();
    timer = setInterval(refresh, intervalMs);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  return {
    start, stop, refresh,
    arrivals: (stopId) => byStop[stopId] || [],
    vehicles: () => vehicles,
    hasVehicles: () => vehicles.length > 0,
    enabled: () => !!feedURL(),
    isFresh: () => lastOk > 0 && (Date.now() - lastOk) < 120000,
    lastError: () => lastError,
    onUpdate: (f) => { listeners.push(f); },
  };
})();

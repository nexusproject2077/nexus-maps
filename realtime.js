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
  let candIdx = 0; // stratégie d'accès qui fonctionne (mémorisée)

  function cfg() { return (typeof NEXUS_CONFIG !== 'undefined') ? NEXUS_CONFIG : {}; }

  // Stratégies d'accès au flux, dans l'ordre de préférence.
  // Si CORS bloque l'accès direct, on bascule sur un relais CORS public.
  function candidates() {
    if (!url) return [];
    if (proxy) return [proxy + encodeURIComponent(url)]; // relais imposé par la config
    const enc = encodeURIComponent(url);
    return [
      url,                                               // direct (idéal si CORS ouvert)
      'https://corsproxy.io/?url=' + enc,                // relais CORS public
      'https://api.allorigins.win/raw?url=' + enc,       // relais CORS public (secours)
    ];
  }

  async function tryFetch(u) {
    const res = await fetch(u, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.arrayBuffer();
  }

  async function refresh() {
    const cands = candidates(); if (!cands.length) return false;
    // on tente d'abord la stratégie mémorisée, puis les autres
    const order = [candIdx, ...cands.map((_, i) => i).filter(i => i !== candIdx)];
    let soft = null; // résultat valide mais vide (à défaut de mieux)
    for (const i of order) {
      try {
        const ab = await tryFetch(cands[i]);
        const { tripUpdates, vehicles: veh } = NexusGTFSRT.parse(ab);
        const idx = {};
        for (const tu of tripUpdates) {
          for (const s of tu.stops) {
            if (!s.stopId || !s.time) continue;
            (idx[s.stopId] = idx[s.stopId] || []).push({ route: tu.routeId, tripId: tu.tripId, time: s.time, delay: s.delay });
          }
        }
        for (const k in idx) idx[k].sort((a, b) => (a.time || 0) - (b.time || 0));
        if (tripUpdates.length || (veh && veh.length)) {  // flux exploitable
          byStop = idx; vehicles = veh || []; lastOk = Date.now(); lastError = null; candIdx = i;
          listeners.forEach(f => { try { f(); } catch (e) {} });
          return true;
        }
        if (!soft) soft = { idx, i };               // accès OK mais vide -> on garde en secours
      } catch (e) { lastError = e; }
    }
    if (soft) { byStop = soft.idx; vehicles = []; lastOk = Date.now(); lastError = null; candIdx = soft.i; }
    listeners.forEach(f => { try { f(); } catch (e2) {} });
    return !!soft;
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
    enabled: () => !!url,
    isFresh: () => lastOk > 0 && (Date.now() - lastOk) < 120000,
    lastError: () => lastError,
    onUpdate: (f) => { listeners.push(f); },
  };
})();

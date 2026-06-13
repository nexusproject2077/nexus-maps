/* ============================================================
   Nexus Maps — Moteur d'interpolation
   ------------------------------------------------------------
   Données : GTFS statique pré-traité (nexus_data.json).
   Principe : pour un instant T donné, on détermine les courses
   en service ce jour-là, puis pour chacune on calcule la distance
   parcourue le long du tracé (interpolation linéaire entre arrêts),
   et on convertit cette distance en coordonnée (lat/lon) sur la shape.

   IMPORTANT : ce sont des positions ESTIMÉES depuis l'horaire
   théorique, pas des positions GPS réelles.
   ============================================================ */

const NexusEngine = (() => {
  let DATA = null;
  // shape_id -> { pts:[[lat,lon,dist]], total } pré-indexé
  const shapeIndex = {};

  function load(data) {
    DATA = data;
    for (const [sid, pts] of Object.entries(DATA.shapes)) {
      shapeIndex[sid] = { pts, total: pts.length ? pts[pts.length - 1][2] : 0 };
    }
  }

  /* ---- Calendrier : un service circule-t-il à la date yyyymmdd ? ---- */
  function serviceRunsOn(serviceId, yyyymmdd, weekday /*0=lundi..6=dimanche*/) {
    // Exceptions calendar_dates : 1 = ajouté, 2 = supprimé (priorité absolue)
    const exc = DATA.exceptions[serviceId];
    if (exc && exc[yyyymmdd] !== undefined) {
      return exc[yyyymmdd] === 1;
    }
    const svc = DATA.services[serviceId];
    if (!svc) return false;
    if (yyyymmdd < svc.start || yyyymmdd > svc.end) return false;
    return svc.days[weekday] === 1;
  }

  /* ---- Date -> entier yyyymmdd + jour de semaine (0=lundi) ---- */
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return parseInt(`${y}${m}${day}`, 10);
  }
  function weekdayMonday0(d) {
    return (d.getDay() + 6) % 7; // JS: 0=dim -> on veut 0=lundi
  }

  /* ---- Secondes écoulées depuis minuit (heure locale du device) ---- */
  function secondsOfDay(d) {
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  /* ---- Interpolation : distance parcourue à l'instant nowSec ----
     timeline = [[t_sec, dist_m], ...] croissant.
     Renvoie la distance le long du tracé, ou null si hors période. */
  function distanceAt(timeline, nowSec) {
    const first = timeline[0], last = timeline[timeline.length - 1];
    if (nowSec < first[0] || nowSec > last[0]) return null; // course non commencée / finie
    // recherche du segment encadrant nowSec
    for (let i = 0; i < timeline.length - 1; i++) {
      const a = timeline[i], b = timeline[i + 1];
      if (nowSec >= a[0] && nowSec <= b[0]) {
        if (b[0] === a[0]) return a[1];
        const r = (nowSec - a[0]) / (b[0] - a[0]);
        return a[1] + r * (b[1] - a[1]);
      }
    }
    return last[1];
  }

  /* ---- Distance le long du tracé -> coordonnée [lat,lon] + cap ---- */
  function pointAtDistance(shapeId, dist) {
    const idx = shapeIndex[shapeId];
    if (!idx || idx.pts.length < 2) return null;
    const pts = idx.pts;
    if (dist <= pts[0][2]) return { lat: pts[0][0], lon: pts[0][1], bearing: bearing(pts[0], pts[1]) };
    const lastP = pts[pts.length - 1];
    if (dist >= lastP[2]) {
      const p2 = pts[pts.length - 2];
      return { lat: lastP[0], lon: lastP[1], bearing: bearing(p2, lastP) };
    }
    // recherche binaire du segment où dist tombe
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][2] <= dist) lo = mid; else hi = mid;
    }
    const a = pts[lo], b = pts[hi];
    const span = b[2] - a[2];
    const r = span > 0 ? (dist - a[2]) / span : 0;
    return {
      lat: a[0] + r * (b[0] - a[0]),
      lon: a[1] + r * (b[1] - a[1]),
      bearing: bearing(a, b),
    };
  }

  function bearing(a, b) {
    const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180;
    const Δλ = (b[1] - a[1]) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /* ---- Liste des bus actifs à l'instant `when` (Date) ----
     activeRoutes : Set d'id de routes à afficher (null = toutes). */
  function activeBuses(when, activeRoutes) {
    const dk = dateKey(when);
    const wd = weekdayMonday0(when);
    const nowSec = secondsOfDay(when);
    const out = [];
    const svcCache = {}; // service_id -> bool, évite de recalculer

    for (let i = 0; i < DATA.trips.length; i++) {
      const t = DATA.trips[i];
      if (activeRoutes && !activeRoutes.has(t.r)) continue;
      if (svcCache[t.sv] === undefined) {
        svcCache[t.sv] = serviceRunsOn(t.sv, dk, wd);
      }
      if (!svcCache[t.sv]) continue;
      const dist = distanceAt(t.tl, nowSec);
      if (dist === null) continue;
      const pos = pointAtDistance(t.sh, dist);
      if (!pos) continue;
      const route = DATA.routes[t.r];
      out.push({
        id: i,
        route: t.r,
        short: route ? route.short : t.r,
        color: route ? route.color : '#888',
        textColor: route ? route.text : '#fff',
        long: route ? route.long : '',
        headsign: t.hs,
        lat: pos.lat,
        lon: pos.lon,
        bearing: pos.bearing,
        progress: dist / (shapeIndex[t.sh].total || 1),
      });
    }
    return out;
  }

  return {
    load,
    activeBuses,
    get routes() { return DATA ? DATA.routes : {}; },
    get stops() { return DATA ? DATA.stops : []; },
    get shapes() { return DATA ? DATA.shapes : {}; },
    get tripsByRoute() {
      const m = {};
      if (DATA) for (const t of DATA.trips) (m[t.r] = m[t.r] || []).push(t);
      return m;
    },
  };
})();

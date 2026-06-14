/* ============================================================
   Nexus Maps — Décodeur GTFS-Realtime (protobuf, sans dépendance)
   ------------------------------------------------------------
   Décode un FeedMessage GTFS-RT et en extrait :
   - tripUpdates : prochains passages temps réel par arrêt
   - vehicles    : positions GPS des véhicules (si publiées)
   Spéc. champs : https://gtfs.org/realtime/reference/
   ============================================================ */
(function (global) {
  function parse(arrayBuffer) {
    const buf = new Uint8Array(arrayBuffer);
    const dv = new DataView(arrayBuffer);
    const td = new TextDecoder('utf-8');

    // Lecture varint (Number ; suffisant pour timestamps epoch et délais usuels)
    function varint(p) {
      let shift = 1, result = 0, b;
      do { b = buf[p.o++]; result += (b & 0x7f) * shift; shift *= 128; } while (b & 0x80);
      return result;
    }
    // Décode un message en map champ -> liste de valeurs
    // varint -> nombre ; length-delimited/32/64 bits -> {s,e} (intervalle)
    function decode(s, e) {
      const f = {}; const p = { o: s };
      while (p.o < e) {
        const key = varint(p), field = Math.floor(key / 8), wt = key & 7;
        let v;
        if (wt === 0) v = varint(p);
        else if (wt === 2) { const len = varint(p); v = { s: p.o, e: p.o + len }; p.o += len; }
        else if (wt === 1) { v = { s: p.o, e: p.o + 8 }; p.o += 8; }
        else if (wt === 5) { v = { s: p.o, e: p.o + 4 }; p.o += 4; }
        else break;
        (f[field] = f[field] || []).push(v);
      }
      return f;
    }
    const str = (r) => r ? td.decode(buf.subarray(r.s, r.e)) : undefined;
    const sub = (r) => r ? decode(r.s, r.e) : null;
    const f32 = (r) => r ? dv.getFloat32(r.s, true) : undefined;
    const first = (a) => (a && a.length) ? a[0] : undefined;
    // int32 signé encodé sur ≤5 octets (sinon on ignore le délai pour rester sûr)
    const i32 = (n) => (n === undefined) ? undefined : (n >= 2147483648 && n < 4294967296 ? n - 4294967296 : (n < 4294967296 ? n : undefined));

    const root = decode(0, buf.length);
    const entities = root[2] || [];
    const tripUpdates = [], vehicles = [];

    for (const ent of entities) {
      const e = sub(ent);
      // --- TripUpdate (champ 3) ---
      const tuR = first(e[3]);
      if (tuR) {
        const tu = sub(tuR);
        const trip = sub(first(tu[1])) || {};
        const tripId = str(first(trip[1]));
        const routeId = str(first(trip[5]));
        const stops = [];
        for (const stuR of (tu[2] || [])) {
          const s = sub(stuR);
          const seq = first(s[1]);
          const stopId = str(first(s[4]));
          const arr = sub(first(s[2])), dep = sub(first(s[3]));
          const ev = arr || dep || null;
          const time = ev ? first(ev[2]) : undefined;       // epoch (s)
          const delay = ev ? i32(first(ev[1])) : undefined; // secondes (signé)
          stops.push({ seq, stopId, time, delay });
        }
        tripUpdates.push({ tripId, routeId, stops });
      }
      // --- VehiclePosition (champ 4) ---
      const vpR = first(e[4]);
      if (vpR) {
        const vp = sub(vpR);
        const trip = sub(first(vp[1])) || {};
        const pos = sub(first(vp[2])) || {};
        const vd = sub(first(vp[8])) || {};
        const lat = f32(first(pos[1])), lon = f32(first(pos[2])), bearing = f32(first(pos[5]));
        if (lat !== undefined && lon !== undefined)
          vehicles.push({
            id: str(first(vd[1])) || str(first(e[1])),
            label: str(first(vd[2])),
            routeId: str(first(trip[5])),
            tripId: str(first(trip[1])),
            lat, lon, bearing,
            timestamp: first(vp[5])
          });
      }
    }
    return { tripUpdates, vehicles };
  }

  global.NexusGTFSRT = { parse };
})(window);

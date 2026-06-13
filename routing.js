/* ============================================================
   Nexus Maps — Routage (Version B blindée : appel direct ORS)
   ------------------------------------------------------------
   - Lit la clé FRAÎCHEMENT à chaque appel (pas de capture figée).
   - En cas d'erreur, remonte la VRAIE réponse d'ORS.
   ============================================================ */

const NexusRouting = (() => {
  const BASE = "https://api.openrouteservice.org";
  const PROFILES = { walk: "foot-walking", bike: "cycling-regular", car: "driving-car" };

  function getKey() {
    // lecture au moment de l'appel, pas au chargement du script
    const cfg = window.NEXUS_CONFIG || {};
    const k = (cfg.ORS_KEY || "").trim();
    if (!k || k === "COLLE_TA_CLE_ICI") {
      throw new Error("Clé absente dans config.js (NEXUS_CONFIG.ORS_KEY vide).");
    }
    return k;
  }

  function getBbox() {
    const b = (window.NEXUS_CONFIG && NEXUS_CONFIG.GEOCODE_BBOX) ||
              { minLon: 3.5, minLat: 47.9, maxLon: 4.6, maxLat: 48.7 };
    return b;
  }

  async function geocode(text) {
    const bbox = getBbox();
    const url = new URL(BASE + "/geocode/search");
    url.searchParams.set("api_key", getKey());
    url.searchParams.set("text", text);
    url.searchParams.set("boundary.rect.min_lon", bbox.minLon);
    url.searchParams.set("boundary.rect.min_lat", bbox.minLat);
    url.searchParams.set("boundary.rect.max_lon", bbox.maxLon);
    url.searchParams.set("boundary.rect.max_lat", bbox.maxLat);
    url.searchParams.set("size", "5");
    url.searchParams.set("lang", "fr");
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error("Géocodage ORS " + res.status + " : " + body.slice(0, 200));
    }
    const data = await res.json();
    return (data.features || []).map((f) => ({
      label: f.properties.label,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));
  }

  async function route(from, to, mode) {
    const profile = PROFILES[mode];
    if (!profile) throw new Error("Mode inconnu : " + mode);
    const res = await fetch(BASE + "/v2/directions/" + profile + "/geojson", {
      method: "POST",
      headers: { "Authorization": getKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [[from.lon, from.lat], [to.lon, to.lat]],
        instructions: false, language: "fr",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error("Itinéraire ORS " + res.status + " : " + body.slice(0, 200));
    }
    const data = await res.json();
    const feat = data.features && data.features[0];
    if (!feat) throw new Error("Aucun itinéraire trouvé.");
    const coords = feat.geometry.coordinates.map((c) => [c[1], c[0]]);
    const s = feat.properties.summary || {};
    return { coords, distance: s.distance || 0, duration: s.duration || 0 };
  }

  return { geocode, route };
})();

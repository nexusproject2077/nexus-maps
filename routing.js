/* ============================================================
   Nexus Maps — Routage (OpenRouteService)
   ------------------------------------------------------------
   - Géocodage : nom d'adresse -> coordonnées (Pelias, inclus dans ORS)
   - Itinéraire : 3 profils
       walk  -> foot-walking   (uniquement voies marchables)
       bike  -> cycling-regular (privilégie pistes cyclables)
       car   -> driving-car
   Tout passe par la clé gratuite définie dans config.js.
   ============================================================ */

const NexusRouting = (() => {
  const BASE = "https://api.openrouteservice.org";
  const PROFILES = {
    walk: "foot-walking",
    bike: "cycling-regular",
    car: "driving-car",
  };

  function key() {
    const k = (window.NEXUS_CONFIG && NEXUS_CONFIG.ORS_KEY) || "";
    if (!k || k === "COLLE_TA_CLE_ICI") {
      throw new Error("Clé OpenRouteService manquante : renseigne ORS_KEY dans config.js.");
    }
    return k;
  }

  /* --- Géocodage : texte -> liste de lieux {label, lat, lon} --- */
  async function geocode(text) {
    const bbox = NEXUS_CONFIG.GEOCODE_BBOX;
    const url = new URL(BASE + "/geocode/search");
    url.searchParams.set("api_key", key());
    url.searchParams.set("text", text);
    url.searchParams.set("boundary.rect.min_lon", bbox.minLon);
    url.searchParams.set("boundary.rect.min_lat", bbox.minLat);
    url.searchParams.set("boundary.rect.max_lon", bbox.maxLon);
    url.searchParams.set("boundary.rect.max_lat", bbox.maxLat);
    url.searchParams.set("size", "5");
    url.searchParams.set("lang", "fr");

    const res = await fetch(url);
    if (!res.ok) throw new Error("Géocodage : HTTP " + res.status);
    const data = await res.json();
    return (data.features || []).map((f) => ({
      label: f.properties.label,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));
  }

  /* --- Itinéraire entre deux points {lat,lon} pour un mode --- */
  async function route(from, to, mode) {
    const profile = PROFILES[mode];
    if (!profile) throw new Error("Mode inconnu : " + mode);

    const url = BASE + "/v2/directions/" + profile + "/geojson";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": key(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ORS attend [lon, lat]
        coordinates: [[from.lon, from.lat], [to.lon, to.lat]],
        instructions: true,
        language: "fr",
      }),
    });
    if (!res.ok) {
      let msg = "HTTP " + res.status;
      try { const e = await res.json(); if (e.error) msg = e.error.message || msg; } catch {}
      throw new Error("Itinéraire : " + msg);
    }
    const data = await res.json();
    const feat = data.features && data.features[0];
    if (!feat) throw new Error("Aucun itinéraire trouvé.");

    const coords = feat.geometry.coordinates.map((c) => [c[1], c[0]]); // -> [lat,lon]
    const summary = feat.properties.summary || {};
    const steps =
      (feat.properties.segments || [])
        .flatMap((s) => s.steps || [])
        .map((st) => ({ instruction: st.instruction, distance: st.distance }));

    return {
      coords,
      distance: summary.distance || 0, // mètres
      duration: summary.duration || 0, // secondes
      steps,
    };
  }

  return { geocode, route, PROFILES };
})();

/* ============================================================
   Nexus Maps — Routage piéton/vélo/voiture (OpenRouteService)
   (le mode bus est géré par busengine.js, pas ici)
   ============================================================ */
const NexusRouting = (() => {
  const BASE = "https://api.openrouteservice.org";
  const PROFILES = { walk:"foot-walking", bike:"cycling-regular", car:"driving-car" };
  function cfg(){ return (typeof NEXUS_CONFIG!=="undefined") ? NEXUS_CONFIG : {}; }
  function getKey(){ const k=((cfg().ORS_KEY)||"").trim();
    if(!k||k==="COLLE_TA_CLE_ICI") throw new Error("Clé absente dans config.js.");
    return k; }
  async function geocode(text){
    const c=cfg(), url=new URL(BASE+"/geocode/search");
    url.searchParams.set("api_key",getKey());
    url.searchParams.set("text",text);
    // France entière, résultats proches de Troyes priorisés
    url.searchParams.set("boundary.country", c.GEOCODE_COUNTRY || "FR");
    const f = c.GEOCODE_FOCUS || {lat:48.2973,lon:4.0744};
    url.searchParams.set("focus.point.lat", f.lat);
    url.searchParams.set("focus.point.lon", f.lon);
    url.searchParams.set("size","8"); url.searchParams.set("lang","fr");
    const res=await fetch(url);
    if(!res.ok){const t=await res.text().catch(()=> ""); throw new Error("Géocodage ORS "+res.status+" : "+t.slice(0,150));}
    const data=await res.json();
    return (data.features||[]).map(f=>({label:f.properties.label,lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]}));
  }
  async function route(from,to,mode){
    const p=PROFILES[mode]; if(!p) throw new Error("Mode "+mode+" non géré ici.");
    const res=await fetch(BASE+"/v2/directions/"+p+"/geojson",{method:"POST",
      headers:{"Authorization":getKey(),"Content-Type":"application/json"},
      body:JSON.stringify({coordinates:[[from.lon,from.lat],[to.lon,to.lat]],instructions:false,language:"fr"})});
    if(!res.ok){const t=await res.text().catch(()=> ""); throw new Error("Itinéraire ORS "+res.status+" : "+t.slice(0,150));}
    const data=await res.json(),feat=data.features&&data.features[0];
    if(!feat) throw new Error("Aucun itinéraire trouvé.");
    return {coords:feat.geometry.coordinates.map(c=>[c[1],c[0]]),
      distance:(feat.properties.summary||{}).distance||0,
      duration:(feat.properties.summary||{}).duration||0};
  }
  return { geocode, route };
})();

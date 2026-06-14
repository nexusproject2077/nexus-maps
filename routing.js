/* ============================================================
   Nexus Maps — Routage piéton/vélo/voiture (OpenRouteService)
   + instructions étape par étape
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
    url.searchParams.set("boundary.country", c.GEOCODE_COUNTRY || "FR");
    const f=c.GEOCODE_FOCUS||{lat:48.2973,lon:4.0744};
    url.searchParams.set("focus.point.lat",f.lat);
    url.searchParams.set("focus.point.lon",f.lon);
    url.searchParams.set("size","8"); url.searchParams.set("lang","fr");
    const res=await fetch(url);
    if(!res.ok){const t=await res.text().catch(()=> ""); throw new Error("Géocodage ORS "+res.status+" : "+t.slice(0,150));}
    const data=await res.json();
    return (data.features||[]).map(f=>({
      label:f.properties.label,
      name:f.properties.name||f.properties.label,
      sub:[f.properties.street,f.properties.locality||f.properties.region].filter(Boolean).join(', '),
      kind:f.properties.layer||'',
      lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]}));
  }

  // Géocodage inverse : coordonnées -> lieu le plus proche (clic sur carte, position)
  async function reverse(lat,lon){
    const url=new URL(BASE+"/geocode/reverse");
    url.searchParams.set("api_key",getKey());
    url.searchParams.set("point.lat",lat);
    url.searchParams.set("point.lon",lon);
    url.searchParams.set("size","1"); url.searchParams.set("lang","fr");
    const res=await fetch(url);
    if(!res.ok) throw new Error("Géocodage inverse ORS "+res.status);
    const data=await res.json(), f=(data.features||[])[0];
    if(!f) return {name:"Lieu sélectionné", label:"", sub:"", lat, lon};
    return {name:f.properties.name||f.properties.label,
      label:f.properties.label,
      sub:[f.properties.street,f.properties.locality||f.properties.region].filter(Boolean).join(', '),
      lat, lon};
  }

  async function route(from,to,mode){
    const p=PROFILES[mode]; if(!p) throw new Error("Mode "+mode+" non géré ici.");
    const res=await fetch(BASE+"/v2/directions/"+p+"/geojson",{method:"POST",
      headers:{"Authorization":getKey(),"Content-Type":"application/json"},
      body:JSON.stringify({coordinates:[[from.lon,from.lat],[to.lon,to.lat]],instructions:true,language:"fr"})});
    if(!res.ok){const t=await res.text().catch(()=> ""); throw new Error("Itinéraire ORS "+res.status+" : "+t.slice(0,150));}
    const data=await res.json(),feat=data.features&&data.features[0];
    if(!feat) throw new Error("Aucun itinéraire trouvé.");
    const coords=feat.geometry.coordinates.map(c=>[c[1],c[0]]); // [lat,lon]
    const steps=(feat.properties.segments||[]).flatMap(s=>s.steps||[])
      .map(st=>{const wp=st.way_points||[0,0], at=coords[wp[0]]||coords[0];
        return {instruction:st.instruction,distance:st.distance,duration:st.duration,
          type:st.type, lat:at[0], lon:at[1], wp};});
    return {coords,
      distance:(feat.properties.summary||{}).distance||0,
      duration:(feat.properties.summary||{}).duration||0, steps};
  }
  return { geocode, reverse, route };
})();

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

  // ---- Base Adresse Nationale (toutes les adresses de France, gratuit, sans clé) ----
  const BAN = "https://api-adresse.data.gouv.fr";
  function banKind(t){ return (t==='municipality'||t==='locality')?'locality':'address'; }
  function banMap(f){
    const p=f.properties||{};
    return {label:p.label, name:p.name||p.label,
      sub:[p.postcode,p.city].filter(Boolean).join(' ')||p.context||'',
      kind:banKind(p.type),
      lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0]};
  }
  async function banSearch(text){
    const c=cfg(), f=c.GEOCODE_FOCUS||{lat:48.2973,lon:4.0744};
    const url=new URL(BAN+"/search/");
    url.searchParams.set("q",text);
    url.searchParams.set("limit","8");
    url.searchParams.set("autocomplete","1");
    url.searchParams.set("lat",f.lat); url.searchParams.set("lon",f.lon);
    const res=await fetch(url); if(!res.ok) throw new Error("BAN "+res.status);
    const data=await res.json();
    return (data.features||[]).map(banMap);
  }
  async function banReverse(lat,lon){
    const url=new URL(BAN+"/reverse/");
    url.searchParams.set("lat",lat); url.searchParams.set("lon",lon);
    const res=await fetch(url); if(!res.ok) throw new Error("BAN reverse "+res.status);
    const data=await res.json(); const f=(data.features||[])[0];
    return f?banMap(f):null;
  }

  // ---- ORS geocode (repli + POI hors BAN) ----
  async function orsGeocode(text){
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

  // Géocodage : BAN d'abord (adresses FR), repli ORS (POI / résultats vides)
  async function geocode(text){
    try{
      const r=await banSearch(text);
      if(r.length) return r;
    }catch(e){ /* repli ORS */ }
    return orsGeocode(text);
  }

  // Géocodage inverse : coordonnées -> lieu le plus proche (clic carte, position)
  async function reverse(lat,lon){
    try{
      const r=await banReverse(lat,lon);
      if(r) return {name:r.name, label:r.label, sub:r.sub, lat, lon};
    }catch(e){ /* repli ORS */ }
    try{
      const url=new URL(BASE+"/geocode/reverse");
      url.searchParams.set("api_key",getKey());
      url.searchParams.set("point.lat",lat);
      url.searchParams.set("point.lon",lon);
      url.searchParams.set("size","1"); url.searchParams.set("lang","fr");
      const res=await fetch(url);
      if(res.ok){ const data=await res.json(), f=(data.features||[])[0];
        if(f) return {name:f.properties.name||f.properties.label, label:f.properties.label,
          sub:[f.properties.street,f.properties.locality||f.properties.region].filter(Boolean).join(', '), lat, lon}; }
    }catch(e){}
    return {name:"Lieu sélectionné", label:"", sub:"", lat, lon};
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

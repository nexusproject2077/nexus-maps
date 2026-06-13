/* ============================================================
   Nexus Maps — Application (MapLibre GL 3D)
   ============================================================ */
(async function () {
  const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);

  // ---- Données bus ----
  let data;
  try {
    const res=await fetch('nexus_data.json'); if(!res.ok) throw 0; data=await res.json();
  } catch(e){ $('#loaderText').textContent='Échec : nexus_data.json introuvable.'; return; }
  NexusBus.load(data);

  // ---- Styles de fond ----
  const STYLES = {
    plan: 'https://tiles.openfreemap.org/styles/liberty',
    planDark: 'https://tiles.openfreemap.org/styles/dark',
    satellite: {
      version:8, glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources:{ sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Esri World Imagery'} },
      layers:[{id:'sat',type:'raster',source:'sat'}]
    },
    relief: {
      version:8, glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources:{ topo:{type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png','https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'OpenTopoMap (CC-BY-SA)'} },
      layers:[{id:'topo',type:'raster',source:'topo'}]
    }
  };

  // ---- Carte ----
  const map = new maplibregl.Map({
    container:'map',
    style: STYLES.planDark,
    center: NEXUS_CONFIG.CENTER,
    zoom: NEXUS_CONFIG.ZOOM,
    pitch: NEXUS_CONFIG.PITCH,
    bearing: -15,
    maxZoom: 19, attributionControl:{compact:true},
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');

  let currentBase='plan';
  const state = { stops:false, lines:false, buses:false, cycle:false, b3d:true };
  let activeRoutes = new Set(Object.keys(NexusBus.routes));

  // ===== Ajout des couches data après chargement du style =====
  function addDataLayers(){
    // --- Bâtiments 3D (sur fond vectoriel uniquement) ---
    if((currentBase==='plan') && state.b3d && !map.getLayer('nexus-3d-buildings')){
      const layers=map.getStyle().layers;
      let firstSymbol; for(const l of layers) if(l.type==='symbol'){firstSymbol=l.id;break;}
      if(map.getSource('openmaptiles')){
        map.addLayer({
          id:'nexus-3d-buildings', source:'openmaptiles', 'source-layer':'building',
          type:'fill-extrusion', minzoom:13,
          paint:{
            'fill-extrusion-color': ['interpolate',['linear'],['get','render_height'],0,'#1a2632',50,'#243443',200,'#2e4256'],
            'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,15.5,['get','render_height']],
            'fill-extrusion-base':['get','render_min_height'],
            'fill-extrusion-opacity':0.85
          }
        }, firstSymbol);
      }
    }

    // --- Source GeoJSON des tracés de lignes ---
    if(!map.getSource('bus-lines')){
      const features=[];
      const shapeToRoute={}; for(const t of data.trips) shapeToRoute[t.sh]=t.r;
      for(const [sid,pts] of Object.entries(NexusBus.shapes)){
        const rid=shapeToRoute[sid]; const rt=NexusBus.routes[rid]; if(!rt)continue;
        features.push({type:'Feature',properties:{route:rid,color:rt.color},
          geometry:{type:'LineString',coordinates:pts.map(p=>[p[1],p[0]])}});
      }
      map.addSource('bus-lines',{type:'geojson',data:{type:'FeatureCollection',features}});
      map.addLayer({id:'bus-lines',type:'line',source:'bus-lines',
        layout:{'line-cap':'round','line-join':'round','visibility':'none'},
        paint:{'line-color':['get','color'],'line-width':2.2,'line-opacity':0.75}});
    }

    // --- Source arrêts ---
    if(!map.getSource('bus-stops')){
      map.addSource('bus-stops',{type:'geojson',data:{type:'FeatureCollection',
        features:NexusBus.stops.map(s=>({type:'Feature',properties:{name:s.name},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}))}});
      map.addLayer({id:'bus-stops',type:'circle',source:'bus-stops',
        layout:{visibility:'none'},
        paint:{'circle-radius':['interpolate',['linear'],['zoom'],11,2,16,5],
          'circle-color':'#00e5ff','circle-stroke-color':'#04141a','circle-stroke-width':1.5,'circle-opacity':0.9}});
    }

    // --- Pistes cyclables (CyclOSM raster overlay) ---
    if(!map.getSource('cycle')){
      map.addSource('cycle',{type:'raster',
        tiles:['https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png','https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'],
        tileSize:256, attribution:'CyclOSM'});
      map.addLayer({id:'cycle',type:'raster',source:'cycle',layout:{visibility:'none'},paint:{'raster-opacity':0.7}});
    }

    // --- Source bus animés ---
    if(!map.getSource('buses')){
      map.addSource('buses',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'buses',type:'circle',source:'buses',layout:{visibility:'none'},
        paint:{'circle-radius':6,'circle-color':['get','color'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    }

    // --- Source itinéraire ---
    if(!map.getSource('route')){
      map.addSource('route',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'route-line',type:'line',source:'route',
        layout:{'line-cap':'round','line-join':'round'},
        paint:{'line-color':'#00e5ff','line-width':6,'line-opacity':0.9}});
      map.addSource('route-pts',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'route-pts',type:'circle',source:'route-pts',
        paint:{'circle-radius':7,'circle-color':['get','color'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
    }
    applyVisibility();
  }

  function applyVisibility(){
    const set=(id,on)=>{ if(map.getLayer(id)) map.setLayoutProperty(id,'visibility',on?'visible':'none'); };
    set('bus-stops',state.stops);
    set('bus-lines',state.lines);
    set('buses',state.buses);
    set('cycle',state.cycle);
    if(map.getLayer('nexus-3d-buildings')) map.setLayoutProperty('nexus-3d-buildings','visibility',(currentBase==='plan'&&state.b3d)?'visible':'none');
    // filtre lignes actives
    if(map.getLayer('bus-lines')) map.setFilter('bus-lines',['in',['get','route'],['literal',[...activeRoutes]]]);
  }

  map.on('load', addDataLayers);

  // ===== Changement de fond =====
  function switchBase(base){
    currentBase=base;
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    let style;
    if(base==='plan') style = dark?STYLES.planDark:STYLES.plan;
    else style = STYLES[base];
    map.setStyle(style);
    map.once('styledata', ()=>{ // ré-ajoute nos couches après changement de style
      addDataLayers();
    });
  }

  // ===== Animation des bus =====
  let simTime=new Date(), lastFrame=performance.now();
  function animate(now){
    if(state.buses){
      const dt=(now-lastFrame)/1000; simTime=new Date(simTime.getTime()+dt*1000); // temps réel ×1
      const buses=NexusBus.activeBuses(simTime, activeRoutes);
      const src=map.getSource('buses');
      if(src) src.setData({type:'FeatureCollection',
        features:buses.map(b=>({type:'Feature',properties:{color:b.color},geometry:{type:'Point',coordinates:[b.lon,b.lat]}}))});
    }
    lastFrame=now; requestAnimationFrame(animate);
  }
  requestAnimationFrame((t)=>{lastFrame=t; animate(t);});

  // ===== Liste des lignes (filtre) =====
  const lineList=$('#lineList');
  Object.values(NexusBus.routes).sort((a,b)=>{const na=parseInt(a.short,10),nb=parseInt(b.short,10);
    return(!isNaN(na)&&!isNaN(nb))?na-nb:a.short.localeCompare(b.short);}).forEach(r=>{
    const it=document.createElement('div'); it.className='line-item'; it.dataset.route=r.id;
    it.innerHTML=`<span class="line-badge" style="background:${r.color};color:${r.text}">${r.short}</span><span class="line-name">${r.long}</span>`;
    it.onclick=()=>{ if(activeRoutes.has(r.id)){activeRoutes.delete(r.id);it.classList.add('off');}
      else{activeRoutes.add(r.id);it.classList.remove('off');} applyVisibility(); };
    lineList.appendChild(it);
  });
  $('#allLines').onclick=()=>{activeRoutes=new Set(Object.keys(NexusBus.routes));$$('.line-item').forEach(i=>i.classList.remove('off'));applyVisibility();};
  $('#noLines').onclick=()=>{activeRoutes=new Set();$$('.line-item').forEach(i=>i.classList.add('off'));applyVisibility();};

  // ===== Toggles =====
  $('#tog3d').onchange=e=>{state.b3d=e.target.checked; applyVisibility();};
  $('#togStops').onchange=e=>{state.stops=e.target.checked; applyVisibility();};
  $('#togLines').onchange=e=>{state.lines=e.target.checked; $('#busLineFilter').style.display=e.target.checked?'block':'none'; applyVisibility();};
  $('#togBuses').onchange=e=>{state.buses=e.target.checked; applyVisibility();};
  $('#togCycle').onchange=e=>{state.cycle=e.target.checked; applyVisibility();};
  $$('.base-btn').forEach(b=>b.onclick=()=>{$$('.base-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');switchBase(b.dataset.base);});

  // ===== Nav liquid glass =====
  const pill=$('#activePill');
  function movePill(btn){pill.style.width=btn.offsetWidth+'px';pill.style.transform=`translateX(${btn.offsetLeft}px)`;}
  const panels={route:$('#panelRoute'),layers:$('#panelLayers')};
  function openTab(tab){
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    const btn=document.querySelector(`.nav-btn[data-tab="${tab}"]`); if(btn)movePill(btn);
    Object.entries(panels).forEach(([k,p])=>p.classList.toggle('open',k===tab));
  }
  $$('.nav-btn').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
  requestAnimationFrame(()=>movePill(document.querySelector('.nav-btn.active')));
  window.addEventListener('resize',()=>movePill(document.querySelector('.nav-btn.active')));
  const nav=$('#nav'),glare=$('#glare');
  nav.addEventListener('mousemove',e=>{const r=nav.getBoundingClientRect();glare.style.setProperty('--x',(e.clientX-r.left)+'px');glare.style.setProperty('--y',(e.clientY-r.top)+'px');});

  // ===== Thème =====
  $('#themeBtn').onclick=()=>{const root=document.documentElement,dark=root.getAttribute('data-theme')==='dark';
    root.setAttribute('data-theme',dark?'light':'dark'); if(currentBase==='plan') switchBase('plan');};

  // ===== Boussole =====
  $('#compassBtn').onclick=()=>map.easeTo({pitch:NEXUS_CONFIG.PITCH,bearing:-15,duration:600});

  // ===== Routage =====
  let fromPt=null,toPt=null,currentMode='walk';
  $$('.mode-btn').forEach(b=>b.onclick=()=>{$$('.mode-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentMode=b.dataset.mode;});

  function setupGeo(inputId,resultsId,assign){
    const input=$(inputId),box=$(resultsId);let timer=null;
    input.addEventListener('input',()=>{clearTimeout(timer);const q=input.value.trim();
      if(q.length<3){box.classList.remove('show');return;}
      timer=setTimeout(async()=>{try{const places=await NexusRouting.geocode(q);box.innerHTML='';
        if(!places.length){box.classList.remove('show');return;}
        places.forEach(p=>{const d=document.createElement('div');d.className='geo-item';d.textContent=p.label;
          d.onclick=()=>{input.value=p.label;assign({lat:p.lat,lon:p.lon});box.classList.remove('show');};box.appendChild(d);});
        box.classList.add('show');}catch(err){box.innerHTML=`<div class="geo-item">${err.message}</div>`;box.classList.add('show');}},350);});
  }
  setupGeo('#fromInput','#fromResults',p=>fromPt=p);
  setupGeo('#toInput','#toResults',p=>toPt=p);

  const fmtD=m=>m>=1000?(m/1000).toFixed(1)+' km':Math.round(m)+' m';
  const fmtT=s=>{const m=Math.round(s/60);return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min';};

  function drawRoute(coords,pts){
    map.getSource('route').setData({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:coords.map(c=>[c[1],c[0]])}}]});
    map.getSource('route-pts').setData({type:'FeatureCollection',features:pts});
    const lons=coords.map(c=>c[1]),lats=coords.map(c=>c[0]);
    map.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],{padding:80,pitch:NEXUS_CONFIG.PITCH});
  }

  $('#routeGo').onclick=async()=>{
    const out=$('#routeResult');
    if(!fromPt||!toPt){out.innerHTML=`<div class="route-err">Choisis un départ et une arrivée dans les suggestions.</div>`;return;}
    out.innerHTML=`<div class="route-err" style="color:var(--text-dim)">Calcul…</div>`;
    try{
      if(currentMode==='bus'){
        const r=NexusBus.busRoute(fromPt,toPt);
        if(!r){out.innerHTML=`<div class="route-err">Aucun trajet bus trouvé (essaie des points plus proches du réseau).</div>`;return;}
        const lineInfo=r.lines.map(id=>{const rt=NexusBus.routes[id];return `<span class="bi-line" style="background:${rt.color};color:${rt.text}">${rt.short}</span>`;}).join(' → ');
        // tracé : on dessine les shapes des lignes empruntées
        let coords=[];
        r.lines.forEach(id=>{const sh=NexusBus.shapeForRoute(id); if(sh)coords=coords.concat(sh.map(c=>[c[1],c[0]]));});
        const pts=[
          {type:'Feature',properties:{color:'#00e5ff'},geometry:{type:'Point',coordinates:[fromPt.lon,fromPt.lat]}},
          {type:'Feature',properties:{color:'#ffb627'},geometry:{type:'Point',coordinates:[toPt.lon,toPt.lat]}},
          {type:'Feature',properties:{color:'#fff'},geometry:{type:'Point',coordinates:[r.board.lon,r.board.lat]}},
          {type:'Feature',properties:{color:'#fff'},geometry:{type:'Point',coordinates:[r.alight.lon,r.alight.lat]}},
        ];
        if(coords.length) drawRoute(coords.map(c=>[c[1],c[0]]),pts);
        const via = r.type==='correspondance'?`<div class="bi-row"><span>Correspondance</span><b>${r.via.name}</b></div>`:'';
        out.innerHTML=`<div style="margin:8px 0">${lineInfo}</div>
          <div class="bi-row"><span>Monter à</span><b>${r.board.name}</b></div>${via}
          <div class="bi-row"><span>Descendre à</span><b>${r.alight.name}</b></div>
          <div class="bi-row"><span>Marche</span><b>${fmtD(r.walk1+r.walk2)}</b></div>
          <div class="bi-est">⚠ Trajet bus indicatif (lignes desservant ces arrêts), horaires théoriques.</div>`;
      } else {
        const r=await NexusRouting.route(fromPt,toPt,currentMode);
        const pts=[
          {type:'Feature',properties:{color:'#00e5ff'},geometry:{type:'Point',coordinates:[fromPt.lon,fromPt.lat]}},
          {type:'Feature',properties:{color:'#ffb627'},geometry:{type:'Point',coordinates:[toPt.lon,toPt.lat]}}];
        drawRoute(r.coords,pts);
        const lbl={walk:'à pied',bike:'à vélo',car:'en voiture'}[currentMode];
        out.innerHTML=`<div class="route-stat"><div class="rs"><b>${fmtD(r.distance)}</b><span>distance</span></div><div class="rs"><b>${fmtT(r.duration)}</b><span>durée ${lbl}</span></div></div>`;
      }
    }catch(err){out.innerHTML=`<div class="route-err">${err.message}</div>`;}
  };

  // ---- Lancement ----
  openTab('explore');
  $('#loader').classList.add('gone');
})();

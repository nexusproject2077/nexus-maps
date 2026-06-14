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

  // ===== Projection globe 3D + atmosphère =====
  function applyGlobe(){
    try{ if(map.setProjection) map.setProjection({type:'globe'}); }catch(e){}
    const dark=document.documentElement.getAttribute('data-theme')!=='light';
    try{ if(map.setSky) map.setSky(dark?{
      'sky-color':'#0a1726','horizon-color':'#103044','fog-color':'#0a0e14',
      'sky-horizon-blend':0.6,'horizon-fog-blend':0.5,'fog-ground-blend':0.5,
      'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,8,0.6,12,0]
    }:{
      'sky-color':'#bfe3ff','horizon-color':'#e8f4ff','fog-color':'#eef4fb',
      'sky-horizon-blend':0.6,'horizon-fog-blend':0.5,'fog-ground-blend':0.5,
      'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,8,0.6,12,0]
    }); }catch(e){}
  }

  // ===== Ajout des couches data après chargement du style =====
  function addDataLayers(){
    applyGlobe();
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
  const panels={explore:$('#panelExplore'),route:$('#panelRoute'),layers:$('#panelLayers'),saved:$('#panelSaved')};
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
        const lineInfo=r.lines.map(id=>{const rt=NexusBus.routes[id];return `<span class="bi-line" style="background:${rt.color};color:${rt.text}">${rt.short}</span>`;}).join(`<span class="bi-sep">${NEXUS_ICONS.arrow()}</span>`);
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
        $('#routeSteps').innerHTML='';
        const via = r.type==='correspondance'?`<div class="bi-row"><span>Correspondance</span><b>${r.via.name}</b></div>`:'';
        out.innerHTML=`<div style="margin:8px 0">${lineInfo}</div>
          <div class="bi-row"><span>Monter à</span><b>${r.board.name}</b></div>${via}
          <div class="bi-row"><span>Descendre à</span><b>${r.alight.name}</b></div>
          <div class="bi-row"><span>Marche</span><b>${fmtD(r.walk1+r.walk2)}</b></div>
          <div class="bi-est">${NEXUS_ICONS.warning()}<span>Trajet bus indicatif (lignes desservant ces arrêts), horaires théoriques.</span></div>`;
      } else {
        const r=await NexusRouting.route(fromPt,toPt,currentMode);
        const pts=[
          {type:'Feature',properties:{color:'#00e5ff'},geometry:{type:'Point',coordinates:[fromPt.lon,fromPt.lat]}},
          {type:'Feature',properties:{color:'#ffb627'},geometry:{type:'Point',coordinates:[toPt.lon,toPt.lat]}}];
        drawRoute(r.coords,pts);
        const lbl={walk:'à pied',bike:'à vélo',car:'en voiture'}[currentMode];
        r.mode=currentMode;
        out.innerHTML=`<div class="route-stat"><div class="rs"><b>${fmtD(r.distance)}</b><span>distance</span></div><div class="rs"><b>${fmtT(r.duration)}</b><span>durée ${lbl}</span></div></div>
          <button class="nav-start" id="navStart">${NEXUS_ICONS.directions()}<span>Démarrer la navigation</span></button>`;
        $('#navStart').onclick=()=>startNav(r);
        const stepsBox=$('#routeSteps');
        if(r.steps && r.steps.length){
          stepsBox.innerHTML='<h3 class="steps-title">Étapes</h3>'+r.steps.map(s=>
            `<div class="step-item"><span class="step-main"><span class="step-ico">${NEXUS_ICONS.maneuver(s.type)}</span><span class="step-txt">${s.instruction}</span></span><span class="step-dist">${fmtD(s.distance)}</span></div>`).join('');
        } else stepsBox.innerHTML='';
      }
    }catch(err){out.innerHTML=`<div class="route-err">${err.message}</div>`;}
  };

  // ===== Favoris & Signalements =====
  let favMarkers=[], reportMarkers=[], reportMode=false;

  function renderFavMarkers(){
    favMarkers.forEach(m=>m.remove()); favMarkers=[];
    NexusStore.getFavorites().forEach(f=>{
      const el=document.createElement('div'); el.className='fav-marker';
      el.innerHTML=NEXUS_ICONS.favPin('#00e5ff');
      const m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([f.lon,f.lat])
        .setPopup(new maplibregl.Popup({offset:24}).setText(f.name)).addTo(map);
      favMarkers.push(m);
    });
  }
  function renderReportMarkers(){
    reportMarkers.forEach(m=>m.remove()); reportMarkers=[];
    NexusStore.getReports().forEach(r=>{
      const el=document.createElement('div'); el.className='report-marker';
      el.innerHTML=NEXUS_ICONS.reportPin('#ffb627');
      const m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([r.lon,r.lat])
        .setPopup(new maplibregl.Popup({offset:24}).setText(r.comment||'Problème signalé')).addTo(map);
      reportMarkers.push(m);
    });
  }
  function renderFavList(){
    const box=$('#favList'), favs=NexusStore.getFavorites();
    box.innerHTML = favs.length ? '' : '<p class="hint">Aucun lieu enregistré.</p>';
    favs.forEach(f=>{
      const d=document.createElement('div'); d.className='fav-row';
      d.innerHTML=`<span class="fav-name">${f.name}</span><button class="fav-del" title="Supprimer" aria-label="Supprimer">${NEXUS_ICONS.close()}</button>`;
      d.querySelector('.fav-name').onclick=()=>map.flyTo({center:[f.lon,f.lat],zoom:16,pitch:NEXUS_CONFIG.PITCH});
      d.querySelector('.fav-del').onclick=()=>{NexusStore.removeFavorite(f.id);renderFavList();renderFavMarkers();};
      box.appendChild(d);
    });
  }
  function renderReportList(){
    const box=$('#reportList'), reps=NexusStore.getReports();
    box.innerHTML = reps.length ? '' : '';
    reps.forEach(r=>{
      const d=document.createElement('div'); d.className='fav-row';
      d.innerHTML=`<span class="fav-name report-name">${NEXUS_ICONS.warning('i-warn-sm')}<span>${r.comment||'Problème'}</span></span><button class="fav-del" title="Supprimer" aria-label="Supprimer">${NEXUS_ICONS.close()}</button>`;
      d.querySelector('.fav-name').onclick=()=>map.flyTo({center:[r.lon,r.lat],zoom:16});
      d.querySelector('.fav-del').onclick=()=>{NexusStore.removeReport(r.id);renderReportList();renderReportMarkers();};
      box.appendChild(d);
    });
  }

  // recherche pour enregistrer un favori
  setupGeo('#favInput','#favResults',(p)=>{
    const name = $('#favInput').value;
    NexusStore.addFavorite({name, lat:p.lat, lon:p.lon});
    $('#favInput').value='';
    renderFavList(); renderFavMarkers();
    map.flyTo({center:[p.lon,p.lat],zoom:15});
  });

  // mode signalement : clic sur la carte
  $('#reportToggle').onclick=()=>{
    reportMode=!reportMode;
    $('#reportToggle').textContent = reportMode ? 'Mode signalement ACTIF — clique la carte' : 'Activer le mode signalement';
    $('#reportToggle').classList.toggle('active-report', reportMode);
    map.getCanvas().style.cursor = reportMode ? 'crosshair' : '';
  };
  map.on('click',(e)=>{
    if(!reportMode) return;
    const comment = prompt("Décris le problème (ex : arrêt déplacé, rue fermée) :");
    if(comment===null) return;
    NexusStore.addReport({lat:e.lngLat.lat, lon:e.lngLat.lng, comment, date:Date.now()});
    renderReportList(); renderReportMarkers();
  });

  renderFavList(); renderFavMarkers(); renderReportList(); renderReportMarkers();

  // ============================================================
  //  Recherche, fiche lieu, position, navigation, partage
  // ============================================================

  // ---- Icônes statiques d'UI ----
  $('#searchIco').innerHTML=NEXUS_ICONS.search();
  $('#searchClear').innerHTML=NEXUS_ICONS.close();
  $('#placeClose').innerHTML=NEXUS_ICONS.close();
  $('#paDirIco').innerHTML=NEXUS_ICONS.directions();
  $('#paFromIco').innerHTML=NEXUS_ICONS.pin();
  $('#paSaveIco').innerHTML=NEXUS_ICONS.bookmark();
  $('#paShareIco').innerHTML=NEXUS_ICONS.share();
  $('#paStreetIco').innerHTML=NEXUS_ICONS.camera();
  $('#locateBtn').innerHTML=NEXUS_ICONS.locate();

  // ---- Utilitaires géo ----
  const R=6371000, rad=Math.PI/180;
  function hav(a,b){const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));}
  function bearing(a,b){const φ1=a.lat*rad,φ2=b.lat*rad,Δλ=(b.lon-a.lon)*rad;
    const y=Math.sin(Δλ)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;}

  // ---- Toast ----
  let toastEl=null,toastTimer=null;
  function flash(msg){
    if(!toastEl){toastEl=document.createElement('div');toastEl.className='toast';document.body.appendChild(toastEl);}
    toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2600);
  }

  // ---- État navigation (déclaré tôt pour le clic carte) ----
  let navActive=false, navWatch=null, navRoute=null;

  // ---- Marqueur position utilisateur ----
  let userMarker=null;
  function ensureUserMarker(lat,lon){
    if(!userMarker){const el=document.createElement('div');el.className='user-dot';
      userMarker=new maplibregl.Marker({element:el}).setLngLat([lon,lat]).addTo(map);}
    else userMarker.setLngLat([lon,lat]);
  }

  // ---- Fiche lieu ----
  let searchMarker=null, currentPlace=null;
  function setSearchMarker(lat,lon){
    if(searchMarker) searchMarker.remove();
    const el=document.createElement('div'); el.className='fav-marker'; el.innerHTML=NEXUS_ICONS.dropPin('#ff5a5f');
    searchMarker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([lon,lat]).addTo(map);
  }
  function fillPlace(p){
    $('#placeName').textContent=p.name||'Lieu';
    $('#placeSub').textContent=p.sub||''; $('#placeSub').style.display=p.sub?'block':'none';
    $('#placeCoords').textContent=p.lat.toFixed(5)+', '+p.lon.toFixed(5);
    const saved=NexusStore.getFavorites().some(f=>Math.abs(f.lat-p.lat)<1e-5&&Math.abs(f.lon-p.lon)<1e-5);
    $('#paSave').classList.toggle('saved',saved);
    $('#paSave').querySelector('span:last-child').textContent=saved?'Enregistré':'Enregistrer';
  }
  function openPlaceCard(p){
    currentPlace=p; fillPlace(p); setSearchMarker(p.lat,p.lon);
    $('#placeCard').classList.add('open');
  }
  function closePlaceCard(){
    $('#placeCard').classList.remove('open');
    if(searchMarker){searchMarker.remove();searchMarker=null;} currentPlace=null;
  }
  $('#placeClose').onclick=closePlaceCard;
  $('#paDir').onclick=()=>{if(!currentPlace)return;toPt={lat:currentPlace.lat,lon:currentPlace.lon};
    $('#toInput').value=currentPlace.name; openTab('route'); closePlaceCard();};
  $('#paFrom').onclick=()=>{if(!currentPlace)return;fromPt={lat:currentPlace.lat,lon:currentPlace.lon};
    $('#fromInput').value=currentPlace.name; openTab('route'); closePlaceCard();};
  $('#paSave').onclick=()=>{if(!currentPlace)return;
    NexusStore.addFavorite({name:currentPlace.name,lat:currentPlace.lat,lon:currentPlace.lon});
    renderFavList(); renderFavMarkers(); fillPlace(currentPlace); flash('Lieu enregistré dans les favoris');};
  $('#paShare').onclick=()=>shareLocation(currentPlace);
  $('#paStreet').onclick=()=>{if(!currentPlace)return;
    window.open(`https://www.mapillary.com/app/?lat=${currentPlace.lat}&lng=${currentPlace.lon}&z=17`,'_blank','noopener');};

  async function shareLocation(p){
    if(!p)return;
    const url=location.origin+location.pathname+`?mlat=${p.lat.toFixed(6)}&mlon=${p.lon.toFixed(6)}`;
    try{ if(navigator.share){ await navigator.share({title:p.name||'Nexus Maps',text:p.name||'Position partagée',url}); return; } }
    catch(e){ if(e&&e.name==='AbortError') return; }
    try{ await navigator.clipboard.writeText(url); flash('Lien de la position copié'); }
    catch{ prompt('Copie ce lien :',url); }
  }

  // ---- Recherche ----
  const sInput=$('#searchInput'), sBox=$('#searchResults'), sClear=$('#searchClear');
  let sTimer=null;
  function kindIcon(kind){
    if(kind==='address'||kind==='street') return NEXUS_ICONS.pin();
    if(kind==='venue') return NEXUS_ICONS.directions();
    return NEXUS_ICONS.search();
  }
  async function runSearch(q){
    sBox.innerHTML='<div class="geo-item">Recherche…</div>';
    try{
      const places=await NexusRouting.geocode(q);
      if(!places.length){sBox.innerHTML='<div class="geo-item">Aucun résultat.</div>';return;}
      sBox.innerHTML='';
      places.forEach(p=>{
        const d=document.createElement('div'); d.className='geo-item';
        d.innerHTML=`<span class="gi-ico">${kindIcon(p.kind)}</span><span class="gi-txt"><span class="gi-name">${p.name}</span>${p.sub?`<span class="gi-sub">${p.sub}</span>`:''}</span>`;
        d.onclick=()=>{addRecent(p);map.flyTo({center:[p.lon,p.lat],zoom:16,pitch:NEXUS_CONFIG.PITCH});openPlaceCard(p);};
        sBox.appendChild(d);
      });
    }catch(err){sBox.innerHTML=`<div class="geo-item">${err.message}</div>`;}
  }
  sInput.addEventListener('input',()=>{clearTimeout(sTimer);const q=sInput.value.trim();
    sClear.classList.toggle('show',!!q);
    if(q.length<3){sBox.innerHTML='';return;}
    sTimer=setTimeout(()=>runSearch(q),350);});
  sInput.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(sTimer);const q=sInput.value.trim();if(q.length>=2)runSearch(q);}});
  sClear.onclick=()=>{sInput.value='';sBox.innerHTML='';sClear.classList.remove('show');sInput.focus();};
  $$('.cat-btn').forEach(b=>b.onclick=()=>{sInput.value=b.dataset.q;sClear.classList.add('show');runSearch(b.dataset.q);});

  // ---- Recherches récentes ----
  const REC_KEY='nexus_recent_v1';
  function getRecents(){try{return JSON.parse(localStorage.getItem(REC_KEY)||'[]');}catch{return[];}}
  function addRecent(p){let l=getRecents().filter(r=>!(Math.abs(r.lat-p.lat)<1e-5&&Math.abs(r.lon-p.lon)<1e-5));
    l.unshift({name:p.name,sub:p.sub||'',lat:p.lat,lon:p.lon}); l=l.slice(0,6);
    try{localStorage.setItem(REC_KEY,JSON.stringify(l));}catch{} renderRecents();}
  function renderRecents(){const l=getRecents(),box=$('#recentList');
    $('#recentSection').style.display=l.length?'block':'none'; box.innerHTML='';
    l.forEach(p=>{const d=document.createElement('div');d.className='fav-row';
      d.innerHTML=`<span class="fav-name">${p.name}</span>`;
      d.querySelector('.fav-name').onclick=()=>{map.flyTo({center:[p.lon,p.lat],zoom:16,pitch:NEXUS_CONFIG.PITCH});openPlaceCard(p);};
      box.appendChild(d);});}
  renderRecents();

  // ---- Ma position ----
  $('#locateBtn').onclick=()=>{
    if(!navigator.geolocation){flash('Géolocalisation non disponible sur cet appareil');return;}
    const btn=$('#locateBtn'); btn.classList.add('locating');
    navigator.geolocation.getCurrentPosition(pos=>{
      btn.classList.remove('locating'); btn.classList.add('active');
      const lat=pos.coords.latitude,lon=pos.coords.longitude;
      ensureUserMarker(lat,lon);
      map.flyTo({center:[lon,lat],zoom:16,pitch:NEXUS_CONFIG.PITCH});
    },err=>{btn.classList.remove('locating');flash('Position indisponible : '+err.message);},
    {enableHighAccuracy:true,timeout:10000});
  };

  // ---- Clic carte -> fiche lieu (géocodage inverse) ----
  map.on('click',(e)=>{
    if(reportMode||navActive) return;
    const lat=e.lngLat.lat, lon=e.lngLat.lng;
    openPlaceCard({name:'Chargement…',sub:'',lat,lon});
    NexusRouting.reverse(lat,lon).then(p=>{
      if(currentPlace&&Math.abs(currentPlace.lat-lat)<1e-9){currentPlace=p;fillPlace(p);}
    }).catch(()=>{if(currentPlace)$('#placeName').textContent='Lieu sélectionné';});
  });

  // ---- Navigation turn-by-turn ----
  function startNav(r){
    if(!r||!r.coords||r.coords.length<2){flash('Itinéraire indisponible pour la navigation');return;}
    if(!navigator.geolocation){flash('Géolocalisation requise pour la navigation');return;}
    navRoute=r;
    const cum=[0];
    for(let i=1;i<r.coords.length;i++)
      cum[i]=cum[i-1]+hav({lat:r.coords[i-1][0],lon:r.coords[i-1][1]},{lat:r.coords[i][0],lon:r.coords[i][1]});
    r.cum=cum; r.total=cum[cum.length-1]||r.distance;
    r.speed=r.duration>0?r.distance/r.duration:1.4;
    navActive=true;
    Object.values(panels).forEach(p=>p.classList.remove('open'));
    $$('.nav-btn').forEach(b=>b.classList.remove('active'));
    closePlaceCard();
    $('#navGuide').classList.add('open');
    navWatch=navigator.geolocation.watchPosition(onNavPos,
      err=>flash('GPS : '+err.message),{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  }
  function nearestIdx(p){let best=0,bd=Infinity;
    for(let i=0;i<navRoute.coords.length;i++){const d=hav(p,{lat:navRoute.coords[i][0],lon:navRoute.coords[i][1]});
      if(d<bd){bd=d;best=i;}} return best;}
  function onNavPos(pos){
    if(!navActive||!navRoute) return;
    const p={lat:pos.coords.latitude,lon:pos.coords.longitude};
    ensureUserMarker(p.lat,p.lon);
    const k=nearestIdx(p), cum=navRoute.cum;
    const remain=Math.max(0,navRoute.total-cum[k]);
    const step=navRoute.steps.find(s=>s.wp&&s.wp[0]>k)||navRoute.steps[navRoute.steps.length-1];
    const mIdx=step&&step.wp?Math.min(step.wp[0],cum.length-1):cum.length-1;
    const distToManeuver=Math.max(0,cum[mIdx]-cum[k]);
    const etaSec=remain/(navRoute.speed||1.4), eta=new Date(Date.now()+etaSec*1000);
    $('#ngIco').innerHTML=NEXUS_ICONS.maneuver(step?step.type:10);
    $('#ngDist').textContent=fmtD(distToManeuver);
    $('#ngInstr').textContent=step?step.instruction:'Arrivée à destination';
    $('#ngEta').textContent=eta.getHours()+':'+String(eta.getMinutes()).padStart(2,'0');
    $('#ngRemain').textContent=fmtD(remain);
    $('#ngNext').textContent=fmtT(etaSec);
    const ahead=navRoute.coords[Math.min(k+2,navRoute.coords.length-1)];
    map.easeTo({center:[p.lon,p.lat],zoom:17,pitch:60,bearing:bearing(p,{lat:ahead[0],lon:ahead[1]}),duration:900});
    if(remain<25){flash('Vous êtes arrivé à destination');stopNav();}
  }
  function stopNav(){
    navActive=false; $('#navGuide').classList.remove('open');
    if(navWatch!=null){navigator.geolocation.clearWatch(navWatch);navWatch=null;}
    map.easeTo({pitch:NEXUS_CONFIG.PITCH,bearing:-15,duration:600});
  }
  $('#ngExit').onclick=stopNav;

  // ---- Liens profonds (partage de vue / position) ----
  function applyHash(){
    const m=location.hash.match(/^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if(m) map.jumpTo({center:[parseFloat(m[3]),parseFloat(m[2])],zoom:parseFloat(m[1])});
  }
  applyHash();
  let hashTimer=null;
  map.on('moveend',()=>{clearTimeout(hashTimer);hashTimer=setTimeout(()=>{const c=map.getCenter();
    history.replaceState(null,'',`#${map.getZoom().toFixed(1)}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}`);},400);});
  const params=new URLSearchParams(location.search);
  if(params.has('mlat')&&params.has('mlon')){
    const lat=parseFloat(params.get('mlat')),lon=parseFloat(params.get('mlon'));
    if(isFinite(lat)&&isFinite(lon)){
      map.jumpTo({center:[lon,lat],zoom:16});
      openPlaceCard({name:'Chargement…',sub:'',lat,lon});
      NexusRouting.reverse(lat,lon).then(p=>{if(currentPlace){currentPlace=p;fillPlace(p);}}).catch(()=>{});
    }
  }

  // ---- Lancement ----
  openTab('explore');
  $('#loader').classList.add('gone');
})();

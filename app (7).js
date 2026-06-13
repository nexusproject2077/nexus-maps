/* ============================================================
   Nexus Maps — Application
   ============================================================ */
(async function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // --- Données ---
  let data;
  try {
    $('#loaderText').textContent = 'Chargement du réseau…';
    const res = await fetch('nexus_data.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (e) {
    $('#loaderText').textContent = 'Échec : nexus_data.json introuvable (sers les fichiers via un serveur web).';
    console.error(e); return;
  }
  NexusEngine.load(data);

  // --- Carte ---
  const map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView(NEXUS_CONFIG.CENTER, NEXUS_CONFIG.ZOOM);
  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  };
  let tileLayer = L.tileLayer(tileUrls.dark, {
    attribution: '&copy; OpenStreetMap &copy; CARTO · Bus : TCAT (ODbL) · Itinéraires : OpenRouteService',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  // --- Tracés des lignes ---
  const routeLayers = {};
  const shapeToRoute = {};
  for (const t of data.trips) shapeToRoute[t.sh] = t.r;
  for (const [sid, pts] of Object.entries(NexusEngine.shapes)) {
    const rid = shapeToRoute[sid];
    const route = NexusEngine.routes[rid];
    if (!route) continue;
    const poly = L.polyline(pts.map((p) => [p[0], p[1]]), {
      color: route.color, weight: 2, opacity: 0.32, interactive: false,
    });
    (routeLayers[rid] = routeLayers[rid] || L.layerGroup()).addLayer(poly);
  }
  for (const rid in routeLayers) routeLayers[rid].addTo(map);

  // --- Arrêts ---
  const stopsLayer = L.layerGroup();
  for (const s of NexusEngine.stops) {
    L.circleMarker([s.lat, s.lon], { radius: 2.5, color: '#2a3a4d', weight: 1, fillColor: '#1a2632', fillOpacity: .8, interactive: false }).addTo(stopsLayer);
  }
  stopsLayer.addTo(map);
  map.on('zoomend', () => {
    if (map.getZoom() < 13) map.removeLayer(stopsLayer);
    else if (!map.hasLayer(stopsLayer)) stopsLayer.addTo(map);
  });

  // --- Simulation des bus ---
  const SPEEDS = [0, 1, 5, 15, 60, 300, 900];
  let speedIndex = 1, simTime = new Date(), lastFrame = performance.now();
  let activeRoutes = new Set(Object.keys(NexusEngine.routes));
  const busMarkers = new Map();
  const busIcon = (c) => L.divIcon({ className: '', html: `<div class="bus-marker" style="background:${c}"></div>`, iconSize: [13,13], iconAnchor: [6,6] });

  function render() {
    const buses = NexusEngine.activeBuses(simTime, activeRoutes);
    const seen = new Set();
    for (const b of buses) {
      seen.add(b.id);
      let m = busMarkers.get(b.id);
      if (!m) { m = L.marker([b.lat,b.lon], { icon: busIcon(b.color) }); m.addTo(map); busMarkers.set(b.id, m);
        m.bindTooltip(`<b>${b.short}</b> → ${b.headsign}`, { direction:'top', offset:[0,-6] }); }
      else m.setLatLng([b.lat,b.lon]);
    }
    for (const [id,m] of busMarkers) if (!seen.has(id)) { map.removeLayer(m); busMarkers.delete(id); }
    $('#activeCount').textContent = buses.length;
  }
  function tick(now) {
    const dt = (now - lastFrame)/1000; lastFrame = now;
    const mult = SPEEDS[speedIndex];
    if (mult > 0) simTime = new Date(simTime.getTime() + dt*1000*mult);
    const hh=String(simTime.getHours()).padStart(2,'0'), mm=String(simTime.getMinutes()).padStart(2,'0'), ss=String(simTime.getSeconds()).padStart(2,'0');
    $('#clock').textContent = `${hh}:${mm}:${ss}`;
    render();
    requestAnimationFrame(tick);
  }

  // --- Liste lignes ---
  const lineList = $('#lineList');
  Object.values(NexusEngine.routes).sort((a,b)=>{
    const na=parseInt(a.short,10), nb=parseInt(b.short,10);
    return (!isNaN(na)&&!isNaN(nb)) ? na-nb : a.short.localeCompare(b.short);
  }).forEach((r)=>{
    const it = document.createElement('div'); it.className='line-item'; it.dataset.route=r.id;
    it.innerHTML = `<span class="line-badge" style="background:${r.color};color:${r.text}">${r.short}</span><span class="line-name">${r.long}</span>`;
    it.onclick = ()=>{
      if (activeRoutes.has(r.id)) { activeRoutes.delete(r.id); it.classList.add('off'); if(routeLayers[r.id]) map.removeLayer(routeLayers[r.id]); }
      else { activeRoutes.add(r.id); it.classList.remove('off'); if(routeLayers[r.id]) routeLayers[r.id].addTo(map); }
    };
    lineList.appendChild(it);
  });
  $('#allLines').onclick = ()=>{ activeRoutes=new Set(Object.keys(NexusEngine.routes)); $$('.line-item').forEach(i=>{i.classList.remove('off'); const r=i.dataset.route; if(routeLayers[r]&&!map.hasLayer(routeLayers[r])) routeLayers[r].addTo(map);}); };
  $('#noLines').onclick = ()=>{ activeRoutes=new Set(); $$('.line-item').forEach(i=>{i.classList.add('off'); const r=i.dataset.route; if(routeLayers[r]) map.removeLayer(routeLayers[r]);}); };

  // --- Vitesse ---
  const speedInput = $('#speed');
  speedInput.oninput = ()=>{ speedIndex=parseInt(speedInput.value,10); const m=SPEEDS[speedIndex]; $('#speedVal').textContent = m===0?'Pause':'×'+m; };
  $('#liveBtn').onclick = ()=>{ simTime=new Date(); speedIndex=1; speedInput.value=1; $('#speedVal').textContent='×1'; };

  // ===== Liquid Glass : onglets + pilule + glare + thème =====
  const pill = $('#activePill');
  function movePill(btn){ pill.style.width = btn.offsetWidth+'px'; pill.style.transform = `translateX(${btn.offsetLeft}px)`; }
  const panels = { lines: $('#panelLines'), route: $('#panelRoute') };
  function openTab(tab){
    $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`); if(btn) movePill(btn);
    Object.entries(panels).forEach(([k,p])=>p.classList.toggle('open', k===tab));
  }
  $$('.nav-btn').forEach(b=> b.onclick = ()=> openTab(b.dataset.tab));
  // pilule initiale
  requestAnimationFrame(()=> movePill(document.querySelector('.nav-btn.active')));
  window.addEventListener('resize', ()=> movePill(document.querySelector('.nav-btn.active')));

  // glare suit la souris
  const nav = $('#nav'), glare = $('#glare');
  nav.addEventListener('mousemove', (e)=>{ const r=nav.getBoundingClientRect(); glare.style.setProperty('--x', (e.clientX-r.left)+'px'); glare.style.setProperty('--y', (e.clientY-r.top)+'px'); });

  // thème
  $('#themeBtn').onclick = ()=>{
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme')==='dark';
    root.setAttribute('data-theme', dark?'light':'dark');
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(dark?tileUrls.light:tileUrls.dark, { attribution:'&copy; OpenStreetMap &copy; CARTO · Bus : TCAT (ODbL) · Itinéraires : OpenRouteService', subdomains:'abcd', maxZoom:19 }).addTo(map);
  };

  // ===== Routage =====
  let fromPt=null, toPt=null, currentMode='walk', routeLine=null, routeMarkers=[];
  $$('.mode-btn').forEach(b=> b.onclick = ()=>{ $$('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); currentMode=b.dataset.mode; });

  function setupGeocode(inputId, resultsId, assign){
    const input=$(inputId), box=$(resultsId); let timer=null;
    input.addEventListener('input', ()=>{
      clearTimeout(timer); const q=input.value.trim();
      if(q.length<3){ box.classList.remove('show'); box.innerHTML=''; return; }
      timer=setTimeout(async ()=>{
        try{
          const places = await NexusRouting.geocode(q);
          box.innerHTML='';
          if(!places.length){ box.classList.remove('show'); return; }
          places.forEach(p=>{ const d=document.createElement('div'); d.className='geo-item'; d.textContent=p.label;
            d.onclick=()=>{ input.value=p.label; assign({lat:p.lat,lon:p.lon}); box.classList.remove('show'); }; box.appendChild(d); });
          box.classList.add('show');
        }catch(err){ box.innerHTML=`<div class="geo-item">${err.message}</div>`; box.classList.add('show'); }
      }, 350);
    });
  }
  setupGeocode('#fromInput','#fromResults', (p)=> fromPt=p);
  setupGeocode('#toInput','#toResults', (p)=> toPt=p);

  function fmtDist(m){ return m>=1000 ? (m/1000).toFixed(1)+' km' : Math.round(m)+' m'; }
  function fmtDur(s){ const min=Math.round(s/60); return min>=60 ? Math.floor(min/60)+' h '+(min%60)+' min' : min+' min'; }

  $('#routeGo').onclick = async ()=>{
    const out = $('#routeResult');
    if(!fromPt || !toPt){ out.innerHTML = `<div class="route-err">Choisis un départ et une arrivée dans les suggestions.</div>`; return; }
    out.innerHTML = `<div class="route-err" style="color:var(--text-dim)">Calcul en cours…</div>`;
    try{
      const r = await NexusRouting.route(fromPt, toPt, currentMode);
      if(routeLine) map.removeLayer(routeLine);
      routeMarkers.forEach(m=>map.removeLayer(m)); routeMarkers=[];
      routeLine = L.polyline(r.coords, { color:'#00e5ff', weight:5, opacity:.9 }).addTo(map);
      routeMarkers.push(L.circleMarker([fromPt.lat,fromPt.lon],{radius:7,color:'#fff',fillColor:'#00e5ff',fillOpacity:1,weight:2}).addTo(map));
      routeMarkers.push(L.circleMarker([toPt.lat,toPt.lon],{radius:7,color:'#fff',fillColor:'#ffb627',fillOpacity:1,weight:2}).addTo(map));
      map.fitBounds(routeLine.getBounds(), { padding:[60,60] });
      const labels = { walk:'à pied', bike:'à vélo', car:'en voiture' };
      out.innerHTML = `<div class="route-stat"><div class="rs"><b>${fmtDist(r.distance)}</b><span>distance</span></div><div class="rs"><b>${fmtDur(r.duration)}</b><span>durée ${labels[currentMode]}</span></div></div>`;
    }catch(err){ out.innerHTML = `<div class="route-err">${err.message}</div>`; }
  };

  // --- Lancement ---
  openTab('map');
  $('#loader').classList.add('gone');
  requestAnimationFrame((t)=>{ lastFrame=t; tick(t); });
})();

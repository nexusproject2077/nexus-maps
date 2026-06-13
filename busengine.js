/* ============================================================
   Nexus Maps — Moteur Bus (animation interpolée + routage GTFS)
   ============================================================ */
const NexusBus = (() => {
  let D = null;
  const shapeIdx = {};
  const stopById = {};

  function load(data) {
    D = data;
    for (const [sid, pts] of Object.entries(D.shapes))
      shapeIdx[sid] = { pts, total: pts.length ? pts[pts.length-1][2] : 0 };
    for (const s of D.stops) stopById[s.id] = s;
  }

  /* ---------- Calendrier ---------- */
  function dateKey(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return parseInt(`${y}${m}${day}`,10);}
  function weekday0(d){return (d.getDay()+6)%7;}
  function secOfDay(d){return d.getHours()*3600+d.getMinutes()*60+d.getSeconds();}
  function runs(sv, dk, wd){
    const exc=D.exceptions[sv];
    if(exc && exc[dk]!==undefined) return exc[dk]===1;
    const s=D.services[sv]; if(!s) return false;
    if(dk<s.start||dk>s.end) return false;
    return s.days[wd]===1;
  }

  /* ---------- Interpolation position ---------- */
  function distAt(tl, now){
    const f=tl[0], l=tl[tl.length-1];
    if(now<f[0]||now>l[0]) return null;
    for(let i=0;i<tl.length-1;i++){const a=tl[i],b=tl[i+1];
      if(now>=a[0]&&now<=b[0]){if(b[0]===a[0])return a[1];return a[1]+(now-a[0])/(b[0]-a[0])*(b[1]-a[1]);}}
    return l[1];
  }
  function ptAt(shape, dist){
    const idx=shapeIdx[shape]; if(!idx||idx.pts.length<2)return null;
    const pts=idx.pts;
    if(dist<=pts[0][2])return{lat:pts[0][0],lon:pts[0][1],bearing:brng(pts[0],pts[1])};
    const last=pts[pts.length-1];
    if(dist>=last[2])return{lat:last[0],lon:last[1],bearing:brng(pts[pts.length-2],last)};
    let lo=0,hi=pts.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1; if(pts[m][2]<=dist)lo=m; else hi=m;}
    const a=pts[lo],b=pts[hi],span=b[2]-a[2],r=span>0?(dist-a[2])/span:0;
    return{lat:a[0]+r*(b[0]-a[0]),lon:a[1]+r*(b[1]-a[1]),bearing:brng(a,b)};
  }
  function brng(a,b){const φ1=a[0]*Math.PI/180,φ2=b[0]*Math.PI/180,Δλ=(b[1]-a[1])*Math.PI/180;
    const y=Math.sin(Δλ)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;}

  function activeBuses(when, activeRoutes){
    const dk=dateKey(when),wd=weekday0(when),now=secOfDay(when),out=[],cache={};
    for(let i=0;i<D.trips.length;i++){const t=D.trips[i];
      if(activeRoutes && !activeRoutes.has(t.r)) continue;
      if(cache[t.sv]===undefined) cache[t.sv]=runs(t.sv,dk,wd);
      if(!cache[t.sv]) continue;
      const dist=distAt(t.tl,now); if(dist===null) continue;
      const pos=ptAt(t.sh,dist); if(!pos) continue;
      const rt=D.routes[t.r];
      out.push({id:i,route:t.r,short:rt?rt.short:t.r,color:rt?rt.color:'#888',
        headsign:t.hs,lat:pos.lat,lon:pos.lon,bearing:pos.bearing});
    }
    return out;
  }

  /* ---------- Routage bus (direct + 1 correspondance) ---------- */
  function haversine(a,b){const R=6371000,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));}
  function nearest(pt,n){return D.stops.map(s=>({s,d:haversine(pt,s)})).sort((a,b)=>a.d-b.d).slice(0,n);}

  function busRoute(from,to){
    const O=nearest(from,5),Dst=nearest(to,5);
    // direct
    for(const o of O)for(const d of Dst){
      const ro=new Set(D.stopRoutes[o.s.id]||[]),rd=new Set(D.stopRoutes[d.s.id]||[]);
      for(const line of ro)if(rd.has(line))
        return{type:'direct',lines:[line],board:o.s,alight:d.s,walk1:o.d,walk2:d.d};
    }
    // 1 correspondance
    for(const o of O)for(const d of Dst){
      const ro=D.stopRoutes[o.s.id]||[],rd=new Set(D.stopRoutes[d.s.id]||[]);
      for(const l1 of ro)for(const stn of (D.routeStops[l1]||[])){
        const via=stopById[stn]; if(!via)continue;
        for(const l2 of (D.stopRoutes[stn]||[]))if(rd.has(l2)&&l2!==l1)
          return{type:'correspondance',lines:[l1,l2],board:o.s,via,alight:d.s,walk1:o.d,walk2:d.d};
      }
    }
    return null;
  }

  // segments de tracé entre 2 arrêts d'une ligne (pour dessiner le trajet bus)
  function shapeForRoute(routeId){
    // renvoie le 1er shape associé à la route (pour tracé approximatif)
    for(const t of D.trips) if(t.r===routeId) return shapeIdx[t.sh] ? shapeIdx[t.sh].pts.map(p=>[p[1],p[0]]) : null;
    return null;
  }

  return {
    load, activeBuses, busRoute, shapeForRoute,
    get routes(){return D?D.routes:{};},
    get stops(){return D?D.stops:[];},
    get shapes(){return D?D.shapes:{};},
    stopById:(id)=>stopById[id],
  };
})();

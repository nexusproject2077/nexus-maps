/* ============================================================
   Nexus Maps — Stockage local (favoris + signalements)
   ------------------------------------------------------------
   Tout est gardé dans le navigateur de l'utilisateur (localStorage).
   Rien n'est envoyé à un serveur -> jamais perdu lors d'une MAJ,
   et 100% privé. Répond au reproche "favoris perdus" d'Apple Plans.
   ============================================================ */
const NexusStore = (() => {
  const KEY_FAV = "nexus_favorites_v1";
  const KEY_REP = "nexus_reports_v1";

  function read(key){ try{ return JSON.parse(localStorage.getItem(key)||"[]"); }catch{ return []; } }
  function write(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); return true; }catch{ return false; } }

  // ---- Favoris ----
  function getFavorites(){ return read(KEY_FAV); }
  function addFavorite(fav){ // {name, lat, lon}
    const list=read(KEY_FAV);
    // évite les doublons (même nom + coords proches)
    if(list.some(f=>f.name===fav.name && Math.abs(f.lat-fav.lat)<1e-5 && Math.abs(f.lon-fav.lon)<1e-5)) return list;
    list.push({...fav, id:Date.now()});
    write(KEY_FAV,list); return list;
  }
  function removeFavorite(id){ const list=read(KEY_FAV).filter(f=>f.id!==id); write(KEY_FAV,list); return list; }

  // ---- Signalements ----
  function getReports(){ return read(KEY_REP); }
  function addReport(rep){ // {lat, lon, comment, date}
    const list=read(KEY_REP);
    list.push({...rep, id:Date.now()});
    write(KEY_REP,list); return list;
  }
  function removeReport(id){ const list=read(KEY_REP).filter(r=>r.id!==id); write(KEY_REP,list); return list; }

  return { getFavorites, addFavorite, removeFavorite, getReports, addReport, removeReport };
})();

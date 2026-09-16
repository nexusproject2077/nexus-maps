/* ============================================================
   Nexus Maps — Internationalisation légère (FR / EN)
   ------------------------------------------------------------
   - Détection auto via navigator.language (repli FR).
   - Choix mémorisé dans localStorage.
   - Application déclarative : data-i18n (texte), data-i18n-ph
     (placeholder), data-i18n-html (HTML de confiance).
   - t(key, vars) pour les chaînes dynamiques (JS).
   Aucune dépendance, aucun réseau.
   ============================================================ */
const NexusI18n = (() => {
  const KEY = 'nexus_lang_v1';

  const DICT = {
    fr: {
      'nav.explore': 'Explorer', 'nav.route': 'Itinéraire', 'nav.layers': 'Couches', 'nav.saved': 'Favoris',
      'status.city': 'Troyes & alentours', 'status.network': 'Réseau TCAT en direct',
      'explore.eyebrow': 'Découvrir autour de vous', 'explore.intro': 'Trouvez un lieu, un service ou une adresse dans toute la France.',
      'route.eyebrow': 'Choisir le meilleur trajet', 'saved.eyebrow': 'Votre espace personnel', 'layers.eyebrow': 'Personnaliser la carte',
      'theme.toLight': 'Activer le thème clair', 'theme.toDark': 'Activer le thème sombre',
      'lang.toggle': 'Changer de langue', 'panel.close': 'Fermer le panneau', 'search.label': 'Rechercher un lieu',
      'route.from.label': 'Adresse de départ', 'route.to.label': "Adresse d'arrivée",
      'search.ph': 'Rechercher un lieu, une adresse…',
      'explore.categories': 'Catégories', 'explore.recent': 'Recherches récentes',
      'cat.restaurant': 'Restaurants', 'cat.cafe': 'Cafés', 'cat.groceries': 'Courses', 'cat.pharmacy': 'Pharmacies',
      'cat.fuel': 'Essence', 'cat.hotel': 'Hôtels', 'cat.parking': 'Parkings', 'cat.health': 'Santé',
      'mode.walk': 'Piéton', 'mode.bike': 'Vélo', 'mode.car': 'Voiture', 'mode.bus': 'Bus',
      'route.from': 'Départ', 'route.to': 'Arrivée', 'route.field.ph': 'Adresse, lieu…', 'route.go': "Calculer l'itinéraire",
      'route.calc': 'Calcul…', 'route.err.points': 'Choisis un départ et une arrivée dans les suggestions.',
      'route.nav.start': 'Démarrer la navigation', 'route.steps': 'Étapes',
      'fav.stats': 'Mes statistiques', 'fav.stats.dist': 'parcourus', 'fav.stats.stops': 'arrêts vus', 'fav.stats.fav': 'favoris',
      'fav.save': 'Enregistrer un lieu', 'fav.save.ph': 'Chercher un lieu à enregistrer…', 'fav.list': 'Mes lieux enregistrés',
      'fav.export': 'Exporter (JSON)', 'fav.import': 'Importer',
      'fav.empty': 'Aucun lieu enregistré.',
      'fav.reports': 'Mes signalements',
      'fav.reports.hint': "Clique <strong>n'importe où sur la carte</strong> en mode signalement pour marquer un problème.",
      'fav.reports.toggle': 'Activer le mode signalement', 'fav.reports.active': 'Mode signalement ACTIF — clique la carte',
      'fav.disclaimer': "Favoris et signalements sont stockés <strong>uniquement sur ton appareil</strong> (localStorage). Rien n'est envoyé à un serveur : ils ne se perdent pas et restent privés.",
      'layers.base': 'Fond de carte', 'layers.base.plan': 'Plan', 'layers.base.sat': 'Satellite', 'layers.base.relief': 'Relief',
      'layers.display': 'Affichage', 'layers.b3d': 'Bâtiments 3D', 'layers.stops': 'Arrêts de bus', 'layers.lines': 'Lignes de bus',
      'layers.buses.est': 'Bus en direct (estimé)', 'layers.buses.live': 'Bus en direct (temps réel)',
      'layers.cycle': 'Pistes cyclables', 'layers.eco': "Mode économie d'énergie",
      'layers.filter': 'Filtrer les lignes', 'layers.all': 'Tout', 'layers.none': 'Aucune',
      'layers.disclaimer': "Clique un <strong>arrêt</strong> pour voir les prochains passages en <strong>temps réel</strong> (flux officiel TCAT). Positions des bus = <strong>estimées</strong> des horaires, sauf si le flux publie des positions GPS.",
      'place.directions': 'Itinéraire', 'place.from': 'Départ', 'place.save': 'Enregistrer', 'place.saved': 'Enregistré',
      'place.share': 'Partager', 'place.street': 'Photos rue', 'place.nearby': 'Arrêts à proximité', 'place.loading': 'Chargement…',
      'nearby.none': 'Aucun arrêt à moins de 500 m.',
      'toast.saved': 'Lieu enregistré dans les favoris', 'toast.shareCopied': 'Lien de la position copié',
      'toast.geo.off': 'Géolocalisation non disponible sur cet appareil', 'toast.arrived': 'Vous êtes arrivé à destination',
      'toast.exported': 'Favoris exportés', 'toast.imported': 'Favoris importés', 'toast.import.err': 'Fichier invalide',
      'toast.eco.on': "Mode économie d'énergie activé", 'toast.eco.off': "Mode économie désactivé",
      'toast.eco.auto': "Batterie faible — mode économie activé",
      'kbd.hint': 'Raccourcis : / recherche · M ma position · R itinéraire · L couches · F favoris · Échap fermer',
    },
    en: {
      'nav.explore': 'Explore', 'nav.route': 'Route', 'nav.layers': 'Layers', 'nav.saved': 'Saved',
      'status.city': 'Troyes & nearby', 'status.network': 'Live TCAT network',
      'explore.eyebrow': 'Discover what is nearby', 'explore.intro': 'Find a place, service or address anywhere in France.',
      'route.eyebrow': 'Choose the best journey', 'saved.eyebrow': 'Your personal space', 'layers.eyebrow': 'Customize the map',
      'theme.toLight': 'Switch to light theme', 'theme.toDark': 'Switch to dark theme',
      'lang.toggle': 'Change language', 'panel.close': 'Close panel', 'search.label': 'Search for a place',
      'route.from.label': 'Starting address', 'route.to.label': 'Destination address',
      'search.ph': 'Search a place, an address…',
      'explore.categories': 'Categories', 'explore.recent': 'Recent searches',
      'cat.restaurant': 'Restaurants', 'cat.cafe': 'Cafés', 'cat.groceries': 'Groceries', 'cat.pharmacy': 'Pharmacies',
      'cat.fuel': 'Fuel', 'cat.hotel': 'Hotels', 'cat.parking': 'Parking', 'cat.health': 'Health',
      'mode.walk': 'Walk', 'mode.bike': 'Bike', 'mode.car': 'Car', 'mode.bus': 'Bus',
      'route.from': 'From', 'route.to': 'To', 'route.field.ph': 'Address, place…', 'route.go': 'Get directions',
      'route.calc': 'Calculating…', 'route.err.points': 'Pick a start and an end from the suggestions.',
      'route.nav.start': 'Start navigation', 'route.steps': 'Steps',
      'fav.stats': 'My stats', 'fav.stats.dist': 'travelled', 'fav.stats.stops': 'stops seen', 'fav.stats.fav': 'saved',
      'fav.save': 'Save a place', 'fav.save.ph': 'Search a place to save…', 'fav.list': 'My saved places',
      'fav.export': 'Export (JSON)', 'fav.import': 'Import',
      'fav.empty': 'No saved place yet.',
      'fav.reports': 'My reports',
      'fav.reports.hint': 'Tap <strong>anywhere on the map</strong> in report mode to flag a problem.',
      'fav.reports.toggle': 'Enable report mode', 'fav.reports.active': 'Report mode ON — tap the map',
      'fav.disclaimer': 'Saved places and reports are stored <strong>only on your device</strong> (localStorage). Nothing is sent to a server: they are never lost and stay private.',
      'layers.base': 'Base map', 'layers.base.plan': 'Map', 'layers.base.sat': 'Satellite', 'layers.base.relief': 'Terrain',
      'layers.display': 'Display', 'layers.b3d': '3D buildings', 'layers.stops': 'Bus stops', 'layers.lines': 'Bus lines',
      'layers.buses.est': 'Live buses (estimated)', 'layers.buses.live': 'Live buses (real-time)',
      'layers.cycle': 'Cycle lanes', 'layers.eco': 'Power-saving mode',
      'layers.filter': 'Filter lines', 'layers.all': 'All', 'layers.none': 'None',
      'layers.disclaimer': 'Tap a <strong>stop</strong> to see the next departures in <strong>real time</strong> (official TCAT feed). Bus positions are <strong>estimated</strong> from the schedule, unless the feed publishes GPS positions.',
      'place.directions': 'Directions', 'place.from': 'From', 'place.save': 'Save', 'place.saved': 'Saved',
      'place.share': 'Share', 'place.street': 'Street photos', 'place.nearby': 'Nearby stops', 'place.loading': 'Loading…',
      'nearby.none': 'No stop within 500 m.',
      'toast.saved': 'Place saved to favorites', 'toast.shareCopied': 'Location link copied',
      'toast.geo.off': 'Geolocation not available on this device', 'toast.arrived': 'You have arrived at your destination',
      'toast.exported': 'Favorites exported', 'toast.imported': 'Favorites imported', 'toast.import.err': 'Invalid file',
      'toast.eco.on': 'Power-saving mode enabled', 'toast.eco.off': 'Power-saving mode disabled',
      'toast.eco.auto': 'Low battery — power-saving mode enabled',
      'kbd.hint': 'Shortcuts: / search · M my location · R route · L layers · F favorites · Esc close',
    },
  };

  let lang = 'fr';
  const listeners = [];

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    const nav = (navigator.language || navigator.userLanguage || 'fr').slice(0, 2).toLowerCase();
    return DICT[nav] ? nav : 'fr';
  }

  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) || (DICT.fr && DICT.fr[key]) || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.documentElement.setAttribute('lang', lang);
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = lang.toUpperCase();
  }

  function setLang(l) {
    if (!DICT[l]) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    listeners.forEach(f => { try { f(l); } catch (e) {} });
  }

  function toggle() { setLang(lang === 'fr' ? 'en' : 'fr'); }

  function init() { lang = detect(); apply(); }

  return {
    init, apply, setLang, toggle, t,
    get lang() { return lang; },
    onChange: (f) => listeners.push(f),
  };
})();

// Un `const` de haut niveau n'est PAS attaché à window dans un script classique.
// On l'expose explicitement pour que `window.NexusI18n` fonctionne dans app.js.
window.NexusI18n = NexusI18n;

// Applique dès que le DOM est prêt (avant app.js pour éviter un flash).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NexusI18n.init());
} else {
  NexusI18n.init();
}

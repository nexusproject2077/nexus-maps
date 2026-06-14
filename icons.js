/* ============================================================
   Nexus Maps — Bibliothèque d'icônes SVG
   Icônes vectorielles pro (style Apple Plans / Google Maps),
   en remplacement de tout emoji/glyphe. Toutes en currentColor
   pour s'adapter au thème, sauf marqueurs (couleurs dédiées).
   ============================================================ */
(function (global) {
  // Warning / signalement — triangle d'alerte net, hérite de currentColor
  const warning = (cls = 'i-warn') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  // Flèche de progression (séparateur de lignes de bus)
  const arrow = (cls = 'i-arrow') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>`;

  // Fermeture / suppression (remplace le « × »)
  const close = (cls = 'i-close') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`;

  // Marqueur favori — pin « teardrop » avec étoile (style Google/Apple)
  const favPin = (fill = '#00e5ff') =>
    `<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="favg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".82"/></linearGradient></defs><path d="M16 1C8.27 1 2 7.27 2 15c0 9.5 11.1 24.2 13.06 26.7a1.2 1.2 0 0 0 1.88 0C18.9 39.2 30 24.5 30 15 30 7.27 23.73 1 16 1z" fill="url(#favg)" stroke="#fff" stroke-width="2"/><path d="M16 8.6l2.13 4.32 4.77.69-3.45 3.36.82 4.75L16 19.48l-4.27 2.24.82-4.75-3.45-3.36 4.77-.69z" fill="#fff"/></svg>`;

  // Marqueur générique (lieu recherché / cliqué) — teardrop avec point
  const dropPin = (fill = '#ff5a5f') =>
    `<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="dropg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".82"/></linearGradient></defs><path d="M16 1C8.27 1 2 7.27 2 15c0 9.5 11.1 24.2 13.06 26.7a1.2 1.2 0 0 0 1.88 0C18.9 39.2 30 24.5 30 15 30 7.27 23.73 1 16 1z" fill="url(#dropg)" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5" fill="#fff"/></svg>`;

  // Marqueur signalement — pin avec point d'exclamation
  const reportPin = (fill = '#ffb627') =>
    `<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="repg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".82"/></linearGradient></defs><path d="M16 1C8.27 1 2 7.27 2 15c0 9.5 11.1 24.2 13.06 26.7a1.2 1.2 0 0 0 1.88 0C18.9 39.2 30 24.5 30 15 30 7.27 23.73 1 16 1z" fill="url(#repg)" stroke="#fff" stroke-width="2"/><rect x="14.4" y="7.8" width="3.2" height="9" rx="1.6" fill="#1a1205"/><circle cx="16" cy="20.4" r="1.9" fill="#1a1205"/></svg>`;

  const S = (p, sw = 2) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  // Icônes d'interface (héritent currentColor)
  const search = () => S('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>');
  const locate = () => S('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>');
  const directions = () => S('<polygon points="3 11 22 2 13 21 11 13 3 11"/>');
  const share = () => S('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>');
  const bookmark = () => S('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>');
  const camera = () => S('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>');
  const pin = () => S('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>');
  const clock = () => S('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>');
  const flag = () => S('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>');

  // Flèche de manœuvre selon le type d'étape ORS
  const maneuver = (type) => {
    const M = {
      left: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
      right: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
      straight: '<line x1="12" y1="20" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/>',
      uturn: '<path d="M5 20V11a5 5 0 0 1 10 0v3"/><polyline points="11 10 15 14 19 10"/>',
      round: '<circle cx="12" cy="13" r="5"/><line x1="12" y1="8" x2="12" y2="2"/><polyline points="9 5 12 2 15 5"/>',
      depart: '<circle cx="12" cy="12" r="3"/><path d="M12 9V3"/><polyline points="9 6 12 3 15 6"/>',
      arrive: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    };
    const key = ({0:'left',1:'right',2:'left',3:'right',4:'left',5:'right',6:'straight',
      7:'round',8:'round',9:'uturn',10:'arrive',11:'depart',12:'left',13:'right'})[type] ?? 'straight';
    return S(M[key]);
  };

  global.NEXUS_ICONS = { warning, arrow, close, favPin, reportPin, dropPin,
    search, locate, directions, share, bookmark, camera, pin, clock, flag, maneuver };
})(window);

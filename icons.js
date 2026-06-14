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

  // Marqueur signalement — pin avec point d'exclamation
  const reportPin = (fill = '#ffb627') =>
    `<svg viewBox="0 0 32 44" aria-hidden="true"><defs><linearGradient id="repg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".82"/></linearGradient></defs><path d="M16 1C8.27 1 2 7.27 2 15c0 9.5 11.1 24.2 13.06 26.7a1.2 1.2 0 0 0 1.88 0C18.9 39.2 30 24.5 30 15 30 7.27 23.73 1 16 1z" fill="url(#repg)" stroke="#fff" stroke-width="2"/><rect x="14.4" y="7.8" width="3.2" height="9" rx="1.6" fill="#1a1205"/><circle cx="16" cy="20.4" r="1.9" fill="#1a1205"/></svg>`;

  global.NEXUS_ICONS = { warning, arrow, close, favPin, reportPin };
})(window);

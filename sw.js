/* ============================================================
   Nexus Maps — Service Worker (offline-first)
   ------------------------------------------------------------
   - Precache de la coquille de l'app (HTML/CSS/JS/icône).
   - Runtime cache "stale-while-revalidate" pour les données
     locales (nexus_data.json) et les tuiles/polices distantes,
     afin que la carte reste utilisable hors-ligne après une
     première visite.
   - Aucune donnée personnelle n'est touchée : favoris et
     signalements restent dans localStorage.
   ============================================================ */
const VERSION = 'v20';
const SHELL_CACHE = 'nexus-shell-' + VERSION;
const RUNTIME_CACHE = 'nexus-runtime-' + VERSION;

// Coquille minimale (chemins relatifs à la portée du SW).
const SHELL = [
  './',
  './index.html',
  './style.css?v=20',
  './config.js?v=20',
  './icons.js?v=20',
  './space.js?v=20',
  './store.js?v=20',
  './busengine.js?v=20',
  './gtfsrt.js?v=20',
  './realtime.js?v=20',
  './routing.js?v=20',
  './app.js?v=20',
  './i18n.js?v=20',
  './icon.svg',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll échoue en bloc : on tolère les absences en ajoutant un par un.
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Détermine si une requête est "cachable" (GET http/https uniquement).
function cachable(req) {
  return req.method === 'GET' && /^https?:/.test(req.url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!cachable(req)) return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Le flux temps réel (GTFS-RT) et les proxys CORS ne doivent jamais être
  // servis depuis le cache : on laisse le réseau gérer.
  if (/data\.gouv\.fr|corsproxy\.io|allorigins\.win/.test(url.hostname)) return;

  // Les navigations privilégient toujours la dernière version disponible.
  // Le cache ne sert que de repli hors-ligne, ce qui évite une UI obsolète
  // après un déploiement du service worker.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh?.ok) cache.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return await cache.match('./index.html') || await cache.match('./') ||
          new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Stale-while-revalidate : réponse immédiate du cache, mise à jour en fond.
  event.respondWith((async () => {
    const cache = await caches.open(sameOrigin ? SHELL_CACHE : RUNTIME_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) { network; return cached; }
    const res = await network;
    if (res) return res;
    return new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
  })());
});

// Permet à la page de forcer l'activation d'un SW mis à jour.
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

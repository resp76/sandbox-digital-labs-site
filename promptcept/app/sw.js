// PromptCept web build service worker.
//
// The app generates prompts locally and stores them in localStorage, so once
// the shell is cached it works with no network at all. Bump CACHE when any
// shell asset changes; the old cache is dropped on activate.
const CACHE = 'promptcept-v2';
const SHELL = [
  '/promptcept/app/',
  '/promptcept/app/index.html',
  '/promptcept/app/styles/app.css',
  '/promptcept/app/js/app.js',
  '/promptcept/app/sw-register.js',
  '/promptcept/app/manifest.webmanifest',
  '/promptcept/app/icons/icon-192.png',
  '/promptcept/app/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigations so a deploy is picked up on the next online
// visit; cache-first for the static shell.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('/promptcept/app/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/promptcept/app/index.html'))
    );
    return;
  }

  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});

const CACHE = 'pocket-bridge-51e4fe10e482';
const BASE = new URL('./', self.location.href);
const PRECACHE = ["/pocket-bridge-public-preview/","/pocket-bridge-public-preview/icon.svg","/pocket-bridge-public-preview/manifest.webmanifest","/pocket-bridge-public-preview/fonts.css","/pocket-bridge-public-preview/icon-192.png","/pocket-bridge-public-preview/icon-512.png","/pocket-bridge-public-preview/assets/index-B6AsPOMg.js","/pocket-bridge-public-preview/assets/index-DFEmyome.css"];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pocket-bridge-') && key !== CACHE).map(key => caches.delete(key)))).then(()=>self.clients.claim())));
function shareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pocket-bridge-shares', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('shares', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE.pathname) || url.pathname.startsWith('/api/')) return;
  if (url.pathname === BASE.pathname + 'shared' && event.request.method === 'POST') {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const db = await shareDb();
        const id = crypto.randomUUID();
        await new Promise((resolve, reject) => {
          const tx = db.transaction('shares', 'readwrite');
          tx.objectStore('shares').put({ id, files: form.getAll('files').filter(file => file instanceof File), text: String(form.get('text') || ''), url: String(form.get('url') || ''), title: String(form.get('title') || '') });
          tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
        db.close();
        return Response.redirect(BASE.href + '?shared=' + id, 303);
      } catch { return Response.redirect(BASE.href + '?shareError=1', 303); }
    })());
    return;
  }
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && (event.request.mode === 'navigate' || /\.(js|css|svg|png)$/.test(url.pathname))) {
        const cache = await caches.open(CACHE); await cache.put(event.request.mode === 'navigate' ? BASE.href : event.request, response.clone());
      }
      return response;
    } catch {
      return await caches.match(event.request) || (event.request.mode === 'navigate' ? await caches.match(BASE.href) : undefined) || new Response('Offline', { status: 503 });
    }
  })());
});

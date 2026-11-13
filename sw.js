// MHS Tracker service worker — makes the app installable and work offline.
// Bump CACHE when you upload a new index.html so phones pick up the update.
const CACHE = 'mhs-tracker-v3';
const SHELL = ['./','./index.html','./manifest.webmanifest','./icon-192-2.png','./icon-512-2.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  // Page loads: network first (so updates show up), cached copy when offline
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)); return r; })
      .catch(()=>caches.match('./index.html')));
    return;
  }
  // Same-origin files: cache first, refresh in background
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>{
      const net = fetch(req).then(r=>{ if(r.ok){ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); } return r; }).catch(()=>hit);
      return hit || net;
    }));
    return;
  }
  // Other sites (e.g. the spreadsheet-import library): try network, remember it, fall back to the saved copy
  e.respondWith(fetch(req).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return r; }).catch(()=>caches.match(req)));
});

var CACHE = "pesos-v1";
var ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(k){
    return Promise.all(k.filter(function(n){ return n !== CACHE; }).map(function(n){ return caches.delete(n); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e){
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});

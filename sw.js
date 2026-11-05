// Guarda a "casca" do site para abrir rápido e funcionar com pouca rede
const VERSAO = "ac-v6";
const CASCA = ["./", "index.html", "css/estilo.css?v=6", "js/dados.js?v=6", "js/app.js?v=6", "manifest.webmanifest", "icones/icone-192.png", "icones/icone-512.png", "img/hero-02.jpg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Rede primeiro (conteúdo sempre atual); sem rede, usa a cópia guardada
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./")))
  );
});

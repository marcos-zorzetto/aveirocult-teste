// Guarda a "casca" do site para abrir rápido e funcionar com pouca rede
const VERSAO = "ac-v1";
const CASCA = ["./", "index.html", "css/estilo.css", "js/dados.js", "js/app.js", "icones/icone-192.png", "icones/icone-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
));
// Rede primeiro (conteúdo sempre atual); sem rede, usa a cópia guardada
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

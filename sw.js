// Guarda a "casca" do site para abrir rápido e funcionar com pouca rede
const VERSAO = "ac-v27";
const CASCA = ["./", "index.html", "css/estilo.css?v=27", "js/dados.js?v=20", "js/app.js?v=23", "js/analytics.js?v=1", "js/imagens.js?v=2", "manifest.webmanifest", "icones/icone-192.png", "icones/icone-512.png", "img/hero-02.jpg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCA)));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

const guardar = (pedido, resposta) => { if (resposta && resposta.ok) caches.open(VERSAO).then(c => c.put(pedido, resposta.clone())); return resposta; };

self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  const url = new URL(request.url);
  // Páginas: pedir sempre ao servidor, ignorando a cópia HTTP de 10 min do GitHub Pages (assim a versão nova chega ao primeiro recarregar)
  if (request.mode === "navigate") {
    e.respondWith(fetch(request.url, { cache: "no-cache", credentials: "same-origin" }).then(r => guardar(request, r))
      .catch(() => caches.match(request).then(r => r || caches.match("./"))));
    return;
  }
  // Ficheiros com versão no nome (?v=) e imagens do site: nunca mudam sem mudar o nome, por isso a cópia local serve primeiro
  if (url.searchParams.has("v") || /^\/[^?]*\/(img|icones)\//.test(url.pathname) || /\/(img|icones)\//.test(url.pathname)) {
    e.respondWith(caches.match(request).then(r => r || fetch(request).then(x => guardar(request, x))));
    return;
  }
  // Resto (manifest, ficheiros sem versão): rede primeiro, cópia local se a rede falhar
  e.respondWith(fetch(request).then(r => guardar(request, r)).catch(() => caches.match(request)));
});

/* Página de detalhe (evento, artista ou notícia) · Aveiro Cult
   O tipo vem de <body data-tipo="evento|artista|noticia">. O registo é lido da base de dados pelo id (ou slug, nas notícias). */
const BD = { url: "https://otcpgtauymtavygscxfo.supabase.co", chave: "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM" };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const dataLonga = iso => { if (!iso) return ""; const d = new Date(iso + "T12:00:00"); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const paragrafos = t => esc(t || "").split(/\n{2,}|\r\n\r\n/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
const ligacao = u => /^https?:\/\//i.test(u || "") ? u : u ? "https://" + u : "";

const tipo = document.body.dataset.tipo;
const params = new URLSearchParams(location.search);
const id = params.get("id"), slug = params.get("n");
const BASE = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");

async function ler() {
  const fonte = { evento: "eventos_publicos", artista: "artistas_publicos", noticia: "noticias" }[tipo];
  const filtro = tipo === "noticia" && slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id || "")}`;
  if (!id && !slug) return null;
  try {
    const r = await fetch(`${BD.url}/rest/v1/${fonte}?select=*&${filtro}&limit=1`, { headers: { apikey: BD.chave, Authorization: `Bearer ${BD.chave}` } });
    const j = r.ok ? await r.json() : [];
    return j[0] || null;
  } catch { return null; }
}

function naoEncontrado() {
  $("#conteudo").innerHTML = `<div class="pg-vazio"><p class="sobre-titulo">Ups</p><h1>Não encontrámos esta página</h1><p>Pode já ter sido removida ou o endereço está incompleto.</p><a class="btn btn-primario" href="./">Voltar ao início</a></div>`;
  document.title = "Página não encontrada · Aveiro Cult";
}

function meta(titulo, descricao, imagem) {
  document.title = `${titulo} · Aveiro Cult`;
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('meta[name="description"]', "content", descricao);
  set('meta[property="og:title"]', "content", titulo);
  set('meta[property="og:description"]', "content", descricao);
  if (imagem) set('meta[property="og:image"]', "content", imagem.startsWith("http") ? imagem : BASE + imagem);
  set('link[rel="canonical"]', "href", location.href.replace(/#.*$/, ""));
}

function ld(obj) { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(obj); document.head.appendChild(s); }

function partilha(titulo) {
  const b = $("#partilhar"); if (!b) return;
  b.addEventListener("click", async () => {
    const dados = { title: titulo, text: `${titulo} · Aveiro Cult`, url: location.href };
    if (navigator.share) { try { await navigator.share(dados); } catch {} return; }
    try { await navigator.clipboard.writeText(location.href); b.querySelector("span").textContent = "Ligação copiada"; } catch {}
  });
}

function mostrarEvento(e) {
  const quando = `${dataLonga(e.data)}${e.hora ? ", às " + esc(e.hora.slice(0, 5)) : ""}${e.data_fim && e.data_fim !== e.data ? " até " + dataLonga(e.data_fim) : ""}`;
  const onde = [e.local, e.concelho].filter(Boolean).join(", ");
  const tags = (e.tags || []).map(t => `<a class="pg-tag" href="./#agenda">#${esc(t)}</a>`).join("");
  $("#conteudo").innerHTML = `
    ${e.imagem ? `<figure class="pg-figura"><img src="${esc(e.imagem)}" alt="${esc(e.titulo)}" onerror="this.parentElement.remove()"></figure>` : ""}
    <p class="sobre-titulo">${esc(e.categoria || "Evento")}${e.concelho ? " · " + esc(e.concelho) : ""}</p>
    <h1>${esc(e.titulo)}</h1>
    <ul class="pg-meta">
      <li><svg><use href="#i-calendario"/></svg><span>${quando}</span></li>
      ${onde ? `<li><svg><use href="#i-pin"/></svg><span>${esc(onde)}</span></li>` : ""}
      ${e.preco ? `<li><svg><use href="#i-bilhete"/></svg><span>${esc(e.preco)}</span></li>` : ""}
    </ul>
    <div class="pg-corpo">${paragrafos(e.descricao)}</div>
    ${tags ? `<div class="pg-tags">${tags}</div>` : ""}
    <div class="pg-acoes">
      ${e.link ? `<a class="btn btn-primario" href="${esc(ligacao(e.link))}" target="_blank" rel="noopener">Bilhetes e mais informação <svg><use href="#i-seta"/></svg></a>` : ""}
      <button class="btn btn-escuro" id="partilhar" type="button"><svg><use href="#i-partilhar"/></svg><span>Partilhar</span></button>
      <a class="btn btn-contorno" href="./#agenda">Ver mais eventos</a>
    </div>`;
  meta(e.titulo, (e.descricao || "").slice(0, 155), e.imagem);
  ld({ "@context": "https://schema.org", "@type": "Event", name: e.titulo, startDate: e.hora ? `${e.data}T${e.hora.slice(0, 5)}` : e.data, ...(e.data_fim ? { endDate: e.data_fim } : {}),
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.local || e.concelho || "Distrito de Aveiro", address: { "@type": "PostalAddress", addressLocality: e.concelho || "Aveiro", addressRegion: "Aveiro", addressCountry: "PT" } },
    ...(e.imagem ? { image: [e.imagem] } : {}), description: (e.descricao || "").slice(0, 500), ...(e.link ? { url: ligacao(e.link) } : {}),
    organizer: { "@type": "Organization", name: "Aveiro Cult", url: BASE } });
  partilha(e.titulo);
}

function mostrarArtista(a) {
  $("#conteudo").innerHTML = `
    ${a.imagem ? `<figure class="pg-figura pg-retrato"><img src="${esc(a.imagem)}" alt="${esc(a.titulo)}" onerror="this.parentElement.remove()"></figure>` : ""}
    <p class="sobre-titulo">${esc(a.categoria || "Artista")}${a.concelho ? " · " + esc(a.concelho) : ""}</p>
    <h1>${esc(a.titulo)}</h1>
    <div class="pg-corpo">${paragrafos(a.descricao)}</div>
    <div class="pg-acoes">
      ${a.site ? `<a class="btn btn-primario" href="${esc(ligacao(a.site))}" target="_blank" rel="noopener">Site <svg><use href="#i-seta"/></svg></a>` : ""}
      ${a.rede ? `<a class="btn btn-escuro" href="${esc(ligacao(a.rede))}" target="_blank" rel="noopener"><svg><use href="#i-insta"/></svg>Redes sociais</a>` : ""}
      <button class="btn btn-escuro" id="partilhar" type="button"><svg><use href="#i-partilhar"/></svg><span>Partilhar</span></button>
      <a class="btn btn-contorno" href="./#artistas">Ver mais artistas</a>
    </div>`;
  meta(a.titulo, (a.descricao || "").slice(0, 155), a.imagem);
  ld({ "@context": "https://schema.org", "@type": a.categoria === "Promotor" ? "Organization" : "PerformingGroup", name: a.titulo, description: (a.descricao || "").slice(0, 500),
    ...(a.imagem ? { image: a.imagem } : {}), ...(a.site ? { url: ligacao(a.site) } : {}), ...(a.concelho ? { address: { "@type": "PostalAddress", addressLocality: a.concelho, addressRegion: "Aveiro", addressCountry: "PT" } } : {}) });
  partilha(a.titulo);
}

function mostrarNoticia(n) {
  const img = n.imagem ? (n.imagem.startsWith("http") ? n.imagem : n.imagem) : "";
  $("#conteudo").innerHTML = `
    ${img ? `<figure class="pg-figura"><img src="${esc(img)}" alt="${esc(n.titulo)}" onerror="this.parentElement.remove()"></figure>` : ""}
    <p class="sobre-titulo">${esc(n.categoria || "Notícia")}${n.concelho ? " · " + esc(n.concelho) : ""}</p>
    <h1>${esc(n.titulo)}</h1>
    <ul class="pg-meta"><li><svg><use href="#i-calendario"/></svg><span>${dataLonga(n.data)}</span></li></ul>
    ${n.resumo ? `<p class="pg-lead">${esc(n.resumo)}</p>` : ""}
    <div class="pg-corpo">${n.corpo ? paragrafos(n.corpo) : ""}</div>
    <div class="pg-acoes">
      ${n.link_original ? `<a class="btn btn-primario" href="${esc(n.link_original)}" target="_blank" rel="noopener">Ler o artigo completo <svg><use href="#i-seta"/></svg></a>` : ""}
      <button class="btn btn-escuro" id="partilhar" type="button"><svg><use href="#i-partilhar"/></svg><span>Partilhar</span></button>
      <a class="btn btn-contorno" href="./#noticias">Mais notícias</a>
    </div>`;
  meta(n.titulo, (n.resumo || n.corpo || "").slice(0, 155), img);
  ld({ "@context": "https://schema.org", "@type": "NewsArticle", headline: n.titulo, datePublished: n.data, dateModified: n.atualizado_em || n.data, description: n.resumo || "",
    ...(img ? { image: [img.startsWith("http") ? img : BASE + img] } : {}), inLanguage: "pt-PT",
    author: { "@type": "Organization", name: "Aveiro Cult" }, publisher: { "@type": "Organization", name: "Aveiro Cult", logo: { "@type": "ImageObject", url: BASE + "icones/icone-512.png" } }, mainEntityOfPage: location.href.replace(/#.*$/, "") });
  partilha(n.titulo);
}

(async () => {
  document.getElementById("ano").textContent = new Date().getFullYear();
  const r = await ler();
  if (!r) return naoEncontrado();
  ({ evento: mostrarEvento, artista: mostrarArtista, noticia: mostrarNoticia })[tipo](r);
  document.body.classList.add("carregado");
})();

/* ============================================================
   Aveiro Cult · comportamento da página
   Sem dependências externas. Cada bloco está comentado.
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toque = matchMedia("(pointer: coarse)").matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normalizar = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const icone = n => `<svg><use href="#i-${n}"/></svg>`;

// Datas no formato "QUI · 29 OUT"
const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const formatar = iso => { const d = new Date(iso + "T12:00:00"); return `${DIAS[d.getDay()]} · ${d.getDate()} ${MESES[d.getMonth()]}`; };
const imagem = (n, extra = "") => n.f
  ? (n.f.startsWith("img/") && !n.f.includes("-800")
    ? `<img src="${n.f.replace(".jpg", "-800.jpg")}" srcset="${n.f.replace(".jpg", "-800.jpg")} 800w, ${n.f} 1600w" sizes="(max-width: 640px) 92vw, 420px" alt="${esc(n.t)}" loading="lazy" decoding="async" ${extra}>`
    : `<img src="${esc(n.f)}" alt="${esc(n.t)}" loading="lazy" decoding="async" ${extra}>`)
  : `<div class="sem" data-cat="${esc(n.cat)}">${icone("calendario")}</div>`;

/* ---------- Barra de progresso e topo ---------- */
const topo = $("#topo");
const progresso = $("#progresso");
let ultimoY = 0;
function aoRolar() {
  const y = scrollY;
  const total = document.documentElement.scrollHeight - innerHeight;
  progresso.style.transform = `scaleX(${total ? y / total : 0})`;
  topo.classList.toggle("rolado", y > 40);
  // Esconde o topo ao descer, mostra ao subir (só depois do hero)
  topo.classList.toggle("esconder", y > innerHeight && y > ultimoY + 4);
  ultimoY = y;
}
addEventListener("scroll", aoRolar, { passive: true });
aoRolar();

/* ---------- Cursor personalizado (só rato) ---------- */
const cursor = $("#cursor");
if (!toque && !reduzir) {
  let cx = 0, cy = 0, tx = 0, ty = 0;
  addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; cursor.classList.add("visivel"); });
  document.addEventListener("mouseleave", () => cursor.classList.remove("visivel"));
  (function anima() { cx += (tx - cx) * .18; cy += (ty - cy) * .18; cursor.style.transform = `translate(${cx - 18}px, ${cy - 18}px)`; requestAnimationFrame(anima); })();
  document.addEventListener("mouseover", e => cursor.classList.toggle("ativo", !!e.target.closest("a, button, .destaque, input, select")));
}

/* ---------- Menu móvel ---------- */
const menuMovel = $("#menuMovel");
const abrirMenu = $("#abrirMenu");
function alternarMenu(abrir) {
  menuMovel.classList.toggle("aberto", abrir);
  menuMovel.setAttribute("aria-hidden", !abrir);
  abrirMenu.setAttribute("aria-expanded", abrir);
  document.body.classList.toggle("sem-rolar", abrir);
}
abrirMenu.addEventListener("click", () => alternarMenu(true));
$("#fecharMenu").addEventListener("click", () => alternarMenu(false));
$$("#menuMovel a").forEach(a => a.addEventListener("click", () => alternarMenu(false)));
addEventListener("keydown", e => { if (e.key === "Escape") { alternarMenu(false); folha.hidden = true; } });

/* ---------- Hero: imagens em rotação ---------- */
const heroFundo = $("#heroFundo");
const heroPontos = $("#heroPontos");
HERO.forEach((h, i) => {
  const img = new Image();
  img.src = h.f; img.alt = h.alt; img.decoding = "async";
  if (i === 0) { img.fetchPriority = "high"; img.classList.add("ativo"); } else img.loading = "lazy";
  img.onerror = () => { img.remove(); heroPontos.children[i]?.remove(); };
  heroFundo.appendChild(img);
  const p = document.createElement("i"); if (i === 0) p.classList.add("ativo"); heroPontos.appendChild(p);
});
let slide = 0;
function mudarSlide(n) {
  const imgs = $$("#heroFundo img"), pts = $$("#heroPontos i");
  if (imgs.length < 2) return;
  imgs[slide]?.classList.remove("ativo"); pts[slide]?.classList.remove("ativo");
  slide = (n + imgs.length) % imgs.length;
  imgs[slide].classList.add("ativo");
  if (pts[slide]) { pts[slide].classList.add("ativo"); pts[slide].style.animation = "none"; pts[slide].offsetHeight; pts[slide].style.animation = ""; }
}
if (!reduzir) setInterval(() => mudarSlide(slide + 1), 7000);

/* ---------- Hero: palavra que roda ---------- */
const roda = $("#rodaPalavra");
const PALAVRAS = ["Aveiro", "Ílhavo", "Ovar", "Águeda", "Espinho", "Arouca", "Estarreja", "a Feira", "Vagos", "Anadia"];
let pal = 0, atual = roda.querySelector("span");
// Nota: com o separador em segundo plano o browser atrasa os temporizadores e vários ciclos podem disparar de seguida;
// por isso guardamos a palavra atual, limpamos sobras e não trocamos enquanto a página não está visível.
if (!reduzir) setInterval(() => {
  if (document.hidden) return;
  roda.querySelectorAll("span").forEach(s => { if (s !== atual) s.remove(); });
  const antiga = atual;
  pal = (pal + 1) % PALAVRAS.length;
  const nova = document.createElement("span");
  nova.textContent = PALAVRAS[pal]; nova.className = "entra";
  antiga.className = "sai";
  roda.appendChild(nova); atual = nova;
  setTimeout(() => { if (antiga !== atual) antiga.remove(); }, 700);
}, 4200);

/* ---------- Contadores ---------- */
function contar(el) {
  const fim = +el.dataset.contar, ini = performance.now(), dur = 1400;
  (function passo(t) {
    const p = Math.min(1, (t - ini) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(fim * e);
    if (p < 1) requestAnimationFrame(passo);
  })(ini);
}
setTimeout(() => $$("[data-contar]").forEach(contar), reduzir ? 0 : 1800);

/* ---------- Ticker ---------- */
const itensTicker = AGENDA.map(a => `${a.dia} ${a.mes} · ${a.t} · ${a.onde}`);
$("#ticker").innerHTML = [...itensTicker, ...itensTicker].map(t => `<span>${esc(t)}</span>`).join("");

/* ---------- Pesquisa, filtros e lista de notícias ---------- */
const estado = { termo: "", cat: "", concelho: "", tag: "" };
let EVENTOS = [], agendaTudo = false; // eventos aprovados vindos da base de dados (preenchido mais abaixo)
const lista = $("#lista"), vazio = $("#vazio"), resultado = $("#resultado");
const POR_PAGINA = 12; let noticiasVisiveis = POR_PAGINA; // a grelha tem 3 colunas: 12 fecha sempre a linha
const selConcelho = $("#filtroConcelho");
CONCELHOS.forEach(c => selConcelho.add(new Option(c, c)));

function realcar(texto) {
  if (!estado.termo) return esc(texto);
  const t = normalizar(texto), q = normalizar(estado.termo);
  let saida = "", i = 0, pos;
  while ((pos = t.indexOf(q, i)) !== -1) { saida += esc(texto.slice(i, pos)) + "<mark>" + esc(texto.slice(pos, pos + q.length)) + "</mark>"; i = pos + q.length; }
  return saida + esc(texto.slice(i));
}
function filtrar() {
  const q = normalizar(estado.termo);
  return NOTICIAS.filter(n =>
    (!estado.cat || n.cat === estado.cat) &&
    (!estado.concelho || n.onde === estado.concelho) &&
    (!q || normalizar(n.t + " " + n.ex + " " + n.onde + " " + n.cat).includes(q)));
}
function mostrar() {
  const todas = filtrar(), itens = todas.slice(0, noticiasVisiveis);
  lista.innerHTML = itens.map((n, i) => `
    <a class="noticia" href="${esc(n.l)}"${n.interno ? "" : ' target="_blank" rel="noopener"'} style="--i:${i % 6}">
      <div class="img">${imagem(n)}</div>
      <div class="meta"><span>${formatar(n.d)}</span><span class="cat">${esc(n.cat)}</span></div>
      <h3>${realcar(n.t)}</h3>
      <p>${realcar(n.ex)}</p>
      <span class="ler">${n.interno ? "Ler notícia" : "Ler no site"} ${icone("seta")}</span>
    </a>`).join("");
  vazio.hidden = todas.length > 0;
  const filtros = [estado.termo && `“${estado.termo}”`, estado.cat, estado.concelho].filter(Boolean).join(" · ");
  resultado.textContent = filtros ? `${todas.length} ${todas.length === 1 ? "resultado" : "resultados"} para ${filtros}` : `${NOTICIAS.length} notícias`;
  const mais = $("#noticiasMais"); if (mais) { mais.hidden = todas.length <= noticiasVisiveis; const n = Math.min(POR_PAGINA, todas.length - noticiasVisiveis); mais.textContent = n === 1 ? "Ver mais 1 notícia" : `Ver mais ${n} notícias`; }
  observarReveal($$("#lista .noticia"));
  mostrarAgenda();
}

/* ---------- Agenda: a mesma pesquisa (texto, categoria, concelho e tags) filtra os eventos ---------- */
function filtrarEventos() {
  const q = normalizar(estado.termo);
  return EVENTOS.filter(e =>
    (!estado.cat || e.categoria === estado.cat) &&
    (!estado.concelho || e.concelho === estado.concelho) &&
    (!estado.tag || (e.tags || []).includes(estado.tag)) &&
    (!q || normalizar([e.titulo, e.descricao, e.local, e.concelho, e.categoria, ...(e.tags || [])].filter(Boolean).join(" ")).includes(q)));
}
function marcarTag() { $$("#agendaTags button, .agenda .etiq").forEach(b => b.classList.toggle("on", b.dataset.tag === estado.tag)); }
// "Todas as semanas · seg, qua" ou "De 10 a 14 dez"
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function quandoCurto(e) {
  if (e.recorrencia === "semanal" && (e.dias_semana || []).length) {
    const dias = [1, 2, 3, 4, 5, 6, 0].filter(d => e.dias_semana.includes(d)).map(d => DIAS_CURTOS[d]);
    const ate = e.repete_ate ? ` até ${new Date(e.repete_ate + "T12:00:00").getDate()} ${MESES[new Date(e.repete_ate + "T12:00:00").getMonth()].toLowerCase()}` : "";
    return `Todas as semanas · ${dias.join(", ")}${ate}`;
  }
  if (e.data_fim && e.data_fim.slice(0, 10) !== e.data) {
    const a = new Date(e.data + "T12:00:00"), b = new Date(e.data_fim.slice(0, 10) + "T12:00:00");
    return `De ${a.getDate()}${a.getMonth() !== b.getMonth() ? " " + MESES[a.getMonth()].toLowerCase() : ""} a ${b.getDate()} ${MESES[b.getMonth()].toLowerCase()}`;
  }
  return "";
}
function mostrarAgenda() {
  const ol = $("#agendaLista"); if (!ol || !EVENTOS.length) return;
  const todos = filtrarEventos(), itens = agendaTudo ? todos : todos.slice(0, 10);
  ol.innerHTML = itens.map((e, i) => {
    const d = new Date((e.proxima_data || e.data) + "T12:00:00"), onde = [e.local, e.concelho].filter(Boolean).join(" · ");
    const quando = quandoCurto(e);
    const etiqs = (e.tags || []).length ? `<span class="etiqs">${e.tags.map(t => `<button type="button" class="etiq${t === estado.tag ? " on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}</span>` : "";
    const info = `<b>${realcar(e.titulo)}</b><span>${icone("pin")}${esc(onde)}${e.hora ? " · " + esc(e.hora.slice(0, 5)) : ""}</span>${quando ? `<span class="repete">${icone("calendario")}${quando}</span>` : ""}${etiqs}`;
    return `<li style="--i:${i % 10}">
      <span class="dia"><b>${String(d.getDate()).padStart(2, "0")}</b><span>${MESES[d.getMonth()]}</span></span>
      <a class="info" href="evento.html?id=${e.id}">${info}</a>
      <a class="ler" href="evento.html?id=${e.id}" aria-label="Abrir ${esc(e.titulo)}">${icone("seta")}</a>
    </li>`;
  }).join("");
  $("#agendaVazio").hidden = todos.length > 0;
  const mais = $("#agendaMais"); mais.hidden = agendaTudo || todos.length <= 10; mais.textContent = todos.length - 10 === 1 ? "Ver mais 1 evento" : `Ver mais ${todos.length - 10} eventos`;
  const filtros = [estado.termo && `“${estado.termo}”`, estado.cat, estado.concelho, estado.tag && "#" + estado.tag].filter(Boolean).join(" · ");
  $("#agendaResultado").textContent = filtros ? `${todos.length} ${todos.length === 1 ? "evento" : "eventos"} para ${filtros}` : `${EVENTOS.length} eventos aprovados nos próximos meses`;
  observarReveal($$("#agendaLista li"));
}
function mostrarTags() {
  const cont = {}; EVENTOS.forEach(e => (e.tags || []).forEach(t => cont[t] = (cont[t] || 0) + 1));
  const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 12);
  $("#agendaTags").innerHTML = top.map(([t, n]) => `<button type="button" data-tag="${esc(t)}">#${esc(t)} <i>${n}</i></button>`).join("");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-tag]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  estado.tag = estado.tag === b.dataset.tag ? "" : b.dataset.tag; agendaTudo = false; noticiasVisiveis = POR_PAGINA; marcarTag(); mostrarAgenda(); irPara("#agenda");
}, true);
$("#agendaMais")?.addEventListener("click", () => { agendaTudo = true; mostrarAgenda(); });
$("#noticiasMais")?.addEventListener("click", () => { noticiasVisiveis += POR_PAGINA; mostrar(); });
function posicaoDe(alvo) {
  if (alvo.id === "inicio") return 0;
  const cabecalho = topo.getBoundingClientRect().bottom - 28; // o topo fixo não deve tapar o título
  return alvo.getBoundingClientRect().top + scrollY - cabecalho;
}
function irPara(id) { const alvo = $(id); if (alvo) scrollTo({ top: posicaoDe(alvo), behavior: reduzir ? "auto" : "smooth" }); }
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const alvo = $(a.getAttribute("href")); if (!alvo) return;
  e.preventDefault(); irPara(a.getAttribute("href"));
});
function marcarCategoria(cat) {
  $$("#chips button").forEach(b => b.classList.toggle("on", b.dataset.f === cat));
  $$("#categorias .categoria").forEach(b => b.classList.toggle("on", b.dataset.f === cat));
}
$("#pesquisa").addEventListener("submit", e => {
  e.preventDefault();
  estado.termo = $("#termo").value.trim();
  estado.concelho = selConcelho.value; agendaTudo = false; noticiasVisiveis = POR_PAGINA;
  mostrar(); irPara("#agenda");
});
$("#termo").addEventListener("input", e => { estado.termo = e.target.value.trim(); mostrar(); });
selConcelho.addEventListener("change", () => { estado.concelho = selConcelho.value; marcarConcelho(); mostrar(); });
$$("#chips button").forEach(b => b.addEventListener("click", () => { estado.cat = b.dataset.f; agendaTudo = false; noticiasVisiveis = POR_PAGINA; marcarCategoria(estado.cat); mostrar(); irPara("#agenda"); }));

// Categorias (cartões)
$("#categorias").innerHTML = CATEGORIAS.map((c, i) => `
  <button type="button" class="categoria${c.f === "" ? " on" : ""}" data-f="${esc(c.f)}" data-reveal style="--i:${i}">
    <span class="icone">${icone(c.i)}</span>${esc(c.n)}
  </button>`).join("");
$$("#categorias .categoria").forEach(b => b.addEventListener("click", () => { estado.cat = b.dataset.f; agendaTudo = false; noticiasVisiveis = POR_PAGINA; marcarCategoria(estado.cat); mostrar(); irPara("#agenda"); }));

// Concelhos (chips)
$("#concelhos").innerHTML = CONCELHOS.map((c, i) => `<button type="button" class="concelho" data-c="${esc(c)}" style="--i:${i}"><i></i>${esc(c)}</button>`).join("");
function marcarConcelho() { $$("#concelhos .concelho").forEach(b => b.classList.toggle("on", b.dataset.c === estado.concelho)); }
$$("#concelhos .concelho").forEach(b => b.addEventListener("click", () => {
  estado.concelho = b.classList.contains("on") ? "" : b.dataset.c;
  selConcelho.value = estado.concelho; agendaTudo = false; noticiasVisiveis = POR_PAGINA; marcarConcelho(); mostrar(); irPara("#agenda");
}));

/* ---------- Destaques (carrossel) ---------- */
const faixa = $("#faixaDestaques");
let DESTAQUES_EXTRA = []; // eventos e artistas que a equipa pôs em destaque (vêm da base de dados)
let destacadas = NOTICIAS.filter(n => n.f).slice(0, 8);
function desenharDestaques() {
destacadas = [...DESTAQUES_EXTRA, ...NOTICIAS.filter(n => n.f)].slice(0, 10);
faixa.innerHTML = destacadas.map(n => `
  <a class="destaque" href="${esc(n.l)}"${n.interno ? "" : ' target="_blank" rel="noopener"'} data-tilt>
    ${imagem(n)}
    <span class="etiqueta${n.selo ? " selo" : ""}">${n.selo ? `<b>★ ${esc(n.selo)}</b> · ` : ""}${esc(n.cat)}</span>
    ${n.d ? `<span class="data">${icone("calendario")}${formatar(n.d)}</span>` : ""}
    <h3>${esc(n.t)}</h3>
    <p>${esc(n.ex)}</p>
    <span class="onde">${icone("pin")}${esc(n.onde)}</span>
    <span class="ler">${icone("seta")}</span>
  </a>`).join("");
$("#destPontos").innerHTML = destacadas.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("");
$$("#destPontos i").forEach((p, i) => p.addEventListener("click", () => faixa.scrollTo({ left: i * passoFaixa(), behavior: "smooth" })));
$$("#faixaDestaques [data-tilt]").forEach(el => typeof ligarTilt === "function" && ligarTilt(el));
}
desenharDestaques();
const pontos = $("#destPontos");
const passoFaixa = () => (faixa.firstElementChild?.offsetWidth || 300) + (parseFloat(getComputedStyle(faixa).columnGap) || 20);
function atualizarPontos() {
  const i = Math.round(faixa.scrollLeft / passoFaixa());
  $$("#destPontos i").forEach((p, j) => p.classList.toggle("on", j === i));
  $("#destAnt").disabled = faixa.scrollLeft < 10;
  $("#destSeg").disabled = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 10;
}
faixa.addEventListener("scroll", atualizarPontos, { passive: true });
$("#destAnt").addEventListener("click", () => faixa.scrollBy({ left: -passoFaixa(), behavior: "smooth" }));
$("#destSeg").addEventListener("click", () => faixa.scrollBy({ left: passoFaixa(), behavior: "smooth" }));
// Arrastar com o rato
let arrasto = null;
faixa.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; arrasto = { x: e.clientX, s: faixa.scrollLeft, moveu: false }; });
addEventListener("pointermove", e => { if (!arrasto) return; const dx = e.clientX - arrasto.x; if (Math.abs(dx) > 4) { arrasto.moveu = true; faixa.classList.add("arrastar"); } faixa.scrollLeft = arrasto.s - dx; });
addEventListener("pointerup", () => { if (arrasto?.moveu) faixa.addEventListener("click", e => e.preventDefault(), { once: true, capture: true }); faixa.classList.remove("arrastar"); arrasto = null; });
// Avanço automático quando visível
let autoDest = null;
new IntersectionObserver(([en]) => {
  clearInterval(autoDest);
  if (en.isIntersecting && !reduzir) autoDest = setInterval(() => {
    if (arrasto || faixa.matches(":hover")) return;
    const fim = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 10;
    fim ? faixa.scrollTo({ left: 0, behavior: "smooth" }) : faixa.scrollBy({ left: passoFaixa(), behavior: "smooth" });
  }, 5000);
}, { threshold: .4 }).observe(faixa);
setTimeout(atualizarPontos, 100);

/* ---------- Telemóvel ilustrativo ---------- */
$("#tmHero").insertAdjacentHTML("afterbegin", `<img src="img/hero-02.jpg" alt="">`);
$("#tmCards").innerHTML = destacadas.slice(0, 2).map(n => `<div class="tm-card"><img src="${n.f}" alt=""><div><span>${formatar(n.d)}</span><b>${esc(n.t.slice(0, 38))}…</b></div></div>`).join("");
const notif = $("#tmNotif");
if (!reduzir) setInterval(() => { notif.classList.add("mostrar"); setTimeout(() => notif.classList.remove("mostrar"), 3200); }, 7000);

/* ---------- Revelar ao rolar ---------- */
const obs = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visivel"); obs.unobserve(en.target); } }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
function observarReveal(els) { els.forEach(el => reduzir ? el.classList.add("visivel") : obs.observe(el)); }
observarReveal($$("[data-reveal], .agenda li, #explorar .caixa, #app .app-in"));
mostrar();

/* ---------- Menu ativo conforme a secção ---------- */
const obsNav = new IntersectionObserver(ens => ens.forEach(en => {
  if (en.isIntersecting) $$("[data-nav]").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
$$("main section[id]").forEach(s => obsNav.observe(s));

/* ---------- Botões magnéticos e cartões com inclinação ---------- */
if (!toque && !reduzir) {
  $$("[data-magnetico]").forEach(b => {
    b.addEventListener("mousemove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener("mouseleave", () => b.style.transform = "");
  });
  document.addEventListener("mousemove", e => {
    const c = e.target.closest("[data-tilt]"); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
  });
  document.addEventListener("mouseout", e => { const c = e.target.closest("[data-tilt]"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; });
  // Paralaxe suave no conteúdo do hero
  const hc = $("#heroConteudo");
  addEventListener("scroll", () => { if (scrollY < innerHeight) hc.style.transform = `translateY(${scrollY * .18}px)`; }, { passive: true });
}

/* ---------- App instalável (PWA) ---------- */
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
const ehIphone = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let pedidoInstalar = null; // evento do Android/Chrome guardado para usar no clique
const folha = $("#folhaIphone");
const toast = $("#toast");
function avisar(msg) { toast.textContent = msg; toast.classList.add("mostrar"); setTimeout(() => toast.classList.remove("mostrar"), 3200); }

addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedidoInstalar = e; });
addEventListener("appinstalled", () => { avisar("App instalada. Procura o ícone no ecrã inicial."); barra.hidden = true; });

async function instalar() {
  if (instalada) return avisar("A app já está instalada neste aparelho.");
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    const { outcome } = await pedidoInstalar.userChoice;
    if (outcome !== "accepted") avisar("Podes instalar quando quiseres, no botão Instalar.");
    pedidoInstalar = null; return;
  }
  if (ehIphone) { folha.hidden = false; return; }
  // Navegador sem instalação automática (ex.: Firefox, ou já instalada noutro perfil)
  folha.hidden = false;
}
$$("[data-instalar]").forEach(b => b.addEventListener("click", instalar));
$$("[data-iphone]").forEach(b => b.addEventListener("click", () => folha.hidden = false));
$("#fecharFolha").addEventListener("click", () => folha.hidden = true);
folha.addEventListener("click", e => { if (e.target === folha) folha.hidden = true; });

// Barra "Instalar" só no telemóvel, se ainda não instalada e não fechada antes
const barra = $("#barraApp");
let fechou = false;
try { fechou = localStorage.getItem("ac-barra") === "1"; } catch (e) {}
if (!instalada && !fechou && innerWidth < 900) { barra.hidden = false; document.body.classList.add("com-barra"); }
$("#fecharBarra").addEventListener("click", () => {
  barra.hidden = true; document.body.classList.remove("com-barra");
  try { localStorage.setItem("ac-barra", "1"); } catch (e) {}
});

$("#ano").textContent = new Date().getFullYear();

// Base de dados (Supabase). A chave abaixo é pública por desenho: só permite inserir submissões pendentes e ler o que foi aprovado.
const ENVIO = { url: "https://otcpgtauymtavygscxfo.supabase.co", chave: "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM", tabela: "submissoes" };
const cabecalhos = { apikey: ENVIO.chave, Authorization: `Bearer ${ENVIO.chave}` };
// Links dos emails do Supabase que chegam à página inicial: convites vão para o painel da equipa; confirmação de conta e recuperação vão para "A minha conta"
if (/access_token=|error_description=/.test(location.hash) && /type=(invite|recovery|magiclink|signup)|error/.test(location.hash)) location.replace((/type=invite/.test(location.hash) ? "admin.html" : "conta.html") + location.hash);

/* ---------- Agenda e artistas vindos da base de dados (eventos aprovados) ---------- */
(async () => {
  const hoje = new Date().toISOString().slice(0, 10);
  let falhou = false; // distingue "sem dados" de "a base de dados não respondeu"
  const ler = async (vista, q) => { try { const r = await fetch(`${ENVIO.url}/rest/v1/${vista}?${q}`, { headers: cabecalhos }); if (!r.ok) { falhou = true; return []; } return await r.json(); } catch { falhou = true; return []; } };
  // os quatro pedidos partem ao mesmo tempo (antes eram um a seguir ao outro)
  const [eventos, noticias, parceiros, artistas] = await Promise.all([
    ler("eventos_publicos", `select=*&proxima_data=gte.${hoje}&order=proxima_data.asc,hora.asc&limit=300`),
    ler("noticias", "select=id,slug,titulo,resumo,imagem,categoria,concelho,data&publicado=is.true&order=data.desc,id.desc&limit=60"),
    ler("parceiros", "select=*&ativo=is.true&order=ordem.asc,nome.asc&limit=40"),
    ler("artistas_publicos", "select=*&order=criado_em.desc&limit=200")
  ]);
  // Destaques pagos/escolhidos pela equipa: eventos e artistas com "destaque_ate" no futuro aparecem primeiro no carrossel
  const resumo = t => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > 150 ? t.slice(0, 147) + "…" : t; };
  DESTAQUES_EXTRA = [
    ...eventos.filter(e => e.destaque_ate && e.destaque_ate >= hoje && e.imagem).map(e => ({ t: e.titulo.replace(/\s+/g, " "), d: e.proxima_data || e.data, cat: e.categoria || "Evento", onde: e.concelho || "", f: e.imagem, ex: resumo(e.descricao), l: `evento.html?id=${e.id}`, interno: true, selo: "Evento" })),
    ...artistas.filter(a => a.destaque_ate && a.destaque_ate >= hoje && a.imagem).map(a => ({ t: a.titulo, d: "", cat: a.categoria || "Artista", onde: a.concelho || "", f: a.imagem, ex: resumo(a.descricao), l: `artista.html?id=${a.id}`, interno: true, selo: "Artista" }))
  ];
  // Banners de anunciantes (parceiros do tipo "banner"); os restantes são logótipos
  const banners = parceiros.filter(p => p.tipo === "banner" && p.imagem), logos = parceiros.filter(p => p.tipo !== "banner");
  const bp = $("#bannerPub");
  if (bp && banners.length) {
    bp.innerHTML = `<span class="banner-rotulo">Publicidade</span>` + banners.map((b, i) => `<a class="banner${i === 0 ? " ativo" : ""}" href="${esc(b.link || "empresas.html")}" ${b.link ? 'target="_blank" rel="noopener sponsored"' : ""}><img src="${esc(b.imagem)}" alt="${esc(b.nome)}" loading="lazy"></a>`).join("");
    bp.hidden = false;
    if (banners.length > 1 && !reduzir) { let k = 0; setInterval(() => { const bs = bp.querySelectorAll(".banner"); bs[k].classList.remove("ativo"); k = (k + 1) % bs.length; bs[k].classList.add("ativo"); }, 6000); }
  }
  EVENTOS = eventos;
  if (!EVENTOS.length) {
    const vz = $("#agendaVazio");
    vz.innerHTML = falhou ? `Não foi possível carregar a agenda agora. Verifica a ligação à internet e <button type="button" class="ligacao" onclick="location.reload()">tenta de novo</button>.`
      : `Ainda não há eventos aprovados para os próximos dias. <a href="publicar.html">Divulga o teu evento</a>.`;
    vz.hidden = false; $("#agendaResultado").textContent = "";
    const it = ["Agenda cultural do distrito de Aveiro", "Divulga o teu evento ou o teu trabalho artístico", "Concertos, teatro, exposições, mercados e muito mais"];
    $("#ticker").innerHTML = [...it, ...it].map(t => `<span>${esc(t)}</span>`).join("");
  }
  // botão "Ver os próximos eventos do Aveiro Cult": só aparece quando há eventos com a etiqueta #aveirocult
  const btnAC = $("#verEventosAC"); if (btnAC) btnAC.hidden = !EVENTOS.some(e => (e.tags || []).includes("aveirocult"));
  if (EVENTOS.length) {
    mostrarTags(); mostrarAgenda();
    const it = EVENTOS.slice(0, 12).map(e => { const d = new Date((e.proxima_data || e.data) + "T12:00:00"); return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} · ${e.titulo}${e.concelho ? " · " + e.concelho : ""}`; });
    $("#ticker").innerHTML = [...it, ...it].map(t => `<span>${esc(t)}</span>`).join("");
  }
  if (noticias.length) {
    NOTICIAS.length = 0;
    noticias.forEach(n => NOTICIAS.push({ t: n.titulo, d: n.data, cat: n.categoria || "", onde: n.concelho || "", f: n.imagem || "", ex: n.resumo || "", l: `noticia.html?n=${encodeURIComponent(n.slug || n.id)}`, interno: true }));
    mostrar();
  }
  if (noticias.length || DESTAQUES_EXTRA.length) { desenharDestaques(); setTimeout(atualizarPontos, 100); }
  const lp = $("#parceirosLista");
  if (lp) {
    lp.innerHTML = logos.length ? logos.map(p => `<a class="parceiro" href="${esc(p.link || "#")}" target="_blank" rel="noopener" title="${esc(p.nome)}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:this.alt}))">` : `<span>${esc(p.nome)}</span>`}</a>`).join("")
      : `<p class="parceiros-vazio">Sê a primeira empresa a apoiar a cultura do distrito.</p>`;
  }
  const sec = $("#artistas");
  if (sec && artistas.length) {
    $("#artistasLista").innerHTML = [...artistas.filter(a => a.destaque_ate && a.destaque_ate >= hoje), ...artistas.filter(a => !(a.destaque_ate && a.destaque_ate >= hoje))].slice(0, 12).map((a, i) => `<article class="artista" data-reveal style="--i:${i}">
      <a class="artista-img" href="artista.html?id=${a.id}" aria-label="${esc(a.titulo)}"><span>${icone("mic")}</span>${a.imagem ? `<img src="${esc(a.imagem)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</a>
      <div class="artista-info">
        <span class="artista-area">${esc(a.categoria || "")}${a.concelho ? " · " + esc(a.concelho) : ""}</span>
        <h3><a href="artista.html?id=${a.id}">${esc(a.titulo)}</a></h3>
        <p>${esc((a.descricao || "").slice(0, 160))}${(a.descricao || "").length > 160 ? "…" : ""}</p>
        <div class="artista-links">${a.site ? `<a href="${esc(a.site)}" target="_blank" rel="noopener">Site</a>` : ""}${a.rede ? `<a href="${esc(a.rede)}" target="_blank" rel="noopener">Redes</a>` : ""}</div>
      </div>
    </article>`).join("");
    sec.hidden = false; observarReveal($$("#artistasLista [data-reveal]"));
  }
})();

/* ---------- Botão "A minha conta" no topo: mostra o primeiro nome quando há sessão ---------- */
(() => {
  const bc = $("#btnConta");
  if (bc && typeof Sessao !== "undefined") Sessao.obter().then(s => { if (s) { bc.classList.add("ligado"); bc.querySelector("span").textContent = (s.nome || "A minha conta").split(" ")[0]; } }).catch(() => { });
})();

/* ---------- Abertura: o logótipo surge, o vento leva-o como folha e a página vira ---------- */
(() => {
  const ab = $("#abertura"), pag = $("#aberturaPagina"), logo = $("#aberturaLogo"), folha = $("#aberturaFolha"), c = $("#aberturaVento");
  let vivo = true;
  const saltar = $("#aberturaSaltar");
  const terminar = () => { vivo = false; document.body.classList.add("revelado"); document.body.classList.remove("sem-rolar"); ab.remove(); };
  // Quem chega por um link para uma secção (ex.: "Agenda" noutra página → ./#agenda) vai direto, sem abertura
  if (reduzir || alvoDoLink()) { terminar(); return; }
  document.body.classList.add("sem-rolar");
  requestAnimationFrame(() => ab.classList.add("pronta"));

  // Folhas em canvas (vento cresce com `forca`)
  const ctx = c.getContext("2d"), CORES = ["#ffde04", "#002fa3", "#f5c800", "#2a2a36", "#3f62b9", "#ffe94d", "#00237a"];
  let W = c.width = c.clientWidth, H = c.height = c.clientHeight, forca = 0, t = 0;
  const nova = (f = {}, inicio = false) => Object.assign(f, { x: inicio ? Math.random() * W : -40 - Math.random() * W * .3, y: inicio ? Math.random() * H : H * (.15 + Math.random() * .85), s: 5 + Math.random() * 11, cor: CORES[Math.random() * CORES.length | 0], rot: Math.random() * 6.3, vr: (Math.random() - .5) * .1, fase: Math.random() * 6.3, vel: .5 + Math.random() * .9, alfa: .6 + Math.random() * .4 });
  const folhas = Array.from({ length: innerWidth < 700 ? 30 : 60 }, () => nova({}, true));
  (function passo() {
    if (!vivo) return;
    t += .016;
    const rajada = .25 + forca * 26 * (1 + .3 * Math.sin(t * 2.1));
    ctx.clearRect(0, 0, W, H);
    for (const f of folhas) {
      f.x += f.vel * rajada; f.y += Math.sin(t * 1.4 + f.fase) * .5 - forca * f.vel * 5; f.rot += f.vr + forca * .14;
      if (f.x > W + 60 || f.y < -60) nova(f);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = f.alfa * (.25 + .75 * Math.min(1, forca * 2.5)); ctx.fillStyle = f.cor;
      ctx.beginPath(); ctx.moveTo(0, -f.s); ctx.quadraticCurveTo(f.s * .95, -f.s * .25, 0, f.s); ctx.quadraticCurveTo(-f.s * .95, -f.s * .25, 0, -f.s); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -f.s * .8); ctx.lineTo(0, f.s * .8); ctx.stroke(); ctx.restore();
    }
    requestAnimationFrame(passo);
  })();

  const curva = t => t * t * (3 - 2 * t);
  const inicio = performance.now();
  // Guião (em ms): 0–900 logótipo entra · 900–1500 vento cresce e o logótipo estremece · 1500–2700 vira folha e voa · 2300–3500 a página vira · 3500 fim
  const ETAPAS = { entrada: [0, 900], vento: [900, 1600], folha: [1500, 2700], virar: [2300, 3500] };
  const fase = (nome, agora) => Math.min(1, Math.max(0, (agora - ETAPAS[nome][0]) / (ETAPAS[nome][1] - ETAPAS[nome][0])));
  let saltado = false;
  function quadro(agora) {
    const ms = saltado ? 9999 : agora - inicio;
    const e = curva(fase("entrada", ms)), v = fase("vento", ms), fo = fase("folha", ms), vi = curva(fase("virar", ms));
    forca = Math.max(v, fo > 0 ? 1 : 0) * (1 - vi * .7);
    // 1) entrada do logótipo
    const tremor = v > 0 && fo === 0 ? Math.sin(ms / 38) * 2.2 * v : 0;
    const enc = curva(Math.min(1, fo / .35)); // 2) encolhe e roda enquanto a folha nasce
    logo.style.opacity = String(e * (1 - enc));
    logo.style.transform = `scale(${(.82 + .18 * e) * (1 - enc * .6)}) rotate(${(tremor + enc * -28).toFixed(2)}deg) translate(${enc * 40}px, ${-enc * 18}px)`;
    // 3) a folha voa em arco até sair pelo canto superior direito
    if (fo > 0 && fo < 1) {
      const r = logo.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
      const x1 = W * 1.2, y1 = -H * .3, cx = W * .55, cy = H * .25, tt = curva(fo), u = 1 - tt;
      const x = u * u * x0 + 2 * u * tt * cx + tt * tt * x1, y = u * u * y0 + 2 * u * tt * cy + tt * tt * y1 + Math.sin(tt * Math.PI * 3) * 34;
      folha.style.transform = `translate(${(x - 36).toFixed(1)}px, ${(y - 36).toFixed(1)}px) rotate(${(tt * 1000).toFixed(1)}deg) scale(${(.4 + Math.sin(tt * Math.PI) * 1.4 + tt * .2).toFixed(3)})`;
      folha.style.opacity = "1";
    } else folha.style.opacity = "0";
    // 4) a página vira sobre a lombada e revela o site
    pag.style.transform = `rotateY(${(-vi * 180).toFixed(2)}deg) rotateX(${(-Math.sin(vi * Math.PI) * 4).toFixed(2)}deg)`;
    pag.style.setProperty("--dobra", Math.sin(vi * Math.PI).toFixed(3));
    if (vi > 0) { document.body.classList.add("revelado"); c.style.opacity = String(1 - vi * vi); saltar.style.opacity = "0"; }
    if (ms >= ETAPAS.virar[1]) { vivo = false; terminar(); return; }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  saltar.addEventListener("click", () => { saltado = true; });
  setTimeout(() => { if (vivo) terminar(); }, ETAPAS.virar[1] + 400); // garantia: termina mesmo que o separador esteja em segundo plano
  addEventListener("resize", () => { W = c.width = c.clientWidth; H = c.height = c.clientHeight; }, { once: true });
})();

/* ---------- Chegar a uma secção por link (ex.: outra página → ./#agenda) ----------
   A agenda, os artistas e as imagens carregam depois de a página abrir e empurram as secções para baixo,
   por isso o navegador deixava a pessoa a meio de outra secção. Durante uns segundos voltamos a alinhar
   a secção sempre que a página cresce, e paramos logo que a pessoa role ou toque em alguma coisa. */
function alvoDoLink() {
  const id = decodeURIComponent(location.hash.slice(1));
  return id && !/[=&]/.test(id) ? document.getElementById(id) : null;
}
(() => {
  const alvo = alvoDoLink();
  if (!alvo || !("ResizeObserver" in window)) return;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  let ativo = true;
  const alinhar = () => { if (ativo) scrollTo({ top: alvo.getBoundingClientRect().top + scrollY, behavior: "instant" }); }; // "instant": sem a animação suave do CSS
  const ro = new ResizeObserver(alinhar);
  const parar = () => { ativo = false; ro.disconnect(); };
  ro.observe(document.body);
  for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) addEventListener(ev, parar, { once: true, passive: true });
  setTimeout(parar, 6000);
  alinhar();
})();

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
  ? `<img src="${n.f}" alt="${esc(n.t)}" loading="lazy" decoding="async" ${extra}>`
  : `<div class="sem" data-cat="${esc(n.cat)}">${icone("calendario")}</div>`;

/* ---------- Abertura ---------- */
(() => {
  const ab = $("#abertura");
  let visto = false;
  try { visto = sessionStorage.getItem("ac-visto") === "1"; sessionStorage.setItem("ac-visto", "1"); } catch (e) {}
  const fechar = () => { ab.classList.add("sair"); document.body.classList.remove("sem-rolar"); };
  if (visto || reduzir) { ab.style.transition = "none"; fechar(); return; }
  document.body.classList.add("sem-rolar");
  setTimeout(fechar, 1300);
})();

/* ---------- Livro: a capa vira com a rolagem ---------- */
const hero = $("#inicio"), pagina = $("#pagina"), pagina2 = $("#pagina2");
const livroAtivo = !reduzir;
if (livroAtivo) document.body.classList.add("livro");
function virarPagina() {
  if (!livroAtivo) return;
  const h = hero.offsetHeight || innerHeight;
  const p = Math.min(1, Math.max(0, scrollY / h));
  const ang = p * 180, s = Math.sin(p * Math.PI);
  // A página roda sobre a lombada (lado esquerdo) e levanta ligeiramente a meio
  pagina.style.transform = `rotateY(${-ang}deg) rotateX(${-s * 3}deg)`;
  pagina.style.setProperty("--s", (s * .9).toFixed(3));
  pagina2.style.setProperty("--sp", (s * .85).toFixed(3));
  hero.style.visibility = p >= 1 ? "hidden" : "";
  return p;
}

/* ---------- Barra de progresso e topo ---------- */
const topo = $("#topo");
const progresso = $("#progresso");
let ultimoY = 0;
function aoRolar() {
  const y = scrollY;
  const total = document.documentElement.scrollHeight - innerHeight;
  progresso.style.transform = `scaleX(${total ? y / total : 0})`;
  const p = virarPagina();
  topo.classList.toggle("rolado", livroAtivo ? p > .3 : y > 40);
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
let pal = 0;
if (!reduzir) setInterval(() => {
  const antiga = roda.querySelector("span");
  pal = (pal + 1) % PALAVRAS.length;
  const nova = document.createElement("span");
  nova.textContent = PALAVRAS[pal]; nova.className = "entra";
  antiga.className = "sai";
  roda.appendChild(nova);
  setTimeout(() => antiga.remove(), 700);
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
const estado = { termo: "", cat: "", concelho: "" };
const lista = $("#lista"), vazio = $("#vazio"), resultado = $("#resultado");
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
  const itens = filtrar();
  lista.innerHTML = itens.map((n, i) => `
    <a class="noticia" href="${n.l}" target="_blank" rel="noopener" style="--i:${i % 6}">
      <div class="img">${imagem(n)}</div>
      <div class="meta"><span>${formatar(n.d)}</span><span class="cat">${esc(n.cat)}</span></div>
      <h3>${realcar(n.t)}</h3>
      <p>${realcar(n.ex)}</p>
      <span class="ler">Ler no site ${icone("seta")}</span>
    </a>`).join("");
  vazio.hidden = itens.length > 0;
  const filtros = [estado.termo && `“${estado.termo}”`, estado.cat, estado.concelho].filter(Boolean).join(" · ");
  resultado.textContent = filtros ? `${itens.length} ${itens.length === 1 ? "resultado" : "resultados"} para ${filtros}` : `${NOTICIAS.length} notícias`;
  observarReveal($$("#lista .noticia"));
}
function posicaoDe(alvo) {
  if (alvo.id === "inicio") return 0;
  const cabecalho = topo.getBoundingClientRect().bottom - 28; // o topo fixo não deve tapar o título
  if (livroAtivo && pagina2.contains(alvo)) return hero.offsetHeight + alvo.getBoundingClientRect().top - pagina2.getBoundingClientRect().top - cabecalho;
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
  estado.concelho = selConcelho.value;
  mostrar(); irPara("#noticias");
});
$("#termo").addEventListener("input", e => { estado.termo = e.target.value.trim(); mostrar(); });
selConcelho.addEventListener("change", () => { estado.concelho = selConcelho.value; marcarConcelho(); mostrar(); });
$$("#chips button").forEach(b => b.addEventListener("click", () => { estado.cat = b.dataset.f; marcarCategoria(estado.cat); mostrar(); irPara("#noticias"); }));

// Categorias (cartões)
$("#categorias").innerHTML = CATEGORIAS.map((c, i) => `
  <button type="button" class="categoria${c.f === "" ? " on" : ""}" data-f="${esc(c.f)}" data-reveal style="--i:${i}">
    <span class="icone">${icone(c.i)}</span>${esc(c.n)}
  </button>`).join("");
$$("#categorias .categoria").forEach(b => b.addEventListener("click", () => { estado.cat = b.dataset.f; marcarCategoria(estado.cat); mostrar(); irPara("#noticias"); }));

// Concelhos (chips)
$("#concelhos").innerHTML = CONCELHOS.map((c, i) => `<button type="button" class="concelho" data-c="${esc(c)}" style="--i:${i}"><i></i>${esc(c)}</button>`).join("");
function marcarConcelho() { $$("#concelhos .concelho").forEach(b => b.classList.toggle("on", b.dataset.c === estado.concelho)); }
$$("#concelhos .concelho").forEach(b => b.addEventListener("click", () => {
  estado.concelho = b.classList.contains("on") ? "" : b.dataset.c;
  selConcelho.value = estado.concelho; marcarConcelho(); mostrar(); irPara("#noticias");
}));

/* ---------- Destaques (carrossel) ---------- */
const faixa = $("#faixaDestaques");
const destacadas = NOTICIAS.filter(n => n.f).slice(0, 8);
faixa.innerHTML = destacadas.map(n => `
  <a class="destaque" href="${n.l}" target="_blank" rel="noopener" data-tilt>
    ${imagem(n)}
    <span class="etiqueta">${esc(n.cat)}</span>
    <span class="data">${icone("calendario")}${formatar(n.d)}</span>
    <h3>${esc(n.t)}</h3>
    <p>${esc(n.ex)}</p>
    <span class="onde">${icone("pin")}${esc(n.onde)}</span>
    <span class="ler">${icone("seta")}</span>
  </a>`).join("");
const pontos = $("#destPontos");
pontos.innerHTML = destacadas.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("");
const passoFaixa = () => (faixa.firstElementChild?.offsetWidth || 300) + 20;
function atualizarPontos() {
  const i = Math.round(faixa.scrollLeft / passoFaixa());
  $$("#destPontos i").forEach((p, j) => p.classList.toggle("on", j === i));
  $("#destAnt").disabled = faixa.scrollLeft < 10;
  $("#destSeg").disabled = faixa.scrollLeft + faixa.clientWidth >= faixa.scrollWidth - 10;
}
faixa.addEventListener("scroll", atualizarPontos, { passive: true });
$("#destAnt").addEventListener("click", () => faixa.scrollBy({ left: -passoFaixa(), behavior: "smooth" }));
$("#destSeg").addEventListener("click", () => faixa.scrollBy({ left: passoFaixa(), behavior: "smooth" }));
$$("#destPontos i").forEach((p, i) => p.addEventListener("click", () => faixa.scrollTo({ left: i * passoFaixa(), behavior: "smooth" })));
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

/* ---------- Agenda ---------- */
$("#agendaLista").innerHTML = AGENDA.map((a, i) => {
  const n = NOTICIAS[a.i];
  return `<li style="--i:${i}">
    <span class="dia"><b>${esc(a.dia)}</b><span>${esc(a.mes)}</span></span>
    <a class="info" href="${n.l}" target="_blank" rel="noopener"><b>${esc(a.t)}</b><span>${icone("pin")}${esc(a.onde)}</span></a>
    <a class="ler" href="${n.l}" target="_blank" rel="noopener" aria-label="Abrir ${esc(a.t)}">${icone("seta")}</a>
  </li>`;
}).join("");

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
  if (!livroAtivo) addEventListener("scroll", () => { if (scrollY < innerHeight) hc.style.transform = `translateY(${scrollY * .18}px)`; }, { passive: true });
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

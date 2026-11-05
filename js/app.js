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
  ? `<img src="${n.f.replace(".jpg", "-800.jpg")}" srcset="${n.f.replace(".jpg", "-800.jpg")} 800w, ${n.f} 1600w" sizes="(max-width: 640px) 92vw, 420px" alt="${esc(n.t)}" loading="lazy" decoding="async" ${extra}>`
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

/* ---------- Divulgar: envio de eventos e artistas ---------- */
// Quando o backend estiver ligado (Supabase), preencher estes dois valores.
// Sem backend, os envios ficam guardados neste navegador (localStorage "ac-envios") e a mensagem de sucesso aparece na mesma.
const ENVIO = { url: "", chave: "", tabela: "submissoes" };
(() => {
  const form = $("#formDivulgar"); if (!form) return;
  const seg = form.querySelector(".segmento"), grupos = [...form.querySelectorAll("[data-grupo]")], erro = $("#formErro"), ok = $("#formOk");
  let tipo = "evento";
  const selCat = form.querySelector('select[name="categoria"]');
  CATEGORIAS.filter(c => c.f).forEach(c => selCat.insertAdjacentHTML("beforeend", `<option>${esc(c.f)}</option>`));
  ["concelho", "concelho_artista"].forEach(n => { const s = form.querySelector(`select[name="${n}"]`); CONCELHOS.forEach(c => s.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`)); });
  const hoje = new Date().toISOString().slice(0, 10); form.querySelector('input[name="data"]').min = hoje;

  function mudarTipo(novo) {
    tipo = novo; seg.dataset.on = novo;
    [...seg.querySelectorAll("button")].forEach(b => { const on = b.dataset.tipo === novo; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    grupos.forEach(g => {
      const ativo = g.dataset.grupo === novo; g.hidden = !ativo;
      // os campos obrigatórios só contam no grupo visível
      [...g.querySelectorAll("[name]")].forEach(el => { const ob = el.closest("label")?.querySelector("span")?.textContent.includes("*"); el.required = !!(ativo && ob); el.disabled = !ativo; });
    });
    erro.hidden = true; form.classList.remove("validar");
  }
  [...seg.querySelectorAll("button")].forEach(b => b.addEventListener("click", () => mudarTipo(b.dataset.tipo)));
  mudarTipo("evento");

  async function imagemBase64(f) {
    if (!f || !f.size) return null;
    if (f.size > 5 * 1024 * 1024) throw new Error("A imagem tem mais de 5 MB. Escolhe uma mais leve.");
    const img = await createImageBitmap(f); const esc_ = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * esc_); c.height = Math.round(img.height * esc_);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .82);
  }

  form.addEventListener("submit", async e => {
    e.preventDefault(); form.classList.add("validar");
    if (!form.checkValidity()) { erro.textContent = "Falta preencher alguns campos obrigatórios (marcados com *)."; erro.hidden = false; form.querySelector(":invalid")?.focus(); return; }
    const btn = form.querySelector('[type="submit"]'); btn.disabled = true; btn.style.opacity = .7;
    try {
      const fd = new FormData(form), dados = { tipo, criado_em: new Date().toISOString(), estado: "pendente" };
      fd.forEach((v, k) => { if (k !== "imagem" && k !== "consent") dados[k] = String(v).trim(); });
      dados.imagem = await imagemBase64(fd.get("imagem"));
      if (ENVIO.url && ENVIO.chave) {
        const r = await fetch(`${ENVIO.url}/rest/v1/${ENVIO.tabela}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ENVIO.chave, Authorization: `Bearer ${ENVIO.chave}`, Prefer: "return=minimal" }, body: JSON.stringify(dados) });
        if (!r.ok) throw new Error("Não foi possível enviar agora. Tenta outra vez daqui a pouco.");
      } else {
        const fila = JSON.parse(localStorage.getItem("ac-envios") || "[]"); fila.push(dados); localStorage.setItem("ac-envios", JSON.stringify(fila.slice(-20)));
      }
      $("#formOkTexto").textContent = tipo === "evento" ? "O teu evento vai ser revisto e, assim que for aprovado, aparece na agenda do site e da app." : "O teu portfólio vai ser revisto e, assim que for aprovado, aparece na secção de artistas do site e da app.";
      form.hidden = true; ok.hidden = false; ok.scrollIntoView({ behavior: "smooth", block: "center" });
      avisar("Enviado com sucesso");
    } catch (err) { erro.textContent = err.message || "Algo correu mal. Tenta outra vez."; erro.hidden = false; }
    btn.disabled = false; btn.style.opacity = "";
  });
  $("#formOutro").addEventListener("click", () => { form.reset(); form.classList.remove("validar"); ok.hidden = true; form.hidden = false; mudarTipo("evento"); form.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();

/* ---------- Abertura: o logótipo surge, o vento leva-o como folha e a página vira ---------- */
(() => {
  const ab = $("#abertura"), pag = $("#aberturaPagina"), logo = $("#aberturaLogo"), folha = $("#aberturaFolha"), c = $("#aberturaVento");
  let vivo = true;
  const saltar = $("#aberturaSaltar");
  const terminar = () => { vivo = false; document.body.classList.add("revelado"); document.body.classList.remove("sem-rolar"); ab.remove(); };
  if (reduzir) { terminar(); return; }
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

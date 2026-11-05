// Datas no formato "QUI · 29 OUT"
const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const formatar = iso => { const d = new Date(iso + "T12:00:00"); return `${DIAS[d.getDay()]} · ${d.getDate()} ${MESES[d.getMonth()]}`; };

// Destaques (notícias com imagem) e lista (todas, com filtro)
const destaques = document.getElementById("destaques");
destaques.innerHTML = NOTICIAS.filter(n => n.img).slice(0, 4).map(n => `
  <a class="card" href="${n.l}">
    <div class="img" style="background-image:url('${n.img}')"></div>
    <div class="data">${formatar(n.d)}</div><h4>${n.t}</h4>
  </a>`).join("");

const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
function mostrar(filtro = "") {
  const f = filtro.toLowerCase();
  const itens = NOTICIAS.filter(n => (n.t + " " + n.ex).toLowerCase().includes(f));
  lista.innerHTML = itens.map(n => `<li><a href="${n.l}"><span class="data">${formatar(n.d)}</span><b>${n.t}</b><p>${n.ex}</p></a></li>`).join("");
  vazio.hidden = itens.length > 0;
}
mostrar();

document.getElementById("busca").addEventListener("submit", e => {
  e.preventDefault();
  mostrar(document.getElementById("termo").value.trim());
  document.getElementById("noticias").scrollIntoView();
});
document.querySelectorAll("#chips button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#chips button").forEach(x => x.classList.remove("on"));
  b.classList.add("on");
  mostrar(b.dataset.f);
  document.getElementById("noticias").scrollIntoView();
}));

document.getElementById("concelhos").innerHTML = CONCELHOS.map(c => `<a>${c}</a>`).join("");

// ===== App instalável (PWA) =====
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

const ehIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
let pedidoInstalar = null; // evento do Android/Chrome guardado para usar no clique

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedidoInstalar = e; });

const folha = document.getElementById("folhaIphone");
async function instalar() {
  if (pedidoInstalar) { pedidoInstalar.prompt(); await pedidoInstalar.userChoice; pedidoInstalar = null; return; }
  folha.hidden = false; // iPhone ou navegador sem instalação automática: mostra os passos
}
document.querySelectorAll("[data-instalar]").forEach(b => b.addEventListener("click", instalar));
document.querySelectorAll("[data-iphone]").forEach(b => b.addEventListener("click", () => folha.hidden = false));
document.getElementById("fecharFolha").addEventListener("click", () => folha.hidden = true);

// Barra "Instalar" só no telemóvel, se ainda não instalada e não fechada antes
const barra = document.getElementById("barraApp");
let fechou = false;
try { fechou = localStorage.getItem("ac-barra") === "1"; } catch (e) {}
if (!instalada && !fechou && innerWidth < 900) barra.hidden = false;
document.getElementById("fecharBarra").addEventListener("click", () => {
  barra.hidden = true;
  try { localStorage.setItem("ac-barra", "1"); } catch (e) {}
});

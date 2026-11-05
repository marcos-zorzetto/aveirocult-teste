/* Google Analytics 4 com consentimento (RGPD).
   Para ativar: coloca o ID de medição da propriedade (formato G-XXXXXXXXXX) em GA_ID.
   Enquanto GA_ID estiver vazio, nada é carregado e o aviso de cookies não aparece. */
const GA_ID = "";
(function () {
  if (!GA_ID || location.hostname === "localhost") return;
  const CHAVE = "ac-cookies";
  let escolha = null;
  try { escolha = localStorage.getItem(CHAVE); } catch (e) {}

  function ligar() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
    const s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }
  function guardar(v) { try { localStorage.setItem(CHAVE, v); } catch (e) {} }

  if (escolha === "sim") return ligar();
  if (escolha === "nao") return;

  const aviso = document.createElement("div");
  aviso.className = "cookies"; aviso.setAttribute("role", "dialog"); aviso.setAttribute("aria-label", "Cookies");
  aviso.innerHTML = '<p>Usamos cookies do Google Analytics só para perceber que páginas são mais vistas. Podes recusar sem perder nada. <a href="privacidade.html#cookies">Saber mais</a></p>'
    + '<div><button type="button" class="btn btn-contorno" data-cookies="nao">Recusar</button><button type="button" class="btn btn-primario" data-cookies="sim">Aceitar</button></div>';
  aviso.addEventListener("click", e => {
    const b = e.target.closest("[data-cookies]"); if (!b) return;
    guardar(b.dataset.cookies); aviso.remove();
    if (b.dataset.cookies === "sim") ligar();
  });
  const mostrar = () => document.body.appendChild(aviso);
  document.body ? mostrar() : document.addEventListener("DOMContentLoaded", mostrar);
})();

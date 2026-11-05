/* Enquadramento inteligente das imagens.
   Cartazes ao alto, logótipos quadrados e fotos ao baixo chegam todos ao mesmo tipo de caixa.
   Quando a proporção da imagem foge muito à da caixa, a imagem passa a aparecer inteira (contain)
   sobre um fundo desfocado feito com a própria imagem, em vez de ser cortada. */
(function () {
  const CAIXAS = ".artista-img, .noticia .img, .pg-figura"; // os destaques ficam sempre em "cover": o cartão é ao alto e o texto sobrepõe a imagem
  function ajustar(img) {
    const caixa = img.closest(CAIXAS); if (!caixa || !img.naturalWidth) return;
    const ri = img.naturalWidth / img.naturalHeight;
    if (caixa.classList.contains("pg-retrato") && Math.abs(ri - 1) > .2) caixa.classList.remove("pg-retrato"); // retrato redondo só para imagens quadradas
    const rc = caixa.clientWidth / caixa.clientHeight;
    if (!rc) return;
    const desvio = Math.abs(ri - rc) / rc;
    if (desvio > .15) { caixa.classList.add("contem"); caixa.style.setProperty("--fundo", `url("${img.currentSrc || img.src}")`); }
  }
  document.addEventListener("load", e => { if (e.target.tagName === "IMG") ajustar(e.target); }, true);
  const prontas = () => document.querySelectorAll(`${CAIXAS.split(", ").map(c => c + " img").join(", ")}`).forEach(i => i.complete && ajustar(i));
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", prontas) : prontas();
})();

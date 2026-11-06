/* Segurança das sessões · Aveiro Cult
   - A sessão (cliente "ac-conta" e moderação "ac-mod") vive em sessionStorage: fechar o navegador ou a app termina-a.
   - Ao fim de 7 minutos sem atividade (toque, tecla, rato, scroll) a sessão termina: os tokens são revogados no
     Supabase, a sessão é apagada e a página recarrega já sem conta. Ao minuto 6 aparece um aviso.
   Carregar antes de sessao.js / admin.js, para uma sessão expirada ser apagada antes de alguém a ler. */
(() => {
  const LIMITE = 7 * 60 * 1000, AVISO = 6 * 60 * 1000;
  const CHAVES = ["ac-conta", "ac-mod"], MARCA = "ac-ativo", SAIU = "ac-saiu";
  const BD = { url: "https://otcpgtauymtavygscxfo.supabase.co", chave: "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM" };
  const ler = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const por = (k, v) => { try { sessionStorage.setItem(k, v); } catch { } };
  const tirar = k => { try { sessionStorage.removeItem(k); } catch { } };

  // Versões antigas guardavam a sessão do cliente em localStorage (ficava aberta para sempre): apagar
  try { localStorage.removeItem("ac-conta"); } catch { }

  const temSessao = () => CHAVES.some(k => ler(k));
  const ultima = () => +ler(MARCA) || 0;
  let escrita = 0, aviso = null;

  function marcar() { escrita = Date.now(); por(MARCA, String(escrita)); esconderAviso(); }

  function terminar() {
    const tokens = CHAVES.map(k => { try { return JSON.parse(ler(k))?.access_token; } catch { return null; } }).filter(Boolean);
    [...new Set(tokens)].forEach(t => fetch(`${BD.url}/auth/v1/logout`, { method: "POST", keepalive: true, headers: { apikey: BD.chave, Authorization: `Bearer ${t}` } }).catch(() => { }));
    CHAVES.forEach(tirar); tirar(MARCA); por(SAIU, "1");
  }

  // Devolve true se a sessão acabou de ser terminada
  function verificar(recarregar) {
    if (!temSessao()) return false;
    const u = ultima();
    if (!u) { marcar(); return false; } // sessão criada nesta página (login, link do email)
    const parado = Date.now() - u;
    if (parado >= LIMITE) { terminar(); if (recarregar) location.reload(); return true; }
    if (parado >= AVISO) mostrarAviso(LIMITE - parado);
    return false;
  }

  // Ao abrir a página: sessão parada há 7 min ou mais (ex.: separador restaurado) já não chega a ser usada
  verificar(false);

  function atividade() {
    if (verificar(true)) return;
    if (Date.now() - escrita > 10000 || aviso) marcar(); // grava no máximo a cada 10 s
  }
  ["pointerdown", "keydown", "wheel", "touchstart", "mousemove", "input"].forEach(ev => addEventListener(ev, atividade, { capture: true, passive: true }));
  // Ao voltar ao separador (telemóvel bloqueado, outra app) verifica antes de aceitar o primeiro toque
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verificar(true); });
  addEventListener("pageshow", e => { if (e.persisted) verificar(true); });
  setInterval(() => verificar(true), 15000);

  // ---------- Avisos ----------
  function estilo() {
    if (document.getElementById("ac-sessao-css")) return;
    const s = document.createElement("style"); s.id = "ac-sessao-css";
    s.textContent = `.ac-sessao{position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;width:min(560px,calc(100% - 32px));display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:16px;background:#111;color:#fff;font:500 14.5px/1.45 Inter,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.28)}
.ac-sessao p{margin:0;flex:1}.ac-sessao button{flex:none;border:0;border-radius:999px;padding:9px 16px;font:600 14px Inter,system-ui,sans-serif;background:#ffd400;color:#111;cursor:pointer}
.ac-sessao button.x{background:transparent;color:#fff;padding:6px 8px;font-size:20px;line-height:1}`;
    document.head.appendChild(s);
  }
  function caixa(html) { estilo(); const d = document.createElement("div"); d.className = "ac-sessao"; d.setAttribute("role", "status"); d.innerHTML = html; document.body.appendChild(d); return d; }

  function mostrarAviso(falta) {
    const seg = Math.max(1, Math.round(falta / 1000));
    if (!aviso) { aviso = caixa(`<p></p><button type="button">Continuar</button>`); aviso.querySelector("button").addEventListener("click", marcar); }
    aviso.querySelector("p").textContent = `Por segurança, vais sair da conta dentro de ${seg} s se não houver atividade.`;
  }
  function esconderAviso() { if (aviso) { aviso.remove(); aviso = null; } }
  setInterval(() => { if (aviso) verificar(true); }, 1000);

  function avisoSaida() {
    if (ler(SAIU) !== "1") return; tirar(SAIU);
    const d = caixa(`<p>Saíste da conta por segurança, depois de 7 minutos sem atividade. Entra outra vez para continuar.</p><button type="button" class="x" aria-label="Fechar">×</button>`);
    d.querySelector("button").addEventListener("click", () => d.remove());
    setTimeout(() => d.remove(), 12000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avisoSaida); else avisoSaida();
})();

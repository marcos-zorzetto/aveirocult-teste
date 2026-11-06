/* Sessão da conta de cliente · Aveiro Cult
   Guarda a sessão do Supabase só neste separador (sessionStorage): fechar o navegador termina-a.
   Renova-a sozinha com o refresh_token enquanto estiver aberta. Ao fim de 7 min sem atividade, js/inatividade.js termina-a. */
const Sessao = (() => {
  const BD = { url: "https://otcpgtauymtavygscxfo.supabase.co", chave: "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM" };
  const CHAVE = "ac-conta";
  const ler = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE) || "null"); } catch { return null; } };
  const escrever = s => { try { s ? sessionStorage.setItem(CHAVE, JSON.stringify(s)) : sessionStorage.removeItem(CHAVE); } catch { /* modo privado: a sessão fica só nesta página */ } };
  let atual = ler();

  // Converte a resposta do Supabase (login, registo ou renovação) na sessão que guardamos
  function guardar(j) {
    if (!j?.access_token) return null;
    atual = { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + (j.expires_in || 3600) * 1000,
      id: j.user?.id, email: j.user?.email, nome: j.user?.user_metadata?.nome || "" };
    escrever(atual); return atual;
  }
  function limpar() { atual = null; escrever(null); }

  async function pedir(caminho, corpo, metodo = "POST", token) {
    const r = await fetch(`${BD.url}/auth/v1/${caminho}`, { method: metodo, headers: { apikey: BD.chave, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  }

  // Devolve uma sessão válida (renova se faltar menos de 1 minuto) ou null
  async function obter() {
    if (!atual) return null;
    if (atual.expira > Date.now() + 60000) return atual;
    if (!atual.refresh_token) { limpar(); return null; }
    try {
      const { ok, status, j } = await pedir("token?grant_type=refresh_token", { refresh_token: atual.refresh_token });
      if (ok) return guardar(j);
      if (status >= 400 && status < 500) limpar(); // token revogado ou expirado: tem de entrar outra vez
    } catch { /* sem rede: mantém a sessão para tentar mais tarde */ }
    return null;
  }

  return { BD, pedir, guardar, limpar, obter, get atual() { return atual; } };
})();

/* A minha conta · Aveiro Cult
   Entrar, criar conta (sem aprovação), recuperar a palavra-passe, ver as minhas publicações e editar os meus dados.
   As publicações de clientes ficam sempre "em revisão" até a equipa aprovar ou rejeitar. */
(() => {
  const { BD } = Sessao;
  const WHATS = "351963067821"; // WhatsApp do Aveiro Cult (o mesmo de empresas.html)
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const dataPt = d => { if (!d) return ""; const x = new Date(d.length > 10 ? d : d + "T12:00:00"); return `${x.getDate()} ${MESES[x.getMonth()]} ${x.getFullYear()}`; };
  const hojeIso = () => new Date().toISOString().slice(0, 10);
  const toast = $("#toast");
  const avisar = m => { toast.textContent = m; toast.classList.add("mostrar"); setTimeout(() => toast.classList.remove("mostrar"), 3000); };
  const linkWhats = texto => `https://wa.me/${WHATS}?text=${encodeURIComponent(texto)}`;
  const aqui = () => location.href.replace(/[?#].*$/, "");
  $("#ano").textContent = new Date().getFullYear();

  const erroEm = (id, msg) => { const e = $(id); e.textContent = msg; e.hidden = !msg; };
  const traduzir = (j, padrao) => {
    const m = `${j?.error_code || ""} ${j?.msg || ""} ${j?.error_description || ""} ${j?.message || ""}`;
    if (/invalid_credentials|Invalid login/i.test(m)) return "Email ou palavra-passe errados.";
    if (/email_not_confirmed|not confirmed/i.test(m)) return "Ainda não confirmaste o email. Abre o link que te enviámos (vê também no spam).";
    if (/user_already_exists|already registered|already been registered/i.test(m)) return "Já existe uma conta com este email. Entra ou usa “Esqueci-me da palavra-passe”.";
    if (/weak_password|weak|at least/i.test(m)) return "Palavra-passe fraca: usa pelo menos 10 caracteres, com letras e números.";
    if (/same_password|different from the old/i.test(m)) return "A palavra-passe nova tem de ser diferente da anterior.";
    if (/over_email_send_rate|rate limit|too many/i.test(m)) return "Foram pedidos demasiados emails em pouco tempo. Espera uns minutos e tenta de novo.";
    if (/sending|smtp|email address .* invalid|not authorized/i.test(m)) return "Não conseguimos enviar o email agora. Tenta mais tarde ou fala connosco no WhatsApp.";
    if (/signup.*disabled/i.test(m)) return "A criação de contas está temporariamente fechada.";
    return padrao;
  };

  /* ---------- Vistas ---------- */
  const cartoes = ["formEntrar", "formCriar", "formRecuperar", "formSenha", "okEntrada"];
  function cartao(qual) {
    cartoes.forEach(id => { $("#" + id).hidden = id !== qual; });
    const abas = qual === "formEntrar" || qual === "formCriar";
    $("#abasConta").hidden = !abas;
    if (abas) {
      const a = qual === "formCriar" ? "criar" : "entrar";
      $("#abasConta").dataset.on = a;
      document.querySelectorAll("#abasConta button").forEach(b => { const on = b.dataset.aba === a; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    }
  }
  function verEntrada(qual = "formEntrar") { $("#aCarregar").hidden = true; $("#vConta").hidden = true; $("#vEntrada").hidden = false; cartao(qual); }
  function ok(titulo, texto) { $("#okTitulo").textContent = titulo; $("#okTexto").textContent = texto; cartao("okEntrada"); }

  $("#abasConta").addEventListener("click", e => { const b = e.target.closest("button"); if (b) cartao(b.dataset.aba === "criar" ? "formCriar" : "formEntrar"); });
  document.querySelectorAll("[data-voltar]").forEach(b => b.addEventListener("click", () => cartao("formEntrar")));
  $("#abrirRecuperar").addEventListener("click", () => { $("#formRecuperar").email.value = $("#formEntrar").email.value; cartao("formRecuperar"); });
  if (/^#criar/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  const abrirEmCriar = /[?&]criar=1/.test(location.search) || /^#criar/.test(location.hash);
  // vindo do formulário "Divulgar": depois de entrar volta para lá
  const voltarDivulgar = /[?&]voltar=divulgar/.test(location.search);
  const seguir = () => voltarDivulgar ? location.replace("publicar.html") : abrirConta();

  /* ---------- Entrar ---------- */
  $("#formEntrar").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'); erroEm("#erroEntrar", "");
    if (!f.email.value.trim() || !f.senha.value) return erroEm("#erroEntrar", "Escreve o email e a palavra-passe.");
    b.disabled = true;
    try {
      const { ok: certo, j } = await Sessao.pedir("token?grant_type=password", { email: f.email.value.trim(), password: f.senha.value });
      if (!certo) throw new Error(traduzir(j, "Não foi possível entrar agora. Tenta de novo."));
      Sessao.guardar(j); f.reset(); await seguir();
    } catch (err) { erroEm("#erroEntrar", err.message === "Failed to fetch" ? "Sem ligação à internet." : err.message); }
    b.disabled = false;
  });

  /* ---------- Criar conta (fica ativa logo; não precisa de aprovação) ---------- */
  $("#formCriar").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'); erroEm("#erroCriar", "");
    f.classList.add("validar");
    if (!f.checkValidity()) { erroEm("#erroCriar", f.senha.value && f.senha.value.length < 10 ? "A palavra-passe tem de ter pelo menos 10 caracteres." : !f.consent.checked && f.nome.value && f.email.validity.valid ? "Tens de aceitar a política de privacidade e os termos." : "Falta preencher alguns campos obrigatórios (marcados com *)."); f.querySelector(":invalid")?.focus(); return; }
    if (f.senha.value !== f.senha2.value) return erroEm("#erroCriar", "As duas palavras-passe não são iguais.");
    b.disabled = true;
    try {
      const email = f.email.value.trim();
      const dados = { nome: f.nome.value.trim(), telefone: f.telefone.value.trim(), empresa: f.empresa.value.trim() };
      const { ok: certo, j } = await Sessao.pedir(`signup?redirect_to=${encodeURIComponent(aqui())}`, { email, password: f.senha.value, data: dados });
      if (!certo) throw new Error(traduzir(j, "Não foi possível criar a conta agora. Tenta de novo."));
      f.reset(); f.classList.remove("validar");
      if (j.access_token) { Sessao.guardar(j); avisar("Conta criada. Bem-vindo(a)!"); await seguir(); }
      else ok("Confirma o teu email", `Enviámos um link para ${email}. Abre-o para ativar a conta (vê também na pasta de spam). Depois já podes publicar.`);
    } catch (err) { erroEm("#erroCriar", err.message === "Failed to fetch" ? "Sem ligação à internet." : err.message); }
    b.disabled = false;
  });

  /* ---------- Recuperar palavra-passe ---------- */
  $("#formRecuperar").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'); erroEm("#erroRecuperar", "");
    if (!f.email.validity.valid || !f.email.value) return erroEm("#erroRecuperar", "Escreve um email válido.");
    b.disabled = true;
    try {
      const { ok: certo, j } = await Sessao.pedir(`recover?redirect_to=${encodeURIComponent(aqui())}`, { email: f.email.value.trim() });
      if (!certo) throw new Error(traduzir(j, "Não foi possível enviar o email agora."));
      ok("Vê o teu email", `Se existir uma conta com ${f.email.value.trim()}, vais receber um link para escolher uma palavra-passe nova.`);
    } catch (err) { erroEm("#erroRecuperar", err.message); }
    b.disabled = false;
  });

  /* ---------- Links dos emails (confirmação, recuperação) chegam com o token no endereço ---------- */
  let tokenTemp = null;
  async function lerLinkDoEmail() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (!h.get("access_token") && !h.get("error_description")) return false;
    const tipo = h.get("type") || "";
    if (tipo === "invite") { location.replace("admin.html" + location.hash); return true; } // convites são para a equipa
    history.replaceState(null, "", location.pathname + location.search); // tira o token da barra de endereço
    if (h.get("error_description")) {
      verEntrada(); erroEm("#erroEntrar", /expired|invalid/i.test(h.get("error_description")) ? "O link expirou ou já foi usado. Entra com a tua palavra-passe ou pede um novo em “Esqueci-me da palavra-passe”." : h.get("error_description"));
      return true;
    }
    const sessao = { access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: Number(h.get("expires_in")) || 3600 };
    const r = await fetch(`${BD.url}/auth/v1/user`, { headers: { apikey: BD.chave, Authorization: `Bearer ${sessao.access_token}` } }).catch(() => null);
    sessao.user = r && r.ok ? await r.json() : null;
    if (tipo === "recovery") { tokenTemp = sessao; verEntrada("formSenha"); $("#textoSenha").textContent = "Escolhe a tua palavra-passe nova."; return true; }
    Sessao.guardar(sessao); // confirmação do email ou link mágico: entra logo
    if (tipo === "signup") avisar("Email confirmado. A tua conta está ativa.");
    await abrirConta(); return true;
  }

  $("#formSenha").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'); erroEm("#erroSenha", "");
    if (f.senha.value.length < 10) return erroEm("#erroSenha", "Usa pelo menos 10 caracteres.");
    if (f.senha.value !== f.senha2.value) return erroEm("#erroSenha", "As duas palavras-passe não são iguais.");
    const s = tokenTemp || await Sessao.obter(); if (!s) return verEntrada();
    b.disabled = true;
    try {
      const { ok: certo, j } = await Sessao.pedir("user", { password: f.senha.value }, "PUT", s.access_token);
      if (!certo) throw new Error(traduzir(j, "Não foi possível guardar a palavra-passe."));
      if (tokenTemp) { Sessao.guardar({ ...tokenTemp, user: j.id ? j : tokenTemp.user }); tokenTemp = null; }
      f.reset(); avisar("Palavra-passe guardada."); $("#cancelarSenha").hidden = true; await abrirConta();
    } catch (err) { erroEm("#erroSenha", err.message); }
    b.disabled = false;
  });
  $("#mudarSenha").addEventListener("click", () => { verEntrada("formSenha"); $("#textoSenha").textContent = "Escolhe a tua palavra-passe nova."; $("#cancelarSenha").hidden = false; });
  $("#cancelarSenha").addEventListener("click", () => { $("#cancelarSenha").hidden = true; abrirConta(); });

  /* ---------- Área do cliente ---------- */
  const rest = async (caminho, opcoes = {}) => {
    const s = await Sessao.obter(); if (!s) throw Object.assign(new Error("sessao"), { sessao: true });
    const r = await fetch(`${BD.url}/rest/v1/${caminho}`, { ...opcoes, headers: { apikey: BD.chave, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json", ...(opcoes.headers || {}) } });
    if (r.status === 401) { Sessao.limpar(); throw Object.assign(new Error("sessao"), { sessao: true }); }
    return r;
  };
  let ficha = null;

  async function abrirConta() {
    const s = await Sessao.obter();
    if (!s) return verEntrada(abrirEmCriar ? "formCriar" : "formEntrar");
    $("#aCarregar").hidden = true; $("#vEntrada").hidden = true; $("#vConta").hidden = false;
    $("#olaNome").textContent = (s.nome || s.email || "").split(" ")[0];
    try {
      const [rf, rm, rp] = await Promise.all([
        rest(`clientes?id=eq.${s.id}&select=*`),
        rest("rpc/e_moderador", { method: "POST", body: "{}" }),
        rest(`submissoes?autor=eq.${s.id}&select=id,tipo,titulo,estado,data,data_fim,recorrencia,criado_em,revisto_em,nota_moderacao,imagem&order=criado_em.desc&limit=100`)
      ]);
      ficha = rf.ok ? (await rf.json())[0] || null : null;
      const moderador = rm.ok ? await rm.json() === true : false;
      $("#irPainel").hidden = !moderador;
      if (moderador) { try { sessionStorage.setItem("ac-mod", JSON.stringify({ access_token: s.access_token, email: s.email, expira: s.expira })); } catch { } }
      desenharFicha(s); desenharAssinatura(moderador);
      desenharPublicacoes(rp.ok ? await rp.json() : null);
    } catch (err) {
      if (err.sessao) return verEntrada();
      $("#minhas").innerHTML = `<p class="vazio-conta">Não foi possível carregar agora. <button class="ligacao" type="button" onclick="location.reload()">Tentar de novo</button></p>`;
    }
  }

  function desenharFicha(s) {
    const f = $("#formDados");
    f.nome.value = ficha?.nome || s.nome || ""; f.email.value = s.email || ""; f.telefone.value = ficha?.telefone || ""; f.empresa.value = ficha?.empresa || "";
    if (ficha?.nome) $("#olaNome").textContent = ficha.nome.split(" ")[0];
  }
  function desenharAssinatura(moderador) {
    const el = $("#assinatura"), ate = ficha?.assinatura_ate;
    const emDia = ate && ate >= hojeIso();
    el.classList.toggle("em-dia", !!(emDia || moderador));
    el.innerHTML = moderador ? `<i></i><span><b>Conta da equipa.</b> O que publicares entra logo no site.</span>`
      : emDia ? `<i></i><span><b>Assinatura em dia</b> até ${dataPt(ate)}.</span>`
      : `<i></i><span><b>${ate ? "Assinatura terminou a " + dataPt(ate) : "Ainda sem assinatura registada"}.</b> Para ativar ou renovar, <a href="${linkWhats(`Olá! Tenho conta no Aveiro Cult (${$("#formDados").email.value}) e queria ${ate ? "renovar" : "ativar"} a assinatura.`)}" target="_blank" rel="noopener">fala connosco no WhatsApp</a>.</span>`;
  }

  const ROTULO = { pendente: "Em revisão", aprovado: "Publicado", rejeitado: "Não publicado" };
  function quando(p) {
    if (p.tipo !== "evento") return "Portfólio de artista";
    if (p.recorrencia === "semanal") return `Todas as semanas, desde ${dataPt(p.data)}`;
    return dataPt(p.data) + (p.data_fim && p.data_fim.slice(0, 10) !== p.data ? " a " + dataPt(p.data_fim.slice(0, 10)) : "");
  }
  function desenharPublicacoes(lista) {
    const el = $("#minhas");
    if (lista === null) { el.innerHTML = `<p class="vazio-conta">Não foi possível carregar as publicações. <button class="ligacao" type="button" onclick="location.reload()">Tentar de novo</button></p>`; return; }
    if (!lista.length) { el.innerHTML = `<p class="vazio-conta">Ainda não publicaste nada. <a href="publicar.html">Divulga o teu primeiro evento</a>.</p>`; return; }
    el.innerHTML = lista.map(p => {
      const ver = p.estado === "aprovado" ? `<a href="${p.tipo === "evento" ? "evento" : "artista"}.html?id=${p.id}">Ver no site</a>` : "";
      const falar = p.estado === "rejeitado" ? `<a href="${linkWhats(`Olá! A minha publicação "${p.titulo}" não foi publicada no Aveiro Cult. Podemos falar?`)}" target="_blank" rel="noopener"><svg><use href="#i-whats"/></svg>Falar no WhatsApp</a>` : "";
      const cancelar = p.estado === "pendente" ? `<button class="ligacao" type="button" data-cancelar="${p.id}">Cancelar envio</button>` : "";
      const motivo = p.estado === "rejeitado" && p.nota_moderacao ? `<p class="pub-motivo"><b>Motivo:</b> ${esc(p.nota_moderacao)}</p>` : "";
      return `<article class="pub">
        <div class="pub-img">${p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</div>
        <div>
          <span class="estado-pub ${esc(p.estado)}">${ROTULO[p.estado] || esc(p.estado)}</span>
          <h3>${esc(p.titulo)}</h3>
          <p class="pub-meta">${esc(quando(p))} · enviado a ${dataPt(p.criado_em)}${p.revisto_em && p.estado !== "pendente" ? " · revisto a " + dataPt(p.revisto_em) : ""}</p>
          ${motivo}
          ${ver || falar || cancelar ? `<div class="pub-acoes">${ver}${falar}${cancelar}</div>` : ""}
        </div>
      </article>`;
    }).join("");
  }
  $("#minhas").addEventListener("click", async e => {
    const b = e.target.closest("[data-cancelar]"); if (!b) return;
    if (!confirm("Cancelar este envio? A equipa deixa de o ver.")) return;
    try {
      const r = await rest(`submissoes?id=eq.${b.dataset.cancelar}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
      const apagados = r.ok ? await r.json() : [];
      avisar(apagados.length ? "Envio cancelado." : "Já não dá para cancelar: a equipa já o reviu.");
      abrirConta();
    } catch (err) { if (err.sessao) verEntrada(); }
  });

  $("#formDados").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'); erroEm("#erroDados", "");
    if (!f.nome.value.trim()) return erroEm("#erroDados", "O nome não pode ficar vazio.");
    b.disabled = true;
    try {
      const s = await Sessao.obter();
      const r = await rest(`clientes?id=eq.${s.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ nome: f.nome.value.trim(), telefone: f.telefone.value.trim() || null, empresa: f.empresa.value.trim() || null }) });
      const linhas = r.ok ? await r.json() : [];
      if (!linhas.length) throw new Error("Não foi possível guardar agora. Tenta de novo.");
      ficha = linhas[0]; desenharFicha(s); avisar("Dados guardados.");
    } catch (err) { if (err.sessao) return verEntrada(); erroEm("#erroDados", err.message); }
    b.disabled = false;
  });

  $("#sair").addEventListener("click", async () => {
    const s = Sessao.atual;
    if (s) fetch(`${BD.url}/auth/v1/logout`, { method: "POST", headers: { apikey: BD.chave, Authorization: `Bearer ${s.access_token}` } }).catch(() => { });
    Sessao.limpar(); try { sessionStorage.removeItem("ac-mod"); } catch { }
    avisar("Saíste da conta."); verEntrada();
  });

  (async () => { if (!(await lerLinkDoEmail())) await abrirConta(); })();
})();

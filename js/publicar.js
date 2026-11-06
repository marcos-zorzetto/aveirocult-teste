/* Publicar · Aveiro Cult
   Página própria do formulário de publicação (publicar.html), separada da página inicial.
   Só publica quem tem conta (cria-se sem aprovação). Tudo o que os clientes enviam fica "Em revisão"
   até a equipa aprovar; nessa altura o cliente recebe o email com o link da publicação. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ENVIO = { url: Sessao.BD.url, chave: Sessao.BD.chave, tabela: "submissoes" };
const cabecalhos = { apikey: ENVIO.chave, Authorization: `Bearer ${ENVIO.chave}` };
const toast = $("#toast");
function avisar(msg) { toast.textContent = msg; toast.classList.add("mostrar"); setTimeout(() => toast.classList.remove("mostrar"), 3200); }
// Sessão de moderação aberta neste separador (painel): o que a equipa envia é publicado logo
const sessaoMod = (() => { try { const x = JSON.parse(sessionStorage.getItem("ac-mod") || "null"); return x && x.expira > Date.now() + 60000 ? x : null; } catch { return null; } })();
document.getElementById("ano").textContent = new Date().getFullYear();

/* ---------- Formulário: envio de eventos e artistas ---------- */
(() => {
  const form = $("#formDivulgar"); if (!form) return;
  const seg = form.querySelector(".segmento"), grupos = [...form.querySelectorAll("[data-grupo]")], erro = $("#formErro"), ok = $("#formOk");
  let tipo = "evento";
  const selCat = form.querySelector('select[name="categoria"]');
  [...CATEGORIAS.filter(c => c.f).map(c => c.f), "Workshop", "Festival", "Exposição", "Literatura", "Mercado", "Outros"].forEach(c => selCat.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
  ["concelho", "concelho_artista"].forEach(n => { const s = form.querySelector(`select[name="${n}"]`); CONCELHOS.forEach(c => s.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`)); });
  const hoje = new Date().toISOString().slice(0, 10); form.querySelector('input[name="data"]').min = hoje;

  // Textos com mínimo de caracteres: contador por baixo, para não haver surpresas ao enviar
  form.querySelectorAll("textarea[minlength]").forEach(t => {
    const min = +t.getAttribute("minlength"), info = document.createElement("small"); info.className = "contador"; info.setAttribute("aria-live", "polite");
    const atualizar = () => { const n = t.value.trim().length; info.textContent = n >= min ? `${n} caracteres` : `Mínimo ${min} caracteres · faltam ${min - n}`; info.classList.toggle("ok", n >= min); t.setCustomValidity(""); };
    t.after(info); t.addEventListener("input", atualizar); atualizar();
  });
  // Mensagem de erro que diz qual é o campo e o que falta
  const nomeCampo = el => (el.closest("label")?.querySelector("span")?.textContent || "").replace(/\s*\*\s*$/, "").trim();
  const motivo = el => {
    const v = el.validity, nome = nomeCampo(el);
    if (el.type === "checkbox") return "Falta marcar a caixa de autorização para podermos publicar.";
    if (v.valueMissing) return nome ? `Falta preencher: ${nome}.` : "Falta preencher um campo obrigatório (marcado com *).";
    if (v.tooShort || (el.minLength > 0 && el.value.trim().length < el.minLength)) return `${nome ? `«${nome}»` : "Este campo"} precisa de pelo menos ${el.minLength} caracteres (tem ${el.value.trim().length}).`;
    if (v.typeMismatch || v.patternMismatch) return `${nome ? `«${nome}»` : "Este campo"} não está num formato válido${el.type === "url" ? " (deve começar por https://)" : ""}.`;
    if (v.rangeUnderflow) return `${nome || "A data"} não pode ser no passado.`;
    return "Há um campo por corrigir (marcado a vermelho).";
  };
  if (sessaoMod) form.insertAdjacentHTML("afterbegin", `<p class="aviso-mod">Sessão de moderação (${esc(sessaoMod.email || "equipa")}): o que enviares aqui é publicado de imediato. <a href="admin.html">Voltar ao painel</a></p>`);

  // Só publica quem tem conta (a conta cria-se sem aprovação). A sessão da equipa (painel) também serve.
  const porta = $("#portaConta");
  let conta = null;
  async function verConta() {
    conta = sessaoMod ? null : await Sessao.obter();
    const ligado = !!(sessaoMod || conta);
    if (!ok.hidden) return; // ecrã de "recebido" aberto: não mexe
    porta.hidden = ligado; form.hidden = !ligado;
    if (conta) {
      form.querySelector('[name="email"]').value = conta.email || "";
      const nome = form.querySelector('[name="responsavel"]'); if (!nome.value) nome.value = conta.nome || "";
      let av = form.querySelector(".aviso-conta");
      if (!av) { form.insertAdjacentHTML("afterbegin", `<p class="aviso-conta"></p>`); av = form.querySelector(".aviso-conta"); }
      av.innerHTML = `A publicar como <b>${esc(conta.email)}</b> · <a href="conta.html">A minha conta</a> · <button type="button" data-trocar>Trocar de conta</button>`;
    } else if (sessaoMod) form.querySelector('[name="email"]').value = sessaoMod.email || "";
  }
  form.addEventListener("click", e => { if (e.target.closest("[data-trocar]")) { Sessao.limpar(); location.href = "conta.html?voltar=divulgar"; } });
  verConta();

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

  // Reduz a imagem no próprio telemóvel (máx. 1600 px, JPEG) e envia para o Storage
  async function enviarImagem(f, cab = cabecalhos) {
    if (!f || !f.size) return null;
    if (f.size > 5 * 1024 * 1024) throw new Error("A imagem tem mais de 5 MB. Escolhe uma mais leve.");
    const img = await createImageBitmap(f); const esc_ = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * esc_); c.height = Math.round(img.height * esc_);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .82));
    const nome = `envios/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const r = await fetch(`${ENVIO.url}/storage/v1/object/imagens/${nome}`, { method: "POST", headers: { ...cab, "Content-Type": "image/jpeg", "x-upsert": "false" }, body: blob });
    if (!r.ok) throw new Error("Não foi possível enviar a imagem. Tenta sem imagem ou com outra.");
    return `${ENVIO.url}/storage/v1/object/public/imagens/${nome}`;
  }

  // "Quando acontece?": mostra os campos certos e ajusta o rótulo da data
  const atualizarQuando = () => {
    const r = form.querySelector('[name="recorrencia"]:checked')?.value || "nenhuma";
    form.querySelectorAll("[data-quando]").forEach(el => { el.hidden = el.dataset.quando !== r; });
    form.querySelector('[name="data_fim"]').required = r === "varios";
    $("#rotuloData").textContent = r === "semanal" ? "Começa em *" : r === "varios" ? "Primeiro dia *" : "Data *";
  };
  form.querySelectorAll('[name="recorrencia"]').forEach(i => i.addEventListener("change", atualizarQuando)); atualizarQuando();

  const v2 = k => (form.querySelector(`[name="${k}"]`)?.value || "").trim();
  const abertoEm = Date.now();
  form.addEventListener("submit", async e => {
    e.preventDefault(); form.classList.add("validar");
    // proteção anti-spam: robôs preenchem o campo escondido ou submetem em menos de 4 segundos
    if (form.querySelector('[name="website"]').value || Date.now() - abertoEm < 4000) { form.hidden = true; ok.hidden = false; return; }
    // minlength só é verificado pelo browser depois de o utilizador escrever; aqui conta sempre (texto sem espaços nas pontas)
    form.querySelectorAll("textarea[minlength]").forEach(t => t.setCustomValidity(t.required || t.value.trim() ? (t.value.trim().length < t.minLength ? "curto" : "") : ""));
    if (!form.checkValidity()) { const mau = [...form.querySelectorAll(":invalid")].find(el => !el.closest("[hidden]")) || form.querySelector(":invalid"); erro.textContent = motivo(mau); erro.hidden = false; mau?.focus(); return; }
    const recorrencia = form.querySelector('[name="recorrencia"]:checked')?.value || "nenhuma";
    const diasSemana = [...form.querySelectorAll('[name="dias_semana"]:checked')].map(i => Number(i.value));
    if (tipo === "evento" && recorrencia === "semanal" && !diasSemana.length) { erro.textContent = "Escolhe pelo menos um dia da semana."; erro.hidden = false; form.querySelector(".dias-semana").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (tipo === "evento" && recorrencia === "varios" && v2("data_fim") && v2("data_fim") < v2("data")) { erro.textContent = "O último dia tem de ser depois do primeiro."; erro.hidden = false; return; }
    const btn = form.querySelector('[type="submit"]'); btn.disabled = true; btn.style.opacity = .7;
    try {
      const fd = new FormData(form), v = k => String(fd.get(k) || "").trim() || null;
      const rec = recorrencia === "semanal" ? { recorrencia: "semanal", dias_semana: diasSemana, repete_ate: v("repete_ate") } : recorrencia === "varios" ? { recorrencia: "nenhuma", data_fim: v("data_fim") } : { recorrencia: "nenhuma" };
      // mesma tabela para os dois tipos: "titulo" é o nome do evento ou o nome artístico; "categoria" é a categoria ou a área
      const dados = tipo === "evento"
        ? { tipo, titulo: v("titulo"), categoria: v("categoria"), concelho: v("concelho"), local: v("local"), data: v("data"), hora: v("hora"), descricao: v("descricao"), link: v("link"), ...rec,
            tags: (v("tags") || "").split(",").map(t => t.trim().toLowerCase().replace(/^#/, "").slice(0, 24)).filter(Boolean).slice(0, 8) }
        : { tipo, titulo: v("nome_artistico"), categoria: v("area"), concelho: v("concelho_artista"), descricao: v("bio"), site: v("site"), rede: v("rede") };
      const sessao = sessaoMod || await Sessao.obter();
      if (!sessao) { await verConta(); throw new Error("A tua sessão terminou. Entra outra vez para enviar."); }
      dados.responsavel = v("responsavel"); dados.email = sessao.email || v("email");
      const autorizado = { ...cabecalhos, Authorization: `Bearer ${sessao.access_token}` };
      dados.imagem = await enviarImagem(fd.get("imagem"), autorizado);
      const r = await fetch(`${ENVIO.url}/rest/v1/${ENVIO.tabela}?select=id,estado`, { method: "POST", headers: { ...autorizado, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(dados) });
      if (r.status === 401) { Sessao.limpar(); await verConta(); throw new Error("A tua sessão terminou. Entra outra vez para enviar."); }
      if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error(/limite/.test(t) ? "Já recebemos várias publicações tuas na última hora. Tenta mais tarde." : "Não foi possível enviar agora. Tenta outra vez daqui a pouco."); }
      // Avisa a equipa por email que há uma publicação para rever (não bloqueia o cliente se falhar)
      const [criada] = await r.json().catch(() => []);
      if (criada?.estado === "pendente") fetch(`${ENVIO.url}/functions/v1/alertar-equipa`, { method: "POST", headers: { ...autorizado, "Content-Type": "application/json" }, body: JSON.stringify({ id: criada.id }), keepalive: true }).catch(() => { });
      $("#formOkTexto").textContent = sessaoMod ? "Publicado. Como tens sessão de moderação aberta, já está no site e na app." : `A equipa vai rever ${tipo === "evento" ? "o teu evento" : "o teu portfólio"} e vais receber um email em ${sessao.email} quando estiver publicado. Podes acompanhar em "A minha conta".`;
      ok.querySelector('a[href="conta.html"]').hidden = !!sessaoMod;
      form.hidden = true; ok.hidden = false; ok.scrollIntoView({ behavior: "smooth", block: "center" });
      avisar("Enviado com sucesso");
    } catch (err) { erro.textContent = err.message || "Algo correu mal. Tenta outra vez."; erro.hidden = false; }
    btn.disabled = false; btn.style.opacity = "";
  });
  $("#formOutro").addEventListener("click", async () => { form.reset(); form.classList.remove("validar"); ok.hidden = true; mudarTipo("evento"); await verConta(); (form.hidden ? porta : form).scrollIntoView({ behavior: "smooth", block: "start" }); });
})();


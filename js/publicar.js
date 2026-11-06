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
      // conta que também é da equipa: avisa que publica sem revisão (evita pensar que a aprovação falhou)
      fetch(`${ENVIO.url}/rest/v1/rpc/e_moderador`, { method: "POST", headers: { ...cabecalhos, Authorization: `Bearer ${conta.access_token}`, "Content-Type": "application/json" }, body: "{}" })
        .then(r => r.ok ? r.json() : false).then(eq => { if (eq === true && !form.querySelector(".aviso-mod")) av.insertAdjacentHTML("afterend", `<p class="aviso-mod">Esta conta faz parte da equipa do Aveiro Cult: o que publicares aparece logo no site, sem revisão. Para testar como cliente, usa outra conta.</p>`); }).catch(() => { });
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

  // Reduz a imagem no próprio telemóvel (máx. 1600 px, JPEG) e envia para o Storage.
  // Se o navegador não conseguir abrir a imagem para a reduzir, envia o ficheiro original (JPG/PNG/WebP até 5 MB).
  // erros escritos por nós (em português); qualquer outro erro do navegador mostra uma mensagem genérica
  const falha = m => Object.assign(new Error(m), { nossa: true });
  const TIPOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const abrirImagem = f => new Promise((ok, falha) => {
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); ok(im); };
    im.onerror = () => { URL.revokeObjectURL(url); falha(new Error("descodificar")); };
    im.src = url;
  });
  async function reduzir(f) {
    let img;
    try { img = await createImageBitmap(f); } catch { img = await abrirImagem(f).catch(() => null); }
    const w = img?.width || img?.naturalWidth, h = img?.height || img?.naturalHeight;
    if (!w || !h) throw falha("Não conseguimos abrir esta imagem. Confirma que é uma foto JPG ou PNG (no iPhone, as fotos HEIC podem ser enviadas como captura de ecrã).");
    const k = Math.min(1, 1600 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); // PNG transparente fica com fundo branco, não preto
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .82));
    if (!blob) throw new Error("descodificar");
    return blob;
  }
  async function enviarImagem(f, cab = cabecalhos) {
    if (!f || !f.size) return null;
    if (f.size > 5 * 1024 * 1024) throw falha("A imagem tem mais de 5 MB. Escolhe uma mais leve.");
    let corpo, tipoImg = "image/jpeg";
    try { corpo = await reduzir(f); }
    catch (e) {
      // imagem ilegível: avisa; imagem lida mas sem memória para reduzir: envia o original (JPG/PNG/WebP)
      if (e.nossa || !TIPOS[f.type]) throw e.nossa ? e : falha("Não conseguimos abrir esta imagem. Usa uma imagem JPG ou PNG.");
      corpo = f; tipoImg = f.type;
    }
    const nome = `envios/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TIPOS[tipoImg]}`;
    const r = await fetch(`${ENVIO.url}/storage/v1/object/imagens/${nome}`, { method: "POST", headers: { ...cab, "Content-Type": tipoImg, "x-upsert": "false" }, body: corpo }).catch(() => null);
    if (!r || !r.ok) throw falha("Não foi possível enviar a imagem. Verifica a internet e tenta outra vez, ou envia sem imagem.");
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
      if (!sessao) { await verConta(); throw falha("A tua sessão terminou. Entra outra vez para enviar."); }
      dados.responsavel = v("responsavel"); dados.email = sessao.email || v("email");
      const autorizado = { ...cabecalhos, Authorization: `Bearer ${sessao.access_token}` };
      dados.imagem = await enviarImagem(fd.get("imagem"), autorizado);
      const r = await fetch(`${ENVIO.url}/rest/v1/${ENVIO.tabela}?select=id,estado`, { method: "POST", headers: { ...autorizado, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(dados) });
      if (r.status === 401) { Sessao.limpar(); await verConta(); throw falha("A tua sessão terminou. Entra outra vez para enviar."); }
      if (!r.ok) { const t = await r.text().catch(() => ""); throw falha(/limite/.test(t) ? "Já recebemos várias publicações tuas na última hora. Tenta mais tarde." : "Não foi possível enviar agora. Tenta outra vez daqui a pouco."); }
      // Avisa a equipa por email que há uma publicação para rever (não bloqueia o cliente se falhar)
      const [criada] = await r.json().catch(() => []);
      if (criada?.estado === "pendente") fetch(`${ENVIO.url}/functions/v1/alertar-equipa`, { method: "POST", headers: { ...autorizado, "Content-Type": "application/json" }, body: JSON.stringify({ id: criada.id }), keepalive: true }).catch(() => { });
      const publicadaJa = sessaoMod || criada?.estado === "aprovado";
      $("#formOkTexto").textContent = publicadaJa ? "Como esta conta é da equipa do Aveiro Cult, já está no site e na app, sem passar pela revisão." : `A equipa vai rever ${tipo === "evento" ? "o teu evento" : "o teu portfólio"} e vais receber um email em ${sessao.email} quando estiver publicado. Podes acompanhar em "A minha conta".`;
      ok.querySelector('a[href="conta.html"]').hidden = !!sessaoMod;
      ok.querySelector("h2").textContent = publicadaJa ? "Publicado!" : "Recebido, obrigado!";
      form.hidden = true; ok.hidden = false; ok.scrollIntoView({ behavior: "smooth", block: "center" });
      avisar("Enviado com sucesso");
    } catch (err) { erro.textContent = err?.nossa ? err.message : "Algo correu mal. Tenta outra vez daqui a pouco."; erro.hidden = false; }
    btn.disabled = false; btn.style.opacity = "";
  });
  $("#formOutro").addEventListener("click", async () => { form.reset(); form.classList.remove("validar"); ok.hidden = true; mudarTipo("evento"); await verConta(); (form.hidden ? porta : form).scrollIntoView({ behavior: "smooth", block: "start" }); });
})();


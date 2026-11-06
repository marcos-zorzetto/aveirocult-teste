/* Painel de moderação · Aveiro Cult
   Entra com a conta Supabase (email + palavra-passe). Só emails na tabela "moderadores" veem e alteram submissões. */
const BD = { url: "https://otcpgtauymtavygscxfo.supabase.co", chave: "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM" };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = $("#toast");
const avisar = m => { toast.textContent = m; toast.classList.add("mostrar"); setTimeout(() => toast.classList.remove("mostrar"), 2800); };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataPt = d => { if (!d) return ""; const x = new Date(d.length > 10 ? d : d + "T12:00:00"); return `${x.getDate()} ${MESES[x.getMonth()]} ${x.getFullYear()}`; };

let sessao = JSON.parse(sessionStorage.getItem("ac-mod") || "null");
let estado = "pendente", tipo = "";

const cab = () => ({ apikey: BD.chave, Authorization: `Bearer ${sessao.access_token}`, "Content-Type": "application/json" });

async function entrar(email, senha) {
  const r = await fetch(`${BD.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: BD.chave, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || "Email ou palavra-passe errados.");
  sessao = { access_token: j.access_token, email: j.user?.email, expira: Date.now() + (j.expires_in || 3600) * 1000 };
  sessionStorage.setItem("ac-mod", JSON.stringify(sessao));
}
function sair() { sessao = null; sessionStorage.removeItem("ac-mod"); mostrar(); }

// Que cartão mostrar na entrada: "entrar", "recuperar" ou "senha"
function cartao(qual) { ["formEntrar", "formRecuperar", "formSenha"].forEach(id => { $("#" + id).hidden = id !== { entrar: "formEntrar", recuperar: "formRecuperar", senha: "formSenha" }[qual]; }); }

function mostrar() {
  const ok = !tokenTemp && sessao && sessao.expira > Date.now(); // com um link de convite/recuperação aberto, mostra primeiro o "criar palavra-passe"
  $("#entrada").hidden = !!ok; $("#painel").hidden = !ok; ["sair", "mudarSenha", "publicarEvento"].forEach(id => $("#" + id).hidden = !ok);
  if (ok) carregar(); else if (sessao) sair();
}

/* ---------- Primeiro acesso e recuperação ----------
   O link do email do Supabase (convite ou recuperação) traz um token no endereço (#access_token=...&type=recovery).
   Com esse token a pessoa escolhe a palavra-passe e entra logo. */
let tokenTemp = null;
(() => {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.toString()) return;
  history.replaceState(null, "", location.pathname + location.search); // tira o token da barra de endereço
  if (h.get("error_description")) { cartao("entrar"); const e = $("#erroEntrar"); e.textContent = /expired|invalid/i.test(h.get("error_description")) ? "O link expirou ou já foi usado. Pede um novo em “Esqueci-me da palavra-passe”." : h.get("error_description"); e.hidden = false; return; }
  if (h.get("access_token") && /invite|recovery|magiclink|signup/.test(h.get("type") || "")) {
    tokenTemp = { access_token: h.get("access_token"), expira: Date.now() + (Number(h.get("expires_in")) || 3600) * 1000 };
    $("#tituloSenha").textContent = h.get("type") === "recovery" ? "Nova palavra-passe" : "Criar palavra-passe";
    cartao("senha");
  }
})();

async function guardarSenha(token, senha) {
  const r = await fetch(`${BD.url}/auth/v1/user`, { method: "PUT", headers: { apikey: BD.chave, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password: senha }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(/same|different/i.test(j.msg || j.error_description || "") ? "A palavra-passe nova tem de ser diferente da anterior." : /weak|short|least/i.test(j.msg || "") ? "Palavra-passe fraca: usa pelo menos 10 caracteres, com letras e números." : (j.msg || j.error_description || "Não foi possível guardar a palavra-passe."));
  return j;
}

$("#formSenha").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target, erro = $("#erroSenha"), b = f.querySelector('[type="submit"]'); erro.hidden = true;
  if (f.senha.value.length < 10) { erro.textContent = "Usa pelo menos 10 caracteres."; erro.hidden = false; return; }
  if (f.senha.value !== f.senha2.value) { erro.textContent = "As duas palavras-passe não são iguais."; erro.hidden = false; return; }
  const token = tokenTemp?.access_token || sessao?.access_token; if (!token) { cartao("entrar"); return; }
  b.disabled = true;
  try {
    const u = await guardarSenha(token, f.senha.value);
    if (tokenTemp) { sessao = { access_token: tokenTemp.access_token, email: u.email, expira: tokenTemp.expira }; sessionStorage.setItem("ac-mod", JSON.stringify(sessao)); tokenTemp = null; }
    f.reset(); cartao("entrar"); mostrar(); avisar("Palavra-passe guardada.");
  } catch (err) { erro.textContent = err.message; erro.hidden = false; }
  b.disabled = false;
});
$("#abrirRecuperar").addEventListener("click", () => { cartao("recuperar"); $("#formRecuperar").email.value = $("#formEntrar").email.value; });
$("#voltarEntrar").addEventListener("click", () => cartao("entrar"));
$("#formRecuperar").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target, b = f.querySelector('[type="submit"]'), erro = $("#erroRecuperar"), ok = $("#okRecuperar"); erro.hidden = ok.hidden = true; b.disabled = true;
  try {
    const volta = location.href.replace(/[?#].*$/, "");
    const r = await fetch(`${BD.url}/auth/v1/recover?redirect_to=${encodeURIComponent(volta)}`, { method: "POST", headers: { apikey: BD.chave, "Content-Type": "application/json" }, body: JSON.stringify({ email: f.email.value.trim() }) });
    if (r.status === 429) throw new Error("Já pediste um link há pouco. Espera uns minutos e tenta de novo.");
    if (!r.ok) throw new Error("Não foi possível enviar o email agora.");
    ok.hidden = false;
  } catch (err) { erro.textContent = err.message; erro.hidden = false; }
  b.disabled = false;
});
// Mudar a palavra-passe com a sessão aberta
$("#mudarSenha").addEventListener("click", () => { $("#painel").hidden = true; $("#entrada").hidden = false; $("#tituloSenha").textContent = "Mudar palavra-passe"; $("#cancelarSenha").hidden = false; cartao("senha"); });
$("#cancelarSenha").addEventListener("click", () => { $("#cancelarSenha").hidden = true; cartao("entrar"); mostrar(); });

async function contar() {
  const r = await fetch(`${BD.url}/rest/v1/submissoes?select=estado`, { headers: cab() });
  if (r.status === 401) return sair();
  const linhas = await r.json(); const n = e => linhas.filter(l => l.estado === e).length;
  $("#nPend").textContent = n("pendente"); $("#nAprov").textContent = n("aprovado"); $("#nRej").textContent = n("rejeitado");
}

async function carregar() {
  const q = `select=*&estado=eq.${estado}${tipo ? "&tipo=eq." + tipo : ""}&order=criado_em.desc&limit=100`;
  const r = await fetch(`${BD.url}/rest/v1/submissoes?${q}`, { headers: cab() });
  if (r.status === 401) return sair();
  if (!r.ok) { avisar("Sem permissão. A tua conta não está na lista de moderadores."); return; }
  const itens = await r.json();
  ITENS = Object.fromEntries(itens.map(i => [i.id, i]));
  await lerClientes(itens.map(i => i.autor));
  $("#vazio").hidden = itens.length > 0;
  $("#lista").innerHTML = itens.map(i => `<article class="item" data-id="${i.id}">
    <div class="item-img">${i.imagem ? `<a href="${esc(i.imagem)}" target="_blank" rel="noopener"><img src="${esc(i.imagem)}" alt="" onerror="this.parentElement.parentElement.textContent='imagem indisponível'"></a>` : "sem imagem"}</div>
    <div class="item-corpo">
      <span class="etiq">${i.tipo === "evento" ? "Evento" : "Artista"} <i>· ${esc(i.categoria || "")}${i.concelho ? " · " + esc(i.concelho) : ""}</i></span>
      <h3>${esc(i.titulo)}${emDestaque(i) ? `<span class="destaque-on">★ Em destaque até ${dataPt(i.destaque_ate)}</span>` : ""}</h3>
      ${linhaAssinatura(i)}
      ${i.tipo === "evento" ? `<p class="meta">${i.recorrencia === "semanal" ? `<b>Todas as semanas</b> (${(i.dias_semana || []).map(d => ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d]).join(", ")})${i.repete_ate ? " até " + dataPt(i.repete_ate) : ""} · desde ${dataPt(i.data)}` : `${dataPt(i.data)}${i.data_fim && i.data_fim.slice(0, 10) !== i.data ? " a " + dataPt(i.data_fim.slice(0, 10)) : ""}`}${i.hora ? " · " + esc(i.hora.slice(0, 5)) : ""}${i.local ? " · " + esc(i.local) : ""}</p>` : ""}
      <p class="desc">${esc(i.descricao || "")}</p>
      ${i.tipo === "evento" ? `<p class="tags">${(i.tags || []).length ? i.tags.map(t => `<span>#${esc(t)}</span>`).join("") : "<i>sem tags</i>"} <button class="ligacao" data-acao="tags">editar tags</button></p>` : ""}
      <p class="links">${[i.link, i.site, i.rede].filter(Boolean).map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</p>
      <p class="quem">Enviado por <b>${esc(i.responsavel || "?")}</b> · ${esc(i.email || "")} · ${dataPt(i.criado_em)}${i.nota_moderacao ? ` · ${i.estado === "rejeitado" ? "motivo" : "nota"}: ${esc(i.nota_moderacao)}` : ""} ${linhaAviso(i)}</p>
      <div class="acoes">
        ${i.estado !== "aprovado" ? `<button class="aprovar" data-acao="aprovado">Aprovar e publicar</button>` : ""}
        ${i.estado !== "rejeitado" ? `<button class="rejeitar" data-acao="rejeitado">Rejeitar</button>` : ""}
        ${i.estado !== "pendente" ? `<button class="pendente" data-acao="pendente">Voltar a pendente</button>` : ""}
        ${i.estado === "aprovado" ? (emDestaque(i) ? `<button class="destacar" data-acao="sem-destaque">Tirar destaque</button>` : `<button class="destacar" data-acao="destacar">★ Destacar</button>`) : ""}
        <button class="apagar" data-acao="apagar">Apagar</button>
      </div>
    </div>
  </article>`).join("");
  contar();
}

const hojeIso = () => new Date().toISOString().slice(0, 10);
const emDestaque = i => i.destaque_ate && i.destaque_ate >= hojeIso();
async function mudar(id, acao) {
  if (acao === "destacar" || acao === "sem-destaque") {
    let ate = null;
    if (acao === "destacar") {
      const sug = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      const r0 = prompt("Destacar na página inicial até que dia? (AAAA-MM-DD)", sug); if (r0 === null) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r0.trim()) || r0.trim() < hojeIso()) return avisar("Data inválida. Usa o formato AAAA-MM-DD, a partir de hoje.");
      ate = r0.trim();
    }
    const r = await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ destaque_ate: ate }) });
    if (!r.ok) return avisar(r.status === 400 ? "Falta atualizar a base de dados (script de 6 nov)." : "Não foi possível guardar.");
    avisar(ate ? "Em destaque na página inicial até " + dataPt(ate) + "." : "Destaque retirado."); return carregar();
  }
  if (acao === "apagar") {
    if (!confirm("Apagar esta submissão de vez? Não dá para recuperar.")) return;
    const r = await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${id}`, { method: "DELETE", headers: cab() });
    if (!r.ok) return avisar("Não foi possível apagar.");
    avisar("Apagado."); return carregar();
  }
  if (acao === "tags") {
    const atual = $(`.item[data-id="${id}"] .tags`).textContent.replace("editar tags", "").replace("sem tags", "").replace(/#/g, "").trim().split(/\s+/).filter(Boolean).join(", ");
    const novo = prompt("Tags do evento, separadas por vírgula (ex.: grátis, família, ao ar livre):", atual); if (novo === null) return;
    const tags = novo.split(",").map(t => t.trim().toLowerCase().replace(/^#/, "").slice(0, 24)).filter(Boolean).slice(0, 8);
    const r = await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...cab(), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ tags }) });
    if (!r.ok) return avisar("Não foi possível guardar as tags.");
    avisar("Tags guardadas."); return carregar();
  }
  const item = ITENS[id] || {}, cliente = CLIENTES[item.autor];
  if (acao === "aprovado" && item.autor && cliente && !emDia(cliente) && !confirm(`A assinatura de ${cliente.nome || cliente.email} não está em dia. Publicar mesmo assim?`)) return;
  let nota = null;
  if (acao === "rejeitado") {
    const sug = item.autor && cliente && !emDia(cliente) ? "A assinatura não está em dia." : "";
    nota = prompt("Motivo da rejeição. O cliente vê este texto no email e na conta dele:", sug); if (nota === null) return;
    nota = nota.trim();
  }
  const r = await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ estado: acao, revisto_em: new Date().toISOString(), ...(nota !== null ? { nota_moderacao: nota || null } : {}) }) });
  if (!r.ok) return avisar("Não foi possível guardar.");
  let msg = acao === "aprovado" ? "Publicado no site e na app." : acao === "rejeitado" ? "Rejeitado." : "Voltou a pendente.";
  if ((acao === "aprovado" || acao === "rejeitado") && item.autor) {
    const res = await notificar(id);
    msg += res === "ok" ? " O cliente recebeu o email." : res === "ja-avisado" || res === "sem-conta" ? ""
      : res === "sem-servico" ? " O email ao cliente ainda não sai: falta ligar o serviço de email. Ele vê o estado em “A minha conta”."
      : " Atenção: o email ao cliente falhou. Ele vê o estado em “A minha conta”.";
  }
  avisar(msg);
  carregar();
}

$("#formEntrar").addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target, b = f.querySelector("button"), erro = $("#erroEntrar"); b.disabled = true; erro.hidden = true;
  try { await entrar(f.email.value.trim(), f.senha.value); f.reset(); mostrar(); } catch (err) { erro.textContent = err.message; erro.hidden = false; }
  b.disabled = false;
});
$("#sair").addEventListener("click", sair);
$("#abas").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; estado = b.dataset.estado; document.querySelectorAll("#abas button").forEach(x => x.classList.toggle("on", x === b)); carregar(); });
$("#filtroTipo").addEventListener("change", e => { tipo = e.target.value; carregar(); });

/* ---------- Clientes: assinatura e aviso por email ---------- */
let CLIENTES = {}, ITENS = {};
const emDia = c => !!(c?.assinatura_ate && c.assinatura_ate >= hojeIso());
async function lerClientes(ids) {
  ids = [...new Set(ids.filter(Boolean))]; if (!ids.length) return;
  const r = await fetch(`${BD.url}/rest/v1/clientes?id=in.(${ids.join(",")})&select=id,nome,empresa,telefone,email,assinatura_ate`, { headers: cab() }).catch(() => null);
  if (r && r.ok) (await r.json()).forEach(c => { CLIENTES[c.id] = c; });
}
function linhaAssinatura(i) {
  if (!i.autor) return i.origem === "adalo" ? "" : `<p class="assin sem-conta">Enviado sem conta (antes das contas de cliente)</p>`;
  const c = CLIENTES[i.autor];
  if (!c) return `<p class="assin">Conta de cliente</p>`;
  const quem = `${esc(c.nome || c.email)}${c.empresa ? " · " + esc(c.empresa) : ""}`;
  return emDia(c) ? `<p class="assin ok">✓ Assinatura em dia até ${dataPt(c.assinatura_ate)} · ${quem}</p>`
    : `<p class="assin atraso">⚠ ${c.assinatura_ate ? "Assinatura terminou a " + dataPt(c.assinatura_ate) : "Sem assinatura registada"} · ${quem} <button class="ligacao" data-ir-cliente="${esc(c.id)}">ver cliente</button></p>`;
}
const linhaAviso = i => i.aviso_estado && i.aviso_estado === i.estado ? `<span class="avisado">✉ cliente avisado ${dataPt(i.aviso_em)}</span>` : "";
// Envia ao cliente o email de "publicado" ou "não publicado" (função "notificar" no Supabase)
async function notificar(id) {
  try {
    const r = await fetch(`${BD.url}/functions/v1/notificar`, { method: "POST", headers: cab(), body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.enviado ? "ok" : j.motivo || "falhou";
  } catch { return "falhou"; }
}

/* ---------- Notícias ---------- */
const CATS = ["Música", "Teatro & Circo", "Gastronomia", "Família", "Desporto", "Tecnologia", "Workshop", "Festival", "Exposição", "Literatura", "Mercado", "Outros"];
const CONCS = ["Águeda", "Albergaria-a-Velha", "Anadia", "Arouca", "Aveiro", "Castelo de Paiva", "Espinho", "Estarreja", "Ílhavo", "Mealhada", "Murtosa", "Oliveira de Azeméis", "Oliveira do Bairro", "Ovar", "Santa Maria da Feira", "São João da Madeira", "Sever do Vouga", "Vagos", "Vale de Cambra"];
const editor = $("#editorNoticia");
CATS.forEach(c => editor.categoria.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
CONCS.forEach(c => editor.concelho.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
const slugDe = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
let modo = "submissoes";
$("#modos").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  modo = b.dataset.modo; document.querySelectorAll("#modos button").forEach(x => x.classList.toggle("on", x === b));
  $("#modoSubmissoes").hidden = modo !== "submissoes"; $("#modoNoticias").hidden = modo !== "noticias"; $("#modoParceiros").hidden = modo !== "parceiros"; $("#modoClientes").hidden = modo !== "clientes";
  if (modo === "submissoes") carregar();
  if (modo === "noticias") carregarNoticias();
  if (modo === "parceiros") carregarParceiros();
  if (modo === "clientes") carregarClientes();
});
async function carregarNoticias() {
  const r = await fetch(`${BD.url}/rest/v1/noticias?select=*&order=data.desc,id.desc&limit=200`, { headers: cab() });
  if (r.status === 401) return sair();
  const itens = r.ok ? await r.json() : [];
  $("#nNoticias").textContent = `${itens.length} notícias · ${itens.filter(n => n.publicado).length} publicadas`;
  $("#vazioNoticias").hidden = itens.length > 0;
  $("#listaNoticias").innerHTML = itens.map(n => `<article class="item" data-id="${n.id}">
    <div class="item-img">${n.imagem ? `<img src="${esc(n.imagem)}" alt="" onerror="this.parentElement.textContent='imagem indisponível'">` : "sem imagem"}</div>
    <div class="item-corpo">
      <span class="estado ${n.publicado ? "" : "rascunho"}">${n.publicado ? "Publicada" : "Rascunho"}</span>
      <span class="etiq">${esc(n.categoria || "")}${n.concelho ? " · " + esc(n.concelho) : ""} · ${dataPt(n.data)}</span>
      <h3>${esc(n.titulo)}</h3>
      <p class="desc">${esc(n.resumo || "")}</p>
      <div class="acoes">
        <button class="pendente" data-noticia="editar">Editar</button>
        <button class="${n.publicado ? "rejeitar" : "aprovar"}" data-noticia="${n.publicado ? "despublicar" : "publicar"}">${n.publicado ? "Despublicar" : "Publicar"}</button>
        ${n.publicado ? `<a class="btn-leve" href="noticia.html?n=${encodeURIComponent(n.slug || n.id)}" target="_blank" rel="noopener">Ver no site</a>` : ""}
        <button class="apagar" data-noticia="apagar">Apagar</button>
      </div>
    </div>
  </article>`).join("");
  $("#listaNoticias").dataset.itens = JSON.stringify(itens);
}
const camposEvento = editor.querySelector(".campos-evento");
editor.e_evento.addEventListener("change", () => { camposEvento.hidden = !editor.e_evento.checked; editor.ev_data.required = editor.e_evento.checked; });
function abrirEditor(n) {
  editor.reset(); editor.hidden = false; camposEvento.hidden = true; editor.ev_data.required = false;
  editor.id.value = n?.id || ""; editor.imagem_atual.value = n?.imagem || "";
  $("#editorTitulo").textContent = n ? "Editar notícia" : "Nova notícia";
  if (n) { ["titulo", "resumo", "corpo", "categoria", "concelho", "data", "link_original"].forEach(k => editor[k].value = n[k] || ""); editor.publicado.checked = !!n.publicado; }
  else { editor.data.value = new Date().toISOString().slice(0, 10); editor.publicado.checked = true; }
  editor.scrollIntoView({ behavior: "smooth", block: "start" }); editor.titulo.focus();
}
async function enviarImagemNoticia(f, pasta = "noticias", maxLado = 1600, manterPng = false) {
  if (!f || !f.size) return null;
  if (f.size > 5 * 1024 * 1024) throw new Error("A imagem tem mais de 5 MB.");
  const img = await createImageBitmap(f); const k = Math.min(1, maxLado / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const png = manterPng && f.type === "image/png"; // logótipos PNG mantêm a transparência
  const blob = await new Promise(r => c.toBlob(r, png ? "image/png" : "image/jpeg", .84));
  const nome = `envios/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? "png" : "jpg"}`;
  const r = await fetch(`${BD.url}/storage/v1/object/imagens/${nome}`, { method: "POST", headers: { apikey: BD.chave, Authorization: `Bearer ${sessao.access_token}`, "Content-Type": png ? "image/png" : "image/jpeg" }, body: blob });
  if (!r.ok) throw new Error("Não foi possível enviar a imagem.");
  return `${BD.url}/storage/v1/object/public/imagens/${nome}`;
}
// Cria na agenda um evento a partir da notícia (fica aprovado logo: a equipa é moderadora)
async function criarEventoDaNoticia(n) {
  if (!editor.ev_data.value) throw new Error("Falta o dia do evento.");
  if (editor.ev_fim.value && editor.ev_fim.value < editor.ev_data.value) throw new Error("O último dia tem de ser depois do primeiro.");
  const base = location.href.replace(/[^/]*([?#].*)?$/, "");
  const ev = { tipo: "evento", titulo: n.titulo.slice(0, 120), descricao: [n.resumo, n.corpo].filter(Boolean).join("\n\n").slice(0, 4000), categoria: n.categoria, concelho: n.concelho,
    local: editor.ev_local.value.trim() || null, data: editor.ev_data.value, hora: editor.ev_hora.value || null, data_fim: editor.ev_fim.value || null, recorrencia: "nenhuma",
    imagem: n.imagem, link: n.link_original || (n.slug ? `${base}noticia.html?n=${encodeURIComponent(n.slug)}` : null), responsavel: "Equipa Aveiro Cult", email: sessao.email,
    tags: editor.ev_tags.value.split(",").map(t => t.trim().toLowerCase().replace(/^#/, "").slice(0, 24)).filter(Boolean).slice(0, 8) };
  const r = await fetch(`${BD.url}/rest/v1/submissoes`, { method: "POST", headers: { ...cab(), Prefer: "return=representation" }, body: JSON.stringify(ev) });
  if (!r.ok) throw new Error("A notícia foi guardada, mas o evento não. Tenta de novo ou cria o evento pelo formulário.");
  const criado = (await r.json())[0];
  if (criado && criado.estado !== "aprovado") // antes do script de 6 nov o evento entra pendente: aprova-se aqui
    await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${criado.id}`, { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ estado: "aprovado", revisto_em: new Date().toISOString(), nota_moderacao: "criado a partir de uma notícia" }) });
}
$("#novaNoticia").addEventListener("click", () => abrirEditor(null));
$("#cancelarNoticia").addEventListener("click", () => { editor.hidden = true; });
$("#atualizarNoticias").addEventListener("click", carregarNoticias);
editor.addEventListener("submit", async e => {
  e.preventDefault(); const b = editor.querySelector('[type="submit"]'); b.disabled = true;
  try {
    const id = editor.id.value;
    const dados = { titulo: editor.titulo.value.trim(), resumo: editor.resumo.value.trim(), corpo: editor.corpo.value.trim() || null, categoria: editor.categoria.value || null, concelho: editor.concelho.value || null,
      data: editor.data.value, link_original: editor.link_original.value.trim() || null, publicado: editor.publicado.checked, atualizado_em: new Date().toISOString() };
    const nova = await enviarImagemNoticia(editor.imagem.files[0]);
    dados.imagem = nova || editor.imagem_atual.value || null;
    if (!id) dados.slug = slugDe(dados.titulo) + "-" + Date.now().toString(36).slice(-4);
    const r = await fetch(`${BD.url}/rest/v1/noticias${id ? "?id=eq." + id : ""}`, { method: id ? "PATCH" : "POST", headers: { ...cab(), Prefer: "return=representation" }, body: JSON.stringify(dados) });
    if (!r.ok) throw new Error("Não foi possível guardar.");
    const guardada = (await r.json().catch(() => []))[0] || {};
    let extra = "";
    if (editor.e_evento.checked) { await criarEventoDaNoticia({ ...dados, slug: guardada.slug || dados.slug }); extra = " O evento já está na agenda."; }
    avisar((dados.publicado ? "Notícia publicada." : "Rascunho guardado.") + extra); editor.hidden = true; carregarNoticias();
  } catch (err) { avisar(err.message || "Algo correu mal."); }
  b.disabled = false;
});
$("#listaNoticias").addEventListener("click", async e => {
  const b = e.target.closest("[data-noticia]"); if (!b) return;
  const id = b.closest(".item").dataset.id, acao = b.dataset.noticia;
  const n = JSON.parse($("#listaNoticias").dataset.itens || "[]").find(x => String(x.id) === id);
  if (acao === "editar") return abrirEditor(n);
  if (acao === "apagar" && !confirm("Apagar esta notícia de vez?")) return;
  const r = await fetch(`${BD.url}/rest/v1/noticias?id=eq.${id}`, acao === "apagar" ? { method: "DELETE", headers: cab() }
    : { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ publicado: acao === "publicar", atualizado_em: new Date().toISOString() }) });
  if (!r.ok) return avisar("Não foi possível guardar.");
  avisar(acao === "apagar" ? "Apagada." : acao === "publicar" ? "Publicada no site." : "Despublicada."); carregarNoticias();
});
$("#atualizar").addEventListener("click", carregar);
$("#lista").addEventListener("click", e => {
  const ir = e.target.closest("[data-ir-cliente]"); if (ir) { $("#pesquisaClientes").value = CLIENTES[ir.dataset.irCliente]?.email || ""; return document.querySelector('#modos [data-modo="clientes"]').click(); }
  const b = e.target.closest("button[data-acao]"); if (!b) return; mudar(b.closest(".item").dataset.id, b.dataset.acao);
});
mostrar();


/* ---------- Parceiros (Empresas Amigas da Cultura) ---------- */
const editorP = $("#editorParceiro");
async function carregarParceiros() {
  const r = await fetch(`${BD.url}/rest/v1/parceiros?select=*&order=ordem.asc,nome.asc&limit=200`, { headers: cab() });
  if (r.status === 401) return sair();
  const itens = r.ok ? await r.json() : [];
  $("#nParceiros").textContent = `${itens.length} parceiros · ${itens.filter(p => p.ativo).length} ativos`;
  $("#vazioParceiros").hidden = itens.length > 0;
  $("#listaParceiros").innerHTML = itens.map(p => `<article class="item" data-id="${p.id}">
    <div class="item-img">${p.imagem ? `<img src="${esc(p.imagem)}" alt="" style="object-fit:contain;padding:10px" onerror="this.parentElement.textContent='imagem indisponível'">` : "sem logótipo"}</div>
    <div class="item-corpo">
      <span class="estado ${p.ativo ? "" : "rascunho"}">${p.ativo ? "Ativo" : "Inativo"}</span>
      <span class="etiq">${p.tipo === "banner" ? "Banner" : "Logótipo"} · ${esc(p.plano || "Sem plano")} · ordem ${p.ordem ?? 0}${p.ate ? ` · ${p.ate >= hojeIso() ? "pago até" : "expirou a"} ${dataPt(p.ate)}` : ""}</span>
      <h3>${esc(p.nome)}</h3>
      <p class="links">${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link)}</a>` : ""}</p>
      <div class="acoes">
        <button class="pendente" data-parceiro="editar">Editar</button>
        <button class="${p.ativo ? "rejeitar" : "aprovar"}" data-parceiro="${p.ativo ? "desativar" : "ativar"}">${p.ativo ? "Desativar" : "Ativar"}</button>
        <button class="apagar" data-parceiro="apagar">Apagar</button>
      </div>
    </div>
  </article>`).join("");
  $("#listaParceiros").dataset.itens = JSON.stringify(itens);
}
function abrirEditorParceiro(p) {
  editorP.reset(); editorP.hidden = false;
  editorP.id.value = p?.id || ""; editorP.imagem_atual.value = p?.imagem || "";
  $("#editorParceiroTitulo").textContent = p ? "Editar parceiro" : "Novo parceiro";
  if (p) { editorP.tipo.value = p.tipo || "logo"; editorP.ate.value = p.ate || ""; editorP.nome.value = p.nome || ""; editorP.plano.value = p.plano || ""; editorP.link.value = p.link || ""; editorP.ordem.value = p.ordem ?? 10; editorP.ativo.checked = !!p.ativo; }
  editorP.scrollIntoView({ behavior: "smooth", block: "start" }); editorP.nome.focus();
}
$("#novoParceiro").addEventListener("click", () => abrirEditorParceiro(null));
$("#cancelarParceiro").addEventListener("click", () => { editorP.hidden = true; });
$("#atualizarParceiros").addEventListener("click", carregarParceiros);
editorP.addEventListener("submit", async e => {
  e.preventDefault(); const b = editorP.querySelector('[type="submit"]'); b.disabled = true;
  try {
    const id = editorP.id.value;
    const dados = { nome: editorP.nome.value.trim(), plano: editorP.plano.value || null, link: editorP.link.value.trim() || null, ordem: Number(editorP.ordem.value) || 0, ativo: editorP.ativo.checked, tipo: editorP.tipo.value, ate: editorP.ate.value || null };
    const banner = dados.tipo === "banner";
    const nova = await enviarImagemNoticia(editorP.imagem.files[0], "parceiros", banner ? 1600 : 800, true);
    if (banner && !nova && !editorP.imagem_atual.value) throw new Error("O banner precisa de uma imagem.");
    dados.imagem = nova || editorP.imagem_atual.value || null;
    const r = await fetch(`${BD.url}/rest/v1/parceiros${id ? "?id=eq." + id : ""}`, { method: id ? "PATCH" : "POST", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify(dados) });
    if (!r.ok) throw new Error(r.status === 400 ? "Falta atualizar a base de dados (script de 6 nov) para usar banners e datas." : "Não foi possível guardar.");
    avisar("Parceiro guardado."); editorP.hidden = true; carregarParceiros();
  } catch (err) { avisar(err.message || "Algo correu mal."); }
  b.disabled = false;
});
$("#listaParceiros").addEventListener("click", async e => {
  const b = e.target.closest("[data-parceiro]"); if (!b) return;
  const id = b.closest(".item").dataset.id, acao = b.dataset.parceiro;
  const p = JSON.parse($("#listaParceiros").dataset.itens || "[]").find(x => String(x.id) === id);
  if (acao === "editar") return abrirEditorParceiro(p);
  if (acao === "apagar" && !confirm("Apagar este parceiro de vez?")) return;
  const r = await fetch(`${BD.url}/rest/v1/parceiros?id=eq.${id}`, acao === "apagar" ? { method: "DELETE", headers: cab() }
    : { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ ativo: acao === "ativar" }) });
  if (!r.ok) return avisar("Não foi possível guardar.");
  avisar(acao === "apagar" ? "Apagado." : acao === "ativar" ? "Parceiro visível no site." : "Parceiro escondido."); carregarParceiros();
});


/* ---------- Clientes (contas criadas no site) ---------- */
let LISTA_CLIENTES = [], CONTAGEM = {};
async function carregarClientes() {
  const [rc, rs] = await Promise.all([
    fetch(`${BD.url}/rest/v1/clientes?select=*&order=criado_em.desc&limit=1000`, { headers: cab() }),
    fetch(`${BD.url}/rest/v1/submissoes?select=autor,estado&autor=not.is.null&limit=5000`, { headers: cab() })
  ]);
  if (rc.status === 401) return sair();
  if (!rc.ok) { $("#nClientes").textContent = "Falta atualizar a base de dados (script das contas de clientes)."; $("#listaClientes").innerHTML = ""; return; }
  // a equipa (moderadores) não aparece na lista de clientes
  const rmod = await fetch(`${BD.url}/rest/v1/moderadores?select=email`, { headers: cab() }).catch(() => null);
  const equipa = new Set((rmod && rmod.ok ? await rmod.json() : []).map(m => String(m.email).toLowerCase()));
  LISTA_CLIENTES = (await rc.json()).filter(c => !equipa.has(String(c.email || "").toLowerCase()));
  CONTAGEM = {}; (rs.ok ? await rs.json() : []).forEach(x => { const c = CONTAGEM[x.autor] ||= { total: 0, pendente: 0 }; c.total++; if (x.estado === "pendente") c.pendente++; });
  desenharClientes();
}
function desenharClientes() {
  const q = $("#pesquisaClientes").value.trim().toLowerCase(), f = $("#filtroClientes").value;
  const lista = LISTA_CLIENTES.filter(c => (!q || `${c.nome} ${c.email} ${c.empresa} ${c.telefone}`.toLowerCase().includes(q)) && (!f || (f === "em-dia") === emDia(c)));
  $("#nClientes").textContent = `${LISTA_CLIENTES.length} contas · ${LISTA_CLIENTES.filter(emDia).length} com assinatura em dia${lista.length !== LISTA_CLIENTES.length ? ` · a mostrar ${lista.length}` : ""}`;
  $("#vazioClientes").hidden = lista.length > 0;
  const tel = t => String(t || "").replace(/\D/g, "");
  $("#listaClientes").innerHTML = lista.map(c => {
    const n = CONTAGEM[c.id] || { total: 0, pendente: 0 }, t = tel(c.telefone);
    return `<article class="cliente" data-id="${esc(c.id)}">
      <div class="cliente-info">
        <h3>${esc(c.nome || "(sem nome)")}${c.empresa ? ` <i>· ${esc(c.empresa)}</i>` : ""}</h3>
        <p class="meta"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>${t ? ` · <a href="https://wa.me/${t.length === 9 ? "351" + t : t}" target="_blank" rel="noopener">${esc(c.telefone)}</a>` : ""} · conta desde ${dataPt(c.criado_em)}</p>
        <p class="meta">${n.total} publicaç${n.total === 1 ? "ão" : "ões"}${n.pendente ? ` · <b>${n.pendente} à espera</b>` : ""}</p>
      </div>
      <div class="cliente-assin ${emDia(c) ? "ok" : "atraso"}">
        <span>${emDia(c) ? "Assinatura em dia" : c.assinatura_ate ? "Terminou a " + dataPt(c.assinatura_ate) : "Sem assinatura"}</span>
        <label><span>Paga até</span><input type="date" value="${esc(c.assinatura_ate || "")}" data-assin></label>
        <div class="acoes"><button class="aprovar" data-guardar-assin>Guardar</button>${c.assinatura_ate ? `<button class="apagar" data-limpar-assin>Tirar</button>` : ""}</div>
      </div>
    </article>`;
  }).join("");
}
$("#pesquisaClientes").addEventListener("input", desenharClientes);
$("#filtroClientes").addEventListener("change", desenharClientes);
$("#atualizarClientes").addEventListener("click", carregarClientes);
$("#listaClientes").addEventListener("click", async e => {
  const b = e.target.closest("[data-guardar-assin], [data-limpar-assin]"); if (!b) return;
  const art = b.closest(".cliente"), id = art.dataset.id;
  const ate = b.hasAttribute("data-limpar-assin") ? null : art.querySelector("[data-assin]").value || null;
  if (b.hasAttribute("data-guardar-assin") && !ate) return avisar("Escolhe a data até quando está paga.");
  b.disabled = true;
  const r = await fetch(`${BD.url}/rest/v1/clientes?id=eq.${id}`, { method: "PATCH", headers: { ...cab(), Prefer: "return=representation" }, body: JSON.stringify({ assinatura_ate: ate }) });
  const linhas = r.ok ? await r.json() : [];
  if (!linhas.length) { b.disabled = false; return avisar("Não foi possível guardar."); }
  const i = LISTA_CLIENTES.findIndex(c => c.id === id); if (i >= 0) LISTA_CLIENTES[i] = linhas[0]; CLIENTES[id] = linhas[0];
  avisar(ate ? `Assinatura em dia até ${dataPt(ate)}.` : "Assinatura retirada."); desenharClientes();
});

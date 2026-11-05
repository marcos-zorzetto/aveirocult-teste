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

function mostrar() {
  const ok = sessao && sessao.expira > Date.now();
  $("#entrada").hidden = !!ok; $("#painel").hidden = !ok; $("#sair").hidden = !ok;
  if (ok) { carregar(); lerAuto(); } else if (sessao) sair();
}

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
  $("#vazio").hidden = itens.length > 0;
  $("#lista").innerHTML = itens.map(i => `<article class="item" data-id="${i.id}">
    <div class="item-img">${i.imagem ? `<a href="${esc(i.imagem)}" target="_blank" rel="noopener"><img src="${esc(i.imagem)}" alt="" onerror="this.parentElement.parentElement.textContent='imagem indisponível'"></a>` : "sem imagem"}</div>
    <div class="item-corpo">
      <span class="etiq">${i.tipo === "evento" ? "Evento" : "Artista"} <i>· ${esc(i.categoria || "")}${i.concelho ? " · " + esc(i.concelho) : ""}</i></span>
      <h3>${esc(i.titulo)}</h3>
      ${i.tipo === "evento" ? `<p class="meta">${dataPt(i.data)}${i.hora ? " · " + esc(i.hora.slice(0, 5)) : ""}${i.local ? " · " + esc(i.local) : ""}</p>` : ""}
      <p class="desc">${esc(i.descricao || "")}</p>
      ${i.tipo === "evento" ? `<p class="tags">${(i.tags || []).length ? i.tags.map(t => `<span>#${esc(t)}</span>`).join("") : "<i>sem tags</i>"} <button class="ligacao" data-acao="tags">editar tags</button></p>` : ""}
      <p class="links">${[i.link, i.site, i.rede].filter(Boolean).map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("")}</p>
      <p class="quem">Enviado por <b>${esc(i.responsavel || "?")}</b> · ${esc(i.email || "")} · ${dataPt(i.criado_em)}${i.nota_moderacao ? ` · nota: ${esc(i.nota_moderacao)}` : ""}</p>
      <div class="acoes">
        ${i.estado !== "aprovado" ? `<button class="aprovar" data-acao="aprovado">Aprovar e publicar</button>` : ""}
        ${i.estado !== "rejeitado" ? `<button class="rejeitar" data-acao="rejeitado">Rejeitar</button>` : ""}
        ${i.estado !== "pendente" ? `<button class="pendente" data-acao="pendente">Voltar a pendente</button>` : ""}
        <button class="apagar" data-acao="apagar">Apagar</button>
      </div>
    </div>
  </article>`).join("");
  contar();
}

async function mudar(id, acao) {
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
  let nota = null;
  if (acao === "rejeitado") { nota = prompt("Motivo (opcional, fica só para a equipa):") ?? ""; }
  const r = await fetch(`${BD.url}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify({ estado: acao, revisto_em: new Date().toISOString(), ...(nota !== null ? { nota_moderacao: nota || null } : {}) }) });
  if (!r.ok) return avisar("Não foi possível guardar.");
  avisar(acao === "aprovado" ? "Publicado no site e na app." : acao === "rejeitado" ? "Rejeitado." : "Voltou a pendente.");
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

/* ---------- Definição: publicação automática ---------- */
async function lerAuto() {
  const r = await fetch(`${BD.url}/rest/v1/definicoes?chave=eq.auto_publicar&select=valor`, { headers: cab() });
  const j = r.ok ? await r.json() : []; $("#autoPublicar").value = j[0]?.valor || "confiaveis";
}
$("#autoPublicar").addEventListener("change", async e => {
  const r = await fetch(`${BD.url}/rest/v1/definicoes`, { method: "POST", headers: { ...cab(), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ chave: "auto_publicar", valor: e.target.value, atualizado_em: new Date().toISOString() }) });
  avisar(r.ok ? "Definição guardada." : "Não foi possível guardar.");
});

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
  $("#modoSubmissoes").hidden = modo !== "submissoes"; $("#modoNoticias").hidden = modo !== "noticias"; $("#modoParceiros").hidden = modo !== "parceiros";
  if (modo === "noticias") carregarNoticias();
  if (modo === "parceiros") carregarParceiros();
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
function abrirEditor(n) {
  editor.reset(); editor.hidden = false;
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
    const r = await fetch(`${BD.url}/rest/v1/noticias${id ? "?id=eq." + id : ""}`, { method: id ? "PATCH" : "POST", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify(dados) });
    if (!r.ok) throw new Error("Não foi possível guardar.");
    avisar(dados.publicado ? "Notícia publicada." : "Rascunho guardado."); editor.hidden = true; carregarNoticias();
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
$("#lista").addEventListener("click", e => { const b = e.target.closest("button[data-acao]"); if (!b) return; mudar(b.closest(".item").dataset.id, b.dataset.acao); });
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
      <span class="etiq">${esc(p.plano || "Sem plano")} · ordem ${p.ordem ?? 0}</span>
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
  if (p) { editorP.nome.value = p.nome || ""; editorP.plano.value = p.plano || ""; editorP.link.value = p.link || ""; editorP.ordem.value = p.ordem ?? 10; editorP.ativo.checked = !!p.ativo; }
  editorP.scrollIntoView({ behavior: "smooth", block: "start" }); editorP.nome.focus();
}
$("#novoParceiro").addEventListener("click", () => abrirEditorParceiro(null));
$("#cancelarParceiro").addEventListener("click", () => { editorP.hidden = true; });
$("#atualizarParceiros").addEventListener("click", carregarParceiros);
editorP.addEventListener("submit", async e => {
  e.preventDefault(); const b = editorP.querySelector('[type="submit"]'); b.disabled = true;
  try {
    const id = editorP.id.value;
    const dados = { nome: editorP.nome.value.trim(), plano: editorP.plano.value || null, link: editorP.link.value.trim() || null, ordem: Number(editorP.ordem.value) || 0, ativo: editorP.ativo.checked };
    const nova = await enviarImagemNoticia(editorP.imagem.files[0], "parceiros", 800, true);
    dados.imagem = nova || editorP.imagem_atual.value || null;
    const r = await fetch(`${BD.url}/rest/v1/parceiros${id ? "?id=eq." + id : ""}`, { method: id ? "PATCH" : "POST", headers: { ...cab(), Prefer: "return=minimal" }, body: JSON.stringify(dados) });
    if (!r.ok) throw new Error("Não foi possível guardar.");
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

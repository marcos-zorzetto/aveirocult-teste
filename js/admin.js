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
  if (ok) carregar(); else if (sessao) sair();
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
$("#atualizar").addEventListener("click", carregar);
$("#lista").addEventListener("click", e => { const b = e.target.closest("button[data-acao]"); if (!b) return; mudar(b.closest(".item").dataset.id, b.dataset.acao); });
mostrar();

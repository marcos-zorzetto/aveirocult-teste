// Aveiro Cult · função "alertar-equipa"
// Chamada pela página Publicar logo depois de um cliente enviar uma publicação.
// Confirma que quem chama é o autor da publicação, que ela está "Em revisão" e que a equipa ainda não foi avisada,
// e envia à equipa (moderadores) um email com o resumo, o estado da assinatura do cliente e o botão para o painel.
// Segredos (Supabase → Edge Functions → Secrets): BREVO_API_KEY, REMETENTE_EMAIL; opcionais: REMETENTE_NOME, SITE_URL,
// ALERTA_EMAIL (emails separados por vírgula; se não existir, avisa todos os moderadores).
// SUPABASE_URL e SUPABASE_SECRET_KEYS (ou a antiga SUPABASE_SERVICE_ROLE_KEY) são dados automaticamente pelo Supabase e nunca saem do servidor.

const URL_BD = Deno.env.get("SUPABASE_URL") ?? "https://otcpgtauymtavygscxfo.supabase.co";
const CHAVE = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM";
// chave de servidor: a nova "secret key" (vai só no cabeçalho apikey); a antiga service_role fica como alternativa
const SEGREDO = (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default as string | undefined; } catch { return undefined; } })();
const LEGADO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO = Deno.env.get("BREVO_API_KEY");
const REMETENTE = Deno.env.get("REMETENTE_EMAIL");
const NOME_REMETENTE = Deno.env.get("REMETENTE_NOME") ?? "Aveiro Cult";
const SITE = (Deno.env.get("SITE_URL") ?? "https://marcos-zorzetto.github.io/aveirocult-teste/").replace(/\/?$/, "/");
const ALERTA = (Deno.env.get("ALERTA_EMAIL") ?? "").split(",").map((e) => e.trim()).filter(Boolean);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataPt = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso.slice(0, 10) + "T12:00:00"); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return responder({ enviado: false, motivo: "metodo" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!/^Bearer .+/.test(auth)) return responder({ enviado: false, motivo: "sem-sessao" }, 401);
  if (!SEGREDO && !LEGADO) return responder({ enviado: false, motivo: "sem-servico" });

  // 1) quem chama (a sessão do cliente)
  const ru = await fetch(`${URL_BD}/auth/v1/user`, { headers: { apikey: CHAVE, Authorization: auth } });
  const user = ru.ok ? await ru.json() : null;
  if (!user?.id) return responder({ enviado: false, motivo: "sem-sessao" }, 401);

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || !/^[0-9a-f-]{36}$/i.test(String(id))) return responder({ enviado: false, motivo: "id" }, 400);

  const adm: Record<string, string> = SEGREDO ? { apikey: SEGREDO, "Content-Type": "application/json" }
    : { apikey: LEGADO!, Authorization: `Bearer ${LEGADO}`, "Content-Type": "application/json" };
  const ler = async (q: string) => { const r = await fetch(`${URL_BD}/rest/v1/${q}`, { headers: adm }); return r.ok ? await r.json() : []; };

  // 2) a publicação: tem de ser deste cliente, estar em revisão, ser recente e ainda não ter gerado aviso
  const [s] = await ler(`submissoes?id=eq.${id}&select=id,tipo,titulo,estado,autor,responsavel,email,data,data_fim,recorrencia,concelho,categoria,local,imagem,criado_em,aviso_estado`);
  if (!s) return responder({ enviado: false, motivo: "nao-encontrada" }, 404);
  if (s.autor !== user.id) return responder({ enviado: false, motivo: "sem-permissao" }, 403);
  if (s.estado !== "pendente") return responder({ enviado: false, motivo: "estado" });
  if (s.aviso_estado) return responder({ enviado: false, motivo: "ja-avisado" });
  if (Date.now() - new Date(s.criado_em).getTime() > 30 * 60 * 1000) return responder({ enviado: false, motivo: "antiga" });
  if (!BREVO || !REMETENTE) return responder({ enviado: false, motivo: "sem-servico" });

  // marca já (só se ainda estiver por marcar), para dois pedidos ao mesmo tempo não gerarem dois emails
  const rm = await fetch(`${URL_BD}/rest/v1/submissoes?id=eq.${id}&aviso_estado=is.null`, { method: "PATCH", headers: { ...adm, Prefer: "return=representation" }, body: JSON.stringify({ aviso_estado: "pendente", aviso_em: new Date().toISOString() }) });
  if (!rm.ok || !(await rm.json()).length) return responder({ enviado: false, motivo: "ja-avisado" });

  // 3) a ficha do cliente (assinatura) e a quem enviar
  const [c] = await ler(`clientes?id=eq.${s.autor}&select=nome,empresa,telefone,assinatura_ate`);
  const para = ALERTA.length ? ALERTA : (await ler("moderadores?select=email")).map((m: { email: string }) => m.email).filter(Boolean);
  if (!para.length) return responder({ enviado: false, motivo: "sem-destinatarios" });

  const hoje = new Date().toISOString().slice(0, 10);
  const ate = c?.assinatura_ate as string | null | undefined;
  const assinatura = !ate ? { cor: "#8a6d00", fundo: "#fff4c2", texto: "Ainda sem assinatura registada" }
    : ate >= hoje ? { cor: "#11663a", fundo: "#dcf5e6", texto: `Assinatura em dia até ${dataPt(ate)}` }
    : { cor: "#9b1c1c", fundo: "#fde1e1", texto: `Assinatura terminou a ${dataPt(ate)}` };
  const oQue = s.tipo === "evento" ? "Evento" : "Portfólio de artista";
  const quando = s.tipo !== "evento" ? "" : s.recorrencia === "semanal" ? `Todas as semanas, desde ${dataPt(s.data)}` : dataPt(s.data) + (s.data_fim && s.data_fim.slice(0, 10) !== s.data ? ` a ${dataPt(s.data_fim)}` : "");
  const quem = [c?.nome || s.responsavel, c?.empresa].filter(Boolean).join(" · ");
  const linha = (rotulo: string, valor: string) => valor ? `<tr><td style="padding:6px 12px 6px 0;color:#6b6b76;font-size:14px;vertical-align:top;white-space:nowrap">${rotulo}</td><td style="padding:6px 0;font-size:15px">${valor}</td></tr>` : "";
  const painel = `${SITE}admin.html`;

  const assunto = `Para rever: «${s.titulo}»`;
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#0f0f14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;padding:28px 26px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-.5px;padding-bottom:18px"><span style="color:#002fa3">Aveiro</span> <span style="color:#0f0f14">Cult</span></td></tr>
<tr><td style="font-size:20px;font-weight:700;line-height:1.3;padding-bottom:8px">Nova publicação à espera de revisão</td></tr>
<tr><td style="font-size:15.5px;line-height:1.6;color:#1b1b24;padding-bottom:14px">Um cliente enviou ${s.tipo === "evento" ? "um evento" : "um portfólio"} para publicar. Só aparece no site depois de aprovares.</td></tr>
${s.imagem ? `<tr><td style="padding-bottom:14px"><img src="${esc(s.imagem)}" alt="" width="160" style="display:block;width:160px;max-width:100%;border-radius:12px"></td></tr>` : ""}
<tr><td><table role="presentation" cellpadding="0" cellspacing="0">
${linha("Título", `<b>${esc(s.titulo)}</b>`)}${linha("Tipo", esc(oQue + (s.categoria ? ` · ${s.categoria}` : "")))}${linha("Quando", esc(quando))}${linha("Onde", esc([s.local, s.concelho].filter(Boolean).join(", ")))}
${linha("Enviado por", esc(quem))}${linha("Contacto", esc([s.email, c?.telefone].filter(Boolean).join(" · ")))}
</table></td></tr>
<tr><td style="padding-top:14px"><span style="display:inline-block;background:${assinatura.fundo};color:${assinatura.cor};font-weight:700;font-size:14px;padding:8px 14px;border-radius:999px">${esc(assinatura.texto)}</span></td></tr>
<tr><td><p style="margin:22px 0"><a href="${painel}" style="display:inline-block;background:#002fa3;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">Abrir o painel e rever</a></p></td></tr>
<tr><td style="font-size:12.5px;color:#6b6b76;padding-top:18px;border-top:1px solid #e8e4dc">Recebeste este email porque fazes parte da equipa do Aveiro Cult. Ao aprovar ou rejeitar, o cliente é avisado por email.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `Nova publicação à espera de revisão\n\n${oQue}: «${s.titulo}»\n${quando ? `Quando: ${quando}\n` : ""}Enviado por: ${quem} (${s.email})\n${assinatura.texto}\n\nRever no painel: ${painel}\n\nAveiro Cult`;

  const rb = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: NOME_REMETENTE, email: REMETENTE }, replyTo: s.email ? { email: s.email, name: s.responsavel || undefined } : undefined, to: para.map((email: string) => ({ email })), subject: assunto, htmlContent: html, textContent: texto }),
  });
  if (!rb.ok) {
    console.error("brevo", rb.status, await rb.text().catch(() => ""));
    // tira a marca para não ficar registado um aviso que não saiu
    await fetch(`${URL_BD}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...adm, Prefer: "return=minimal" }, body: JSON.stringify({ aviso_estado: null, aviso_em: null }) });
    return responder({ enviado: false, motivo: "falhou-envio" }, 502);
  }
  return responder({ enviado: true });
});

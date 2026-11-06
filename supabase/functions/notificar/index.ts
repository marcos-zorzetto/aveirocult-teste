// Aveiro Cult · função "notificar"
// Chamada pelo painel da equipa depois de aprovar ou rejeitar uma publicação de um cliente.
// Confirma que quem chama é moderador, lê a publicação e envia ao cliente o email de "publicado" ou "não publicado"
// (com o motivo e o link do WhatsApp). O envio é feito pela API da Brevo.
// Segredos (Supabase → Edge Functions → Secrets): BREVO_API_KEY, REMETENTE_EMAIL; opcionais: REMETENTE_NOME, SITE_URL, WHATSAPP.

const URL_BD = Deno.env.get("SUPABASE_URL") ?? "https://otcpgtauymtavygscxfo.supabase.co";
const CHAVE = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM";
const BREVO = Deno.env.get("BREVO_API_KEY");
const REMETENTE = Deno.env.get("REMETENTE_EMAIL");
const NOME_REMETENTE = Deno.env.get("REMETENTE_NOME") ?? "Aveiro Cult";
const SITE = (Deno.env.get("SITE_URL") ?? "https://marcos-zorzetto.github.io/aveirocult-teste/").replace(/\/?$/, "/");
const WHATS = Deno.env.get("WHATSAPP") ?? "351963067821";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function moldura(titulo: string, conteudo: string) {
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#0f0f14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;padding:28px 26px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-.5px;padding-bottom:18px"><span style="color:#002fa3">Aveiro</span> <span style="color:#0f0f14">Cult</span></td></tr>
<tr><td style="font-size:20px;font-weight:700;line-height:1.3;padding-bottom:12px">${titulo}</td></tr>
<tr><td style="font-size:15.5px;line-height:1.6;color:#1b1b24">${conteudo}</td></tr>
<tr><td style="font-size:12.5px;color:#6b6b76;padding-top:22px;border-top:1px solid #e8e4dc">Recebeste este email porque tens conta no Aveiro Cult e enviaste uma publicação. Acompanha tudo em <a href="${SITE}conta.html" style="color:#002fa3">A minha conta</a>.</td></tr>
</table></td></tr></table></body></html>`;
}
const botao = (href: string, texto: string, cor = "#002fa3") =>
  `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:${cor};color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">${texto}</a></p>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return responder({ enviado: false, motivo: "metodo" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!/^Bearer .+/.test(auth)) return responder({ enviado: false, motivo: "sem-sessao" }, 401);
  const cab = { apikey: CHAVE, Authorization: auth, "Content-Type": "application/json" };

  // 1) só a equipa pode pedir envios
  const rm = await fetch(`${URL_BD}/rest/v1/rpc/e_moderador`, { method: "POST", headers: cab, body: "{}" });
  if (!rm.ok || (await rm.json()) !== true) return responder({ enviado: false, motivo: "sem-permissao" }, 403);

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || !/^[0-9a-f-]{36}$/i.test(String(id))) return responder({ enviado: false, motivo: "id" }, 400);

  // 2) a publicação (lida com a sessão do moderador)
  const rs = await fetch(`${URL_BD}/rest/v1/submissoes?id=eq.${id}&select=id,tipo,titulo,estado,email,responsavel,nota_moderacao,autor,aviso_estado`, { headers: cab });
  const s = rs.ok ? (await rs.json())[0] : null;
  if (!s) return responder({ enviado: false, motivo: "nao-encontrada" }, 404);
  if (s.estado !== "aprovado" && s.estado !== "rejeitado") return responder({ enviado: false, motivo: "estado" });
  if (!s.autor || !s.email) return responder({ enviado: false, motivo: "sem-conta" });
  if (s.aviso_estado === s.estado) return responder({ enviado: false, motivo: "ja-avisado" });
  if (!BREVO || !REMETENTE) return responder({ enviado: false, motivo: "sem-servico" });

  // 3) o email
  const nome = String(s.responsavel || "").trim().split(/\s+/)[0] || "";
  const ola = `Olá${nome ? " " + nome : ""},`;
  const oQue = s.tipo === "evento" ? "o teu evento" : "o teu portfólio";
  const titulo = esc(s.titulo);
  let assunto: string, html: string, texto: string;
  if (s.estado === "aprovado") {
    const link = `${SITE}${s.tipo === "evento" ? "evento" : "artista"}.html?id=${s.id}`;
    assunto = `Publicado: «${s.titulo}» já está no Aveiro Cult`;
    html = moldura(`Já está publicado! 🎉`, `<p>${esc(ola)}</p><p>Boa notícia: a equipa aprovou ${oQue} <b>«${titulo}»</b> e já aparece no site e na app do Aveiro Cult.</p>${botao(link, "Ver a publicação")}<p>Partilha o link nas tuas redes para chegar a mais gente.</p>`);
    texto = `${ola}\n\nA equipa aprovou ${oQue} «${s.titulo}» e já aparece no site e na app do Aveiro Cult.\nVer: ${link}\n\nAveiro Cult`;
  } else {
    const wa = `https://wa.me/${WHATS}?text=${encodeURIComponent(`Olá Mariana! A minha publicação «${s.titulo}» não foi publicada no Aveiro Cult (conta ${s.email}). Podemos falar?`)}`;
    const motivo = s.nota_moderacao ? `<p style="background:#fdecec;color:#8a1717;padding:12px 14px;border-radius:12px"><b>Motivo:</b> ${esc(s.nota_moderacao)}</p>` : "";
    assunto = `«${s.titulo}» não foi publicado`;
    html = moldura(`Desta vez não foi publicado`, `<p>${esc(ola)}</p><p>A equipa reviu ${oQue} <b>«${titulo}»</b> e, por agora, não foi publicado.</p>${motivo}<p>Se tiveres dúvidas, quiseres corrigir alguma coisa ou regularizar a assinatura, fala diretamente com a Mariana no WhatsApp:</p>${botao(wa, "Falar com a Mariana no WhatsApp", "#1f8a4c")}`);
    texto = `${ola}\n\nA equipa reviu ${oQue} «${s.titulo}» e, por agora, não foi publicado.${s.nota_moderacao ? "\nMotivo: " + s.nota_moderacao : ""}\n\nFala com a Mariana no WhatsApp: ${wa}\n\nAveiro Cult`;
  }

  const rb = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: NOME_REMETENTE, email: REMETENTE }, replyTo: { email: REMETENTE, name: NOME_REMETENTE }, to: [{ email: s.email, name: s.responsavel || undefined }], subject: assunto, htmlContent: html, textContent: texto }),
  });
  if (!rb.ok) {
    console.error("brevo", rb.status, await rb.text().catch(() => ""));
    return responder({ enviado: false, motivo: "falhou-envio" }, 502);
  }

  // 4) regista o aviso para não repetir
  await fetch(`${URL_BD}/rest/v1/submissoes?id=eq.${id}`, { method: "PATCH", headers: { ...cab, Prefer: "return=minimal" }, body: JSON.stringify({ aviso_estado: s.estado, aviso_em: new Date().toISOString() }) });
  return responder({ enviado: true });
});

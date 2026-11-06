# Migração do site novo para aveirocult.com

Guia para pôr o site novo no domínio da Mariana. **Não fazer nada disto sem a aprovação dela.**
Nada aqui apaga o WordPress: ele fica guardado como cópia de segurança.

## O que está pronto

- `migracao/migrar.py`: cria uma cópia do site já com o domínio definitivo, sem "noindex" e com o sitemap gerado.
- `migracao/.htaccess`: redirecionamentos das páginas e notícias antigas do WordPress, HTTPS, cache e cabeçalhos de segurança (servidores Apache/cPanel, o mais comum em Portugal).
- `404.html`: página de erro com ligações para a agenda e notícias.
- Base de dados (Supabase): não muda. O site continua a usar a mesma, venha de onde vier.

## Antes do dia da mudança

1. **Saber onde está o site hoje.** Ver no GoDaddy (onde está o aveirocult.com) para onde apontam os DNS e qual é a hospedagem do WordPress. Precisamos do acesso ao painel da hospedagem (cPanel ou outro). As senhas são da Mariana: ela entra ou partilha o acesso de forma segura, nunca por WhatsApp.
2. **Cópia de segurança completa do WordPress** (ficheiros + base de dados), feita pela própria hospedagem ou com o plugin UpdraftPlus. Guardar fora do servidor.
3. **Exportar as notícias que faltam** do WordPress (Ferramentas → Exportar) para as importar no painel de notícias do site novo.
4. **Emails do site (Brevo), em modo profissional e seguro.** Os emails de confirmação de conta, recuperação de palavra-passe e "publicado / não publicado" saem pela Brevo. Antes da mudança:
   - **Conta em nome do Aveiro Cult**, criada pela Mariana com o email dela. O Marcos entra como utilizador convidado, sem partilhar senhas. Ativar a **autenticação em dois passos** (2FA) nas contas da Brevo e do Supabase.
   - **Autenticar o domínio aveirocult.com na Brevo** (Senders, Domains & Dedicated IPs → Domains): a Brevo dá registos DNS (código Brevo, DKIM e DMARC) para pôr no GoDaddy. Sem isto os emails podem ir para o spam e qualquer pessoa pode fingir ser o Aveiro Cult. Com DMARC começar em `p=none`, passar a `p=quarantine` depois de 2 semanas sem problemas.
   - **Remetente do domínio**, por exemplo `nao-responder@aveirocult.com` (nome "Aveiro Cult") e respostas para o email da Mariana. Deixar de usar o @gmail como remetente.
   - **Chave de API só no Supabase** (Edge Functions → Secrets: `BREVO_API_KEY`, `REMETENTE_EMAIL`, `SITE_URL=https://aveirocult.com/`). Nunca no código do site, em ficheiros ou por WhatsApp. Uma chave só para o site, com o nome "site aveirocult.com", para se poder revogar sem afetar mais nada. Trocar a chave se alguma vez for exposta e uma vez por ano.
   - **SMTP do Supabase pela Brevo** (Authentication → Emails → SMTP Settings: `smtp-relay.brevo.com`, porta 587, utilizador e chave SMTP da Brevo, remetente do domínio). Depois **voltar a ligar "Confirm email"** em Sign In / Providers → Email, para só entrar quem confirma o email.
   - **Proteção de palavras-passe**: em Authentication → Attack Protection, ligar o CAPTCHA no registo se aparecerem contas falsas.
   - **RGPD**: a Brevo é europeia (França) e tem acordo de tratamento de dados (DPA) nas definições da conta; aceitar. A política de privacidade do site já a menciona.

## No dia da mudança

1. No computador, na pasta do site: `python migracao/migrar.py https://aveirocult.com/`
   Cria a pasta `site-aveirocult-com` ao lado, pronta a enviar.
2. Na hospedagem, mover o WordPress para uma subpasta (ex.: `wordpress-antigo/`) ou renomear a pasta pública, **sem apagar**.
3. Enviar todo o conteúdo de `site-aveirocult-com` (incluindo o ficheiro escondido `.htaccess`) para a pasta pública (`public_html`).
4. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://aveirocult.com/`
   - Redirect URLs: acrescentar `https://aveirocult.com/**` (painel e "A minha conta") e retirar o endereço do github.io
   - Edge Functions → Secrets: `SITE_URL` = `https://aveirocult.com/` (links dos emails)
5. **Google Analytics**: confirmar que o ID (G-…) está em `js/analytics.js` e que o fluxo de dados aponta para aveirocult.com.
6. **Google Search Console**: adicionar aveirocult.com, enviar `https://aveirocult.com/sitemap.xml`.

## Testar logo a seguir

- `https://aveirocult.com/` abre o site novo com cadeado (HTTPS).
- `http://www.aveirocult.com/` vai parar a `https://aveirocult.com/`.
- `https://aveirocult.com/sobre/` vai para a página Sobre.
- Uma notícia antiga, por exemplo `https://aveirocult.com/ana-moura-atua-nos-festivais-de-outono-2026/`, abre a notícia nova.
- Um endereço inventado mostra a página 404.
- `https://aveirocult.com/admin.html` deixa entrar a Mariana.
- Instalar a app no telemóvel (Android e iPhone) e ver que abre.
- Criar uma conta de cliente de teste, confirmar o email, publicar um evento, rejeitá-lo no painel e ver que chega o email com o motivo e o WhatsApp (e que não vai para o spam). Apagar a conta de teste no fim.

## Se algo correr mal

Voltar a pôr o WordPress na pasta pública (repor a pasta renomeada). Como o domínio e os DNS não mudam, o site antigo volta em minutos.

## Depois

- Pedir à Mariana para mudar as senhas que foram partilhadas por WhatsApp (WordPress, Adalo, hospedagem).
- Quando a app do Adalo deixar de ser usada, cancelar o plano.
- O domínio aveirocult.pt (dominios.pt) pode redirecionar para aveirocult.com.

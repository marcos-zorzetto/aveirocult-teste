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
4. **Email para recuperar palavras-passe (SMTP).** O Supabase grátis só envia emails para a equipa do projeto. Para a Mariana poder recuperar a palavra-passe sozinha, configurar um SMTP em Supabase → Authentication → Emails → SMTP Settings (ex.: Resend, grátis até 3.000 emails/mês, ou o email do domínio se a hospedagem incluir).

## No dia da mudança

1. No computador, na pasta do site: `python migracao/migrar.py https://aveirocult.com/`
   Cria a pasta `site-aveirocult-com` ao lado, pronta a enviar.
2. Na hospedagem, mover o WordPress para uma subpasta (ex.: `wordpress-antigo/`) ou renomear a pasta pública, **sem apagar**.
3. Enviar todo o conteúdo de `site-aveirocult-com` (incluindo o ficheiro escondido `.htaccess`) para a pasta pública (`public_html`).
4. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://aveirocult.com/`
   - Redirect URLs: acrescentar `https://aveirocult.com/admin.html`
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
- Enviar um evento de teste pelo formulário e apagá-lo no painel.

## Se algo correr mal

Voltar a pôr o WordPress na pasta pública (repor a pasta renomeada). Como o domínio e os DNS não mudam, o site antigo volta em minutos.

## Depois

- Pedir à Mariana para mudar as senhas que foram partilhadas por WhatsApp (WordPress, Adalo, hospedagem).
- Quando a app do Adalo deixar de ser usada, cancelar o plano.
- O domínio aveirocult.pt (dominios.pt) pode redirecionar para aveirocult.com.

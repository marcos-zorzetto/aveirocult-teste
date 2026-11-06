# Prepara uma cópia do site para o domínio definitivo (ex.: https://aveirocult.com/).
# Não altera esta pasta: cria a pasta ../site-aveirocult-com/ pronta a enviar para a hospedagem.
#
#   python migracao/migrar.py https://aveirocult.com/
#
# O que faz:
#  1. troca o endereço de teste (GitHub Pages) pelo domínio definitivo em canonical, og:url, JSON-LD, robots, sitemap e 404;
#  2. tira o "noindex" de todas as páginas públicas (o painel admin.html e a página 404 continuam fora do Google);
#  3. copia o .htaccess (redirecionamentos do WordPress antigo, HTTPS, cache e cabeçalhos de segurança);
#  4. gera o sitemap.xml com as notícias, eventos e artistas publicados (precisa de internet).
import re, shutil, subprocess, sys, pathlib

TESTE = "https://marcos-zorzetto.github.io/aveirocult-teste/"
if len(sys.argv) != 2 or not re.match(r"^https://[^/]+/$", sys.argv[1]):
    sys.exit("Uso: python migracao/migrar.py https://aveirocult.com/   (com https:// e a barra no fim)")
NOVO = sys.argv[1]
raiz = pathlib.Path(__file__).resolve().parent.parent
destino = raiz.parent / ("site-" + re.sub(r"[^a-z0-9]+", "-", NOVO.split("//")[1].strip("/").lower()))
if destino.exists(): shutil.rmtree(destino)
ignorar = shutil.ignore_patterns(".git", "migracao", "__pycache__", "*.md")
shutil.copytree(raiz, destino, ignore=ignorar)

SEMPRE_FORA = {"admin.html", "404.html"}
for f in destino.rglob("*"):
    if f.suffix not in {".html", ".js", ".txt", ".xml", ".py", ".webmanifest"}: continue
    s = f.read_text(encoding="utf-8"); antes = s
    s = s.replace(TESTE, NOVO)
    if f.suffix == ".html" and f.name not in SEMPRE_FORA:
        s = re.sub(r'\s*<!-- Endereço de teste:[^>]*-->', "", s)
        s = re.sub(r'\s*<meta name="robots" content="noindex[^"]*">', "", s)
    if s != antes: f.write_text(s, encoding="utf-8"); print("atualizado:", f.relative_to(destino))

shutil.copy(raiz / "migracao" / ".htaccess", destino / ".htaccess")
print("copiado: .htaccess")
try:
    subprocess.run([sys.executable, "gerar_sitemap.py"], cwd=destino, check=True)
except Exception as e:
    print("AVISO: sitemap não gerado (sem internet?). Corre depois, dentro da pasta nova: python gerar_sitemap.py", e)

restos = [str(f.relative_to(destino)) for f in destino.rglob("*.*") if f.suffix in {".html", ".js", ".txt", ".xml"} and TESTE in f.read_text(encoding="utf-8", errors="ignore")]
print("\nPasta pronta:", destino)
print("Endereços de teste que sobraram:", restos or "nenhum")

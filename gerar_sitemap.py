# Gera sitemap.xml com as páginas fixas e todas as notícias, eventos e artistas publicados.
# Correr na pasta do site:  python gerar_sitemap.py   (precisa de internet; não precisa de chave privada)
import json, urllib.request, datetime
BASE = "https://marcos-zorzetto.github.io/aveirocult-teste/"   # trocar por https://aveirocult.com/ na migração
URL, CHAVE = "https://otcpgtauymtavygscxfo.supabase.co", "sb_publishable_DiaWIBUyBbCHnCDolUWFuw_fjONpncM"
def ler(q):
    r = urllib.request.Request(f"{URL}/rest/v1/{q}", headers={"apikey": CHAVE, "Authorization": f"Bearer {CHAVE}"})
    return json.load(urllib.request.urlopen(r, timeout=60))
hoje = datetime.date.today().isoformat()
linhas = [("", "1.0", "daily", hoje), ("empresas.html", "0.6", "monthly", hoje), ("sobre.html", "0.6", "monthly", hoje), ("privacidade.html", "0.2", "yearly", hoje)]
for n in ler("noticias?select=slug,id,data,atualizado_em&publicado=is.true&order=data.desc"):
    linhas.append((f"noticia.html?n={n['slug'] or n['id']}", "0.7", "monthly", (n.get("atualizado_em") or n["data"])[:10]))
for e in ler(f"eventos_publicos?select=id,data,criado_em&data=gte.{hoje}&order=data.asc"):
    linhas.append((f"evento.html?id={e['id']}", "0.8", "weekly", e["criado_em"][:10]))
for a in ler("artistas_publicos?select=id,criado_em&order=criado_em.desc"):
    linhas.append((f"artista.html?id={a['id']}", "0.5", "monthly", a["criado_em"][:10]))
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"  <url><loc>{BASE}{u.replace('&', '&amp;')}</loc><lastmod>{d}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority></url>\n" for u, p, c, d in linhas) + "</urlset>\n"
open("sitemap.xml", "w", encoding="utf-8").write(xml)
print(f"sitemap.xml com {len(linhas)} páginas")

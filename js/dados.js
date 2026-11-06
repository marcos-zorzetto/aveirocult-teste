// Conteúdo real do aveirocult.com (recolhido a 5/11/2026 pela API do WordPress).
// Na versão final estes dados vêm do painel de gestão; aqui ficam num ficheiro para a versão de teste.

// Imagens de ambiente do hero (rodam automaticamente)
const HERO = [
  { f: "img/hero-02.jpg", alt: "Mesa de restaurante com luz quente" },
  { f: "img/post-01.jpg", alt: "Artistas da Noite do Circo em palco" },
  { f: "img/post-07.jpg", alt: "Orquestra Filarmonia das Beiras" },
  { f: "img/post-06.jpg", alt: "Rui Paixão no espetáculo GLÜLT" },
  { f: "img/post-03.jpg", alt: "Músicos da 8ª Avenida Jazz" }
];

// t: título · d: data · l: ligação · ex: resumo · cat: categoria · onde: concelho · f: imagem (vazio = sem imagem)
const NOTICIAS = [
  { t: "Noite do Circo regressa ao Museu de Lamas", d: "2026-10-29", cat: "Teatro & Circo", onde: "Santa Maria da Feira", f: "img/post-01-800.jpg", l: "https://aveirocult.com/noite-do-circo-regressa-ao-museu-de-lamas/", ex: "A Noite do Circo regressa ao Museu de Santa Maria de Lamas a 13 e 14 de novembro, com 15 artistas de cinco nacionalidades e cinco espetáculos." },
  { t: "Mercadinho de Outono anima o Largo do Mercado Manuel Firmino", d: "2026-10-29", cat: "Família", onde: "Aveiro", f: "img/post-02-800.jpg", l: "https://aveirocult.com/mercadinho-de-outono-anima-o-largo-do-mercado-manuel-firmino-de-28-de-outubro-a-1-de-novembro/", ex: "De 28 de outubro a 1 de novembro, uma iniciativa que celebra os sabores e as cores da estação, com comboio elétrico, jogos tradicionais e oficinas." },
  { t: "8ª Avenida volta a ser palco do jazz com dois dias de música, talento e cultura", d: "2026-10-29", cat: "Música", onde: "São João da Madeira", f: "img/post-03-800.jpg", l: "https://aveirocult.com/8a-avenida-volta-a-ser-palco-do-jazz-com-dois-dias-de-musica-talento-e-cultura/", ex: "A 31 de outubro e 1 de novembro, novos talentos, música ao vivo, DJ e feira de vinil celebram o jazz num programa que promete surpreender." },
  { t: "Ana Moura atua nos Festivais de Outono 2026", d: "2026-10-28", cat: "Música", onde: "Aveiro", f: "img/post-04-800.jpg", l: "https://aveirocult.com/ana-moura-atua-nos-festivais-de-outono-2026/", ex: "Com uma carreira sem paralelo no fado contemporâneo, Ana Moura sobe ao palco da Nave Multiusos Caixa UA, no âmbito dos Festivais de Outono 2026." },
  { t: "Aveiro em Movimento promove debate sobre longevidade e saúde após o alto rendimento", d: "2026-10-28", cat: "Desporto", onde: "Aveiro", f: "img/post-05-800.jpg", l: "https://aveirocult.com/aveiro-em-movimento-promove-debate-sobre-longevidade-e-saude-apos-o-alto-rendimento/", ex: "Aurora Cunha, Jaime Pacheco e Rui Sampaio partilham experiências sobre a vida depois da competição, numa mesa-redonda do programa municipal." },
  { t: "Rui Paixão estreia em novembro um novo espetáculo", d: "2026-10-26", cat: "Teatro & Circo", onde: "Ovar", f: "img/post-06-800.jpg", l: "https://aveirocult.com/rui-paixao-estreia-em-novembro-um-novo-espetaculo/", ex: "GLÜLT é o nome do novo solo, com estreia em França no Les SUBS, integrado na La Nuit du Cirque, e passagem por Ovar a 20 de novembro." },
  { t: "Festivais de Outono 2026 abrem com Orquestra das Beiras e peças que dialogam entre artes", d: "2026-10-22", cat: "Música", onde: "Aveiro", f: "img/post-07-800.jpg", l: "https://aveirocult.com/festivais-de-outono-2026-abrem-com-orquestra-das-beiras-e-pecas-que-dialogam-entre-artes/", ex: "A música assume-se como pilar central da descoberta nos Festivais de Outono 2026, traduzida no tema “Música+”, na Universidade de Aveiro." },
  { t: "Tanganho: uma história real de coragem que marcou Portugal ganha vida em palco", d: "2026-10-21", cat: "Teatro & Circo", onde: "Aveiro", f: "img/post-08-800.jpg", l: "https://aveirocult.com/tanganho-uma-historia-real-de-coragem-que-marcou-portugal-ganha-vida-em-palco/", ex: "Um século depois da primeira Volta a Portugal a Cavalo, a história de Zé Tanganho chega aos palcos num espetáculo que cruza teatro, dança, cavalos e música." },
  { t: "Aveiro Techweek | Hackathon 2026 tem inscrições abertas até 4 de novembro", d: "2026-10-21", cat: "Tecnologia", onde: "Aveiro", f: "img/post-09-800.jpg", l: "https://aveirocult.com/aveiro-techweek-hackathon-2026-tem-inscricoes-abertas-ate-4-de-novembro/", ex: "Iniciativa desafia estudantes, profissionais, investigadores e empreendedores a desenvolver soluções para três desafios de tecnologia, dados e IA." },
  { t: "Câmara de Aveiro aprova protocolo com a AHRESP para «O Restaurante ao Vivo»", d: "2026-10-21", cat: "Gastronomia", onde: "Aveiro", f: "", l: "https://aveirocult.com/camara-municipal-de-aveiro-aprova-protocolo-com-a-ahresp-para-a-realizacao-do-evento-o-restauranteao-vivo/", ex: "O Executivo Municipal aprovou um protocolo com a Associação da Hotelaria, Restauração e Similares de Portugal para o evento de 6 de novembro." },
  { t: "Município de Estarreja apoia campanha que alerta para o uso excessivo do telemóvel", d: "2026-10-19", cat: "Família", onde: "Estarreja", f: "img/post-11-800.jpg", l: "https://aveirocult.com/municipio-de-estarreja-apoia-campanha-que-alerta-para-o-uso-excessivo-do-telemovel-e-do-digital/", ex: "“És mais fixe sem o teu telemóvel”: a frase surge num outdoor e não passa despercebida aos alunos da Escola Egas Moniz, em Avanca." },
  { t: "Festival da Castanha, de 23 a 25 de outubro, em Arouca", d: "2026-10-19", cat: "Gastronomia", onde: "Arouca", f: "img/post-12-800.jpg", l: "https://aveirocult.com/festival-da-castanha-de-23-a-25-de-outubro-em-arouca/", ex: "Castanha, mel e cogumelos em destaque na 15.ª edição do Festival da Castanha, no centro histórico de Arouca." },
  { t: "Câmara de Águeda apoia União de Bandas de Águeda na realização do Festival UBA", d: "2026-09-21", cat: "Música", onde: "Águeda", f: "img/post-13-800.jpg", l: "https://aveirocult.com/camara-de-agueda-apoia-uniao-de-bandas-de-agueda-na-realizacao-do-festival-uba/", ex: "Iniciativa reúne as seis bandas filarmónicas do concelho e assinala os 38 anos da União de Bandas de Águeda." },
  { t: "Música, teatro e dança marcam o último quadrimestre de 2026 no Teatro Aveirense", d: "2026-09-09", cat: "Teatro & Circo", onde: "Aveiro", f: "img/post-14-800.jpg", l: "https://aveirocult.com/musica-teatro-e-danca-marcam-o-ultimo-quadrimestre-de-2026-no-teatro-aveirense/", ex: "Entre setembro e dezembro, uma programação que cruza música, teatro, dança e criação contemporânea, com propostas para diferentes públicos." }
];

// Agenda construída a partir das notícias acima (datas confirmadas nos artigos). i = índice da notícia
const AGENDA = [
  { dia: "06", mes: "NOV", t: "O Restaurante ao Vivo", onde: "Aveiro", i: 9 },
  { dia: "13", mes: "NOV", t: "Noite do Circo", onde: "Museu de Lamas · Santa Maria da Feira", i: 0 },
  { dia: "20", mes: "NOV", t: "Rui Paixão · GLÜLT", onde: "Ovar", i: 5 },
  { dia: "NOV", mes: "FO 26", t: "Ana Moura · Festivais de Outono", onde: "Nave Multiusos Caixa UA · Aveiro", i: 3 },
  { dia: "04", mes: "DEZ", t: "Tanganho", onde: "Quintãs · Aveiro", i: 7 }
];

// Categorias do site (ícone = símbolo SVG em index.html)
const CATEGORIAS = [
  { n: "Tudo", i: "calendario", f: "" },
  { n: "Música", i: "musica", f: "Música" },
  { n: "Teatro & Circo", i: "teatro", f: "Teatro & Circo" },
  { n: "Gastronomia", i: "garfo", f: "Gastronomia" },
  { n: "Família", i: "familia", f: "Família" },
  { n: "Desporto", i: "desporto", f: "Desporto" },
  { n: "Tecnologia", i: "tech", f: "Tecnologia" }
];

const CONCELHOS = ["Águeda", "Albergaria-a-Velha", "Anadia", "Arouca", "Aveiro", "Castelo de Paiva", "Espinho", "Estarreja", "Ílhavo", "Mealhada", "Murtosa", "Oliveira de Azeméis", "Oliveira do Bairro", "Ovar", "Santa Maria da Feira", "São João da Madeira", "Sever do Vouga", "Vagos", "Vale de Cambra"];

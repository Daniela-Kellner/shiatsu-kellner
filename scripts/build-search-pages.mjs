import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Generate searchable pages from the same descriptions used by the offer dialogs.
const root = fileURLToPath(new URL('../website/', import.meta.url));
const source = await readFile(path.join(root, 'app.js'), 'utf8');
const start = source.indexOf('const offerDetails = ');
const end = source.indexOf('\nfor (const trigger', start);
if (start < 0 || end < 0) throw new Error('Offer descriptions not found');
const offers = new Function(source.slice(start, end) + '; return offerDetails;')();
const base = 'https://shiatsu-kellner.at/';
const pages = {
  shiatsu: ['shiatsu', 'Shiatsu in Mellach bei Graz', 'Individuelles Shiatsu mit Daniela Kellner in Mellach bei Graz: achtsame Körperarbeit, persönliche Begleitung und Erfahrung seit 2001.'],
  mental: ['mentaltraining-coaching', 'Mentaltraining & Coaching bei Graz', 'Mentaltraining, Coaching und Bewusstseinsarbeit mit Daniela Kellner in Mellach bei Graz. Raum für deine Ressourcen und neue Perspektiven.'],
  kakao: ['kakaozeremonien-rituale', 'Kakaozeremonien & Rituale bei Graz', 'Kakaozeremonien und persönliche Rituale mit Daniela Kellner bei Graz. Bewusst genießen, Gemeinschaft erleben oder eine Zeremonie vor Ort anfragen.'],
  moxa: ['moxa-narbenarbeit', 'Moxa & Narbenarbeit in Mellach', 'Achtsame Moxa-Wärmeanwendungen und ganzheitliche Narbenarbeit mit Daniela Kellner in Mellach bei Graz. Individuell und in deinem Tempo.'],
  schwangerschaft: ['schwangerschaft-geburt-baby', 'Shiatsu in der Schwangerschaft & Babybegleitung', 'Begleitung mit Daniela Kellner in Mellach bei Graz: Shiatsu in der Schwangerschaft, Geburtsbegleitung nach Absprache, Wochenbett und Babyzeit.'],
  kindermental: ['kinder-mentaltraining', 'Mentaltraining für Kinder & Jugendliche', 'Einfühlsames Kinder-Mentaltraining mit Daniela Kellner bei Graz: Selbstvertrauen, Gefühle und Ressourcen stärken, mit Blick auf das familiäre Umfeld.'],
  kinder: ['kinderbehandlung', 'Shiatsu-Körperarbeit für Kinder bei Graz', 'Sanfte, individuelle Körperarbeit für Kinder bis zwölf Jahre mit Daniela Kellner in Mellach bei Graz. Zeit zum Ankommen und Wohlfühlen.']
};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraphs = values => values.map(value => `<p>${escape(value)}</p>`).join('\n');
const provider = {
  '@type': 'LocalBusiness', '@id': base + '#praxis', name: 'Daniela Kellner · Shiatsu & Bewusstsein',
  url: base, telephone: '+436641034409', email: 'daniela@shiatsu-kellner.at',
  logo: base + 'assets/daniela-logo.webp', image: base + 'assets/daniela-portraet-2026.webp',
  address: { '@type': 'PostalAddress', streetAddress: 'Murbergstraße 155', postalCode: '8072', addressLocality: 'Fernitz-Mellach', addressRegion: 'Steiermark', addressCountry: 'AT' },
  areaServed: ['Enzelsdorf', 'Graz', 'Graz-Umgebung Süd'],
  sameAs: ['https://www.instagram.com/soul_life_power/'],
  hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Shiatsu und persönliche Begleitung', itemListElement: [] }
};
for (const [key, offer] of Object.entries(offers)) {
  if (!pages[key]) throw new Error('Missing search page for ' + key);
  const [slug, title, description] = pages[key];
  const url = base + 'angebote/' + slug + '/';
  const service = { '@type': 'Service', '@id': url + '#angebot', name: offer.title, serviceType: offer.title, description, url, provider: { '@id': provider['@id'] }, areaServed: ['Enzelsdorf', 'Graz', 'Graz-Umgebung Süd'] };
  provider.hasOfferCatalog.itemListElement.push({ '@type': 'Offer', itemOffered: service });
  const mediaClass = key === 'schwangerschaft' ? ' service-page-media--sepia' : key === 'kakao' ? ' service-page-media--kakao' : key === 'moxa' ? ' service-page-media--moxa' : '';
  const media = offer.image ? `<div class="service-page-media${mediaClass}"><img src="../../assets/${escape(offer.image)}" alt="${escape(offer.alt)}">${offer.extraImage ? `<img src="../../assets/${escape(offer.extraImage)}" alt="${escape(offer.extraAlt)}">` : ''}</div>` : '';
  const sections = (offer.sections || []).map(section => `<section class="detail-section"><h2>${escape(section.title)}</h2>${paragraphs(section.paragraphs)}${section.quote ? `<blockquote class="detail-quote">${escape(section.quote)}</blockquote>` : ''}${section.image ? `<figure class="detail-section-photo${section.imageNatural ? ' detail-section-photo--natural' : ''}"><img src="../../assets/${escape(section.image)}" width="${section.imageWidth || 553}" height="${section.imageHeight || 836}" alt="${escape(section.imageAlt)}" loading="lazy"><figcaption>${escape(section.imageCaption)}</figcaption></figure>` : ''}</section>`).join('\n');
  const prices = offer.prices.length ? `<dl class="treatment-prices">${offer.prices.map(([label, price]) => `<div><dt>${escape(label)}</dt><dd>${price} €</dd></div>`).join('')}</dl><p class="price-note">Standardpreise · Aktionen werden gesondert ausgewiesen.</p>` : '<p>Umfang und Rahmen der Begleitung besprechen wir persönlich.</p>';
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [service, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Startseite', item: base }, { '@type': 'ListItem', position: 2, name: offer.title, item: url }] }] });
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | Daniela Kellner</title><meta name="description" content="${escape(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${escape(title)} | Daniela Kellner"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${base}assets/${escape(offer.image || 'daniela-logo.webp')}">
<link rel="icon" href="../../assets/logo-claim.png"><link rel="stylesheet" href="../../style.css?v=20261120-oliv-zart"><script type="application/ld+json">${json}</script></head>
<body><a class="skip-link" href="#inhalt">Zum Inhalt</a><header class="service-page-header"><a class="brand" href="../../" aria-label="Daniela Kellner – Startseite"><img src="../../assets/daniela-logo.webp" width="1200" height="218" alt="Daniela Kellner"></a><a class="text-link" href="../../#angebot">Alle Angebote</a></header>
<main id="inhalt" class="service-page"><nav class="service-page-breadcrumb" aria-label="Brotkrumennavigation"><a href="../../">Startseite</a> / <a href="../../#angebot">Angebote</a> / ${escape(offer.title)}</nav>
${media}${offer.imageCredit || ''}<article class="detail-body"><p class="eyebrow">${escape(offer.eyebrow)}</p><h1>${escape(offer.title)}</h1>${offer.subtitle ? `<p class="detail-subtitle"><em>${escape(offer.subtitle)}</em></p>` : ''}${paragraphs(offer.paragraphs)}${sections}
${offer.list.length ? `<ul>${offer.list.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : ''}${prices}
<p class="service-page-location">Persönliche Begleitung im Seminarhaus am Eckhof, Murbergstraße 155, 8072 Fernitz-Mellach bei Graz. Termine nach Vereinbarung.</p>
<a class="button" href="mailto:daniela@shiatsu-kellner.at?subject=${encodeURIComponent(offer.inquirySubject || 'Anfrage: ' + offer.title)}">${escape(offer.inquiryLabel || 'Persönlich anfragen')} ↗</a>
<p class="medical-note">${escape(offer.medicalNote || 'Diese Angebote ersetzen keine ärztliche Diagnose, Psychotherapie oder medizinische Behandlung.')}</p><a class="text-link" href="../../#angebot">Zurück zur Angebotsübersicht</a></article></main>
<footer class="service-page-footer"><span>Daniela Kellner · Shiatsu &amp; Bewusstsein</span><a href="../../#kontakt">Kontakt</a><a href="../../impressum/">Impressum</a><a href="../../agb/">AGB</a></footer></body></html>\n`;
  const directory = path.join(root, 'angebote', slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), html);
}
// The fixed pair ritual and the introductory block are already readable on the homepage.
for (const [name, anchor] of [['Paar-Ritual', 'paarritual'], ['Kennenlernblock', 'kennenlernen']]) {
  provider.hasOfferCatalog.itemListElement.push({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, url: base + '#' + anchor, provider: { '@id': provider['@id'] } } });
}
const branch = { '@type': 'LocalBusiness', '@id': base + '#eckhof', name: 'Daniela Kellner · Begleitung im Seminarhaus am Eckhof', parentOrganization: { '@id': provider['@id'] }, url: base + '#kontakt', telephone: provider.telephone, address: { '@type': 'PostalAddress', streetAddress: 'Murbergstraße 155', postalCode: '8072', addressLocality: 'Fernitz-Mellach', addressRegion: 'Steiermark', addressCountry: 'AT' } };
let index = await readFile(path.join(root, 'index.html'), 'utf8');
index = index.replace(/\s*<script id="practice-search-data" type="application\/ld\+json">[\s\S]*?<\/script>/, '');
index = index.replace('</head>', `  <script id="practice-search-data" type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [provider, branch] })}</script>\n</head>`);
index = index.replace(/<button\b([^>]*\bdata-offer="([^"]+)"[^>]*)>([\s\S]*?)<\/button>/g, (_, attributes, key, content) => {
  if (!pages[key]) throw new Error('Unknown offer link: ' + key);
  return `<a${attributes} href="angebote/${pages[key][0]}/">${content}</a>`;
});
await writeFile(path.join(root, 'index.html'), index);
const urls = [base, base + 'veranstaltungen/kakaokreis-dezember-2026/', ...Object.values(pages).map(([slug]) => base + 'angebote/' + slug + '/')];
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => '  <url><loc>' + url + '</loc></url>').join('\n')}\n</urlset>\n`);
console.log(`Generated ${Object.keys(pages).length} offer pages, practice data and sitemap.`);

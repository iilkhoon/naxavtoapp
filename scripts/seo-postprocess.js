// Post-processes the static web export (dist/). Run after `expo export --platform web`.
//
// 1. Every page gets lang="az" and the site-wide title, description and Open Graph
//    tags. Tags a page already renders itself (components/web/SeoHead) are kept;
//    only the missing ones are added.
// 2. dist/sitemap.xml is rebuilt with every approved listing and plate. Without
//    network access or Supabase keys the static public/sitemap.xml stays as is.
//
// A custom app/+html.tsx would be the usual place for (1), but on SDK 58 it
// stops Expo from injecting the page's <script> tags, so pages never hydrate.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://naxavto.com';
const TITLE = 'Naxçıvan Avto — Avtomobil və nömrə elanları';
const DESCRIPTION =
  'Naxçıvanda avtomobil və qeydiyyat nişanı elanları: satış, kredit və barter. Elanınızı pulsuz yerləşdirin.';

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'hourly', priority: '1.0' },
  { loc: '/add-listing', changefreq: 'monthly', priority: '0.6' },
  { loc: '/calculator', changefreq: 'monthly', priority: '0.6' },
  { loc: '/compare', changefreq: 'monthly', priority: '0.4' },
  { loc: '/favorites', changefreq: 'monthly', priority: '0.3' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.2' },
];

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// [test for an existing tag, tag to add]
const DEFAULT_TAGS = [
  [/<meta\s+name="description"/i, `<meta name="description" content="${escapeAttr(DESCRIPTION)}"/>`],
  [/<meta\s+name="theme-color"/i, '<meta name="theme-color" content="#FF3B30"/>'],
  [/property="og:type"/i, '<meta property="og:type" content="website"/>'],
  [/property="og:site_name"/i, '<meta property="og:site_name" content="Naxçıvan Avto"/>'],
  [/property="og:locale"/i, '<meta property="og:locale" content="az_AZ"/>'],
  [/property="og:title"/i, `<meta property="og:title" content="${escapeAttr(TITLE)}"/>`],
  [/property="og:description"/i, `<meta property="og:description" content="${escapeAttr(DESCRIPTION)}"/>`],
  [/property="og:image"/i, `<meta property="og:image" content="${SITE_URL}/og-image.png"/>`],
  [/<meta\s+name="twitter:card"/i, '<meta name="twitter:card" content="summary_large_image"/>'],
  [
    /application\/ld\+json/i,
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'AutoDealer',
      name: 'Naxçıvan Avto',
      url: SITE_URL,
      description: DESCRIPTION,
      areaServed: { '@type': 'AdministrativeArea', name: 'Naxçıvan Muxtar Respublikası' },
    })}</script>`,
  ],
];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.html') ? [full] : [];
  });

function processHtml(html) {
  let out = html.replace(/<html(\s+lang="[^"]*")?/, '<html lang="az"');

  // An empty <title> from the export is replaced; a page-specific one is kept
  out = out.replace(/<title[^>]*>\s*<\/title>/i, '');
  const head = out.slice(0, out.indexOf('</head>'));
  const missing = [];
  if (!/<title[^>]*>[^<]+<\/title>/i.test(head)) missing.push(`<title>${escapeXml(TITLE)}</title>`);
  for (const [test, tag] of DEFAULT_TAGS) if (!test.test(head)) missing.push(tag);

  return missing.length ? out.replace('<head>', `<head>${missing.join('')}`) : out;
}

// Minimal .env reader (the build has no dotenv dependency)
function readEnv() {
  const env = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function fetchRows(env, table) {
  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=id,short_id,created_at&status=eq.approved&order=created_at.desc&limit=5000`;
  const res = await fetch(url, {
    headers: { apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

async function writeSitemap() {
  const env = readEnv();
  if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Sitemap: Supabase keys not found, kept the static sitemap.xml');
    return;
  }
  try {
    const [listings, plates] = await Promise.all([fetchRows(env, 'listings'), fetchRows(env, 'plates')]);
    const day = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : undefined);
    const urls = [
      ...STATIC_ROUTES.map((r) => ({ ...r })),
      ...listings.map((l) => ({ loc: `/listing/${l.short_id || l.id}`, lastmod: day(l.created_at), changefreq: 'weekly', priority: '0.8' })),
      ...plates.map((p) => ({ loc: `/plate/${p.short_id || p.id}`, lastmod: day(p.created_at), changefreq: 'weekly', priority: '0.6' })),
    ];
    const body = urls
      .map((u) => `  <url><loc>${escapeXml(SITE_URL + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
      .join('\n');
    fs.writeFileSync(
      path.join(DIST, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
    );
    console.log(`Sitemap: ${listings.length} listings, ${plates.length} plates`);
  } catch (e) {
    console.log(`Sitemap: could not load listings (${e.message}), kept the static sitemap.xml`);
  }
}

async function main() {
  let count = 0;
  for (const file of walk(DIST)) {
    const html = fs.readFileSync(file, 'utf8');
    const next = processHtml(html);
    if (next !== html) {
      fs.writeFileSync(file, next);
      count++;
    }
  }
  console.log(`SEO tags checked in ${count} HTML files`);
  await writeSitemap();
}

main();

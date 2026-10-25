// Adds language, title, description and Open Graph tags to every page of the
// static web export (dist/). Run after `expo export --platform web`.
//
// A custom app/+html.tsx would be the usual place for this, but on SDK 58 it
// stops Expo from injecting the page's <script> tags, so pages never hydrate.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SITE_URL = 'https://naxavto.com';
const TITLE = 'Naxçıvan Avto — Avtomobil və nömrə elanları';
const DESCRIPTION =
  'Naxçıvanda avtomobil və qeydiyyat nişanı elanları: satış, kredit və barter. Elanınızı pulsuz yerləşdirin.';

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const headTags = [
  `<title>${TITLE}</title>`,
  `<meta name="description" content="${escapeAttr(DESCRIPTION)}"/>`,
  '<meta name="theme-color" content="#FF3B30"/>',
  '<meta property="og:type" content="website"/>',
  '<meta property="og:site_name" content="Naxçıvan Avto"/>',
  '<meta property="og:locale" content="az_AZ"/>',
  `<meta property="og:title" content="${escapeAttr(TITLE)}"/>`,
  `<meta property="og:description" content="${escapeAttr(DESCRIPTION)}"/>`,
  `<meta property="og:image" content="${SITE_URL}/og-image.png"/>`,
  '<meta name="twitter:card" content="summary"/>',
].join('');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.html') ? [full] : [];
  });

let count = 0;
for (const file of walk(DIST)) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('property="og:title"')) continue;

  html = html
    .replace(/<html\s+lang="[^"]*"/, '<html lang="az"')
    // Drop any empty title the export emitted; ours goes right after <head>
    .replace(/<title[^>]*><\/title>/, '')
    .replace('<head>', `<head>${headTags}`);

  fs.writeFileSync(file, html);
  count++;
}

console.log(`SEO tags added to ${count} HTML files`);

// One self-contained standings.html, for publishing as a Claude Artifact.
// The artifact can't fetch ./system-jasper/*.css, so they're inlined here instead
// of being kept as a second copy of the page. Source of truth stays public/standings.html.
//   node scripts/build-artifact.mjs   ->  dist-artifact/standings.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
let html = readFileSync(join(pub, 'standings.html'), 'utf8');

for (const css of ['system-jasper/tokens.css', 'system-jasper/shell.css']) {
  const tag = `<link rel="stylesheet" href="./${css}">`;
  if (!html.includes(tag)) throw new Error('link not found: ' + css);
  html = html.replace(tag, `<style>\n/* ${css} */\n${readFileSync(join(pub, css), 'utf8')}\n</style>`);
}
// The favicon is a file next to the page; the artifact sets its own icon.
html = html.replace('<link rel="icon" href="./favicon.svg">\n', '');

mkdirSync(join(root, 'dist-artifact'), { recursive: true });
writeFileSync(join(root, 'dist-artifact', 'standings.html'), html);
console.log('dist-artifact/standings.html', (html.length / 1024).toFixed(0) + 'kB');

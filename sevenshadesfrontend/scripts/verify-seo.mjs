import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const pages = JSON.parse(await readFile(new URL('src/services/seoPages.json', root), 'utf8'));
const sitemap = await readFile(new URL('build/sitemap.xml', root), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, Object.keys(pages).length);
for (const [path, [title]] of Object.entries(pages)) {
  const file = path === '/' ? 'index.html' : path.slice(1) + '/index.html';
  const html = await readFile(new URL('build/' + file, root), 'utf8');
  assert.ok(html.includes(title.replaceAll('&', '&amp;')));
  assert.ok(html.includes(`rel="canonical" href="https://doordrape.com${path}"`));
  assert.ok(html.includes('<main '));
  assert.ok(sitemap.includes(`<loc>https://doordrape.com${path}</loc>`));
  assert.ok(!html.includes('application/ld+json">{"@type":"Product"'));
}
const shell = await readFile(new URL('build/app-shell.html', root), 'utf8');
assert.ok(shell.includes('name="robots" content="noindex, follow"'));
assert.ok(!shell.includes('rel="canonical"'));
assert.ok(!sitemap.includes('productdetailspage'));
const home = await readFile(new URL('build/index.html', root), 'utf8');
assert.ok(home.includes('<summary>How does Doordrape Try &amp; Buy work?</summary>'));
console.log('SEO release checks passed: public heads/content, canonicals, sitemap, private shell and product exclusion.');

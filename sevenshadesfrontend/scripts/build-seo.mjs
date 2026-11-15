import { readFile, writeFile, mkdir } from 'node:fs/promises';
const pages = JSON.parse(await readFile(new URL('../src/services/seoPages.json', import.meta.url), 'utf8'));
const faqs = JSON.parse(await readFile(new URL('../src/services/homeFaq.json', import.meta.url), 'utf8'));
const build = new URL('../build/', import.meta.url);
const template = await readFile(new URL('index.html', build), 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function render(path, title, description, indexable) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  const values = { description, robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow', googlebot: indexable ? 'index, follow' : 'noindex, follow', 'og:title': title, 'og:description': description, 'og:url': `https://doordrape.com${path}`, 'twitter:title': title, 'twitter:description': description };
  html = html.replace(/<meta\b[^>]*>/g, tag => {
    const name = tag.match(/(?:name|property)="([^"]+)"/)?.[1];
    return name in values ? tag.replace(/content="[^"]*"/, `content="${escape(values[name])}"`) : tag;
  });
  html = html.replace(/<link rel="canonical"[^>]*>/, indexable ? `<link rel="canonical" href="https://doordrape.com${path}" />` : '');
  if (!indexable) html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  if (indexable) {
    const links = '<nav aria-label="Store links"><a href="/">DoorDrape</a> · <a href="/productpage">Clothing collections</a> · <a href="/privacy-policy">Privacy policy</a> · <a href="/terms-and-conditions">Terms and conditions</a></nav>';
    const faq = path === '/' ? `<section><h2>Frequently Asked Questions About Try &amp; Buy</h2>${faqs.map(item => `<details><summary>${escape(item.question)}</summary><p>${escape(item.answer)}</p></details>`).join('')}</section>` : '';
    const body = `<main style="max-width:960px;margin:32px auto;padding:24px;font-family:system-ui;line-height:1.6">${links}<h1>${escape(title)}</h1><p>${escape(description)}</p>${faq}<p>The interactive store requires JavaScript.</p></main>`;
    html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  }
  return html;
}
for (const [path, [title, description]] of Object.entries(pages)) {
  const destination = path === '/' ? new URL('index.html', build) : new URL(`${path.slice(1)}/index.html`, build);
  await mkdir(new URL('.', destination), { recursive: true });
  await writeFile(destination, render(path, title, description, true));
}
await writeFile(new URL('app-shell.html', build), render('/', 'DoorDrape', 'Your DoorDrape account and shopping experience.', false));
await writeFile(new URL('sitemap.xml', build), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).map(path => `\n  <url><loc>https://doordrape.com${path}</loc></url>`).join('')}\n</urlset>\n`);
console.log(`SEO: generated ${Object.keys(pages).length} public metadata documents and a noindex app shell.`);

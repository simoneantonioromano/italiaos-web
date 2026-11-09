import { copyFile, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import worker from '../src/index.js';
import { refresh } from '../src/ingest.js';
import { sources } from '../src/sources.js';
import { localDb } from './local.mjs';

const previousOrigin = 'https://italiaos.while-e.chatgpt.site';
const pageUrl = new URL(process.env.PAGE_URL || 'https://simoneantonioromano.github.io/italiaos-web');
if (pageUrl.protocol !== 'https:' || pageUrl.username || pageUrl.password || pageUrl.search || pageUrl.hash) {
  throw new Error('PAGE_URL must be the HTTPS URL of the Pages site.');
}
const prefix = pageUrl.pathname.replace(/\/+$/, '');
const publishedOrigin = pageUrl.origin + prefix;
const output = resolve(process.env.PAGES_DIR || '_site');
const outputRelative = relative(process.cwd(), output);
if (!outputRelative || outputRelative.startsWith('..') || isAbsolute(outputRelative) || basename(output).startsWith('.')) {
  throw new Error('PAGES_DIR must be a non-hidden output directory inside the checkout.');
}
const state = resolve(process.env.STATE_DB || '.state/italiaos.sqlite');
if (state === output || state.startsWith(output + (process.platform === 'win32' ? '\\' : '/'))) {
  throw new Error('STATE_DB must be outside PAGES_DIR.');
}
const categories = [...new Set(sources.map(source => source.category))];
const registry = new Map(sources.map(source => [source.id, source]));
const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function publishedPath(path) {
  if (path === '/') return prefix + '/';
  return prefix + path + (/\.[a-z0-9]+$/i.test(path) ? '' : '/');
}

function validatedOriginal(article) {
  try {
    const url = new URL(article.url);
    const source = registry.get(article.source_id);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && source?.articleHosts.includes(url.hostname)) {
      return url.href;
    }
  } catch {}
  return null;
}

function decorateHtml(html, route, outputRoute, articleUrls) {
  let result = html.replaceAll(previousOrigin + route, pageUrl.origin + publishedPath(outputRoute));
  const archivePage = outputRoute !== route;
  if (archivePage) result = result.replace(/<meta name="robots"[^>]+>/, '<meta name="robots" content="noindex,follow">');
  result = result.replace(/\b(href|src|action)="(\/[^"]*)"/g, (_, attribute, path) => {
    const articleId = path.match(/^\/fonte\/([a-f0-9]{24})$/)?.[1];
    if (articleId) {
      const original = articleUrls.get(articleId);
      return attribute + '="' + (original ? escape(original) : publishedPath('/notizia/' + articleId)) + '"';
    }
    return attribute + '="' + publishedPath(path) + '"';
  });
  result = result.replace(/href="\?page=(\d+)&amp;q=[^"]*"/g, (_, page) =>
    'href="' + publishedPath(Number(page) === 1 ? route : route.replace(/\/$/, '') + '/pagina/' + page) + '"');
  if (route === '/privacy') {
    result = result.replace(/ItaliaOS utilizza contatori aggregati[^<]+?servizio\./,
      'Il servizio di hosting può trattare dati di connessione per fornire e proteggere il servizio.');
  }
  if (route === '/' || route.startsWith('/categoria/')) {
    const category = route.startsWith('/categoria/') ? route.split('/')[2] : '';
    result = result.replace('</head>', '<script type="module" src="' + publishedPath('/pages-search.js') +
      '" data-italiaos-search="' + escape(category) + '"></script></head>');
  }
  return result;
}

async function render(route, env, expected = 200) {
  const result = await worker.fetch(new Request(new URL(route, 'https://italiaos.local')), env);
  if (result.status !== expected) throw new Error('Rendering ' + route + ' returned HTTP ' + result.status);
  return result.text();
}

async function write(name, content) {
  const filename = join(output, name);
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, content, 'utf8');
}

async function prepareOutput() {
  const existing = await lstat(output).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error('PAGES_DIR must be a regular directory.');
    const marker = await readFile(join(output, '.italiaos-build'), 'utf8').catch(() => null);
    if (marker !== 'ItaliaOS Pages export\n') throw new Error('PAGES_DIR exists and is not a previous ItaliaOS export.');
    await rm(output, { recursive: true });
  }
  await mkdir(output, { recursive: true });
  await write('.italiaos-build', 'ItaliaOS Pages export\n');
}

function listings(rows, sourceCategories) {
  const paths = [['/', rows.length]];
  for (const category of sourceCategories) paths.push(['/categoria/' + category, rows.filter(row => row.category === category).length]);
  return paths.flatMap(([route, count]) =>
    Array.from({ length: Math.max(1, Math.min(100, Math.ceil(count / 24))) }, (_, index) => ({
      route, page: index + 1,
      outputRoute: index ? route.replace(/\/$/, '') + '/pagina/' + (index + 1) : route,
    })));
}

await mkdir(dirname(state), { recursive: true });
const db = localDb(state);
const env = { DB: db, CONTACT_EMAIL: process.env.CONTACT_EMAIL };
try {
  const outcome = process.env.SKIP_REFRESH === '1' ? null : await refresh(env);
  if (outcome) console.log(JSON.stringify(outcome));
  const articles = (await db.prepare('SELECT id, source_id, category, title, url, published_at, summary FROM articles ORDER BY published_at DESC, id DESC').all())
    .results.filter(row => registry.has(row.source_id) && /^[a-f0-9]{24}$/.test(row.id));
  if (!articles.length && !outcome?.successful) throw new Error('No current or archived articles and no working feeds.');
  if (outcome && !outcome.successful && articles.length) console.warn('The build is preserving the last edition. Current feeds were unavailable.');

  const articleUrls = new Map(articles.map(article => [article.id, validatedOriginal(article)]));
  const sourceCategories = [...new Set([...categories, ...articles.map(article => article.category)])];
  await prepareOutput();
  await write('.nojekyll', '');
  await copyFile(new URL('./pages-search.js', import.meta.url), join(output, 'pages-search.js'));

  for (const { route, page, outputRoute } of listings(articles, sourceCategories)) {
    const query = page > 1 ? '?page=' + page : '';
    let html = decorateHtml(await render(route + query, env), route, outputRoute, articleUrls);
    if (page === 100) html = html.replace(/<a href="[^"]+\/pagina\/101\/"[^>]*>[^<]*<\/a>/g, '');
    await write(join(outputRoute.replace(/^\//, ''), 'index.html'), html);
  }
  for (const route of ['/fonti', '/metodo', '/privacy', '/sponsor', '/contatto-sponsor',
    ...articles.map(article => '/notizia/' + article.id)]) {
    const html = decorateHtml(await render(route, env), route, route, articleUrls);
    await write(join(route.slice(1), 'index.html'), html);
  }
  const missing = decorateHtml(await render('/404', env, 404), '/', '/', articleUrls);
  await write('404.html', missing);

  for (const route of ['/style.css', '/logo.svg', '/feed.xml']) {
    await write(route.slice(1), (await render(route, env)).replaceAll(previousOrigin, publishedOrigin + '/'));
  }
  const sitemapPaths = ['/', '/fonti', '/metodo', ...sourceCategories.map(category => '/categoria/' + category)];
  await write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    sitemapPaths.map(path => '<url><loc>' + escape(pageUrl.origin + publishedPath(path)) + '</loc></url>').join('') + '</urlset>');
  await write('robots.txt', 'User-agent: *\nAllow: ' + publishedPath('/') + '\nDisallow: ' + publishedPath('/api') +
    '\nSitemap: ' + pageUrl.origin + publishedPath('/sitemap.xml') + '\n');
  const health = await worker.fetch(new Request('https://italiaos.local/api/health'), env);
  const status = await health.json();
  await write('api/health.json', JSON.stringify({ ...status, builtAt: new Date().toISOString() }));
  await write('search.json', JSON.stringify(articles.map(article => ({
    id: article.id, title: article.title, summary: article.summary, category: article.category,
    source: registry.get(article.source_id).name, publishedAt: article.published_at,
    url: articleUrls.get(article.id),
  }))));
  console.log('Built ' + articles.length + ' articles at ' + output);
} finally {
  db.close();
}


import style, { logo } from './style.js';
import { sources } from './sources.js';
import { refresh } from './ingest.js';
import { metric } from './metrics.js';

const categories = {
  politica: 'Politica', economia: 'Economia', lavoro: 'Lavoro', esteri: 'Esteri',
  territori: 'Territori', societa: 'Società', ambiente: 'Ambiente', salute: 'Salute',
  cultura: 'Cultura', scienza: 'Scienza', sport: 'Sport', norme: 'Norme', bandi: 'Bandi',
};
const sourceMap = new Map(sources.map(source => [source.id, source]));
const sourceKinds = { istituzionale: 'Fonte istituzionale', editoriale: 'Fonte editoriale' };
const publicOrigin = 'https://italiaos.while-e.chatgpt.site';
const defaultContact = 'simoneantonio.romano@gmail.com';
const dateTime = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome',
});
const date = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeZone: 'Europe/Rome' });
const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const formatTime = value => value && Number.isFinite(Date.parse(value)) ? dateTime.format(new Date(value)) : '';
const label = key => categories[key] ?? 'Attualità';
const contact = env => /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(env.CONTACT_EMAIL ?? '') ? env.CONTACT_EMAIL : defaultContact;
const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control':'no-store'}});
const arrow = '<span aria-hidden="true">↗</span>';
const more = '<span aria-hidden="true">→</span>';

function track(ctx, db, event) {
  if (db && ctx?.waitUntil) ctx.waitUntil(metric(db, event).catch(() => {}));
}

function layout(body, { title, description, path, active, status = 200, index = true, lastChecked }) {
  const name = title ? title + ' | ItaliaOS' : 'ItaliaOS | L’Italia, dalle fonti';
  const canonical = publicOrigin + path;
  const nav = Object.entries(categories).filter(([key]) => sources.some(s => s.category === key))
    .map(([key, text]) => '<a href="/categoria/' + key + '"' + (active === key ? ' class="active" aria-current="page"' : '') + '>' + text + '</a>').join('');
  const head = '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escape(name) + '</title><meta name="description" content="' + escape(description) + '">' +
    '<link rel="canonical" href="' + canonical + '"><link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">' +
    '<link rel="alternate" type="application/rss+xml" title="ItaliaOS" href="/feed.xml"><meta name="theme-color" content="#111820">' +
    '<meta property="og:type" content="website"><meta property="og:title" content="' + escape(name) + '">' +
    '<meta property="og:description" content="' + escape(description) + '"><meta property="og:url" content="' + canonical + '">' +
    (!index ? '<meta name="robots" content="noindex,follow">' : '') + '</head>';
  const header = '<a class="skip-link" href="#contenuto">Vai alle notizie</a><div class="topline"><div class="wrap"><span>OSSERVATORIO INFORMATIVO</span><span>' +
    '<i class="status-dot" aria-hidden="true"></i> ' + (lastChecked ? 'Ultima scansione · ' + escape(formatTime(lastChecked)) : 'Scansione oraria delle fonti') + '</span></div></div>' +
    '<header class="masthead"><div class="wrap"><a class="brand" href="/" aria-label="ItaliaOS, prima pagina">' + logo +
    '<span><strong class="brand-title">Italia<span>OS</span></strong><small class="brand-subtitle">L’Italia, dalle fonti.</small></span></a>' +
    '<div class="masthead-tools"><a href="/fonti">Fonti</a><a href="/metodo">Metodo</a></div></div></header>' +
    '<nav class="nav" aria-label="Categorie"><div class="wrap nav-inner"><a href="/"' + (active === 'home' ? ' class="active" aria-current="page"' : '') + '>Prima pagina</a>' + nav + '</div></nav>';
  const footer = '<footer class="footer"><div class="wrap footer-inner"><div><strong>ItaliaOS</strong><p>Notizie e aggiornamenti con la fonte sempre a portata di clic.</p></div>' +
    '<nav aria-label="Informazioni"><a href="/fonti">Fonti</a><a href="/metodo">Metodo</a><a href="/sponsor">Sostieni ItaliaOS</a><a href="/privacy">Privacy</a><a href="/feed.xml">RSS</a></nav></div></footer>';
  return new Response(head + '<body>' + header + '<main class="wrap" id="contenuto">' + body + '</main>' + footer + '</body></html>', {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    },
  });
}

function metadata(row) {
  const source = sourceMap.get(row.source_id);
  return '<div class="story-meta"><a class="category" href="/categoria/' + escape(row.category) + '">' + escape(label(row.category)) +
    '</a><span class="source">' + escape(source?.name) + '</span><time datetime="' + escape(row.published_at) + '">' + escape(formatTime(row.published_at)) + '</time></div>';
}

function media(row, css) {
  if (!row.image_url || !row.image_credit) return '';
  return '<figure class="' + css + '"><img src="' + escape(row.image_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' +
    '<figcaption class="media-credit">' + escape(row.image_credit) + '</figcaption></figure>';
}

function story(row, lead = false) {
  return '<article class="' + (lead ? 'lead' : 'story') + (row.image_url ? '' : ' chartless') + '">' +
    media(row, lead ? 'lead-media' : 'story-media') + '<div class="' + (lead ? 'lead-body' : 'story-body') + '">' +
    metadata(row) + '<h' + (lead ? '2' : '3') + '><a href="/notizia/' + row.id + '">' + escape(row.title) + '</a></h' + (lead ? '2' : '3') + '>' +
    (row.summary ? '<p class="summary">' + escape(row.summary) + '</p>' : '') +
    '<div class="story-actions"><a class="story-link" href="/notizia/' + row.id + '">Scheda ' + more +
    '</a><a class="story-link" href="/fonte/' + row.id + '" rel="nofollow">Fonte ' + arrow + '</a></div></div></article>';
}

const sectionIntro = (title, text, eyebrow = 'ITALIAOS / OSSERVATORIO') =>
  '<header class="intro"><div><p class="eyebrow">' + eyebrow + '</p><h1 class="headline">' + title + '</h1><p class="lede">' + text + '</p></div></header>';

function page(title, intro, html) {
  return '<div class="page">' + sectionIntro(title, intro) + '<div class="prose">' + html + '</div></div>';
}

async function sourceStatus(db) {
  return (await db.prepare('SELECT source_id, checked_at, success_at, error, article_count FROM source_status').all()).results;
}

function getLastChecked(status) {
  return status.map(row => row.checked_at).filter(Boolean).sort().at(-1) ?? null;
}

async function timeline(db, category, query, offset) {
  const filters = ['source_id IN (' + sources.map(() => '?').join(',') + ')'];
  const values = sources.map(source => source.id);
  if (category) {
    filters.push('category = ?');
    values.push(category);
  }
  if (query) {
    filters.push('instr(lower(title || char(32) || coalesce(summary, char(32))), lower(?)) > 0');
    values.push(query);
  }
  const result = await db.prepare('SELECT * FROM articles WHERE ' + filters.join(' AND ') +
    ' ORDER BY published_at DESC, id DESC LIMIT 25 OFFSET ?').bind(...values, offset).all();
  return result.results;
}

function listing(rows, status, category, query, pageNum) {
  const working = status.filter(row => row.success_at && !row.error).length;
  const hasMore = rows.length === 25;
  const showLead = pageNum === 1 && !query;
  const items = rows.slice(0, 24);
  const lead = showLead ? items.shift() : null;
  const latest = getLastChecked(status);
  const search = '<form class="search" action="' + (category ? '/categoria/' + category : '/') +
    '" method="get" role="search"><label for="q">Cerca nelle notizie</label><div><input id="q" name="q" type="search" maxlength="120" value="' + escape(query) +
    '" placeholder="Cerca un tema o una notizia"><button class="button" type="submit">Cerca</button></div></form>';
  const edition = '<header class="intro"><div><p class="eyebrow">EDIZIONE DIGITALE</p><h1 class="headline">' + (category ? label(category) : 'Oggi in Italia') +
    '</h1><p class="lede">Gli ultimi aggiornamenti dalle fonti monitorate, con sintesi e accesso diretto all’originale.</p></div>' +
    '<div class="edition"><span>EDIZIONE DEL GIORNO</span><strong>' + escape(date.format(new Date())) + '</strong></div></header>';
  const aside = '<aside class="sidebar"><section class="panel"><p class="eyebrow">COPERTURA</p><h2>Le fonti</h2><p>' + working +
    ' canali disponibili nell’ultima verifica su ' + sources.length + ' monitorati.</p><ul class="panel-list">' +
    [...new Set(sources.map(source => source.name))].slice(0, 8).map(name => '<li>' + escape(name) + '</li>').join('') +
    '</ul><a href="/fonti">Consulta il registro ' + more + '</a></section><section class="panel"><p class="eyebrow">SEGUI</p><h2>La tua rassegna</h2>' +
    '<p>Ricevi le nuove schede nel tuo lettore di feed.</p><a href="/feed.xml">Apri il feed RSS ' + more + '</a></section></aside>';
  const empty = '<div class="empty"><h2>' + (query ? 'Nessun risultato' : 'Nessun aggiornamento disponibile') +
    '</h2><p>' + (query ? 'Prova a cercare con parole diverse.' : latest ? 'Riprova dopo la prossima scansione delle fonti.' : 'La prima scansione è in preparazione.') + '</p></div>';
  const pages = '<nav class="pagination" aria-label="Pagine">' +
    (pageNum > 1 ? '<a href="?page=' + (pageNum - 1) + '&amp;q=' + encodeURIComponent(query) + '">← Più recenti</a>' : '') +
    (hasMore ? '<a href="?page=' + (pageNum + 1) + '&amp;q=' + encodeURIComponent(query) + '">Meno recenti →</a>' : '') + '</nav>';
  return edition + search + '<div class="layout"><div class="stream">' +
    (lead ? story(lead, true) : '') +
    (items.length ? '<h2 class="section-title">' + (query ? 'Risultati della ricerca' : 'Ultimi aggiornamenti') + '</h2><div class="grid">' + items.map(row => story(row)).join('') + '</div>' : '') +
    (!rows.length ? empty : '') + pages + '</div>' + aside + '</div>';
}

function registry(status) {
  const byId = new Map(status.map(row => [row.source_id, row]));
  return page('Le fonti di ItaliaOS', 'Editore, licenza e stato di ogni canale monitorato.', '<div class="source-register">' +
    sources.map(source => {
      const state = byId.get(source.id);
      return '<article class="panel"><p class="eyebrow">' + escape(sourceKinds[source.type]) + '</p><h2>' + escape(source.name) +
        '</h2><p>' + escape(label(source.category)) + ' · RSS/Atom · Controllo ogni ora</p><p>' +
        (state?.error ? 'Feed temporaneamente non disponibile' : state?.success_at ? 'Feed raggiungibile' : 'In attesa della prima verifica') +
        (state?.success_at ? ' · Ultimo esito positivo ' + escape(formatTime(state.success_at)) : '') +
        '</p><p>' + escape(source.attribution) + '</p><p><a href="' + escape(source.url) + '">Feed originale ' + arrow +
        '</a> · <a href="' + escape(source.terms) + '">Condizioni di riuso ' + arrow + '</a></p></article>';
    }).join('') + '</div>');
}

function detail(row) {
  const source = sourceMap.get(row.source_id);
  const attribution = [row.author, source.attribution].filter(Boolean).join(' · ');
  return '<article class="page"><p class="eyebrow"><a class="article-back" href="/">← Prima pagina</a></p>' + metadata(row) +
    '<h1 class="headline">' + escape(row.title) + '</h1>' + media(row, 'lead-media') + '<div class="prose">' +
    (row.summary ? '<h2>Sintesi automatica</h2><p class="lede">' + escape(row.summary) +
    '</p><p>Estratto sintetizzato dal materiale messo a disposizione dalla fonte.</p>' : '<p>Apri la pubblicazione originale per leggere il contenuto completo.</p>') +
    '<p class="source">' + escape(sourceKinds[source.type]) + ' · ' + escape(attribution) + '</p>' +
    (source.licenseUrl ? '<p><a href="' + escape(source.licenseUrl) + '">' + escape(source.license) + ' ' + arrow + '</a></p>' : '') +
    '<p><a class="button" href="/fonte/' + row.id + '">Leggi l’originale ' + arrow + '</a></p></div></article>';
}

function hasAccess(request, env) {
  const email = request.headers.get('oai-authenticated-user-email');
  const token = request.headers.get('Authorization');
  return Boolean((env.OPERATOR_EMAIL && email === env.OPERATOR_EMAIL) ||
    (env.REFRESH_SECRET && token === 'Bearer ' + env.REFRESH_SECRET));
}

async function runRefresh(env) {
  const result = await refresh(env);
  return result;
}

function rss(rows) {
  const items = rows.map(row => '<item><title>' + escape(row.title) + '</title><link>' + escape(row.url) +
    '</link><guid isPermaLink="false">italiaos:' + row.id + '</guid><pubDate>' + new Date(row.published_at).toUTCString() +
    '</pubDate><category>' + escape(label(row.category)) + '</category><description>' + escape(row.summary ?? '') +
    '</description><source url="' + escape(sourceMap.get(row.source_id)?.url) + '">' + escape(sourceMap.get(row.source_id)?.name) + '</source></item>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ItaliaOS</title><link>' +
    publicOrigin + '</link><description>Ultimi aggiornamenti dalle fonti di ItaliaOS</description><language>it</language>' + items +
    '</channel></rss>', {headers: {'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}

const toolsList = [
  {name:'italiaos_stato',description:'Legge lo stato pubblico delle fonti e della rassegna ItaliaOS.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'italiaos_aggiorna',description:'Esegue un ciclo di aggiornamento ItaliaOS. Operazione riservata al proprietario.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
];

async function health(db) {
  const status = await sourceStatus(db);
  const {count} = await db.prepare('SELECT count(*) AS count FROM articles').first();
  const lastChecked = getLastChecked(status);
  const lastSuccessful = status.map(row => row.success_at).filter(Boolean).sort().at(-1) ?? null;
  return {ok:Boolean(lastSuccessful && count), fresh:Boolean(lastSuccessful && Date.now() - Date.parse(lastSuccessful) < 3 * 3600000),
    lastChecked, lastSuccessful, articles:count, sources:{configured:sources.length, working:status.filter(row => row.success_at && !row.error).length,
      failed:status.filter(row => row.error).length}};
}

async function mcp(request, env) {
  const data = await request.json();
  const reply = result => json({jsonrpc:'2.0',id:data.id,result});
  const call = (value, isError = false) => reply({content:[{type:'text',text:JSON.stringify(value)}],isError});
  if (data.method === 'server/discover') return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if (data.method === 'tools/list') return reply({tools:toolsList});
  if (data.method === 'tools/call' && data.params?.name === 'italiaos_stato') return call(await health(env.DB));
  if (data.method === 'tools/call' && data.params?.name === 'italiaos_aggiorna') {
    if (!hasAccess(request, env)) return call({error:'Operazione riservata'}, true);
    const result = await runRefresh(env);
    return call(result, !result.ok && !result.busy);
  }
  return json({jsonrpc:'2.0',id:data.id,error:{code:-32601,message:'Method not found'}});
}

async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/style.css') return new Response(style + '.story-actions,.pagination{display:flex;gap:1rem;flex-wrap:wrap}.search{margin:0 0 2rem}.search label{display:block;margin-bottom:.5rem}.search div{display:flex;max-width:620px;gap:.5rem}.search input{width:100%;min-width:0;padding:.75rem;background:transparent;color:inherit;border:1px solid currentColor;border-radius:4px}.masthead-tools{display:flex;gap:1.1rem}.masthead>.wrap{display:flex;align-items:center;justify-content:space-between}', {headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'public, max-age=3600'}});
  if (path === '/logo.svg') return new Response(logo, {headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});
  if (path === '/api/refresh' && request.method === 'POST') {
    if (!hasAccess(request, env)) return json({error:'Operazione riservata'},403);
    const result = await runRefresh(env);
    return json(result, result.ok || result.busy ? 200 : 502);
  }
  if (path === '/mcp' && request.method === 'POST') return mcp(request, env);
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  if (path === '/api/health') {
    const result = await health(env.DB);
    return json(result, result.ok ? 200 : 503);
  }
  if (path === '/robots.txt') return new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /fonte/\nSitemap: ' + publicOrigin + '/sitemap.xml\n', {headers:{'Content-Type':'text/plain; charset=utf-8'}});
  if (path === '/sitemap.xml') {
    const paths = ['/', '/fonti', '/metodo', ...new Set(sources.map(source => '/categoria/' + source.category))];
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map(p => '<url><loc>' + publicOrigin + p + '</loc></url>').join('') + '</urlset>', {headers:{'Content-Type':'application/xml; charset=utf-8'}});
  }
  if (path === '/feed.xml') {
    track(ctx, env.DB, 'rss_view');
    return rss(await timeline(env.DB, null, '', 0));
  }
  if (path === '/fonti') return layout(registry(await sourceStatus(env.DB)), {title:'Fonti',description:'Canali verificati, attribuzioni, condizioni di riuso e stato dei feed.',path});
  if (path === '/metodo') return layout(page('Come funziona', 'Dalla pubblicazione originale alla scheda di ItaliaOS.',
    '<h2>Raccolta e aggiornamento</h2><p>ItaliaOS monitora a intervalli orari i feed del <a href="/fonti">registro fonti</a>. Ogni scheda indica origine, data e collegamento alla pubblicazione. Il registro distingue canali istituzionali ed editoriali.</p>' +
    '<h2>Sintesi e fotografie</h2><p>Il sistema ricava automaticamente una sintesi dal testo disponibile nel feed autorizzato. La scheda rimanda all’originale per il contesto completo. Le immagini provengono dalle fonti con riuso ammesso e sono accompagnate da attribuzione. Le schede prive di immagini utilizzano un formato testuale.</p>' +
    '<h2>Copertura e correzioni</h2><p>La rassegna riflette la copertura dei canali attivi. Una fonte istituzionale è primaria per le proprie comunicazioni. Per segnalazioni, aggiornamenti e richieste di rimozione scrivi a <a href="mailto:' + escape(contact(env)) + '">' + escape(contact(env)) + '</a>, indicando la scheda e l’originale.</p>'),
    {title:'Metodo',description:'Raccolta, criteri, sintesi automatiche, immagini e rettifiche.',path});
  if (path === '/privacy') return layout(page('Privacy', 'Come sono trattati i dati nel sito e nei contatti.',
    '<p>ItaliaOS utilizza contatori aggregati per tipo di interazione e giorno. I contatori non conservano identificatori personali. Il servizio di hosting può trattare dati di connessione per fornire e proteggere il servizio. Le foto, quando disponibili, possono essere caricate dal server della fonte.</p>' +
    '<p>Per contatti e richieste sui dati scrivi a <a href="mailto:' + escape(contact(env)) + '">' + escape(contact(env)) + '</a>. I messaggi ricevuti sono utilizzati per gestire la richiesta.</p>'),
    {title:'Privacy',description:'Informazioni sul trattamento nel sito e per i contatti.',path,index:false});
  if (path === '/sponsor') {
    track(ctx, env.DB, 'sponsor_view');
    return layout(page('Sostieni ItaliaOS', 'Una proposta per realtà che vogliono sostenere l’accesso alle fonti.',
      '<h2>Partner fondatore</h2><p>Spazio pubblicitario per 30 giorni, separato dalle notizie e identificato come pubblicità. Il progetto propone un formato di lancio da 250 € per 30 giorni, con condizioni da confermare prima dell’attivazione.</p>' +
      '<p>La sponsorizzazione non interviene nella selezione o nell’ordinamento delle notizie. Gli spazi sono assegnati in base a disponibilità e compatibilità con il progetto.</p>' +
      '<p><a class="button" href="/contatto-sponsor">Richiedi disponibilità ' + more + '</a></p>'),
      {title:'Partner fondatore',description:'Contatta ItaliaOS per disponibilità e dettagli sulla sponsorizzazione.',path,index:false});
  }
  if (path === '/contatto-sponsor') {
    track(ctx, env.DB, 'sponsor_click');
    return layout(page('Contatta ItaliaOS', 'Scrivici per la disponibilità dello spazio pubblicitario.',
      '<p><a class="button" href="mailto:' + escape(contact(env)) + '?subject=ItaliaOS%20%7C%20Partner%20fondatore">Apri la tua app email ' + arrow + '</a></p><p>' + escape(contact(env)) + '</p>'),
      {title:'Contatti sponsor',description:'Contatto commerciale di ItaliaOS.',path,index:false});
  }
  const item = path.match(/^\/(notizia|fonte)\/([a-f0-9]{24})$/);
  if (item) {
    const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(item[2]).first();
    if (row && sourceMap.has(row.source_id)) {
      if (item[1] === 'fonte') {
        const original = new URL(row.url);
        const source = sourceMap.get(row.source_id);
        if (original.protocol !== 'https:' || !(source.articleHosts ?? source.hosts).includes(original.hostname)) return new Response(null,{status:404});
        track(ctx, env.DB, 'source_click');
        return new Response(null,{status:302,headers:{Location:row.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
      }
      track(ctx, env.DB, 'story_view');
      return layout(detail(row),{title:row.title,description:row.summary ?? row.title,path,index:false});
    }
  }
  const category = path.match(/^\/categoria\/([a-z]+)$/)?.[1];
  if (path === '/' || (category && Object.hasOwn(categories, category))) {
    const query = (url.searchParams.get('q') ?? '').trim().slice(0,120);
    const pageNum = Math.min(100,Math.max(1,Number.parseInt(url.searchParams.get('page') ?? '',10) || 1));
    track(ctx, env.DB, category ? 'category_view' : 'home_view');
    const [rows, status] = await Promise.all([timeline(env.DB,category,query,(pageNum-1)*24),sourceStatus(env.DB)]);
    return layout(listing(rows,status,category,query,pageNum),{title:category ? label(category) : null,
      description:'Notizie e aggiornamenti per categoria, sintesi automatiche e accesso diretto alle fonti.',path,active:category ?? 'home',
      index:!query && pageNum === 1, lastChecked:getLastChecked(status)});
  }
  return layout(page('Pagina non trovata','Torna alla prima pagina di ItaliaOS.','<p><a href="/">Apri la prima pagina ' + more + '</a></p>'),
    {title:'Pagina non trovata',description:'Pagina non trovata.',path:'/',status:404,index:false});
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (error) {
      console.error('ItaliaOS route failure', error.message);
      if (new URL(request.url).pathname.startsWith('/api/')) return json({error:'Servizio temporaneamente non disponibile'},503);
      return layout(page('Aggiornamento temporaneo','Riprova tra poco.','<p><a href="/metodo">Come funziona ItaliaOS</a></p>'),
        {title:'Servizio temporaneamente non disponibile',description:'Riprova tra poco.',path:'/',status:503,index:false});
    }
  },
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runRefresh(env));
  },
};

import { sources } from './sources.js';

const REQUEST_TIMEOUT = 8000;
const MAX_BYTES = 1_500_000;
const MAX_ITEMS = 30;
const PARALLEL_FEEDS = 4;
const MAX_REDIRECTS = 2;
const TRACKING = /^(?:utm_.+|fbclid|gclid|mc_[ce]id)$/i;
const NAMED_ENTITIES = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  egrave: 'è', eacute: 'é', agrave: 'à', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…',
};

function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (!name.startsWith('#')) return Object.hasOwn(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : entity;
    const hex = name[1].toLowerCase() === 'x';
    const point = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : ' ';
  });
}

function unwrap(value) {
  return value.trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function asText(value) {
  return decode(decode(unwrap(value))
    .replace(/<(script|style|iframe|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\s]+/g, ' ')
    .trim();
}

function readTag(xml, tag) {
  return xml.match(new RegExp('<' + tag + '(?:\\s[^>]*?)?>([\\s\\S]*?)<\\/' + tag + '\\s*>', 'i'))?.[1] ?? '';
}

function attributes(tag) {
  const result = Object.create(null);
  for (const match of tag.matchAll(/([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  }
  return result;
}

function approvedUrl(input, base, hosts, preserveFragment = false) {
  try {
    const url = new URL(input, base);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !hosts?.includes(url.hostname)) return null;
    if (!preserveFragment) url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function canonicalUrl(input, base, source) {
  const url = input && approvedUrl(input, base, source.articleHosts, source.preserveLink);
  if (!url) return null;
  if (source.preserveLink) return url.href;
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}

function readEntryLink(entry, atom) {
  if (!atom) return decode(unwrap(readTag(entry, 'link'))) || decode(unwrap(readTag(entry, 'guid')));
  for (const match of entry.matchAll(/<link\b[^>]*>/gi)) {
    const link = attributes(match[0]);
    if ((!link.rel || link.rel === 'alternate') && link.href) return link.href;
  }
  return '';
}

function makeSummary(entry, source, title) {
  if (!source.allowSummary) return null;
  const descriptions = ['description', 'summary', 'content:encoded', 'content']
    .map(tag => asText(readTag(entry, tag)))
    .filter(text => text.length >= 50 && text.toLocaleLowerCase('it') !== title.toLocaleLowerCase('it'));
  const plain = descriptions[0]?.replace(/(?:\s+(?:leggi di più|continua a leggere|scopri di più))[\s.…]*$/i, '') ?? '';
  if (!plain) return null;
  const selected = plain.split(/(?<=[.!?])\s+/u).slice(0, 2).join(' ');
  if (selected.length <= 310) return selected;
  const shortened = selected.slice(0, 310);
  const boundary = shortened.lastIndexOf(' ');
  return shortened.slice(0, boundary > 150 ? boundary : shortened.length).replace(/[ ,;:]+$/, '') + '…';
}

function readImage(entry, source, base) {
  if (!source.allowImage || !source.attribution || !source.licenseUrl) return [null, null];
  const allowed = source.imageHosts ?? source.articleHosts;
  const candidates = [];
  for (const match of entry.matchAll(/<(media:thumbnail|media:content|enclosure|link)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    const media = attributes(match[0]);
    const isImage = tag === 'media:thumbnail' || media.medium === 'image' || /^image\/(?:jpeg|png|webp|avif|gif)$/i.test(media.type ?? '');
    if (!isImage || (tag === 'link' && media.rel !== 'enclosure')) continue;
    const image = approvedUrl(media.url || media.href, base, allowed);
    if (!image || /\.(?:svg|svgz)$/i.test(image.pathname)) continue;
    candidates.push(image.href);
  }
  const unique = [...new Set(candidates)];
  if (!unique.length || (source.requireExplicitImageRights && unique.length !== 1)) return [null, null];
  const rights = asText(readTag(entry, 'media:copyright') || readTag(entry, 'dc:rights'));
  const explicitlyLicensed = /(?:\bcc\s+by\s+4\.0\b|creativecommons\.org\/licenses\/by\/4\.0(?:\/|$))/i.test(rights);
  if (rights && !explicitlyLicensed) return [null, null];
  const explicitCredit = asText(readTag(entry, 'media:credit')).slice(0, 180);
  const ownCredit = (source.ownImageCredits ?? [source.attribution]).some(credit =>
    explicitCredit.toLocaleLowerCase('it').includes(credit.toLocaleLowerCase('it')));
  if (source.requireExplicitImageRights && !explicitlyLicensed && !ownCredit) return [null, null];
  return [unique[0], explicitCredit || source.attribution];
}

function selectCategory(entry, source) {
  if (!source.categoryRules) return source.category;
  const values = [...entry.matchAll(/<category\b[^>]*>[\s\S]*?<\/category\s*>|<category\b[^>]*\/>/gi)]
    .map(match => attributes(match[0]).term || asText(readTag(match[0], 'category')));
  return Object.entries(source.categoryRules).find(([, labels]) => labels.some(label => values.includes(label)))?.[0] ?? source.category;
}

export function parseFeed(xml, source, base, now = new Date()) {
  const payload = xml.replace(/^\uFEFF?\s*(?:<\?xml[\s\S]*?\?>\s*)?/, '').replace(/<!--[\s\S]*?-->/g, '').trimStart();
  const atom = /^<feed(?:\s|>)/i.test(payload);
  if (!atom && !/^<(?:rss|rdf:RDF)(?:\s|>)/i.test(payload)) throw new Error('Risposta priva di un feed RSS o Atom valido.');
  const tag = atom ? 'entry' : 'item';
  const pattern = new RegExp('<' + tag + '(?:\\s[^>]*?)?>([\\s\\S]*?)<\\/' + tag + '\\s*>', 'gi');
  const items = new Map();
  let seen = 0;
  for (const match of payload.matchAll(pattern)) {
    const entry = match[1];
    const url = canonicalUrl(readEntryLink(entry, atom), base, source);
    const title = asText(readTag(entry, 'title')).slice(0, 360);
    const date = asText(readTag(entry, 'pubDate') || readTag(entry, 'published') || readTag(entry, 'dc:date') || readTag(entry, 'updated'));
    const timestamp = Date.parse(date);
    if (++seen > 150 || items.size >= MAX_ITEMS) break;
    if (!url || !title || !Number.isFinite(timestamp) || timestamp > now.getTime() + 6 * 60 * 60 * 1000) continue;
    const [imageUrl, imageCredit] = readImage(entry, source, url);
    const author = asText(readTag(readTag(entry, 'author'), 'name') || readTag(entry, 'dc:creator') || readTag(entry, 'author'));
    items.set(url, {
      sourceId: source.id, category: selectCategory(entry, source), title, url,
      publishedAt: new Date(timestamp).toISOString(), summary: makeSummary(entry, source, title),
      imageUrl, imageCredit, author: author.slice(0, 180) || null,
    });
  }
  if (seen && !items.size) throw new Error('Il feed non contiene articoli con titolo, data e link autorizzati.');
  return [...items.values()];
}

async function feedBody(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body) {
    throw new Error('Dimensione del feed oltre il limite o risposta priva di contenuto.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error('Dimensione del feed oltre il limite.');
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function getFeed(source, previous, request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const headers = new Headers({
    accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.2',
    'user-agent': 'ItaliaOS/1.0 (lettore RSS)',
  });
  if (previous?.etag) headers.set('if-none-match', previous.etag);
  if (previous?.last_modified) headers.set('if-modified-since', previous.last_modified);
  let url = approvedUrl(source.url, undefined, source.hosts);
  try {
    for (let redirects = 0; url && redirects <= MAX_REDIRECTS; redirects++) {
      const response = await request(url.href, { headers, redirect: 'manual', signal: controller.signal });
      if (response.status === 304) return { unchanged: true };
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        url = location && approvedUrl(location, url, source.hosts);
        await response.body?.cancel();
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Risposta HTTP ' + response.status + '.');
      }
      return {
        xml: await feedBody(response), url: url.href,
        etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified'),
      };
    }
    throw new Error('Indirizzo del feed o reindirizzamento fuori dall’elenco autorizzato.');
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Il feed non ha risposto entro 8 secondi.');
    if (error instanceof TypeError) throw new Error('Collegamento al feed non riuscito.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const upsertArticles = [
  'INSERT INTO articles (id, source_id, category, title, url, published_at, summary, image_url, image_credit, author)',
  "SELECT value ->> '$.id', value ->> '$.sourceId', value ->> '$.category', value ->> '$.title', value ->> '$.url',",
  "value ->> '$.publishedAt', value ->> '$.summary', value ->> '$.imageUrl', value ->> '$.imageCredit', value ->> '$.author'",
  'FROM json_each(?) WHERE true',
  'ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id, category=excluded.category, title=excluded.title,',
  'published_at=excluded.published_at, summary=excluded.summary, image_url=excluded.image_url,',
  'image_credit=excluded.image_credit, author=excluded.author',
  'WHERE (articles.source_id=excluded.source_id OR articles.source_id IN (SELECT value FROM json_each(?)))',
  'AND (articles.source_id, articles.category, articles.title, articles.published_at, articles.summary,',
  'articles.image_url, articles.image_credit, articles.author) IS NOT',
  '(excluded.source_id, excluded.category, excluded.title, excluded.published_at, excluded.summary,',
  'excluded.image_url, excluded.image_credit, excluded.author)',
].join(' ');

const upsertStatus = [
  'INSERT INTO source_status (source_id, checked_at, success_at, error, article_count, etag, last_modified)',
  'VALUES (?, ?, ?, NULL, ?, ?, ?)',
  'ON CONFLICT(source_id) DO UPDATE SET checked_at=excluded.checked_at, success_at=excluded.success_at,',
  'error=NULL, article_count=excluded.article_count, etag=excluded.etag, last_modified=excluded.last_modified',
].join(' ');

async function processSource(db, source, previous, checkedAt, request, priority) {
  try {
    const feed = await getFeed(source, previous, request);
    if (feed.unchanged) {
      await db.prepare('UPDATE source_status SET checked_at=?, success_at=?, error=NULL WHERE source_id=?')
        .bind(checkedAt, checkedAt, source.id).run();
      return { id: source.id, ok: true, count: previous?.article_count ?? 0, unchanged: true };
    }
    const items = parseFeed(feed.xml, source, feed.url, new Date(checkedAt));
    const replacementIds = priority.slice(priority.indexOf(source.id) + 1);
    const records = await Promise.all(items.map(async item => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(item.url));
      const id = Array.from(new Uint8Array(digest).slice(0, 12), value => value.toString(16).padStart(2, '0')).join('');
      return { id, ...item };
    }));
    await db.batch([
      db.prepare(upsertArticles).bind(JSON.stringify(records), JSON.stringify(replacementIds)),
      db.prepare(upsertStatus).bind(source.id, checkedAt, checkedAt, items.length, feed.etag, feed.lastModified),
    ]);
    return { id: source.id, ok: true, count: items.length };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 220);
    await db.prepare([
      'INSERT INTO source_status (source_id, checked_at, error) VALUES (?, ?, ?)',
      'ON CONFLICT(source_id) DO UPDATE SET checked_at=excluded.checked_at, error=excluded.error',
    ].join(' ')).bind(source.id, checkedAt, message).run();
    return { id: source.id, ok: false, count: 0, error: message };
  }
}

export async function refresh(env, registry = sources, request = fetch) {
  const db = env.DB;
  const time = new Date();
  const checkedAt = time.toISOString();
  const token = crypto.randomUUID();
  const lock = await db.prepare([
    'INSERT INTO refresh_lock (id, token, expires_at) VALUES (1, ?, ?)',
    'ON CONFLICT(id) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at WHERE refresh_lock.expires_at<=?',
  ].join(' ')).bind(token, new Date(time.getTime() + 180_000).toISOString(), checkedAt).run();
  if (!lock.meta.changes) return { ok: false, busy: true, checkedAt };
  try {
    const status = await db.prepare('SELECT source_id, article_count, etag, last_modified FROM source_status').all();
    const previous = new Map(status.results.map(row => [row.source_id, row]));
    const priority = [...registry]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))
      .map(source => source.id);
    const outcomes = [];
    for (let i = 0; i < registry.length; i += PARALLEL_FEEDS) {
      const group = registry.slice(i, i + PARALLEL_FEEDS);
      const results = await Promise.allSettled(group.map(source =>
        processSource(db, source, previous.get(source.id), checkedAt, request, priority)));
      outcomes.push(...results.map((result, index) => result.status === 'fulfilled'
        ? result.value : { id: group[index].id, ok: false, count: 0, error: 'Stato della fonte non salvato.' }));
    }
    const successful = outcomes.filter(source => source.ok).length;
    return {
      ok: successful > 0, checkedAt, successful, failed: outcomes.length - successful,
      articles: outcomes.reduce((total, source) => total + source.count, 0), sources: outcomes,
    };
  } finally {
    await db.prepare('DELETE FROM refresh_lock WHERE id=1 AND token=?').bind(token).run();
  }
}


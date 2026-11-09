const q = (new URLSearchParams(location.search).get('q') ?? '').trim().slice(0, 120);
const form = document.querySelector('form.search');
const stream = document.querySelector('.stream');

function textNode(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function searchKey(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it');
}

function searchResult(row) {
  const card = document.createElement('article');
  card.className = 'story chartless';
  const body = document.createElement('div');
  body.className = 'story-body';
  const meta = document.createElement('div');
  meta.className = 'story-meta';
  meta.append(textNode('span', row.source, 'source'));
  const timestamp = new Date(row.publishedAt);
  if (Number.isFinite(timestamp.valueOf())) {
    const time = textNode('time', new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome',
    }).format(timestamp));
    time.dateTime = row.publishedAt;
    meta.append(time);
  }
  const title = document.createElement('h3');
  const detail = textNode('a', row.title);
  detail.href = new URL('notizia/' + encodeURIComponent(row.id) + '/', import.meta.url).href;
  title.append(detail);
  body.append(meta, title);
  if (row.summary) body.append(textNode('p', row.summary, 'summary'));
  if (row.url) {
    const original = new URL(row.url);
    if (original.protocol === 'https:' && !original.username && !original.password) {
      const source = textNode('a', 'Fonte originale ↗', 'story-link');
      source.href = original.href;
      source.rel = 'nofollow noreferrer';
      body.append(source);
    }
  }
  card.append(body);
  return card;
}

if (q && form && stream) {
  form.elements.q.value = q;
  const category = document.querySelector('[data-italiaos-search]')?.dataset.italiaosSearch;
  try {
    const response = await fetch(new URL('search.json', import.meta.url));
    if (!response.ok) throw new Error('Search index unavailable');
    const records = await response.json();
    const tokens = searchKey(q).split(/\s+/);
    const matches = records.filter(row =>
      (!category || row.category === category) &&
      tokens.every(token => searchKey([row.title, row.summary, row.source].filter(Boolean).join(' ')).includes(token)));
    stream.replaceChildren(textNode('h2', 'Risultati per «' + q + '»', 'section-title'));
    if (matches.length) {
      const grid = document.createElement('div');
      grid.className = 'grid';
      grid.append(...matches.slice(0, 120).map(searchResult));
      stream.append(grid);
      if (matches.length > 120) stream.append(textNode('p', 'Primi 120 risultati. Restringi la ricerca per trovare altre notizie.'));
    } else {
      stream.append(textNode('p', 'Nessuna notizia corrispondente. Prova con parole diverse.', 'empty'));
    }
  } catch {
    const message = textNode('p', 'La ricerca è temporaneamente indisponibile. La rassegna resta consultabile.');
    message.setAttribute('role', 'status');
    form.after(message);
  }
}


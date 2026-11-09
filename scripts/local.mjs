import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';

export function localDb(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  if (!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name='articles'").get()) {
    sqlite.exec(readFileSync(new URL('../drizzle/0000_italiaos.sql', import.meta.url), 'utf8'));
  }
  const make = (sql, values = []) => ({
    bind: (...params) => make(sql, params),
    first: async () => sqlite.prepare(sql).get(...values) ?? null,
    all: async () => ({results:sqlite.prepare(sql).all(...values)}),
    run: () => ({meta:{changes:sqlite.prepare(sql).run(...values).changes}}),
  });
  return {
    prepare: make,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = statements.map(statement => statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => sqlite.close(),
  };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4317);
  const env = {DB:localDb(process.env.ITALIAOS_DATABASE ?? 'italiaos.sqlite'),
    CONTACT_EMAIL:process.env.CONTACT_EMAIL, REFRESH_SECRET:process.env.REFRESH_SECRET};
  createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, 'http://127.0.0.1:' + port);
      const result = await worker.fetch(new Request(url, {method:incoming.method,headers:incoming.headers}), env, {
        waitUntil(promise) { promise.catch(error => console.error(error.message)); },
      });
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      outgoing.writeHead(500).end('Preview unavailable');
      console.error(error.message);
    }
  }).listen(port, '127.0.0.1', () => console.log('Local http://127.0.0.1:' + port));
}

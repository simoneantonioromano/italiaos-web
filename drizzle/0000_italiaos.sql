CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  image_credit TEXT,
  author TEXT
);
--> statement-breakpoint
CREATE INDEX articles_by_date ON articles (published_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX articles_by_category ON articles (category, published_at DESC, id DESC);
--> statement-breakpoint
CREATE TABLE source_status (
  source_id TEXT PRIMARY KEY,
  checked_at TEXT NOT NULL,
  success_at TEXT,
  error TEXT,
  article_count INTEGER NOT NULL DEFAULT 0,
  etag TEXT,
  last_modified TEXT
);
--> statement-breakpoint
CREATE TABLE refresh_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE metrics (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, event)
) WITHOUT ROWID;

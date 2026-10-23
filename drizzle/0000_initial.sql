CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  instagram_handle TEXT NOT NULL UNIQUE,
  instagram_user_id TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  segment TEXT NOT NULL,
  geography TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  funnel TEXT NOT NULL DEFAULT 'customer',
  pipeline_state TEXT NOT NULL DEFAULT 'discovered',
  channel_state TEXT NOT NULL DEFAULT 'browser_contact_pending',
  channel_owner TEXT NOT NULL DEFAULT 'browser',
  next_action_at TEXT,
  do_not_contact INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  external_id TEXT UNIQUE,
  direction TEXT NOT NULL,
  channel TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  variant TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  type TEXT NOT NULL,
  lead_id INTEGER REFERENCES leads(id),
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  locked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  lead_id INTEGER REFERENCES leads(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  lead_id INTEGER REFERENCES leads(id),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS jobs_ready_idx ON jobs(status, available_at);
CREATE INDEX IF NOT EXISTS leads_pipeline_idx ON leads(pipeline_state);
CREATE INDEX IF NOT EXISTS messages_lead_idx ON messages(lead_id, created_at);

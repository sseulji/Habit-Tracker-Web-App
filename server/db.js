// SQLite storage (Node's built-in node:sqlite). One file under server/data/.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = process.env.DB_FILE || fileURLToPath(new URL('./data/habits.db', import.meta.url));
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tz TEXT NOT NULL DEFAULT 'UTC',
  calendar TEXT NOT NULL DEFAULT 'demo',          -- demo | manual | google (later)
  day_start INTEGER NOT NULL DEFAULT 420,
  day_end INTEGER NOT NULL DEFAULT 1320,
  morning_at INTEGER NOT NULL DEFAULT 450,         -- 07:30
  evening_at INTEGER NOT NULL DEFAULT 1290,        -- 21:30
  notify_morning INTEGER NOT NULL DEFAULT 1,
  notify_start INTEGER NOT NULL DEFAULT 1,
  notify_recap INTEGER NOT NULL DEFAULT 1,
  last_active_at INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 30,
  min_name TEXT NOT NULL DEFAULT '',
  min_duration INTEGER NOT NULL DEFAULT 5,
  days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',    -- 0 = Sunday
  window TEXT NOT NULL DEFAULT 'any',              -- morning | lunch | evening | any
  fixed_start INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS completions (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'full',               -- full | min | rest
  PRIMARY KEY (habit_id, date)
);
CREATE TABLE IF NOT EXISTS placements (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start INTEGER,
  end INTEGER,
  mode TEXT NOT NULL,                              -- full | min | rest | missed
  locked INTEGER NOT NULL DEFAULT 0,
  moves INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  prev TEXT,                                       -- JSON of the placement before the last automatic change
  change_note INTEGER NOT NULL DEFAULT 0,          -- mention the change in the next start notification
  conflict INTEGER NOT NULL DEFAULT 0,             -- a locked time now overlaps the calendar
  notified INTEGER NOT NULL DEFAULT 0,
  snoozed INTEGER NOT NULL DEFAULT 0,
  UNIQUE (habit_id, date)
);
CREATE TABLE IF NOT EXISTS busy_blocks (           -- demo/manual calendar entries (busy time only, no titles)
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start INTEGER NOT NULL,
  end INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS days (                  -- per-user daily job state
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  morning_sent INTEGER NOT NULL DEFAULT 0,
  recap_sent INTEGER NOT NULL DEFAULT 0,
  weekly_sent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keys TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,                              -- morning | start | cancel | recap | weekly | test
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,            -- sent to at least one push subscription
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS weekly_summaries (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week TEXT NOT NULL,                              -- Monday of the summarised week
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',              -- new | applied | dismissed
  PRIMARY KEY (user_id, week)
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getMeta(key) {
  return one('SELECT value FROM meta WHERE key = ?', key)?.value;
}

export function setMeta(key, value) {
  run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

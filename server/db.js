// SQLite storage (Node's built-in node:sqlite). One file under data/ at the project root —
// outside server/, so the dev watcher doesn't restart on every write.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA } from './schema.js';

const file = process.env.DB_FILE || fileURLToPath(new URL('../data/habits.db', import.meta.url));
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(SCHEMA);

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

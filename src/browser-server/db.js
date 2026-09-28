// Browser stand-in for server/db.js (browser-only build): the same schema and helpers on sql.js,
// SQLite compiled to WebAssembly. The database is saved in this browser's localStorage.
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SCHEMA } from '../../server/schema.js';

const KEY = 'habit-tracker-db';
const SQL = await initSqlJs({ locateFile: () => wasmUrl });

function load() {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return new SQL.Database(Uint8Array.from(atob(saved), c => c.charCodeAt(0)));
  } catch (error) {
    console.error('Could not restore saved data; starting fresh.', error);
  }
  return new SQL.Database();
}

const raw = load();
raw.exec('PRAGMA foreign_keys = ON;');
raw.exec(SCHEMA);

// The subset of node:sqlite's DatabaseSync API the server code uses.
class Statement {
  constructor(sql) {
    this.sql = sql;
  }

  get(...params) {
    const stmt = raw.prepare(this.sql);
    try {
      stmt.bind(params);
      return stmt.step() ? stmt.getAsObject() : undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params) {
    const stmt = raw.prepare(this.sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  run(...params) {
    raw.run(this.sql, params);
    return {
      changes: raw.getRowsModified(),
      lastInsertRowid: raw.exec('SELECT last_insert_rowid()')[0].values[0][0],
    };
  }
}

export const db = {
  prepare: (sql) => new Statement(sql),
  exec: (sql) => raw.exec(sql),
};

export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

export function transaction(fn) {
  raw.exec('BEGIN');
  try {
    const result = fn();
    raw.exec('COMMIT');
    return result;
  } catch (error) {
    raw.exec('ROLLBACK');
    throw error;
  }
}

export function getMeta(key) {
  return one('SELECT value FROM meta WHERE key = ?', key)?.value;
}

export function setMeta(key, value) {
  run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

// Save to localStorage (called after each request and each job run).
export function persist() {
  try {
    const bytes = raw.export();
    raw.exec('PRAGMA foreign_keys = ON;'); // export() resets connection pragmas
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    window.localStorage.setItem(KEY, btoa(binary));
  } catch (error) {
    console.error('Could not save data in this browser.', error);
  }
}

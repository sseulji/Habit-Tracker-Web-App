import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { one, run, transaction } from './db.js';
import { addBusy, removeBusy, getBusy, PROVIDERS } from './calendar.js';
import { isValidTimeZone, addDays } from './tz.js';
import * as svc from './service.js';
import { publicKey, subscribe, unsubscribe, hasSubscription, notify, recentNotifications } from './notify.js';
import { announce, sendMorning, sendRecap, sendWeekly } from './jobs.js';

export const api = Router();

// ---------- helpers ----------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

const COOKIE = 'sid';
function readCookie(req) {
  const header = req.headers.cookie || '';
  return header.split(';').map(s => s.trim().split('=')).find(([k]) => k === COOKIE)?.[1] || null;
}
function setSession(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 90}`);
}

const minutes = (v, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 24 * 60) fail(400, `${name} must be minutes between 0 and 1440`);
  return n;
};
const text = (v, name, max = 120) => {
  if (typeof v !== 'string') fail(400, `${name} is required`);
  const s = v.trim();
  if (!s || s.length > max) fail(400, `${name} must be 1–${max} characters`);
  return s;
};
const optionalText = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Wrap async handlers so thrown errors reach the error handler (Express 5 does this too).
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function publicUser(u) {
  return {
    id: u.id, name: u.name, tz: u.tz, calendar: u.calendar, createdAt: u.created_at,
    dayStart: u.day_start, dayEnd: u.day_end, morningAt: u.morning_at, eveningAt: u.evening_at,
    notifyMorning: Boolean(u.notify_morning), notifyStart: Boolean(u.notify_start), notifyRecap: Boolean(u.notify_recap),
    pushEnabled: hasSubscription(u),
  };
}

// ---------- auth ----------

// Demo sign-in by name. Google sign-in replaces this once an OAuth client is configured.
api.post('/auth/demo', h((req, res) => {
  const name = text(req.body?.name, 'name', 40);
  const tz = isValidTimeZone(req.body?.tz) ? req.body.tz : 'UTC';
  let user = one('SELECT * FROM users WHERE name = ?', name);
  if (!user) {
    const id = run('INSERT INTO users (name, tz, last_active_at) VALUES (?, ?, ?)', name, tz, Date.now()).lastInsertRowid;
    user = svc.userById(id);
  } else if (user.tz !== tz) {
    run('UPDATE users SET tz = ? WHERE id = ?', tz, user.id);
    user = svc.userById(user.id);
  }
  const token = randomBytes(32).toString('hex');
  run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', token, user.id);
  setSession(res, token);
  res.json({ user: publicUser(user) });
}));

api.use((req, res, next) => {
  const token = readCookie(req);
  const session = token && one('SELECT user_id FROM sessions WHERE token = ?', token);
  if (!session) return res.status(401).json({ error: 'Not signed in' });
  req.user = svc.userById(session.user_id);
  req.token = token;
  run('UPDATE users SET last_active_at = ? WHERE id = ?', Date.now(), req.user.id);
  next();
});

api.post('/auth/logout', (req, res) => {
  run('DELETE FROM sessions WHERE token = ?', req.token);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

api.patch('/me', h(async (req, res) => {
  const b = req.body || {};
  const u = req.user;
  const next = {
    name: b.name !== undefined ? text(b.name, 'name', 40) : u.name,
    tz: b.tz !== undefined && isValidTimeZone(b.tz) ? b.tz : u.tz,
    calendar: b.calendar !== undefined ? (PROVIDERS.includes(b.calendar) ? b.calendar : fail(400, 'unknown calendar')) : u.calendar,
    day_start: b.dayStart !== undefined ? minutes(b.dayStart, 'dayStart') : u.day_start,
    day_end: b.dayEnd !== undefined ? minutes(b.dayEnd, 'dayEnd') : u.day_end,
    morning_at: b.morningAt !== undefined ? minutes(b.morningAt, 'morningAt') : u.morning_at,
    evening_at: b.eveningAt !== undefined ? minutes(b.eveningAt, 'eveningAt') : u.evening_at,
    notify_morning: b.notifyMorning !== undefined ? (b.notifyMorning ? 1 : 0) : u.notify_morning,
    notify_start: b.notifyStart !== undefined ? (b.notifyStart ? 1 : 0) : u.notify_start,
    notify_recap: b.notifyRecap !== undefined ? (b.notifyRecap ? 1 : 0) : u.notify_recap,
  };
  if (next.day_end - next.day_start < 60) fail(400, 'Activity hours must span at least an hour');
  if (next.name !== u.name && one('SELECT 1 x FROM users WHERE name = ? AND id != ?', next.name, u.id)) fail(409, 'That name is taken');
  run(`UPDATE users SET name = ?, tz = ?, calendar = ?, day_start = ?, day_end = ?, morning_at = ?, evening_at = ?,
       notify_morning = ?, notify_start = ?, notify_recap = ? WHERE id = ?`,
    next.name, next.tz, next.calendar, next.day_start, next.day_end, next.morning_at, next.evening_at,
    next.notify_morning, next.notify_start, next.notify_recap, u.id);
  const user = svc.userById(u.id);
  await announce(user, svc.replan(user));
  res.json({ user: publicUser(user) });
}));

// ---------- today ----------

api.get('/today', (req, res) => res.json(svc.todayView(req.user)));

// ---------- habits ----------

function habitFields(b, existing = {}) {
  const pick = (k, d) => (b[k] !== undefined ? b[k] : existing[k] ?? d);
  const days = pick('days', [0, 1, 2, 3, 4, 5, 6]);
  if (!Array.isArray(days) || days.length === 0 || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) fail(400, 'Pick at least one day');
  const duration = Number(pick('duration', 30));
  const minDuration = Number(pick('minDuration', 5));
  if (!Number.isInteger(duration) || duration < 5 || duration > 240) fail(400, 'Duration must be 5–240 minutes');
  if (!Number.isInteger(minDuration) || minDuration < 1 || minDuration > duration) fail(400, 'Minimum version must be 1 minute up to the full duration');
  const window = pick('window', 'any');
  if (!['any', 'morning', 'lunch', 'evening'].includes(window)) fail(400, 'Unknown time of day');
  const fixed = pick('fixedStart', null);
  return {
    name: text(pick('name'), 'Habit name', 60),
    description: optionalText(pick('description', '')),
    icon: optionalText(pick('icon', ''), 8),
    duration, minDuration,
    minName: optionalText(pick('minName', ''), 40),
    days: JSON.stringify([...new Set(days)].sort()),
    window,
    fixedStart: fixed === null || fixed === '' ? null : minutes(fixed, 'fixedStart'),
  };
}

api.get('/habits', (req, res) => res.json({ habits: svc.todayView(req.user).habits }));

api.post('/habits', h(async (req, res) => {
  const f = habitFields(req.body || {});
  const id = run(`INSERT INTO habits (user_id, name, description, icon, duration, min_name, min_duration, days, window, fixed_start)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, req.user.id, f.name, f.description, f.icon, f.duration, f.minName, f.minDuration, f.days, f.window, f.fixedStart).lastInsertRowid;
  svc.ensurePlan(req.user);
  res.status(201).json({ id, today: svc.todayView(req.user) });
}));

api.patch('/habits/:id', h(async (req, res) => {
  const row = one('SELECT * FROM habits WHERE id = ? AND user_id = ?', req.params.id, req.user.id) || fail(404, 'Habit not found');
  const f = habitFields(req.body || {}, svc.toHabit(row));
  const timingChanged = f.duration !== row.duration || f.minDuration !== row.min_duration || f.window !== row.window
    || f.fixedStart !== row.fixed_start || f.days !== row.days;
  transaction(() => {
    run(`UPDATE habits SET name = ?, description = ?, icon = ?, duration = ?, min_name = ?, min_duration = ?, days = ?, window = ?, fixed_start = ? WHERE id = ?`,
      f.name, f.description, f.icon, f.duration, f.minName, f.minDuration, f.days, f.window, f.fixedStart, row.id);
    // Timing changed → re-place today's (unfinished) slot with the new settings.
    if (timingChanged) {
      const { date } = svc.nowFor(req.user);
      if (!one('SELECT 1 x FROM completions WHERE habit_id = ? AND date = ?', row.id, date)) {
        run('DELETE FROM placements WHERE habit_id = ? AND date = ?', row.id, date);
      }
    }
  });
  res.json({ today: svc.todayView(req.user) });
}));

api.delete('/habits/:id', (req, res) => {
  run('DELETE FROM habits WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
  res.json({ today: svc.todayView(req.user) });
});

api.post('/habits/:id/toggle', (req, res) => {
  one('SELECT 1 x FROM habits WHERE id = ? AND user_id = ?', req.params.id, req.user.id) || fail(404, 'Habit not found');
  svc.toggleHabit(req.user, Number(req.params.id));
  res.json({ today: svc.todayView(req.user) });
});

api.get('/completions', (req, res) => res.json({ completions: svc.completionsView(req.user) }));

// ---------- placements ----------

function placement(req) {
  return svc.getPlacement(req.user, req.params.id) || fail(404, 'Not on today\'s plan');
}

async function act(user, p, action) {
  switch (action) {
    case 'done': svc.complete(user, p, 'full'); break;
    case 'min': svc.complete(user, p, 'min'); break;
    case 'rest':
      if (!svc.restAvailable(p.habit_id, p.date)) fail(409, 'This week\'s rest day is already used');
      svc.complete(user, p, 'rest');
      break;
    case 'undone': svc.uncomplete(p); break;
    case 'snooze': {
      const { cancelled } = svc.snooze(user, p);
      if (cancelled) await announce(user, [{ ...svc.getPlacement(user, p.id), cancelled: true }]);
      break;
    }
    case 'undo': svc.undo(user, p) || fail(409, 'Nothing to undo'); break;
    case 'auto': await announce(user, svc.unlockAndReplan(user, p)); break;
    default: fail(400, 'Unknown action');
  }
}

api.post('/placements/:id/:action', h(async (req, res) => {
  await act(req.user, placement(req), req.params.action);
  res.json({ today: svc.todayView(req.user) });
}));

api.patch('/placements/:id', h(async (req, res) => {
  svc.setTime(req.user, placement(req), minutes(req.body?.start, 'start'));
  res.json({ today: svc.todayView(req.user) });
}));

// Buttons pressed on a notification (sent by the service worker).
api.post('/notification-action', h(async (req, res) => {
  const p = svc.getPlacement(req.user, req.body?.placementId) || fail(404, 'Not on today\'s plan');
  await act(req.user, p, req.body?.action);
  res.json({ ok: true });
}));

// ---------- calendar (demo / manual busy time) ----------

api.get('/busy', (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : svc.nowFor(req.user).date;
  res.json({ date, busy: getBusy(req.user, date) });
});

// A new meeting lands: the plan reacts immediately, like a calendar change notification would.
api.post('/busy', h(async (req, res) => {
  const b = req.body || {};
  const today = svc.nowFor(req.user).date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : today;
  if (date < today || date > addDays(today, 14)) fail(400, 'Date must be within the next two weeks');
  const start = minutes(b.start, 'start');
  const end = minutes(b.end, 'end');
  if (end <= start) fail(400, 'End must be after start');
  addBusy(req.user, date, start, end);
  const changed = svc.replan(req.user);
  await announce(req.user, changed);
  res.status(201).json({ changed: changed.length, today: svc.todayView(req.user) });
}));

api.delete('/busy/:id', h(async (req, res) => {
  removeBusy(req.user, req.params.id) || fail(404, 'Not found');
  await announce(req.user, svc.replan(req.user));
  res.json({ today: svc.todayView(req.user) });
}));

// ---------- notifications ----------

api.get('/push/key', (req, res) => res.json({ publicKey }));

api.post('/push/subscribe', (req, res) => {
  const s = req.body;
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) fail(400, 'Invalid subscription');
  subscribe(req.user, s);
  res.json({ ok: true });
});

api.post('/push/unsubscribe', (req, res) => {
  unsubscribe(req.user, req.body?.endpoint);
  res.json({ ok: true });
});

api.get('/notifications', (req, res) => res.json({ notifications: recentNotifications(req.user) }));

// Run a notification now (Settings → Try it): test, morning plan, evening recap, weekly summary.
api.post('/notifications/run/:kind', h(async (req, res) => {
  const u = req.user;
  const runners = {
    test: () => notify(u, { kind: 'test', title: 'Test notification', body: 'Notifications work on this device.' }),
    morning: () => sendMorning(u),
    recap: () => sendRecap(u),
    weekly: () => sendWeekly(u),
  };
  const runner = runners[req.params.kind] || fail(400, 'Unknown notification');
  const sent = await runner();
  res.json({ sent, notifications: recentNotifications(u) });
}));

// ---------- weekly summary ----------

api.get('/summary/weekly', (req, res) => {
  const latest = svc.latestWeeklySummary(req.user);
  res.json({ summary: latest || { ...svc.weeklySummary(req.user, svc.nowFor(req.user).date), status: 'preview' } });
});

api.post('/summary/weekly/:week/apply', (req, res) => {
  svc.applyWeeklySuggestion(req.user, req.params.week) || fail(404, 'No summary for that week');
  res.json({ summary: svc.latestWeeklySummary(req.user) });
});

api.post('/summary/weekly/:week/dismiss', (req, res) => {
  svc.dismissWeeklySuggestion(req.user, req.params.week);
  res.json({ summary: svc.latestWeeklySummary(req.user) });
});

// ---------- data ----------

api.get('/export', (req, res) => {
  const habits = svc.habitsOf(req.user);
  res.json({ version: '2.0', exportDate: new Date().toISOString(), habits, completions: svc.completionsView(req.user) });
});

// Accepts this app's export (v2) and the original tracker's backup / browser data (v1:
// completions as { habitId: ['YYYY-MM-DD', …] }).
api.post('/import', (req, res) => {
  const { habits, completions } = req.body || {};
  if (!Array.isArray(habits) || typeof completions !== 'object' || completions === null) fail(400, 'Not a habit tracker backup');
  let imported = 0;
  transaction(() => {
    for (const hb of habits.slice(0, 200)) {
      if (typeof hb?.name !== 'string' || !hb.name.trim()) continue;
      const f = habitFields({
        name: hb.name, description: hb.description || '', icon: hb.icon || '',
        duration: hb.duration ?? 30, minDuration: hb.minDuration ?? 5, minName: hb.minName || '',
        days: hb.days ?? [0, 1, 2, 3, 4, 5, 6], window: hb.window || 'any', fixedStart: hb.fixedStart ?? null,
      });
      const createdAt = typeof hb.createdAt === 'string' && !Number.isNaN(Date.parse(hb.createdAt))
        ? new Date(hb.createdAt).toISOString().replace('T', ' ').slice(0, 19) : null;
      const id = run(`INSERT INTO habits (user_id, name, description, icon, duration, min_name, min_duration, days, window, fixed_start, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
        req.user.id, f.name, f.description, f.icon, f.duration, f.minName, f.minDuration, f.days, f.window, f.fixedStart, createdAt).lastInsertRowid;
      const entries = completions[hb.id];
      const pairs = Array.isArray(entries) ? entries.map(d => [d, 'full']) : Object.entries(entries || {});
      for (const [date, kind] of pairs) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && ['full', 'min', 'rest'].includes(kind)) {
          run('INSERT OR IGNORE INTO completions (habit_id, date, kind) VALUES (?, ?, ?)', id, date, kind);
        }
      }
      imported++;
    }
  });
  res.json({ imported, today: svc.todayView(req.user) });
});

api.delete('/data', (req, res) => {
  transaction(() => {
    run('DELETE FROM habits WHERE user_id = ?', req.user.id);
    run('DELETE FROM busy_blocks WHERE user_id = ?', req.user.id);
    run('DELETE FROM weekly_summaries WHERE user_id = ?', req.user.id);
  });
  res.json({ today: svc.todayView(req.user) });
});

// ---------- errors ----------

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});


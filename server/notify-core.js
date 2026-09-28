// Notification budget and log, shared by web push (notify.js) and the browser-only build.
import { one, all, run } from './db.js';
import { habitsOf, isDue, nowFor } from './service.js';

const DAY = 24 * 60 * 60 * 1000;

// Daily cap: habits due today + 2. A user who hasn't reacted for 3 days only gets the morning plan.
function allowed(user, kind, date, at) {
  if (kind === 'test') return true;
  const inactive = user.last_active_at && at - user.last_active_at > 3 * DAY;
  if (inactive && kind !== 'morning') return false;
  const cap = habitsOf(user).filter(h => isDue(h, date)).length + 2;
  const sent = one(`SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND date = ? AND kind != 'test'`, user.id, date).n;
  return sent < cap;
}

// Records a notification if the budget allows; returns its id, or null when it must not be sent.
export function logNotification(user, payload, at) {
  const { date } = nowFor(user, at);
  if (!allowed(user, payload.kind, date, at)) return null;
  return run(`INSERT INTO notifications (user_id, date, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    user.id, date, payload.kind, payload.title, payload.body, at).lastInsertRowid;
}

export function markDelivered(id) {
  run('UPDATE notifications SET delivered = 1 WHERE id = ?', id);
}

export function recentNotifications(user, limit = 20) {
  return all('SELECT id, kind, title, body, delivered, created_at createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?', user.id, limit)
    .map(n => ({ ...n, delivered: Boolean(n.delivered) }));
}

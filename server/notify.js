// Web push + the PRD's notification budget. Every notification is also logged so the app
// can show it (Settings → Notifications) even where push isn't available.
import webpush from 'web-push';
import { one, all, run, getMeta, setMeta } from './db.js';
import { habitsOf, isDue, nowFor } from './service.js';

const DAY = 24 * 60 * 60 * 1000;

function vapidKeys() {
  let keys = getMeta('vapid');
  if (!keys) {
    keys = JSON.stringify(webpush.generateVAPIDKeys());
    setMeta('vapid', keys);
  }
  return JSON.parse(keys);
}

const keys = vapidKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:habits@example.com', keys.publicKey, keys.privateKey);

export const publicKey = keys.publicKey;

export function subscribe(user, subscription) {
  run(`INSERT INTO push_subscriptions (endpoint, user_id, keys) VALUES (?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys`,
    subscription.endpoint, user.id, JSON.stringify(subscription.keys));
}

export function unsubscribe(user, endpoint) {
  run('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', endpoint, user.id);
}

export const hasSubscription = (user) => Boolean(one('SELECT 1 x FROM push_subscriptions WHERE user_id = ?', user.id));

// Daily cap: habits due today + 2. A user who hasn't reacted for 3 days only gets the morning plan.
function allowed(user, kind, date, at) {
  if (kind === 'test') return true;
  const inactive = user.last_active_at && at - user.last_active_at > 3 * DAY;
  if (inactive && kind !== 'morning') return false;
  const cap = habitsOf(user).filter(h => isDue(h, date)).length + 2;
  const sent = one(`SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND date = ? AND kind != 'test'`, user.id, date).n;
  return sent < cap;
}

/**
 * payload: { kind, title, body, placementId?, actions?: [{ action, title }] }
 * Returns true when logged (whether or not a device received it).
 */
export async function notify(user, payload, at = Date.now()) {
  const { date } = nowFor(user, at);
  if (!allowed(user, payload.kind, date, at)) return false;

  const id = run(`INSERT INTO notifications (user_id, date, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    user.id, date, payload.kind, payload.title, payload.body, at).lastInsertRowid;

  const subs = all('SELECT * FROM push_subscriptions WHERE user_id = ?', user.id);
  let delivered = false;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: JSON.parse(s.keys) }, JSON.stringify({ ...payload, id }), { TTL: 60 * 30 });
      delivered = true;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) run('DELETE FROM push_subscriptions WHERE endpoint = ?', s.endpoint);
      else console.error('push failed:', error.statusCode || error.message);
    }
  }));
  if (delivered) run('UPDATE notifications SET delivered = 1 WHERE id = ?', id);
  return true;
}

export function recentNotifications(user, limit = 20) {
  return all('SELECT id, kind, title, body, delivered, created_at createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?', user.id, limit)
    .map(n => ({ ...n, delivered: Boolean(n.delivered) }));
}

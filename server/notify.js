// Web push + the PRD's notification budget. Every notification is also logged so the app
// can show it (Settings → Notifications) even where push isn't available.
import webpush from 'web-push';
import { one, all, run, getMeta, setMeta } from './db.js';
import { logNotification, markDelivered, recentNotifications } from './notify-core.js';

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
export { recentNotifications };

export function subscribe(user, subscription) {
  run(`INSERT INTO push_subscriptions (endpoint, user_id, keys) VALUES (?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys`,
    subscription.endpoint, user.id, JSON.stringify(subscription.keys));
}

export function unsubscribe(user, endpoint) {
  run('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', endpoint, user.id);
}

export const hasSubscription = (user) => Boolean(one('SELECT 1 x FROM push_subscriptions WHERE user_id = ?', user.id));

/**
 * payload: { kind, title, body, placementId?, actions?: [{ action, title }] }
 * Returns true when logged (whether or not a device received it).
 */
export async function notify(user, payload, at = Date.now()) {
  const id = logNotification(user, payload, at);
  if (id == null) return false;

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
  if (delivered) markDelivered(id);
  return true;
}

// Browser stand-in for server/notify.js: no push server, so notifications are shown by this
// page's service worker while the app is open (when the browser allows notifications).
import { logNotification, markDelivered, recentNotifications } from '../../server/notify-core.js';

export const publicKey = null;
export { recentNotifications };

export function subscribe() {}
export function unsubscribe() {}
export const hasSubscription = () => typeof Notification !== 'undefined' && Notification.permission === 'granted';

export async function notify(user, payload, at = Date.now()) {
  const id = logNotification(user, payload, at);
  if (id == null) return false;
  try {
    if (hasSubscription() && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(payload.title, {
        body: payload.body,
        tag: payload.placementId ? `placement-${payload.placementId}` : payload.kind,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
      });
      markDelivered(id);
    }
  } catch (error) {
    console.error('Could not show notification:', error);
  }
  return true;
}

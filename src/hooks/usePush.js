import { useCallback, useEffect, useState } from 'react';
import { api, isBrowserOnly } from '../api';

// The browser-only build shows notifications from the page itself, so it needs no PushManager.
const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window
  && (isBrowserOnly || 'PushManager' in window);

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// Push on this device: 'unsupported' | 'denied' | 'off' | 'on'
function usePush() {
  const [status, setStatus] = useState(supported ? 'off' : 'unsupported');
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supported) return;
    if (Notification.permission === 'denied') return setStatus('denied');
    if (isBrowserOnly) return setStatus(Notification.permission === 'granted' ? 'on' : 'off');
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    setStatus(sub ? 'on' : 'off');
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const enable = async () => {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      if (isBrowserOnly) return setStatus('on');
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get('/push/key');
      const sub = await reg.pushManager.getSubscription()
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await api.post('/push/subscribe', sub.toJSON());
      setStatus('on');
    } catch (e) {
      setError(e.message || 'Could not turn on notifications');
    }
  };

  const disable = async () => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch (e) {
      setError(e.message || 'Could not turn off notifications');
    }
  };

  return { status, error, enable, disable };
}

export default usePush;

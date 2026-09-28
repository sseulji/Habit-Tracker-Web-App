// Offline support + push notifications.
// Registered with ?dev=1 by the Vite dev server: caching is then skipped so hot reload is never stale.
// Habit data lives on the server and never passes through the cache.
const CACHE = 'habit-tracker-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];
const DEV = new URL(self.location.href).searchParams.has('dev');

self.addEventListener('install', (event) => {
  if (!DEV) event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => DEV || key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (DEV || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // always live

  // Page navigations: network first so new deploys show up, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin assets (hashed JS/CSS, icons) and Google Fonts: cache first, then network.
  const isFont = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
  if (url.origin === self.location.origin || isFont) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});

// ---------- Push ----------

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Habit Tracker', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Habit Tracker', {
    body: data.body || '',
    tag: data.placementId ? `placement-${data.placementId}` : data.kind,
    renotify: true,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data,
    actions: (data.actions || []).slice(0, 3),
  }));
});

async function refreshOpenApps() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage({ type: 'refresh' }));
  return windows;
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if (event.action && data.placementId) {
    // A button on the notification: record it without opening the app.
    event.waitUntil(
      fetch('/api/notification-action', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementId: data.placementId, action: event.action }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return refreshOpenApps();
        })
        .catch(() => self.clients.openWindow(self.registration.scope))
    );
    return;
  }

  // The notification itself: focus the app (or open it) on Today.
  event.waitUntil(
    refreshOpenApps().then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    })
  );
});

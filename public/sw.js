// public/sw.js

const CACHE_NAME = 'vdf-pwa-v1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logo.png',
  '/group-avatar.png',
  '/img/default-avatar.png',
  // иконки навигации
  '/icons/home.png',
  '/icons/home-gray.png',
  '/icons/user.png',
  '/icons/user-active.png',
  '/icons/plus.png',
  '/icons/plus-active.png',
  '/icons/list.png',
  '/icons/list-gray.png',
  '/icons/mic.png',
  '/icons/send.png',
  '/icons/attach.png',
  '/icons/edit.png',
  '/icons/mute.png',
  '/icons/play.png',
  '/icons/play-dark.png',
  '/icons/pause-dark.png',
  '/icons/upload.png',
  // статические шрифты браузера грузит сам
];

// ---------- INSTALL / ACTIVATE (PWA) ----------

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// ---------- FETCH: кешируем только GET, без API ----------

self.addEventListener('fetch', event => {
  const req = event.request;

  // не кешируем POST/PUT/DELETE и т.п.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // не кешируем API-запросы
  if (url.pathname.startsWith('/api/')) return;

  // стратегия: cache-first для статики и shell
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // пробуем из кэша
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const response = await fetch(req);
        // кладём только успешные GETы
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(req, response.clone());
        }
        return response;
      } catch (e) {
        // оффлайн‑фолбэк для навигации
        if (req.mode === 'navigate') {
          const fallback = await cache.match('/index.html');
          if (fallback) return fallback;
        }
        throw e;
      }
    })()
  );
});

// ---------- PUSH УВЕДОМЛЕНИЯ ----------

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {};
  }

  const title  = data.title  || 'Новое сообщение';
  const body   = data.body   || '';
  const icon   = data.icon   || '/logo.png';
  const tag    = data.tag    || 'vdf-chat';
  const url    = data.url    || '/';
  const chatId = data.chatId || null;

  const notifData = { url, chatId };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      data: notifData
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const data   = event.notification.data || {};
  const url    = data.url || '/';
  const chatId = data.chatId || null;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    if (chatId) {
      if (allClients.length > 0) {
        const client = allClients[0];
        try {
          if ('focus' in client) {
            await client.focus();
          }
        } catch (e) {}

        try {
          client.postMessage({ type: 'OPEN_CHAT', chatId });
        } catch (e) {}
        return;
      }

      await self.clients.openWindow('/?chatId=' + encodeURIComponent(chatId));
      return;
    }

    for (const client of allClients) {
      if (client.visibilityState === 'visible') {
        try {
          await client.focus();
        } catch (e) {}
        return;
      }
    }

    await self.clients.openWindow(url);
  })());
});
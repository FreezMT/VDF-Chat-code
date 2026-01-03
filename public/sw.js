// public/sw.js

// ====== PWA / OFFLINE КЭШИРОВАНИЕ ======

const STATIC_CACHE_VERSION = 'v3';
const STATIC_CACHE_NAME    = 'vdf-chat-static-' + STATIC_CACHE_VERSION;
const RUNTIME_CACHE_NAME   = 'vdf-chat-runtime-' + STATIC_CACHE_VERSION;

// Минимальный набор файлов для оффлайн-оболочки
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',

  // базовые картинки
  '/logo.png',
  '/group-avatar.png',
  '/img/default-avatar.png',
  '/img/chat-bg.png',

  // иконки навигации/кнопок (если пути другие — поправь под свой проект)
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
  '/icons/play.png',
  '/icons/pause.png',
  '/icons/play-dark.png',
  '/icons/pause-dark.png',
  '/icons/mute.png',
  '/icons/upload.png'
];

// Установка: предкэшируем "оболочку" приложения
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Активация: чистим старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (
            key !== STATIC_CACHE_NAME &&
            key !== RUNTIME_CACHE_NAME &&
            key.startsWith('vdf-chat-')
          ) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Обработка запросов: только GET, без API/POST
self.addEventListener('fetch', event => {
  const req = event.request;

  // Кэшируем только GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Только наш origin
  if (url.origin !== self.location.origin) return;

  // Навигация (переходы по страницам) — network-first, fallback на кэш
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put('/', resClone);
          }).catch(() => {});
          return res;
        })
        .catch(() => {
          return caches.match(req)
            .then(match => match || caches.match('/'));
        })
    );
    return;
  }

  // Если это один из заранее известных статических ассетов — cache-first
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req)
          .then(res => {
            const resClone = res.clone();
            caches.open(STATIC_CACHE_NAME).then(cache => {
              cache.put(req, resClone);
            }).catch(() => {});
            return res;
          })
          .catch(() => caches.match('/'));
      })
    );
    return;
  }

  // Остальные GET (картинки, аватары и т.п.) — network-first с runtime-кэшем
  event.respondWith(
    fetch(req)
      .then(res => {
        const resClone = res.clone();
        caches.open(RUNTIME_CACHE_NAME).then(cache => {
          cache.put(req, resClone);
        }).catch(() => {});
        return res;
      })
            .catch(() => {
        return caches.match(req).then(match => {
          if (match) return match;

          // Для картинок/аватаров/медиа не подменяем на '/', просто даём 404/пустой ответ
          if (url.pathname.startsWith('/avatars') ||
              url.pathname.startsWith('/video-previews') ||
              url.pathname.startsWith('/img')) {
            return new Response('', { status: 404 });
          }

          // Для остальных — fallback на оболочку
          return caches.match('/') ;
        });
      })
  );
});


// ====== PUSH УВЕДОМЛЕНИЯ ======

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

    // Если в push пришёл chatId — открываем конкретный чат
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

    // Иначе — просто открываем/фокусируем приложение
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
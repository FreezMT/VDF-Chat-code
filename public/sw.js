// public/sw.js

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
      // renotify можно не указывать, т.к. tag уже уникальный
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const data   = event.notification.data || {};
  const url    = data.url || '/';
  const chatId = data.chatId || null;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    if (chatId) {
      // если есть окно — фокусируем и шлём команду открыть чат
      if (allClients.length > 0) {
        const client = allClients[0];
        if ('focus' in client) {
          await client.focus();
        }
        client.postMessage({ type: 'OPEN_CHAT', chatId });
        return;
      }

      // если окон нет — открываем новое с параметром chatId
      await self.clients.openWindow('/?chatId=' + encodeURIComponent(chatId));
      return;
    }

    // без chatId: фокусируем видимое окно или открываем url
    for (const client of allClients) {
      if (client.visibilityState === 'visible') {
        await client.focus();
        return;
      }
    }

    await self.clients.openWindow(url);
  })());
});
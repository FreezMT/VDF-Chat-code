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
      // renotify не обязателен, tag уже группирует уведомления
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

    // Если есть chatId — пробуем открыть/фокусировать окно приложения и сообщить ему нужный чат
    if (chatId) {
      if (allClients.length > 0) {
        const client = allClients[0];
        try {
          if ('focus' in client) {
            await client.focus();
          }
        } catch (e) {
          // ignore focus error
        }
        try {
          client.postMessage({ type: 'OPEN_CHAT', chatId });
        } catch (e) {
          // ignore postMessage error
        }
        return;
      }

      // Если окон нет — открываем новое с параметром chatId
      await self.clients.openWindow('/?chatId=' + encodeURIComponent(chatId));
      return;
    }

    // Без chatId: фокусируем видимое окно или открываем url
    for (const client of allClients) {
      // visibilityState есть только у контролируемых клиентов, но includeUncontrolled:true это покрывает
      if (client.visibilityState === 'visible') {
        try {
          await client.focus();
        } catch (e) {
          // ignore
        }
        return;
      }
    }

    await self.clients.openWindow(url);
  })());
});
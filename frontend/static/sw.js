// Energia Időzítő — Service Worker
// Enables Web Push notifications so the app can alert the user when the
// electricity price drops into the "olcsó" (cheap) band.
//
// NOTE on VAPID keys: the public key used by the frontend to subscribe
// (see VAPID_PUBLIC_KEY in js/app.js) is a PLACEHOLDER — base64-encoded
// random bytes, not a real elliptic-curve key. It lets the opt-in /
// subscribe flow run end-to-end in the browser, but a server cannot use it
// to actually deliver push messages. Before wiring up real server-sent
// push, generate a real pair with the `web-push` npm library, e.g.:
//   npx web-push generate-vapid-keys
// then swap the public key here/in app.js and keep the private key on the
// backend only (never ship it to the client).

const NOTIF_TAG = 'price-alert';
const DEFAULT_TITLE = 'Energia Időzítő';
const DEFAULT_BODY = 'Most olcsó — indítsd a mosógépet!';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real server-triggered push messages (once real VAPID keys + a backend
// push-sender are in place) land here.
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  }
  const title = data.title || DEFAULT_TITLE;
  const body = data.body || DEFAULT_BODY;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: NOTIF_TAG,
      renotify: true,
    })
  );
});

// Local notifications, triggered directly from the app (via
// registration.showNotification) when the currently displayed price is
// cheap, are shown immediately by app.js and don't need this handler —
// but we also support asking the SW to show one via postMessage, in case
// the page wants to fire a notification while it's in the background.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_PRICE_ALERT') {
    self.registration.showNotification(event.data.title || DEFAULT_TITLE, {
      body: event.data.body || DEFAULT_BODY,
      tag: NOTIF_TAG,
      renotify: true,
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

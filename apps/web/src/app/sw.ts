import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  Serwist,
  NetworkOnly,
  CacheFirst,
  ExpirationPlugin,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
  runtimeCaching: [
    // 1. Explicitly bypass cache for all API & authentication endpoints
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('onrender.com') ||
        url.pathname.includes('socket.io') ||
        url.pathname.includes('/auth/'),
      handler: new NetworkOnly(),
    },
    // 2. Cache Google Fonts
    {
      matcher: ({ url }) =>
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          }),
        ],
      }),
    },
    // 3. Fallback to standard Serwist Next.js precaching & runtime rules
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Listen for incoming Web Push events
self.addEventListener('push', (event: PushEvent) => {
  console.log('[ServiceWorker Push] 🔔 Push event received by browser service worker:', event);

  let payload = {
    title: 'Baari Notification',
    body: 'You have a new update in your flat.',
    data: {} as Record<string, any>,
  };

  if (event.data) {
    try {
      const json = event.data.json();
      console.log('[ServiceWorker Push] Parsed JSON push payload:', json);
      payload = {
        title: json.title || payload.title,
        body: json.body || payload.body,
        data: json.data || {},
      };
    } catch (_) {
      const text = event.data.text();
      console.log('[ServiceWorker Push] Raw text push payload:', text);
      payload.body = text || payload.body;
    }
  } else {
    console.log('[ServiceWorker Push] Push event has no payload data.');
  }

  const notificationOptions: NotificationOptions = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  };

  event.waitUntil(
    self.registration
      .showNotification(payload.title, notificationOptions)
      .then(() => {
        console.log('[ServiceWorker Push] ✅ showNotification() displayed successfully:', payload.title);
      })
      .catch((err) => {
        console.error('[ServiceWorker Push] ❌ showNotification() failed to display:', err);
      })
  );
});

// Handle notification click / tap
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[ServiceWorker NotificationClick] User clicked notification:', event.notification);
  event.notification.close();

  const data = event.notification.data || {};
  let targetPath = '/home';
  if (data.type === 'expense' || data.type === 'settlement') {
    targetPath = '/expense';
  } else if (data.type === 'activity') {
    targetPath = '/activity';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetPath) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});


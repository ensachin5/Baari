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


/* eslint-disable no-restricted-globals */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const SW_VERSION = '2.1.0'; // Fix: exclude auth routes, add offline fallback
const OFFLINE_FALLBACK = '/offline.html';

const sendMessageToClients = async (type, payload) => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({ type, payload });
  }
};

/**
 * MULTI-TENANCY SECURITY NOTE:
 * 
 * Background sync of pending orders is DISABLED in the service worker.
 * This is intentional for multi-tenancy security reasons:
 * 
 * 1. The service worker doesn't have access to the current user's shopId
 * 2. Syncing orders without shopId verification could leak data between shops
 * 3. Manual sync from the POS page has proper shopId context and auth token
 * 
 * Users should use the "Sync" button in the POS interface to sync pending orders.
 * This ensures proper multi-tenant isolation.
 */

self.addEventListener('message', (event) => {
  const data = event?.data;
  if (!data || typeof data !== 'object') return;
  
  if (data.type === 'TRIGGER_SYNC') {
    // Notify client to handle sync with proper shopId context
    // The actual sync is handled by the POS page with proper auth
    sendMessageToClients('sync-requested', { 
      message: 'Please use the Sync button in POS to sync pending orders.' 
    });
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-orders') {
    // Don't auto-sync - notify client instead for multi-tenancy safety
    event.waitUntil(
      sendMessageToClients('sync-requested', { 
        message: 'Background sync requested. Please use the Sync button in POS.' 
      })
    );
  }
});

self.workbox?.core?.setCacheNameDetails({ prefix: 'smartduka-pos', suffix: SW_VERSION });
self.workbox?.core?.clientsClaim();
// Use self.skipWaiting() instead of workbox.core.skipWaiting() (recommended in Workbox v6+)
self.skipWaiting();

// Pre-cache the offline fallback page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('smartduka-pos-offline').then((cache) => cache.add(OFFLINE_FALLBACK))
  );
});

if (self.workbox) {
  const { routing, strategies, expiration } = self.workbox;

  // Cache API calls (both localhost and production)
  routing.registerRoute(
    ({ url }) => 
      url.origin === 'http://localhost:5000' || 
      url.origin === 'https://api.smartduka.com' ||
      url.pathname.startsWith('/inventory/products') || 
      url.pathname.startsWith('/inventory/categories'),
    new strategies.NetworkFirst({
      cacheName: 'smartduka-pos-api',
      networkTimeoutSeconds: 5,
      plugins: [
        new expiration.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 }),
      ],
    }),
    'GET',
  );

  // Cache pages — exclude auth routes (contain tokens that must never be cached)
  routing.registerRoute(
    ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/auth/'),
    new strategies.NetworkFirst({
      cacheName: 'smartduka-pos-pages',
      networkTimeoutSeconds: 3,
      plugins: [
        {
          // Provide offline fallback when both network and cache fail
          handlerDidError: async () => {
            return caches.match(OFFLINE_FALLBACK);
          },
        },
      ],
    }),
  );
} else {
  console.warn('Workbox could not be loaded. Offline caching disabled.');
}

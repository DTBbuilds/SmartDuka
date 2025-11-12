/* eslint-disable no-restricted-globals */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');
importScripts('https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js');

const SW_VERSION = '1.0.0';
let isSyncing = false;

const sendMessageToClients = async (type, payload) => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({ type, payload });
  }
};

const buildRequest = (payload) => {
  const url = new URL('/sales/checkout', self.location.origin).toString();
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
};

const flushPendingOrders = async () => {
  if (typeof Dexie === 'undefined') {
    sendMessageToClients('sync-error', { message: 'Dexie not available in service worker.' });
    return;
  }

  if (isSyncing) return;
  isSyncing = true;

  const db = new Dexie('SmartDukaPOS');
  db.version(1).stores({
    products: '&_id, name, categoryId, updatedAt',
    pendingOrders: '++id, createdAt',
    metadata: '&key, updatedAt',
  });

  try {
    const orders = await db.pendingOrders.orderBy('createdAt').toArray();
    if (orders.length === 0) {
      await sendMessageToClients('sync-result', { success: 0, failed: 0 });
      return;
    }

    let success = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const payload = { ...order.payload, status: 'completed', isOffline: false };
        const response = await fetch(buildRequest(payload));
        if (!response.ok) {
          failed += 1;
          continue;
        }
        if (order.id != null) {
          await db.pendingOrders.delete(order.id);
        }
        success += 1;
      } catch (error) {
        failed += 1;
      }
    }

    await sendMessageToClients('sync-result', { success, failed });
  } catch (error) {
    await sendMessageToClients('sync-error', { message: error?.message ?? 'Failed to sync pending orders' });
  } finally {
    isSyncing = false;
  }
};

self.addEventListener('message', (event) => {
  const data = event?.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'TRIGGER_SYNC') {
    flushPendingOrders();
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-orders') {
    event.waitUntil(flushPendingOrders());
  }
});

self.workbox?.core?.setCacheNameDetails({ prefix: 'smartduka-pos', suffix: SW_VERSION });
self.workbox?.core?.clientsClaim();
// Use self.skipWaiting() instead of workbox.core.skipWaiting() (recommended in Workbox v6+)
self.skipWaiting();

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

  // Cache pages
  routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new strategies.NetworkFirst({
      cacheName: 'smartduka-pos-pages',
      networkTimeoutSeconds: 3,
    }),
  );
} else {
  console.warn('Workbox could not be loaded. Offline caching disabled.');
}

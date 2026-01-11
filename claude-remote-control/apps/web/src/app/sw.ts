import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

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
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ============================================================================
// Web Push Notification Handlers
// ============================================================================

interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  timestamp: number;
}

/**
 * Handle incoming push notifications.
 * Displays a notification even when the browser/tab is closed.
 */
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    console.log('[SW] Push event received but no data');
    return;
  }

  try {
    const payload = event.data.json() as PushPayload;

    const options: NotificationOptions = {
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: payload.tag,
      data: { url: payload.url },
      requireInteraction: true, // Keep notification visible until user interacts
    };

    event.waitUntil(self.registration.showNotification(payload.title, options));
  } catch (err) {
    console.error('[SW] Failed to parse push payload:', err);
  }
});

/**
 * Handle notification click.
 * Opens or focuses the app and navigates to the relevant session.
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    // Try to find an existing window and focus it
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if ('focus' in client) {
          // Navigate to the URL and focus
          return client.navigate(url).then(() => client.focus());
        }
      }
      // No existing window, open a new one
      return self.clients.openWindow(url);
    })
  );
});

'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook that listens for push notifications when the app is in the foreground.
 * When a push notification arrives while the app is focused, the service worker
 * sends a message instead of showing a system notification, and this hook
 * displays it as an in-app toast.
 */
export function useInAppNotifications() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_FOREGROUND') {
        const { title, body } = event.data.payload;
        toast(title, {
          description: body,
          duration: 6000,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
}

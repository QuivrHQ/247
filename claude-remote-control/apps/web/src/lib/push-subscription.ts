/**
 * Web Push subscription management.
 * Handles subscribing to push notifications from agents.
 */

// LocalStorage key for tracking subscribed agents
const SUBSCRIBED_AGENTS_KEY = '247-push-subscriptions';

interface SubscribedAgent {
  agentUrl: string;
  subscribedAt: number;
}

/**
 * Get the list of agents we're subscribed to.
 */
function getSubscribedAgents(): SubscribedAgent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SUBSCRIBED_AGENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save the list of subscribed agents.
 */
function saveSubscribedAgents(agents: SubscribedAgent[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUBSCRIBED_AGENTS_KEY, JSON.stringify(agents));
}

/**
 * Check if we're already subscribed to an agent.
 */
export function isSubscribedToAgent(agentUrl: string): boolean {
  const agents = getSubscribedAgents();
  return agents.some((a) => a.agentUrl === agentUrl);
}

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications from an agent.
 * Returns true if subscription was successful.
 */
export async function subscribeToPush(agentUrl: string): Promise<boolean> {
  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Push notifications not supported');
    return false;
  }

  // Check notification permission
  if (Notification.permission === 'denied') {
    console.log('[Push] Notification permission denied');
    return false;
  }

  // Request permission if not granted
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permission not granted');
      return false;
    }
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from agent
    const vapidResponse = await fetch(`${agentUrl}/api/push/vapid-key`);
    if (!vapidResponse.ok) {
      console.error('[Push] Failed to get VAPID key');
      return false;
    }
    const { publicKey } = await vapidResponse.json();

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    // Send subscription to agent
    const subscribeResponse = await fetch(`${agentUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!subscribeResponse.ok) {
      console.error('[Push] Failed to register subscription with agent');
      return false;
    }

    // Track this subscription locally
    const agents = getSubscribedAgents();
    if (!agents.some((a) => a.agentUrl === agentUrl)) {
      agents.push({ agentUrl, subscribedAt: Date.now() });
      saveSubscribedAgents(agents);
    }

    console.log('[Push] Successfully subscribed to agent:', agentUrl);
    return true;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
}

/**
 * Unsubscribe from push notifications from an agent.
 */
export async function unsubscribeFromPush(agentUrl: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Notify agent
      await fetch(`${agentUrl}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {
        // Ignore errors - agent might be offline
      });

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    // Remove from local tracking
    const agents = getSubscribedAgents();
    const filtered = agents.filter((a) => a.agentUrl !== agentUrl);
    saveSubscribedAgents(filtered);

    console.log('[Push] Unsubscribed from agent:', agentUrl);
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Check if push notifications are available.
 */
export function isPushAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current push notification permission state.
 */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushAvailable()) return 'unsupported';
  return Notification.permission;
}

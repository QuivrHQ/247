/**
 * Push notification sender.
 * Sends Web Push notifications to all subscribed clients.
 */

import webpush from 'web-push';
import type { WSSessionInfo, AttentionReason } from '247-shared';
import * as pushDb from '../db/push-subscriptions.js';

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  timestamp: number;
}

/**
 * Get notification message based on attention reason.
 */
function getNotificationMessage(reason: AttentionReason): { title: string; body: string } {
  switch (reason) {
    case 'permission':
      return {
        title: 'Action requise',
        body: 'Claude a besoin de votre autorisation pour continuer.',
      };
    case 'input':
      return {
        title: 'Réponse attendue',
        body: 'Claude attend votre réponse pour continuer.',
      };
    case 'plan_approval':
      return {
        title: 'Plan à valider',
        body: 'Claude a terminé son plan et attend votre validation.',
      };
    case 'task_complete':
      return {
        title: 'Tâche terminée',
        body: 'Claude a terminé sa tâche.',
      };
    default:
      return {
        title: 'Attention requise',
        body: 'Une session nécessite votre attention.',
      };
  }
}

/**
 * Send push notification for a session status update.
 * Only sends if status is 'needs_attention'.
 */
export async function sendPushNotification(session: WSSessionInfo): Promise<void> {
  // Only send for needs_attention status
  if (session.status !== 'needs_attention') {
    return;
  }

  const subscriptions = pushDb.getAllSubscriptions();
  if (subscriptions.length === 0) {
    console.log('[Push] No subscriptions, skipping push notification');
    return;
  }

  const { title, body } = getNotificationMessage(session.attentionReason || 'input');

  const payload: PushPayload = {
    title: `${title} - ${session.name}`,
    body,
    tag: `session-${session.name}`,
    url: `/?session=${encodeURIComponent(session.name)}`,
    timestamp: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  const invalidEndpoints: string[] = [];

  console.log(`[Push] Sending notification to ${subscriptions.length} subscriber(s)`);

  // Send to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map(async (dbSub) => {
      const subscription = pushDb.toWebPushSubscription(dbSub);
      try {
        await webpush.sendNotification(subscription, payloadStr);
        return { success: true, endpoint: dbSub.endpoint };
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        // 404 or 410 means subscription is no longer valid
        if (error.statusCode === 404 || error.statusCode === 410) {
          invalidEndpoints.push(dbSub.endpoint);
          console.log(`[Push] Subscription expired: ${dbSub.endpoint.substring(0, 50)}...`);
        } else {
          console.error(`[Push] Failed to send:`, error);
        }
        return { success: false, endpoint: dbSub.endpoint };
      }
    })
  );

  // Clean up invalid subscriptions
  if (invalidEndpoints.length > 0) {
    const deleted = pushDb.deleteInvalidSubscriptions(invalidEndpoints);
    console.log(`[Push] Cleaned up ${deleted} invalid subscription(s)`);
  }

  const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[Push] Sent ${successful}/${subscriptions.length} notification(s)`);
}

/**
 * Send a test push notification.
 * Useful for verifying setup.
 */
export async function sendTestNotification(): Promise<{ sent: number; failed: number }> {
  const subscriptions = pushDb.getAllSubscriptions();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: 'Test Notification',
    body: 'Les notifications push fonctionnent !',
    tag: 'test',
    url: '/',
    timestamp: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const dbSub of subscriptions) {
    try {
      await webpush.sendNotification(pushDb.toWebPushSubscription(dbSub), payloadStr);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Push notification routes.
 * Handles Web Push subscription management.
 */

import { Router } from 'express';
import type webpush from 'web-push';
import { getPublicVapidKey } from '../push/vapid.js';
import * as pushDb from '../db/push-subscriptions.js';
import { sendTestNotification } from '../push/sender.js';

export function createPushRoutes(): Router {
  const router = Router();

  /**
   * GET /api/push/vapid-key
   * Returns the public VAPID key for client-side subscription.
   */
  router.get('/vapid-key', (_req, res) => {
    const publicKey = getPublicVapidKey();
    res.json({ publicKey });
  });

  /**
   * POST /api/push/subscribe
   * Register a new push subscription.
   * Body: PushSubscription object from browser
   */
  router.post('/subscribe', (req, res) => {
    const subscription = req.body as webpush.PushSubscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    try {
      const userAgent = req.get('User-Agent');
      pushDb.saveSubscription(subscription, userAgent);
      console.log(
        `[Push] New subscription registered: ${subscription.endpoint.substring(0, 50)}...`
      );

      res.json({
        success: true,
        message: 'Subscription registered',
        count: pushDb.getSubscriptionCount(),
      });
    } catch (err) {
      console.error('[Push] Failed to save subscription:', err);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  /**
   * POST /api/push/unsubscribe
   * Remove a push subscription.
   * Body: { endpoint: string }
   */
  router.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };

    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    try {
      const deleted = pushDb.deleteSubscription(endpoint);
      console.log(`[Push] Subscription removed: ${deleted}`);

      res.json({
        success: true,
        deleted,
        count: pushDb.getSubscriptionCount(),
      });
    } catch (err) {
      console.error('[Push] Failed to delete subscription:', err);
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  });

  /**
   * GET /api/push/status
   * Get push notification status (for debugging).
   */
  router.get('/status', (_req, res) => {
    res.json({
      enabled: true,
      subscriptionCount: pushDb.getSubscriptionCount(),
      vapidKeyConfigured: !!getPublicVapidKey(),
    });
  });

  /**
   * POST /api/push/test
   * Send a test notification to all subscribers.
   */
  router.post('/test', async (_req, res) => {
    try {
      const result = await sendTestNotification();
      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  return router;
}

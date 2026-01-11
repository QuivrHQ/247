/**
 * Push subscription database operations.
 * Stores Web Push subscriptions for sending notifications when browser is closed.
 */

import { getDatabase } from './index.js';
import type webpush from 'web-push';

export interface DbPushSubscription {
  id: number;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  user_agent: string | null;
  created_at: number;
}

/**
 * Create the push_subscriptions table (called during migration)
 */
export const CREATE_PUSH_SUBSCRIPTIONS_SQL = `
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT UNIQUE NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
`;

/**
 * Save a push subscription.
 * Uses REPLACE to handle re-subscriptions from the same endpoint.
 */
export function saveSubscription(
  subscription: webpush.PushSubscription,
  userAgent?: string
): DbPushSubscription {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions
    (endpoint, keys_p256dh, keys_auth, user_agent, created_at)
    VALUES (@endpoint, @p256dh, @auth, @userAgent, @createdAt)
  `);

  stmt.run({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent ?? null,
    createdAt: now,
  });

  return {
    id: 0, // Not needed for return
    endpoint: subscription.endpoint,
    keys_p256dh: subscription.keys.p256dh,
    keys_auth: subscription.keys.auth,
    user_agent: userAgent ?? null,
    created_at: now,
  };
}

/**
 * Delete a push subscription by endpoint.
 */
export function deleteSubscription(endpoint: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  return result.changes > 0;
}

/**
 * Get all active push subscriptions.
 */
export function getAllSubscriptions(): DbPushSubscription[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM push_subscriptions').all() as DbPushSubscription[];
}

/**
 * Get subscription count.
 */
export function getSubscriptionCount(): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM push_subscriptions').get() as {
    count: number;
  };
  return result.count;
}

/**
 * Convert DB subscription to web-push format.
 */
export function toWebPushSubscription(dbSub: DbPushSubscription): webpush.PushSubscription {
  return {
    endpoint: dbSub.endpoint,
    keys: {
      p256dh: dbSub.keys_p256dh,
      auth: dbSub.keys_auth,
    },
  };
}

/**
 * Delete expired/invalid subscriptions.
 * Called when a push fails with 404 or 410 status.
 */
export function deleteInvalidSubscriptions(endpoints: string[]): number {
  if (endpoints.length === 0) return 0;

  const db = getDatabase();
  const placeholders = endpoints.map(() => '?').join(',');
  const result = db
    .prepare(`DELETE FROM push_subscriptions WHERE endpoint IN (${placeholders})`)
    .run(...endpoints);

  return result.changes;
}

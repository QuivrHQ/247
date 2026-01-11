/**
 * Push Subscriptions Database Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  saveSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionCount,
  toWebPushSubscription,
  deleteInvalidSubscriptions,
  CREATE_PUSH_SUBSCRIPTIONS_SQL,
} from '../../src/db/push-subscriptions.js';
import { initTestDatabase, closeDatabase } from '../../src/db/index.js';

describe('Push Subscriptions DB', () => {
  beforeEach(() => {
    initTestDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('saveSubscription', () => {
    it('saves a new subscription', () => {
      const subscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      };

      const result = saveSubscription(subscription, 'Mozilla/5.0 Test');

      expect(result.endpoint).toBe(subscription.endpoint);
      expect(result.keys_p256dh).toBe(subscription.keys.p256dh);
      expect(result.keys_auth).toBe(subscription.keys.auth);
      expect(result.user_agent).toBe('Mozilla/5.0 Test');
      expect(result.created_at).toBeGreaterThan(0);
    });

    it('replaces existing subscription with same endpoint', () => {
      const subscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: {
          p256dh: 'old-p256dh-key',
          auth: 'old-auth-key',
        },
      };

      saveSubscription(subscription);

      // Update with new keys
      const updatedSubscription = {
        endpoint: 'https://push.example.com/abc123',
        keys: {
          p256dh: 'new-p256dh-key',
          auth: 'new-auth-key',
        },
      };

      saveSubscription(updatedSubscription);

      const all = getAllSubscriptions();
      expect(all.length).toBe(1);
      expect(all[0].keys_p256dh).toBe('new-p256dh-key');
    });
  });

  describe('deleteSubscription', () => {
    it('deletes an existing subscription', () => {
      const subscription = {
        endpoint: 'https://push.example.com/to-delete',
        keys: { p256dh: 'key1', auth: 'key2' },
      };

      saveSubscription(subscription);
      expect(getSubscriptionCount()).toBe(1);

      const deleted = deleteSubscription(subscription.endpoint);

      expect(deleted).toBe(true);
      expect(getSubscriptionCount()).toBe(0);
    });

    it('returns false when subscription does not exist', () => {
      const deleted = deleteSubscription('https://nonexistent.com');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllSubscriptions', () => {
    it('returns empty array when no subscriptions', () => {
      const all = getAllSubscriptions();
      expect(all).toEqual([]);
    });

    it('returns all subscriptions', () => {
      saveSubscription({
        endpoint: 'https://push1.example.com',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });
      saveSubscription({
        endpoint: 'https://push2.example.com',
        keys: { p256dh: 'key2', auth: 'auth2' },
      });
      saveSubscription({
        endpoint: 'https://push3.example.com',
        keys: { p256dh: 'key3', auth: 'auth3' },
      });

      const all = getAllSubscriptions();
      expect(all.length).toBe(3);
    });
  });

  describe('getSubscriptionCount', () => {
    it('returns 0 when no subscriptions', () => {
      expect(getSubscriptionCount()).toBe(0);
    });

    it('returns correct count', () => {
      saveSubscription({
        endpoint: 'https://push1.example.com',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });
      saveSubscription({
        endpoint: 'https://push2.example.com',
        keys: { p256dh: 'key2', auth: 'auth2' },
      });

      expect(getSubscriptionCount()).toBe(2);
    });
  });

  describe('toWebPushSubscription', () => {
    it('converts DB format to web-push format', () => {
      const dbSub = {
        id: 1,
        endpoint: 'https://push.example.com/abc',
        keys_p256dh: 'test-p256dh',
        keys_auth: 'test-auth',
        user_agent: 'Test Agent',
        created_at: Date.now(),
      };

      const webPushSub = toWebPushSubscription(dbSub);

      expect(webPushSub).toEqual({
        endpoint: 'https://push.example.com/abc',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth',
        },
      });
    });
  });

  describe('deleteInvalidSubscriptions', () => {
    it('deletes multiple subscriptions by endpoint', () => {
      saveSubscription({
        endpoint: 'https://push1.example.com',
        keys: { p256dh: 'key1', auth: 'auth1' },
      });
      saveSubscription({
        endpoint: 'https://push2.example.com',
        keys: { p256dh: 'key2', auth: 'auth2' },
      });
      saveSubscription({
        endpoint: 'https://push3.example.com',
        keys: { p256dh: 'key3', auth: 'auth3' },
      });

      expect(getSubscriptionCount()).toBe(3);

      const deleted = deleteInvalidSubscriptions([
        'https://push1.example.com',
        'https://push3.example.com',
      ]);

      expect(deleted).toBe(2);
      expect(getSubscriptionCount()).toBe(1);

      const remaining = getAllSubscriptions();
      expect(remaining[0].endpoint).toBe('https://push2.example.com');
    });

    it('returns 0 when empty array provided', () => {
      const deleted = deleteInvalidSubscriptions([]);
      expect(deleted).toBe(0);
    });
  });
});

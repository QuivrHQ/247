import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { requestNotificationPermission } from '../../../src/lib/notifications';

describe('Notifications', () => {
  describe('requestNotificationPermission', () => {
    beforeEach(() => {
      // Reset mock implementation for each test
      (window.Notification.requestPermission as Mock).mockClear();
    });

    it('calls Notification.requestPermission when API is available', async () => {
      (window.Notification.requestPermission as Mock).mockResolvedValueOnce('granted');

      const result = await requestNotificationPermission();

      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });

    it('returns denied permission state', async () => {
      (window.Notification.requestPermission as Mock).mockResolvedValueOnce('denied');

      const result = await requestNotificationPermission();
      expect(result).toBe('denied');
    });

    it('returns default permission state', async () => {
      (window.Notification.requestPermission as Mock).mockResolvedValueOnce('default');

      const result = await requestNotificationPermission();
      expect(result).toBe('default');
    });
  });
});

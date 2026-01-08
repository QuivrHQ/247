/**
 * SessionCard Helper Functions Tests
 *
 * Tests for helper functions and configuration in the SessionCard component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionStatus, AttentionReason } from '247-shared';

// Re-implement the formatStatusTime logic from SessionCard for testing
function formatStatusTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Status configuration from SessionCard
const statusConfig: Record<
  SessionStatus,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    glow: string;
    label: string;
  }
> = {
  init: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    label: 'Starting',
  },
  working: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    label: 'Working',
  },
  needs_attention: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
    label: 'Attention',
  },
  idle: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    glow: 'shadow-gray-500/20',
    label: 'Idle',
  },
};

// Attention labels from SessionCard
const attentionLabels: Record<AttentionReason, string> = {
  permission: 'Permission',
  input: 'Waiting',
  plan_approval: 'Plan Ready',
  task_complete: 'Done',
};

describe('SessionCard Helpers', () => {
  describe('formatStatusTime', () => {
    let originalDateNow: () => number;
    const fixedNow = 1704067200000; // 2024-01-01 00:00:00 UTC

    beforeEach(() => {
      originalDateNow = Date.now;
      Date.now = vi.fn(() => fixedNow);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    it('returns empty string for undefined timestamp', () => {
      expect(formatStatusTime(undefined)).toBe('');
    });

    it('returns "just now" for timestamps less than 5 seconds ago', () => {
      expect(formatStatusTime(fixedNow - 1000)).toBe('just now');
      expect(formatStatusTime(fixedNow - 4000)).toBe('just now');
    });

    it('returns seconds ago for timestamps 5-59 seconds ago', () => {
      expect(formatStatusTime(fixedNow - 5000)).toBe('5s ago');
      expect(formatStatusTime(fixedNow - 30000)).toBe('30s ago');
      expect(formatStatusTime(fixedNow - 59000)).toBe('59s ago');
    });

    it('returns minutes ago for timestamps 1-59 minutes ago', () => {
      expect(formatStatusTime(fixedNow - 60000)).toBe('1m ago');
      expect(formatStatusTime(fixedNow - 300000)).toBe('5m ago'); // 5 minutes
      expect(formatStatusTime(fixedNow - 3540000)).toBe('59m ago'); // 59 minutes
    });

    it('returns hours ago for timestamps 60+ minutes ago', () => {
      expect(formatStatusTime(fixedNow - 3600000)).toBe('1h ago'); // 1 hour
      expect(formatStatusTime(fixedNow - 7200000)).toBe('2h ago'); // 2 hours
      expect(formatStatusTime(fixedNow - 86400000)).toBe('24h ago'); // 24 hours
    });
  });

  describe('statusConfig', () => {
    it('has configuration for all session statuses', () => {
      const statuses: SessionStatus[] = ['init', 'working', 'needs_attention', 'idle'];

      statuses.forEach((status) => {
        expect(statusConfig[status]).toBeDefined();
        expect(statusConfig[status].label).toBeDefined();
        expect(statusConfig[status].color).toBeDefined();
        expect(statusConfig[status].bgColor).toBeDefined();
        expect(statusConfig[status].borderColor).toBeDefined();
        expect(statusConfig[status].glow).toBeDefined();
      });
    });

    it('init status has correct label', () => {
      expect(statusConfig.init.label).toBe('Starting');
    });

    it('working status has correct label', () => {
      expect(statusConfig.working.label).toBe('Working');
    });

    it('needs_attention status has correct label', () => {
      expect(statusConfig.needs_attention.label).toBe('Attention');
    });

    it('idle status has correct label', () => {
      expect(statusConfig.idle.label).toBe('Idle');
    });

    it('each status has unique color scheme', () => {
      const colors = new Set(Object.values(statusConfig).map((c) => c.color));
      expect(colors.size).toBe(4);
    });
  });

  describe('attentionLabels', () => {
    it('has labels for all attention reasons', () => {
      const reasons: AttentionReason[] = ['permission', 'input', 'plan_approval', 'task_complete'];

      reasons.forEach((reason) => {
        expect(attentionLabels[reason]).toBeDefined();
        expect(typeof attentionLabels[reason]).toBe('string');
      });
    });

    it('permission reason has correct label', () => {
      expect(attentionLabels.permission).toBe('Permission');
    });

    it('input reason has correct label', () => {
      expect(attentionLabels.input).toBe('Waiting');
    });

    it('plan_approval reason has correct label', () => {
      expect(attentionLabels.plan_approval).toBe('Plan Ready');
    });

    it('task_complete reason has correct label', () => {
      expect(attentionLabels.task_complete).toBe('Done');
    });
  });

  describe('Session name display', () => {
    // Extract readable session name (part after --)
    const getDisplayName = (name: string): string => {
      return name.split('--')[1] || name;
    };

    it('extracts name after double dash', () => {
      expect(getDisplayName('project--brave-lion-42')).toBe('brave-lion-42');
    });

    it('returns full name when no double dash', () => {
      expect(getDisplayName('simple-session')).toBe('simple-session');
    });

    it('handles multiple double dashes (takes first part after split)', () => {
      // split('--')[1] only returns the second part, not everything after first --
      expect(getDisplayName('project--part1--part2')).toBe('part1');
    });

    it('handles empty string before double dash', () => {
      expect(getDisplayName('--session-name')).toBe('session-name');
    });
  });

  describe('Keyboard shortcut assignment', () => {
    // Get shortcut number for index (1-9, null for 9+)
    const getShortcut = (index: number): number | null => {
      return index < 9 ? index + 1 : null;
    };

    it('returns 1 for index 0', () => {
      expect(getShortcut(0)).toBe(1);
    });

    it('returns 9 for index 8', () => {
      expect(getShortcut(8)).toBe(9);
    });

    it('returns null for index 9 and above', () => {
      expect(getShortcut(9)).toBeNull();
      expect(getShortcut(10)).toBeNull();
      expect(getShortcut(100)).toBeNull();
    });
  });

  describe('Archive eligibility', () => {
    // Check if session can be archived (idle or task_complete)
    const canArchive = (status: SessionStatus, attentionReason?: AttentionReason): boolean => {
      return (
        status === 'idle' || (status === 'needs_attention' && attentionReason === 'task_complete')
      );
    };

    it('allows archive for idle sessions', () => {
      expect(canArchive('idle')).toBe(true);
    });

    it('allows archive for task_complete sessions', () => {
      expect(canArchive('needs_attention', 'task_complete')).toBe(true);
    });

    it('does not allow archive for working sessions', () => {
      expect(canArchive('working')).toBe(false);
    });

    it('does not allow archive for init sessions', () => {
      expect(canArchive('init')).toBe(false);
    });

    it('does not allow archive for needs_attention with permission', () => {
      expect(canArchive('needs_attention', 'permission')).toBe(false);
    });

    it('does not allow archive for needs_attention with input', () => {
      expect(canArchive('needs_attention', 'input')).toBe(false);
    });

    it('does not allow archive for needs_attention with plan_approval', () => {
      expect(canArchive('needs_attention', 'plan_approval')).toBe(false);
    });
  });

  describe('Attention state detection', () => {
    const needsAttention = (status: SessionStatus): boolean => {
      return status === 'needs_attention';
    };

    it('returns true for needs_attention status', () => {
      expect(needsAttention('needs_attention')).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(needsAttention('init')).toBe(false);
      expect(needsAttention('working')).toBe(false);
      expect(needsAttention('idle')).toBe(false);
    });
  });
});

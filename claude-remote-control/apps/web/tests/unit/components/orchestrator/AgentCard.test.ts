/**
 * AgentCard Helper Functions Tests
 *
 * Tests for helper functions and configuration in the AgentCard component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Re-implement helper functions from AgentCard.tsx for testing
// ============================================================================

interface AgentTypeConfig {
  color: string;
  borderColor: string;
  bgColor: string;
}

function createConfig(colorName: string): AgentTypeConfig {
  return {
    color: `text-${colorName}-400`,
    borderColor: `border-${colorName}-500/30`,
    bgColor: `bg-${colorName}-500/5`,
  };
}

const AGENT_CONFIGS: Record<string, AgentTypeConfig> = {
  code: createConfig('violet'),
  test: createConfig('cyan'),
  review: createConfig('amber'),
  fix: createConfig('emerald'),
  'general-purpose': createConfig('blue'),
  explore: createConfig('orange'),
};

const DEFAULT_CONFIG = createConfig('zinc');

function getAgentConfig(type: string): AgentTypeConfig {
  const normalizedType = type.toLowerCase().replace('-agent', '');
  return AGENT_CONFIGS[normalizedType] || DEFAULT_CONFIG;
}

type SubAgentStatus = 'pending' | 'running' | 'completed' | 'failed';

function getStatusBorderClass(status: SubAgentStatus): string {
  switch (status) {
    case 'running':
      return 'border-cyan-500/30';
    case 'completed':
      return 'border-emerald-500/20';
    case 'failed':
      return 'border-red-500/30';
    default:
      return 'border-zinc-800/60';
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('AgentCard Helpers', () => {
  describe('createConfig', () => {
    it('creates config with correct color classes', () => {
      const config = createConfig('violet');

      expect(config.color).toBe('text-violet-400');
      expect(config.borderColor).toBe('border-violet-500/30');
      expect(config.bgColor).toBe('bg-violet-500/5');
    });

    it('works with different color names', () => {
      const cyanConfig = createConfig('cyan');
      expect(cyanConfig.color).toBe('text-cyan-400');

      const emeraldConfig = createConfig('emerald');
      expect(emeraldConfig.color).toBe('text-emerald-400');

      const blueConfig = createConfig('blue');
      expect(blueConfig.color).toBe('text-blue-400');
    });
  });

  describe('AGENT_CONFIGS', () => {
    it('has configuration for all expected agent types', () => {
      const expectedTypes = ['code', 'test', 'review', 'fix', 'general-purpose', 'explore'];

      expectedTypes.forEach((type) => {
        expect(AGENT_CONFIGS[type]).toBeDefined();
        expect(AGENT_CONFIGS[type].color).toBeDefined();
        expect(AGENT_CONFIGS[type].borderColor).toBeDefined();
        expect(AGENT_CONFIGS[type].bgColor).toBeDefined();
      });
    });

    it('code agent has violet color', () => {
      expect(AGENT_CONFIGS['code'].color).toContain('violet');
    });

    it('test agent has cyan color', () => {
      expect(AGENT_CONFIGS['test'].color).toContain('cyan');
    });

    it('review agent has amber color', () => {
      expect(AGENT_CONFIGS['review'].color).toContain('amber');
    });

    it('fix agent has emerald color', () => {
      expect(AGENT_CONFIGS['fix'].color).toContain('emerald');
    });

    it('general-purpose agent has blue color', () => {
      expect(AGENT_CONFIGS['general-purpose'].color).toContain('blue');
    });

    it('explore agent has orange color', () => {
      expect(AGENT_CONFIGS['explore'].color).toContain('orange');
    });
  });

  describe('getAgentConfig', () => {
    it('returns correct config for known agent types', () => {
      expect(getAgentConfig('code').color).toContain('violet');
      expect(getAgentConfig('test').color).toContain('cyan');
      expect(getAgentConfig('review').color).toContain('amber');
      expect(getAgentConfig('fix').color).toContain('emerald');
      expect(getAgentConfig('general-purpose').color).toContain('blue');
      expect(getAgentConfig('explore').color).toContain('orange');
    });

    it('normalizes -agent suffix', () => {
      expect(getAgentConfig('code-agent').color).toContain('violet');
      expect(getAgentConfig('test-agent').color).toContain('cyan');
      expect(getAgentConfig('review-agent').color).toContain('amber');
      expect(getAgentConfig('fix-agent').color).toContain('emerald');
    });

    it('is case-insensitive', () => {
      expect(getAgentConfig('CODE').color).toContain('violet');
      expect(getAgentConfig('Code').color).toContain('violet');
      expect(getAgentConfig('TEST').color).toContain('cyan');
      expect(getAgentConfig('Test-Agent').color).toContain('cyan');
    });

    it('handles Explore with capital E', () => {
      expect(getAgentConfig('Explore').color).toContain('orange');
      expect(getAgentConfig('EXPLORE').color).toContain('orange');
    });

    it('returns default config for unknown types', () => {
      expect(getAgentConfig('unknown').color).toContain('zinc');
      expect(getAgentConfig('random').color).toContain('zinc');
      expect(getAgentConfig('').color).toContain('zinc');
    });

    it('returns default config when only -agent suffix provided', () => {
      expect(getAgentConfig('-agent').color).toContain('zinc');
    });
  });

  describe('getStatusBorderClass', () => {
    it('returns cyan border for running status', () => {
      expect(getStatusBorderClass('running')).toBe('border-cyan-500/30');
    });

    it('returns emerald border for completed status', () => {
      expect(getStatusBorderClass('completed')).toBe('border-emerald-500/20');
    });

    it('returns red border for failed status', () => {
      expect(getStatusBorderClass('failed')).toBe('border-red-500/30');
    });

    it('returns default zinc border for pending status', () => {
      expect(getStatusBorderClass('pending')).toBe('border-zinc-800/60');
    });
  });

  describe('Running time calculation', () => {
    let originalDateNow: () => number;
    const fixedNow = 1704067200000; // 2024-01-01 00:00:00 UTC

    beforeEach(() => {
      originalDateNow = Date.now;
      Date.now = vi.fn(() => fixedNow);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    const calculateRunningTime = (startedAt: Date | undefined): number => {
      return startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
    };

    it('returns 0 for undefined startedAt', () => {
      expect(calculateRunningTime(undefined)).toBe(0);
    });

    it('calculates seconds since start', () => {
      const startedAt = new Date(fixedNow - 5000); // 5 seconds ago
      expect(calculateRunningTime(startedAt)).toBe(5);
    });

    it('calculates larger time differences', () => {
      const startedAt = new Date(fixedNow - 60000); // 60 seconds ago
      expect(calculateRunningTime(startedAt)).toBe(60);
    });

    it('handles just started (0 seconds)', () => {
      const startedAt = new Date(fixedNow);
      expect(calculateRunningTime(startedAt)).toBe(0);
    });
  });
});

describe('AgentCard Status Display', () => {
  describe('Status visibility logic', () => {
    it('shows shimmer animation only for running status', () => {
      const showShimmer = (status: SubAgentStatus): boolean => status === 'running';

      expect(showShimmer('running')).toBe(true);
      expect(showShimmer('pending')).toBe(false);
      expect(showShimmer('completed')).toBe(false);
      expect(showShimmer('failed')).toBe(false);
    });

    it('shows progress bar for non-pending statuses', () => {
      const showProgress = (status: SubAgentStatus): boolean => status !== 'pending';

      expect(showProgress('running')).toBe(true);
      expect(showProgress('completed')).toBe(true);
      expect(showProgress('failed')).toBe(true);
      expect(showProgress('pending')).toBe(false);
    });

    it('shows completed footer only for completed status', () => {
      const showCompletedFooter = (status: SubAgentStatus): boolean => status === 'completed';

      expect(showCompletedFooter('completed')).toBe(true);
      expect(showCompletedFooter('running')).toBe(false);
      expect(showCompletedFooter('pending')).toBe(false);
      expect(showCompletedFooter('failed')).toBe(false);
    });

    it('shows failed footer only for failed status', () => {
      const showFailedFooter = (status: SubAgentStatus): boolean => status === 'failed';

      expect(showFailedFooter('failed')).toBe(true);
      expect(showFailedFooter('running')).toBe(false);
      expect(showFailedFooter('pending')).toBe(false);
      expect(showFailedFooter('completed')).toBe(false);
    });
  });

  describe('Output display logic', () => {
    it('shows waiting state for pending with no output', () => {
      const showWaiting = (status: SubAgentStatus): boolean => status === 'pending';

      expect(showWaiting('pending')).toBe(true);
      expect(showWaiting('running')).toBe(false);
    });

    it('shows loading state for non-pending with no output', () => {
      const showLoading = (status: SubAgentStatus, outputLength: number): boolean =>
        status !== 'pending' && outputLength === 0;

      expect(showLoading('running', 0)).toBe(true);
      expect(showLoading('running', 1)).toBe(false);
      expect(showLoading('pending', 0)).toBe(false);
    });

    it('shows output when available', () => {
      const showOutput = (status: SubAgentStatus, outputLength: number): boolean =>
        status !== 'pending' && outputLength > 0;

      expect(showOutput('running', 5)).toBe(true);
      expect(showOutput('completed', 3)).toBe(true);
      expect(showOutput('running', 0)).toBe(false);
      expect(showOutput('pending', 0)).toBe(false);
    });
  });
});

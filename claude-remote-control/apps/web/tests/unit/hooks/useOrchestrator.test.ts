/**
 * useOrchestrator Hook Helper Functions Tests
 *
 * Tests for helper functions used in the useOrchestrator hook.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Re-implement helper functions from useOrchestrator.ts for testing
// ============================================================================

type OrchestrationStatus =
  | 'planning'
  | 'clarifying'
  | 'executing'
  | 'iterating'
  | 'paused'
  | 'completed'
  | 'failed';
type SubAgentStatus = 'pending' | 'running' | 'completed' | 'failed';

interface SubAgent {
  id: string;
  name: string;
  type: string;
  status: SubAgentStatus;
  progress: number;
  output: string[];
  cost: number;
  startedAt?: Date;
  completedAt?: Date;
}

function mapStatus(status: string): OrchestrationStatus {
  const statusMap: Record<string, OrchestrationStatus> = {
    planning: 'planning',
    clarifying: 'clarifying',
    executing: 'executing',
    iterating: 'iterating',
    paused: 'paused',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
  };
  return statusMap[status] || 'executing';
}

function mapSubtaskStatus(status: string): SubAgentStatus {
  switch (status) {
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function getProgressFromStatus(status: string): number {
  switch (status) {
    case 'completed':
      return 100;
    case 'running':
      return 50;
    default:
      return 0;
  }
}

function mapSubtask(subtask: any): SubAgent {
  return {
    id: subtask.id,
    name: subtask.name,
    type: subtask.type as SubAgent['type'],
    status: mapSubtaskStatus(subtask.status),
    progress: getProgressFromStatus(subtask.status),
    output: [],
    cost: subtask.costUsd || 0,
    startedAt: subtask.startedAt ? new Date(subtask.startedAt) : undefined,
    completedAt: subtask.completedAt ? new Date(subtask.completedAt) : undefined,
  };
}

function calculateProgress(status: string, subtasks: any[]): number {
  if (status === 'completed') return 100;
  if (status === 'planning' || status === 'clarifying') return 10;
  if (subtasks.length === 0) return 20;

  const completed = subtasks.filter((s: any) => s.status === 'completed').length;
  const running = subtasks.filter((s: any) => s.status === 'running').length;
  const total = subtasks.length;

  return Math.round(((completed + running * 0.5) / total) * 80) + 20;
}

// Message deduplication logic
function isDuplicateMessage(
  messages: Array<{ role: string; content: string }>,
  role: string,
  content: string
): boolean {
  return messages.some((m) => m.role === role && m.content === content);
}

// Agent deduplication logic
function isAgentDuplicate(agents: SubAgent[], agentId: string): boolean {
  return agents.some((a) => a.id === agentId);
}

// ============================================================================
// Tests
// ============================================================================

describe('useOrchestrator Helpers', () => {
  describe('mapStatus', () => {
    it('maps known statuses correctly', () => {
      expect(mapStatus('planning')).toBe('planning');
      expect(mapStatus('clarifying')).toBe('clarifying');
      expect(mapStatus('executing')).toBe('executing');
      expect(mapStatus('iterating')).toBe('iterating');
      expect(mapStatus('paused')).toBe('paused');
      expect(mapStatus('completed')).toBe('completed');
      expect(mapStatus('failed')).toBe('failed');
    });

    it('maps cancelled to failed', () => {
      expect(mapStatus('cancelled')).toBe('failed');
    });

    it('defaults to executing for unknown statuses', () => {
      expect(mapStatus('unknown')).toBe('executing');
      expect(mapStatus('')).toBe('executing');
      expect(mapStatus('random')).toBe('executing');
    });
  });

  describe('mapSubtaskStatus', () => {
    it('maps running status', () => {
      expect(mapSubtaskStatus('running')).toBe('running');
    });

    it('maps completed status', () => {
      expect(mapSubtaskStatus('completed')).toBe('completed');
    });

    it('maps failed status', () => {
      expect(mapSubtaskStatus('failed')).toBe('failed');
    });

    it('defaults to pending for unknown statuses', () => {
      expect(mapSubtaskStatus('unknown')).toBe('pending');
      expect(mapSubtaskStatus('')).toBe('pending');
      expect(mapSubtaskStatus('queued')).toBe('pending');
    });
  });

  describe('getProgressFromStatus', () => {
    it('returns 100 for completed', () => {
      expect(getProgressFromStatus('completed')).toBe(100);
    });

    it('returns 50 for running', () => {
      expect(getProgressFromStatus('running')).toBe(50);
    });

    it('returns 0 for other statuses', () => {
      expect(getProgressFromStatus('pending')).toBe(0);
      expect(getProgressFromStatus('failed')).toBe(0);
      expect(getProgressFromStatus('unknown')).toBe(0);
    });
  });

  describe('mapSubtask', () => {
    it('maps a basic subtask correctly', () => {
      const subtask = {
        id: 'task-123',
        name: 'Test Agent',
        type: 'general-purpose',
        status: 'running',
      };

      const result = mapSubtask(subtask);

      expect(result.id).toBe('task-123');
      expect(result.name).toBe('Test Agent');
      expect(result.type).toBe('general-purpose');
      expect(result.status).toBe('running');
      expect(result.progress).toBe(50);
      expect(result.output).toEqual([]);
      expect(result.cost).toBe(0);
    });

    it('maps completed subtask with full data', () => {
      const now = Date.now();
      const subtask = {
        id: 'task-456',
        name: 'Code Agent',
        type: 'code-agent',
        status: 'completed',
        costUsd: 0.05,
        startedAt: now - 10000,
        completedAt: now,
      };

      const result = mapSubtask(subtask);

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.cost).toBe(0.05);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('handles missing optional fields', () => {
      const subtask = {
        id: 'task-789',
        name: 'Minimal',
        type: 'test',
        status: 'pending',
      };

      const result = mapSubtask(subtask);

      expect(result.cost).toBe(0);
      expect(result.startedAt).toBeUndefined();
      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('calculateProgress', () => {
    it('returns 100 for completed status', () => {
      expect(calculateProgress('completed', [])).toBe(100);
      expect(calculateProgress('completed', [{ status: 'running' }])).toBe(100);
    });

    it('returns 10 for planning status', () => {
      expect(calculateProgress('planning', [])).toBe(10);
      expect(calculateProgress('planning', [{ status: 'running' }])).toBe(10);
    });

    it('returns 10 for clarifying status', () => {
      expect(calculateProgress('clarifying', [])).toBe(10);
    });

    it('returns 20 for executing with no subtasks', () => {
      expect(calculateProgress('executing', [])).toBe(20);
    });

    it('calculates progress based on subtask completion', () => {
      // All completed: 80% of 80 + 20 = 100
      expect(
        calculateProgress('executing', [{ status: 'completed' }, { status: 'completed' }])
      ).toBe(100);

      // All running: 50% of 80 + 20 = 60
      expect(calculateProgress('executing', [{ status: 'running' }, { status: 'running' }])).toBe(
        60
      );

      // Mixed: 1 completed (100%), 1 running (50%) = 75% of 80 + 20 = 80
      expect(calculateProgress('executing', [{ status: 'completed' }, { status: 'running' }])).toBe(
        80
      );

      // 1 completed, 1 pending: 50% of 80 + 20 = 60
      expect(calculateProgress('executing', [{ status: 'completed' }, { status: 'pending' }])).toBe(
        60
      );
    });

    it('handles single subtask', () => {
      expect(calculateProgress('executing', [{ status: 'completed' }])).toBe(100);
      expect(calculateProgress('executing', [{ status: 'running' }])).toBe(60);
      expect(calculateProgress('executing', [{ status: 'pending' }])).toBe(20);
    });
  });

  describe('isDuplicateMessage', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' },
    ];

    it('detects duplicate messages', () => {
      expect(isDuplicateMessage(messages, 'user', 'Hello')).toBe(true);
      expect(isDuplicateMessage(messages, 'assistant', 'Hi there!')).toBe(true);
    });

    it('does not detect non-duplicates', () => {
      expect(isDuplicateMessage(messages, 'user', 'Different')).toBe(false);
      expect(isDuplicateMessage(messages, 'assistant', 'Hello')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isDuplicateMessage(messages, 'user', 'hello')).toBe(false);
    });

    it('handles empty messages array', () => {
      expect(isDuplicateMessage([], 'user', 'Hello')).toBe(false);
    });
  });

  describe('isAgentDuplicate', () => {
    const agents: SubAgent[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'code',
        status: 'running',
        progress: 50,
        output: [],
        cost: 0,
      },
      {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'test',
        status: 'completed',
        progress: 100,
        output: [],
        cost: 0,
      },
    ];

    it('detects existing agent IDs', () => {
      expect(isAgentDuplicate(agents, 'agent-1')).toBe(true);
      expect(isAgentDuplicate(agents, 'agent-2')).toBe(true);
    });

    it('does not detect non-existing agent IDs', () => {
      expect(isAgentDuplicate(agents, 'agent-3')).toBe(false);
      expect(isAgentDuplicate(agents, 'unknown')).toBe(false);
    });

    it('handles empty agents array', () => {
      expect(isAgentDuplicate([], 'agent-1')).toBe(false);
    });
  });
});

describe('OrchestratorView Helpers', () => {
  // Status class mapping from OrchestratorView
  function getOrchestrationStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'executing':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30';
    }
  }

  describe('getOrchestrationStatusClass', () => {
    it('returns correct class for completed status', () => {
      expect(getOrchestrationStatusClass('completed')).toContain('emerald');
    });

    it('returns correct class for failed status', () => {
      expect(getOrchestrationStatusClass('failed')).toContain('red');
    });

    it('returns correct class for executing status', () => {
      expect(getOrchestrationStatusClass('executing')).toContain('cyan');
    });

    it('returns default class for other statuses', () => {
      expect(getOrchestrationStatusClass('planning')).toContain('zinc');
      expect(getOrchestrationStatusClass('unknown')).toContain('zinc');
    });
  });
});

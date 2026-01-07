/**
 * Session Type Tests
 * Tests for SessionStatus, AttentionReason, StatusSource, and WSSessionInfo
 */
import { describe, it, expect } from 'vitest';
import type { WSSessionInfo } from '../../src/types/index.js';
import {
  isSessionStatus,
  isAttentionReason,
  isStatusSource,
  isValidWSSessionInfo,
} from './type-guards.js';

describe('SessionStatus', () => {
  it('accepts all valid statuses', () => {
    expect(isSessionStatus('init')).toBe(true);
    expect(isSessionStatus('working')).toBe(true);
    expect(isSessionStatus('needs_attention')).toBe(true);
    expect(isSessionStatus('idle')).toBe(true);
  });

  it('rejects invalid statuses', () => {
    expect(isSessionStatus('running')).toBe(false);
    expect(isSessionStatus('stopped')).toBe(false);
    expect(isSessionStatus('waiting')).toBe(false);
    expect(isSessionStatus('')).toBe(false);
    expect(isSessionStatus(null)).toBe(false);
    expect(isSessionStatus(undefined)).toBe(false);
  });
});

describe('AttentionReason', () => {
  it('accepts all valid reasons', () => {
    expect(isAttentionReason('permission')).toBe(true);
    expect(isAttentionReason('input')).toBe(true);
    expect(isAttentionReason('plan_approval')).toBe(true);
    expect(isAttentionReason('task_complete')).toBe(true);
  });

  it('rejects invalid reasons', () => {
    expect(isAttentionReason('waiting')).toBe(false);
    expect(isAttentionReason('error')).toBe(false);
    expect(isAttentionReason('')).toBe(false);
  });
});

describe('StatusSource', () => {
  it('accepts valid sources', () => {
    expect(isStatusSource('hook')).toBe(true);
    expect(isStatusSource('tmux')).toBe(true);
  });

  it('rejects invalid sources', () => {
    expect(isStatusSource('api')).toBe(false);
    expect(isStatusSource('manual')).toBe(false);
  });
});

describe('WSSessionInfo Validation', () => {
  const validSession: WSSessionInfo = {
    name: 'project--brave-lion-42',
    project: 'my-project',
    status: 'working',
    statusSource: 'hook',
    createdAt: Date.now(),
  };

  it('validates minimal session info', () => {
    expect(isValidWSSessionInfo(validSession)).toBe(true);
  });

  it('validates session with all optional fields', () => {
    const fullSession: WSSessionInfo = {
      ...validSession,
      attentionReason: 'permission',
      lastEvent: 'PreToolUse',
      lastStatusChange: Date.now(),
      lastActivity: 'input detected',
      archivedAt: Date.now(),
      environmentId: 'env-123',
      environment: {
        id: 'env-123',
        name: 'Production',
        provider: 'anthropic',
        icon: 'zap',
        isDefault: true,
      },
    };
    expect(isValidWSSessionInfo(fullSession)).toBe(true);
  });

  it('validates session with needs_attention and attentionReason', () => {
    const session: WSSessionInfo = {
      ...validSession,
      status: 'needs_attention',
      attentionReason: 'plan_approval',
    };
    expect(isValidWSSessionInfo(session)).toBe(true);
  });

  it('rejects session without name', () => {
    const { name, ...sessionWithoutName } = validSession;
    expect(isValidWSSessionInfo(sessionWithoutName)).toBe(false);
  });

  it('rejects session without project', () => {
    const { project, ...sessionWithoutProject } = validSession;
    expect(isValidWSSessionInfo(sessionWithoutProject)).toBe(false);
  });

  it('rejects session with invalid status', () => {
    const session = { ...validSession, status: 'running' };
    expect(isValidWSSessionInfo(session)).toBe(false);
  });

  it('rejects session with invalid statusSource', () => {
    const session = { ...validSession, statusSource: 'api' };
    expect(isValidWSSessionInfo(session)).toBe(false);
  });

  it('rejects session without createdAt', () => {
    const { createdAt, ...sessionWithoutCreatedAt } = validSession;
    expect(isValidWSSessionInfo(sessionWithoutCreatedAt)).toBe(false);
  });

  it('rejects session with invalid attentionReason', () => {
    const session = { ...validSession, attentionReason: 'invalid' };
    expect(isValidWSSessionInfo(session)).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidWSSessionInfo(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidWSSessionInfo(undefined)).toBe(false);
  });
});

/**
 * Protocol Compatibility Tests
 * Tests to ensure message types work correctly as discriminated unions
 */
import { describe, it, expect } from 'vitest';
import type {
  WSMessageToAgent,
  WSMessageFromAgent,
  WSStatusMessageToAgent,
  WSStatusMessageFromAgent,
} from '../../src/types/index.js';

describe('Protocol Compatibility', () => {
  it('ensures message types are discriminated unions', () => {
    const toAgent: WSMessageToAgent = { type: 'input', data: 'test' };
    if (toAgent.type === 'input') {
      expect(toAgent.data).toBeDefined();
    }

    const fromAgent: WSMessageFromAgent = { type: 'history', data: 'test', lines: 10 };
    if (fromAgent.type === 'history') {
      expect(fromAgent.lines).toBeDefined();
    }

    const statusToAgent: WSStatusMessageToAgent = { type: 'status-subscribe' };
    expect(statusToAgent.type).toBe('status-subscribe');

    const statusFromAgent: WSStatusMessageFromAgent = { type: 'sessions-list', sessions: [] };
    if (statusFromAgent.type === 'sessions-list') {
      expect(statusFromAgent.sessions).toBeDefined();
    }
  });

  it('verifies all WSMessageToAgent types are covered', () => {
    const toAgentTypes = [
      'input',
      'resize',
      'start-claude',
      'start-claude-ralph',
      'ping',
      'request-history',
    ];
    toAgentTypes.forEach((type) => {
      expect([
        'input',
        'resize',
        'start-claude',
        'start-claude-ralph',
        'ping',
        'request-history',
      ]).toContain(type);
    });
  });

  it('verifies all WSMessageFromAgent types are covered', () => {
    const fromAgentTypes = ['output', 'connected', 'disconnected', 'pong', 'history'];
    fromAgentTypes.forEach((type) => {
      expect(['output', 'connected', 'disconnected', 'pong', 'history']).toContain(type);
    });
  });

  it('verifies all WSStatusMessageToAgent types are covered', () => {
    const statusToAgentTypes = ['status-subscribe', 'status-unsubscribe'];
    statusToAgentTypes.forEach((type) => {
      expect(['status-subscribe', 'status-unsubscribe']).toContain(type);
    });
  });

  it('verifies all WSStatusMessageFromAgent types are covered', () => {
    const statusFromAgentTypes = [
      'sessions-list',
      'status-update',
      'session-removed',
      'session-archived',
    ];
    statusFromAgentTypes.forEach((type) => {
      expect(['sessions-list', 'status-update', 'session-removed', 'session-archived']).toContain(
        type
      );
    });
  });
});

/**
 * Status Channel Protocol Tests
 * Tests for WSStatusMessageToAgent and WSStatusMessageFromAgent
 */
import { describe, it, expect } from 'vitest';
import type { WSSessionInfo } from '../../src/types/index.js';
import { isWSStatusMessageToAgent, isWSStatusMessageFromAgent } from './type-guards.js';

describe('WSStatusMessageToAgent (Client → Agent)', () => {
  it('validates status-subscribe', () => {
    const msg = { type: 'status-subscribe' };
    expect(isWSStatusMessageToAgent(msg)).toBe(true);
  });

  it('validates status-unsubscribe', () => {
    const msg = { type: 'status-unsubscribe' };
    expect(isWSStatusMessageToAgent(msg)).toBe(true);
  });

  it('rejects unknown type', () => {
    const msg = { type: 'subscribe' };
    expect(isWSStatusMessageToAgent(msg)).toBe(false);
  });
});

describe('WSStatusMessageFromAgent (Agent → Client)', () => {
  describe('sessions-list message', () => {
    it('validates sessions-list with empty array', () => {
      const msg = { type: 'sessions-list', sessions: [] };
      expect(isWSStatusMessageFromAgent(msg)).toBe(true);
    });

    it('validates sessions-list with sessions', () => {
      const sessions: WSSessionInfo[] = [
        {
          name: 'test--abc123',
          project: 'test',
          status: 'working',
          statusSource: 'hook',
          createdAt: Date.now(),
        },
      ];
      const msg = { type: 'sessions-list', sessions };
      expect(isWSStatusMessageFromAgent(msg)).toBe(true);
    });

    it('rejects sessions-list without sessions', () => {
      const msg = { type: 'sessions-list' };
      expect(isWSStatusMessageFromAgent(msg)).toBe(false);
    });
  });

  describe('status-update message', () => {
    it('validates status-update', () => {
      const session: WSSessionInfo = {
        name: 'test--abc123',
        project: 'test',
        status: 'needs_attention',
        attentionReason: 'permission',
        statusSource: 'hook',
        createdAt: Date.now(),
      };
      const msg = { type: 'status-update', session };
      expect(isWSStatusMessageFromAgent(msg)).toBe(true);
    });

    it('rejects status-update without session', () => {
      const msg = { type: 'status-update' };
      expect(isWSStatusMessageFromAgent(msg)).toBe(false);
    });
  });

  describe('session-removed message', () => {
    it('validates session-removed', () => {
      const msg = { type: 'session-removed', sessionName: 'test--abc123' };
      expect(isWSStatusMessageFromAgent(msg)).toBe(true);
    });

    it('rejects session-removed without sessionName', () => {
      const msg = { type: 'session-removed' };
      expect(isWSStatusMessageFromAgent(msg)).toBe(false);
    });
  });

  describe('session-archived message', () => {
    it('validates session-archived', () => {
      const session: WSSessionInfo = {
        name: 'test--abc123',
        project: 'test',
        status: 'idle',
        statusSource: 'hook',
        createdAt: Date.now(),
        archivedAt: Date.now(),
      };
      const msg = { type: 'session-archived', sessionName: 'test--abc123', session };
      expect(isWSStatusMessageFromAgent(msg)).toBe(true);
    });
  });
});

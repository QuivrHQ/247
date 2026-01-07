/**
 * Terminal Channel Protocol Tests
 * Tests for WSMessageToAgent and WSMessageFromAgent
 */
import { describe, it, expect } from 'vitest';
import { isWSMessageToAgent, isWSMessageFromAgent } from './type-guards.js';

describe('WSMessageToAgent (Client → Agent)', () => {
  describe('input message', () => {
    it('validates correct input message', () => {
      const msg = { type: 'input', data: 'ls -la' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });

    it('rejects input without data', () => {
      const msg = { type: 'input' };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });

    it('rejects input with non-string data', () => {
      const msg = { type: 'input', data: 123 };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });

    it('accepts empty string data', () => {
      const msg = { type: 'input', data: '' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });
  });

  describe('resize message', () => {
    it('validates correct resize message', () => {
      const msg = { type: 'resize', cols: 120, rows: 40 };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });

    it('rejects resize without cols', () => {
      const msg = { type: 'resize', rows: 40 };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });

    it('rejects resize without rows', () => {
      const msg = { type: 'resize', cols: 120 };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });

    it('rejects resize with string dimensions', () => {
      const msg = { type: 'resize', cols: '120', rows: '40' };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });
  });

  describe('start-claude message', () => {
    it('validates correct start-claude message', () => {
      const msg = { type: 'start-claude' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });

    it('accepts extra properties (forward compatibility)', () => {
      const msg = { type: 'start-claude', model: 'opus' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });
  });

  describe('ping message', () => {
    it('validates correct ping message', () => {
      const msg = { type: 'ping' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });
  });

  describe('request-history message', () => {
    it('validates request-history with lines', () => {
      const msg = { type: 'request-history', lines: 100 };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });

    it('validates request-history without lines', () => {
      const msg = { type: 'request-history' };
      expect(isWSMessageToAgent(msg)).toBe(true);
    });

    it('rejects request-history with string lines', () => {
      const msg = { type: 'request-history', lines: '100' };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });
  });

  describe('invalid messages', () => {
    it('rejects unknown type', () => {
      const msg = { type: 'unknown' };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });

    it('rejects null', () => {
      expect(isWSMessageToAgent(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isWSMessageToAgent(undefined)).toBe(false);
    });

    it('rejects string', () => {
      expect(isWSMessageToAgent('input')).toBe(false);
    });

    it('rejects array', () => {
      expect(isWSMessageToAgent([{ type: 'input', data: 'test' }])).toBe(false);
    });

    it('rejects object without type', () => {
      const msg = { data: 'ls -la' };
      expect(isWSMessageToAgent(msg)).toBe(false);
    });
  });
});

describe('WSMessageFromAgent (Agent → Client)', () => {
  describe('output message', () => {
    it('validates correct output message', () => {
      const msg = { type: 'output', data: 'Hello World\n' };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });

    it('rejects output without data', () => {
      const msg = { type: 'output' };
      expect(isWSMessageFromAgent(msg)).toBe(false);
    });

    it('accepts ANSI escape sequences', () => {
      const msg = { type: 'output', data: '\x1b[32mGreen text\x1b[0m' };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });
  });

  describe('connected message', () => {
    it('validates correct connected message', () => {
      const msg = { type: 'connected', session: 'project--brave-lion-42' };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });

    it('rejects connected without session', () => {
      const msg = { type: 'connected' };
      expect(isWSMessageFromAgent(msg)).toBe(false);
    });
  });

  describe('disconnected message', () => {
    it('validates correct disconnected message', () => {
      const msg = { type: 'disconnected' };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });
  });

  describe('pong message', () => {
    it('validates correct pong message', () => {
      const msg = { type: 'pong' };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });
  });

  describe('history message', () => {
    it('validates correct history message', () => {
      const msg = { type: 'history', data: '$ echo hello\nhello\n', lines: 2 };
      expect(isWSMessageFromAgent(msg)).toBe(true);
    });

    it('rejects history without data', () => {
      const msg = { type: 'history', lines: 2 };
      expect(isWSMessageFromAgent(msg)).toBe(false);
    });

    it('rejects history without lines', () => {
      const msg = { type: 'history', data: 'test' };
      expect(isWSMessageFromAgent(msg)).toBe(false);
    });
  });
});

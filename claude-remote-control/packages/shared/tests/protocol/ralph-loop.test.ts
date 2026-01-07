/**
 * Ralph Loop Message Tests
 * Tests for start-claude-ralph messages and RalphLoopConfig validation
 */
import { describe, it, expect } from 'vitest';
import { isWSMessageToAgent } from './type-guards.js';

describe('start-claude-ralph message', () => {
  it('validates correct start-claude-ralph with minimal config', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: 'Build a feature' },
    };
    expect(isWSMessageToAgent(msg)).toBe(true);
  });

  it('validates start-claude-ralph with full config', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: {
        prompt: 'Build a feature with tests',
        maxIterations: 10,
        completionPromise: 'COMPLETE',
        useWorktree: true,
      },
    };
    expect(isWSMessageToAgent(msg)).toBe(true);
  });

  it('rejects start-claude-ralph without config', () => {
    const msg = { type: 'start-claude-ralph' };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with null config', () => {
    const msg = { type: 'start-claude-ralph', config: null };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with empty prompt', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: '' },
    };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with whitespace-only prompt', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: '   ' },
    };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with invalid maxIterations', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: 'test', maxIterations: '10' },
    };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with invalid completionPromise', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: 'test', completionPromise: 123 },
    };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });

  it('rejects start-claude-ralph with invalid useWorktree', () => {
    const msg = {
      type: 'start-claude-ralph',
      config: { prompt: 'test', useWorktree: 'yes' },
    };
    expect(isWSMessageToAgent(msg)).toBe(false);
  });
});

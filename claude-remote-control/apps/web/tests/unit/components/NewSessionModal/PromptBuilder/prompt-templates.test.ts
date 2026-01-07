import { describe, it, expect } from 'vitest';
import {
  buildRalphPrompt,
  buildCompletionInstruction,
  isValidPromptBuilder,
  getDefaultPromptBuilder,
} from '@/components/NewSessionModal/PromptBuilder/prompt-templates';
import type { RalphPromptBuilder } from '@vibecompany/247-shared';

describe('buildCompletionInstruction', () => {
  it('builds instruction with custom signal', () => {
    const instruction = buildCompletionInstruction('DONE');
    expect(instruction).toBe(
      'When you have fully completed this task, output exactly: <promise>DONE</promise>'
    );
  });

  it('defaults to COMPLETE when signal is empty', () => {
    const instruction = buildCompletionInstruction('');
    expect(instruction).toBe(
      'When you have fully completed this task, output exactly: <promise>COMPLETE</promise>'
    );
  });

  it('trims whitespace from signal', () => {
    const instruction = buildCompletionInstruction('  FINISHED  ');
    expect(instruction).toBe(
      'When you have fully completed this task, output exactly: <promise>FINISHED</promise>'
    );
  });
});

describe('buildRalphPrompt', () => {
  it('builds minimal prompt with task description only', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: [],
      deliverables: [],
      customDeliverable: '',
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt).toBe(
      `Build a feature

When you have fully completed this task, output exactly: <promise>COMPLETE</promise>`
    );
  });

  it('returns empty string for empty task description', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: '',
      successCriteria: [],
      deliverables: [],
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');
    expect(prompt).toBe('');
  });

  it('includes success criteria when provided', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: ['All tests pass', 'No linter errors'],
      deliverables: [],
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt).toContain('## Success Criteria');
    expect(prompt).toContain('1. All tests pass');
    expect(prompt).toContain('2. No linter errors');
  });

  it('includes deliverables when selected', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: [],
      deliverables: ['tests', 'readme'],
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt).toContain('## Expected Deliverables');
    expect(prompt).toContain('Unit/integration tests with >80% coverage');
    expect(prompt).toContain('Updated README documentation');
  });

  it('includes custom deliverable when provided', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: [],
      deliverables: ['tests', 'custom'],
      customDeliverable: 'API documentation',
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt).toContain('## Expected Deliverables');
    expect(prompt).toContain('Unit/integration tests with >80% coverage');
    expect(prompt).toContain('API documentation');
  });

  it('builds complete prompt with all sections', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Implement JWT authentication',
      successCriteria: ['All tests pass', 'No TypeScript errors'],
      deliverables: ['tests', 'types'],
      customDeliverable: '',
    };
    const prompt = buildRalphPrompt(builder, 'DONE');

    expect(prompt).toBe(
      `Implement JWT authentication

## Success Criteria
1. All tests pass
2. No TypeScript errors

## Expected Deliverables
- Unit/integration tests with >80% coverage
- TypeScript types and interfaces

When you have fully completed this task, output exactly: <promise>DONE</promise>`
    );
  });

  it('filters out empty success criteria', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: ['Valid criterion', '', '  ', 'Another criterion'],
      deliverables: [],
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt).toContain('1. Valid criterion');
    expect(prompt).toContain('2. Another criterion');
    expect(prompt).not.toContain('3.');
  });

  it('trims task description', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: '  Build a feature  ',
      successCriteria: [],
      deliverables: [],
    };
    const prompt = buildRalphPrompt(builder, 'COMPLETE');

    expect(prompt.startsWith('Build a feature')).toBe(true);
  });
});

describe('isValidPromptBuilder', () => {
  it('returns true for valid builder with task description', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: 'Build a feature',
      successCriteria: [],
      deliverables: [],
    };
    expect(isValidPromptBuilder(builder)).toBe(true);
  });

  it('returns false for empty task description', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: '',
      successCriteria: [],
      deliverables: [],
    };
    expect(isValidPromptBuilder(builder)).toBe(false);
  });

  it('returns false for whitespace-only task description', () => {
    const builder: RalphPromptBuilder = {
      taskDescription: '   ',
      successCriteria: [],
      deliverables: [],
    };
    expect(isValidPromptBuilder(builder)).toBe(false);
  });
});

describe('getDefaultPromptBuilder', () => {
  it('returns default builder state', () => {
    const defaults = getDefaultPromptBuilder();

    expect(defaults.taskDescription).toBe('');
    expect(defaults.successCriteria).toEqual([]);
    expect(defaults.deliverables).toEqual(['tests']);
    expect(defaults.customDeliverable).toBe('');
  });
});

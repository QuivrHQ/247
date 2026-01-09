/**
 * SDK Orchestrator Helper Functions Tests
 *
 * Tests for helper functions in the SDK orchestrator module.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Re-implement pure functions from sdk-orchestrator.ts for testing
// ============================================================================

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: 'text'; text: string } =>
          typeof block === 'object' &&
          block !== null &&
          block.type === 'text' &&
          typeof block.text === 'string'
      )
      .map((block) => block.text)
      .join('\n');
  }

  return '';
}

interface ToolUseBlock {
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

function extractToolUses(content: unknown): ToolUseBlock[] {
  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter(
    (block): block is ToolUseBlock =>
      typeof block === 'object' &&
      block !== null &&
      block.type === 'tool_use' &&
      typeof block.id === 'string' &&
      typeof block.name === 'string'
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('SDK Orchestrator Helpers', () => {
  describe('extractTextContent', () => {
    it('returns empty string for null', () => {
      expect(extractTextContent(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(extractTextContent(undefined)).toBe('');
    });

    it('returns the string as-is when content is a string', () => {
      expect(extractTextContent('Hello, world!')).toBe('Hello, world!');
    });

    it('returns empty string for empty string', () => {
      expect(extractTextContent('')).toBe('');
    });

    it('extracts text from a single text block', () => {
      const content = [{ type: 'text', text: 'Hello from block' }];
      expect(extractTextContent(content)).toBe('Hello from block');
    });

    it('extracts and joins text from multiple text blocks', () => {
      const content = [
        { type: 'text', text: 'First line' },
        { type: 'text', text: 'Second line' },
        { type: 'text', text: 'Third line' },
      ];
      expect(extractTextContent(content)).toBe('First line\nSecond line\nThird line');
    });

    it('ignores non-text blocks', () => {
      const content = [
        { type: 'text', text: 'Text content' },
        { type: 'tool_use', id: '123', name: 'Task' },
        { type: 'text', text: 'More text' },
      ];
      expect(extractTextContent(content)).toBe('Text content\nMore text');
    });

    it('returns empty string for array with no text blocks', () => {
      const content = [
        { type: 'tool_use', id: '123', name: 'Task' },
        { type: 'image', data: 'base64...' },
      ];
      expect(extractTextContent(content)).toBe('');
    });

    it('returns empty string for empty array', () => {
      expect(extractTextContent([])).toBe('');
    });

    it('handles mixed invalid and valid blocks', () => {
      const content = [
        null,
        { type: 'text', text: 'Valid' },
        { type: 'text' }, // missing text property
        { text: 'No type' }, // missing type property
        { type: 'text', text: 'Also valid' },
      ];
      expect(extractTextContent(content)).toBe('Valid\nAlso valid');
    });

    it('returns empty string for non-array objects', () => {
      expect(extractTextContent({ type: 'text', text: 'Hello' })).toBe('');
    });

    it('returns empty string for numbers', () => {
      expect(extractTextContent(42)).toBe('');
    });
  });

  describe('extractToolUses', () => {
    it('returns empty array for null', () => {
      expect(extractToolUses(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(extractToolUses(undefined)).toEqual([]);
    });

    it('returns empty array for non-array', () => {
      expect(extractToolUses('string')).toEqual([]);
      expect(extractToolUses(42)).toEqual([]);
      expect(extractToolUses({ type: 'tool_use' })).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(extractToolUses([])).toEqual([]);
    });

    it('extracts a single tool_use block', () => {
      const content = [
        { type: 'tool_use', id: 'tool-123', name: 'Task', input: { prompt: 'test' } },
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        id: 'tool-123',
        name: 'Task',
        input: { prompt: 'test' },
      });
    });

    it('extracts multiple tool_use blocks', () => {
      const content = [
        { type: 'tool_use', id: 'tool-1', name: 'Task', input: {} },
        { type: 'tool_use', id: 'tool-2', name: 'Read', input: {} },
        { type: 'tool_use', id: 'tool-3', name: 'Write', input: {} },
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.name)).toEqual(['Task', 'Read', 'Write']);
    });

    it('ignores non-tool_use blocks', () => {
      const content = [
        { type: 'text', text: 'Some text' },
        { type: 'tool_use', id: 'tool-1', name: 'Task', input: {} },
        { type: 'image', data: 'base64' },
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Task');
    });

    it('ignores tool_use blocks with missing id', () => {
      const content = [
        { type: 'tool_use', name: 'Task', input: {} }, // missing id
        { type: 'tool_use', id: 'valid', name: 'Read', input: {} },
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid');
    });

    it('ignores tool_use blocks with missing name', () => {
      const content = [
        { type: 'tool_use', id: 'tool-1', input: {} }, // missing name
        { type: 'tool_use', id: 'tool-2', name: 'Valid', input: {} },
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    it('handles tool_use without input property', () => {
      const content = [
        { type: 'tool_use', id: 'tool-1', name: 'Task' }, // no input
      ];
      const result = extractToolUses(content);
      expect(result).toHaveLength(1);
      expect(result[0].input).toBeUndefined();
    });

    it('preserves input properties', () => {
      const content = [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'Task',
          input: {
            subagent_type: 'general-purpose',
            description: 'Calculate 2+2',
            prompt: 'What is 2+2?',
          },
        },
      ];
      const result = extractToolUses(content);
      expect(result[0].input).toEqual({
        subagent_type: 'general-purpose',
        description: 'Calculate 2+2',
        prompt: 'What is 2+2?',
      });
    });
  });

  describe('Task tool detection', () => {
    // Helper to filter Task tools like the orchestrator does
    const filterTaskTools = (toolUses: ToolUseBlock[]): ToolUseBlock[] => {
      return toolUses.filter((t) => t.name === 'Task');
    };

    it('identifies Task tool calls', () => {
      const content = [
        { type: 'tool_use', id: '1', name: 'Task', input: { subagent_type: 'code-agent' } },
        { type: 'tool_use', id: '2', name: 'Read', input: {} },
        { type: 'tool_use', id: '3', name: 'Task', input: { subagent_type: 'test-agent' } },
      ];
      const toolUses = extractToolUses(content);
      const taskTools = filterTaskTools(toolUses);

      expect(taskTools).toHaveLength(2);
      expect(taskTools[0].input?.subagent_type).toBe('code-agent');
      expect(taskTools[1].input?.subagent_type).toBe('test-agent');
    });

    it('extracts agent info from Task tool input', () => {
      const content = [
        {
          type: 'tool_use',
          id: 'task-123',
          name: 'Task',
          input: {
            subagent_type: 'general-purpose',
            description: 'Analyze the codebase',
          },
        },
      ];
      const toolUses = extractToolUses(content);
      const taskTools = filterTaskTools(toolUses);

      expect(taskTools).toHaveLength(1);
      const agentType = String(taskTools[0].input?.subagent_type || 'unknown');
      const agentName = String(taskTools[0].input?.description || 'Sub-agent');

      expect(agentType).toBe('general-purpose');
      expect(agentName).toBe('Analyze the codebase');
    });

    it('uses defaults when Task input is missing fields', () => {
      const content = [{ type: 'tool_use', id: 'task-1', name: 'Task', input: {} }];
      const toolUses = extractToolUses(content);
      const task = toolUses[0];

      const agentType = String(task.input?.subagent_type || 'unknown');
      const agentName = String(task.input?.description || 'Sub-agent');

      expect(agentType).toBe('unknown');
      expect(agentName).toBe('Sub-agent');
    });
  });
});

describe('Orchestration Status Mapping', () => {
  // Status mapping logic from the orchestrator
  type OrchestrationStatus =
    | 'planning'
    | 'clarifying'
    | 'executing'
    | 'iterating'
    | 'completed'
    | 'failed'
    | 'cancelled';

  const mapStatus = (status: string): OrchestrationStatus => {
    const statusMap: Record<string, OrchestrationStatus> = {
      planning: 'planning',
      clarifying: 'clarifying',
      executing: 'executing',
      iterating: 'iterating',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'executing';
  };

  it('maps known statuses correctly', () => {
    expect(mapStatus('planning')).toBe('planning');
    expect(mapStatus('clarifying')).toBe('clarifying');
    expect(mapStatus('executing')).toBe('executing');
    expect(mapStatus('iterating')).toBe('iterating');
    expect(mapStatus('completed')).toBe('completed');
    expect(mapStatus('failed')).toBe('failed');
    expect(mapStatus('cancelled')).toBe('cancelled');
  });

  it('defaults to executing for unknown statuses', () => {
    expect(mapStatus('unknown')).toBe('executing');
    expect(mapStatus('')).toBe('executing');
    expect(mapStatus('random')).toBe('executing');
  });
});

describe('Message Deduplication Logic', () => {
  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  const isDuplicate = (messages: Message[], newMessage: Message): boolean => {
    return messages.some((m) => m.role === newMessage.role && m.content === newMessage.content);
  };

  it('detects duplicate messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    expect(isDuplicate(messages, { role: 'user', content: 'Hello' })).toBe(true);
    expect(isDuplicate(messages, { role: 'assistant', content: 'Hi there!' })).toBe(true);
  });

  it('does not detect non-duplicates', () => {
    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    expect(isDuplicate(messages, { role: 'user', content: 'Different' })).toBe(false);
    expect(isDuplicate(messages, { role: 'assistant', content: 'Hello' })).toBe(false);
  });

  it('handles empty message list', () => {
    const messages: Message[] = [];
    expect(isDuplicate(messages, { role: 'user', content: 'Hello' })).toBe(false);
  });

  it('is case-sensitive', () => {
    const messages: Message[] = [{ role: 'user', content: 'Hello' }];
    expect(isDuplicate(messages, { role: 'user', content: 'hello' })).toBe(false);
  });
});

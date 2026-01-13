import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolDefinitions, handleToolCall, type ToolContext } from '../src/tools/index.js';
import type { AgentClient } from '../src/client/agent-client.js';

describe('Tool Definitions', () => {
  it('should define all required tools', () => {
    const toolNames = toolDefinitions.map((t) => t.name);
    expect(toolNames).toContain('spawn_session');
    expect(toolNames).toContain('list_sessions');
    expect(toolNames).toContain('get_session_status');
    expect(toolNames).toContain('get_session_output');
    expect(toolNames).toContain('send_input');
    expect(toolNames).toContain('wait_for_completion');
    expect(toolNames).toContain('stop_session');
    expect(toolNames).toContain('archive_session');
  });

  it('should have valid input schemas', () => {
    for (const tool of toolDefinitions) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it('spawn_session should require prompt and project', () => {
    const spawnTool = toolDefinitions.find((t) => t.name === 'spawn_session');
    expect(spawnTool?.inputSchema.required).toContain('prompt');
    expect(spawnTool?.inputSchema.required).toContain('project');
  });
});

describe('handleToolCall', () => {
  let mockAgentClient: AgentClient;
  let context: ToolContext;

  beforeEach(() => {
    mockAgentClient = {
      listSessions: vi.fn(),
      getSession: vi.fn(),
      spawnSession: vi.fn(),
      getSessionOutput: vi.fn(),
      sendInput: vi.fn(),
      stopSession: vi.fn(),
      archiveSession: vi.fn(),
      getCapacity: vi.fn(),
      listProjects: vi.fn(),
    } as unknown as AgentClient;

    context = { agentClient: mockAgentClient };
  });

  describe('spawn_session', () => {
    it('should spawn a session with required args', async () => {
      vi.mocked(mockAgentClient.spawnSession).mockResolvedValue({
        success: true,
        sessionName: 'test-session',
      });

      const result = await handleToolCall(
        'spawn_session',
        { prompt: 'Test prompt', project: 'test-project' },
        context
      );

      expect(mockAgentClient.spawnSession).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        project: 'test-project',
        worktree: undefined,
        branchName: undefined,
        trustMode: undefined,
        model: undefined,
        timeout: undefined,
      });
      expect(result).toEqual({ success: true, sessionName: 'test-session' });
    });

    it('should pass optional args', async () => {
      vi.mocked(mockAgentClient.spawnSession).mockResolvedValue({ success: true });

      await handleToolCall(
        'spawn_session',
        {
          prompt: 'Test',
          project: 'proj',
          worktree: true,
          trustMode: true,
          model: 'opus',
        },
        context
      );

      expect(mockAgentClient.spawnSession).toHaveBeenCalledWith(
        expect.objectContaining({
          worktree: true,
          trustMode: true,
          model: 'opus',
        })
      );
    });
  });

  describe('list_sessions', () => {
    it('should return all sessions', async () => {
      const mockSessions = [
        { name: 's1', project: 'p1', status: 'idle', createdAt: 1000 },
        { name: 's2', project: 'p2', status: 'working', createdAt: 2000 },
      ];
      vi.mocked(mockAgentClient.listSessions).mockResolvedValue(mockSessions);

      const result = await handleToolCall('list_sessions', {}, context);

      expect(result).toEqual({
        sessions: expect.arrayContaining([
          expect.objectContaining({ name: 's1', project: 'p1' }),
          expect.objectContaining({ name: 's2', project: 'p2' }),
        ]),
        total: 2,
      });
    });

    it('should filter by project', async () => {
      const mockSessions = [
        { name: 's1', project: 'p1', status: 'idle', createdAt: 1000 },
        { name: 's2', project: 'p2', status: 'working', createdAt: 2000 },
      ];
      vi.mocked(mockAgentClient.listSessions).mockResolvedValue(mockSessions);

      const result = (await handleToolCall('list_sessions', { project: 'p1' }, context)) as {
        sessions: unknown[];
        total: number;
      };

      expect(result.total).toBe(1);
      expect(result.sessions[0]).toEqual(expect.objectContaining({ name: 's1' }));
    });

    it('should filter by status', async () => {
      const mockSessions = [
        { name: 's1', project: 'p1', status: 'idle', createdAt: 1000 },
        { name: 's2', project: 'p2', status: 'working', createdAt: 2000 },
      ];
      vi.mocked(mockAgentClient.listSessions).mockResolvedValue(mockSessions);

      const result = (await handleToolCall('list_sessions', { status: 'working' }, context)) as {
        sessions: unknown[];
        total: number;
      };

      expect(result.total).toBe(1);
      expect(result.sessions[0]).toEqual(expect.objectContaining({ name: 's2' }));
    });
  });

  describe('get_session_status', () => {
    it('should return session status', async () => {
      const mockSession = { name: 'test', project: 'p', status: 'idle', createdAt: 1000 };
      vi.mocked(mockAgentClient.getSession).mockResolvedValue(mockSession);

      const result = await handleToolCall('get_session_status', { name: 'test' }, context);

      expect(mockAgentClient.getSession).toHaveBeenCalledWith('test');
      expect(result).toEqual(mockSession);
    });

    it('should return error for unknown session', async () => {
      vi.mocked(mockAgentClient.getSession).mockResolvedValue(null);

      const result = await handleToolCall('get_session_status', { name: 'unknown' }, context);

      expect(result).toEqual({ error: 'Session not found: unknown' });
    });
  });

  describe('get_session_output', () => {
    it('should return session output', async () => {
      const mockOutput = {
        sessionName: 'test',
        output: 'Hello',
        totalLines: 1,
        returnedLines: 1,
        isRunning: false,
        capturedAt: Date.now(),
      };
      vi.mocked(mockAgentClient.getSessionOutput).mockResolvedValue(mockOutput);

      const result = await handleToolCall('get_session_output', { name: 'test' }, context);

      expect(mockAgentClient.getSessionOutput).toHaveBeenCalledWith('test', 100, 'plain');
      expect(result).toEqual(mockOutput);
    });

    it('should pass custom lines and format', async () => {
      vi.mocked(mockAgentClient.getSessionOutput).mockResolvedValue({} as any);

      await handleToolCall(
        'get_session_output',
        { name: 'test', lines: 500, format: 'raw' },
        context
      );

      expect(mockAgentClient.getSessionOutput).toHaveBeenCalledWith('test', 500, 'raw');
    });
  });

  describe('send_input', () => {
    it('should send input to session', async () => {
      vi.mocked(mockAgentClient.sendInput).mockResolvedValue({
        success: true,
        sessionName: 'test',
      });

      const result = await handleToolCall('send_input', { name: 'test', text: 'yes' }, context);

      expect(mockAgentClient.sendInput).toHaveBeenCalledWith('test', 'yes', true);
      expect(result).toEqual({ success: true, sessionName: 'test' });
    });

    it('should support sendEnter=false', async () => {
      vi.mocked(mockAgentClient.sendInput).mockResolvedValue({
        success: true,
        sessionName: 'test',
      });

      await handleToolCall(
        'send_input',
        { name: 'test', text: 'input', sendEnter: false },
        context
      );

      expect(mockAgentClient.sendInput).toHaveBeenCalledWith('test', 'input', false);
    });
  });

  describe('wait_for_completion', () => {
    it('should return immediately if session is idle', async () => {
      vi.mocked(mockAgentClient.getSession).mockResolvedValue({
        name: 'test',
        project: 'p',
        status: 'idle',
        createdAt: 1000,
      });

      const result = await handleToolCall(
        'wait_for_completion',
        { name: 'test', pollInterval: 100 },
        context
      );

      expect(result).toEqual(
        expect.objectContaining({
          completed: true,
          finalStatus: 'idle',
          timedOut: false,
        })
      );
    });

    it('should return when session needs attention', async () => {
      vi.mocked(mockAgentClient.getSession).mockResolvedValue({
        name: 'test',
        project: 'p',
        status: 'needs_attention',
        attentionReason: 'permission',
        createdAt: 1000,
      });

      const result = await handleToolCall(
        'wait_for_completion',
        { name: 'test', pollInterval: 100 },
        context
      );

      expect(result).toEqual(
        expect.objectContaining({
          completed: true,
          finalStatus: 'needs_attention',
          attentionReason: 'permission',
        })
      );
    });

    it('should return error if session not found', async () => {
      vi.mocked(mockAgentClient.getSession).mockResolvedValue(null);

      const result = await handleToolCall(
        'wait_for_completion',
        { name: 'unknown', pollInterval: 100 },
        context
      );

      expect(result).toEqual(
        expect.objectContaining({
          completed: false,
          error: 'Session not found: unknown',
        })
      );
    });

    it('should timeout after specified duration', async () => {
      vi.mocked(mockAgentClient.getSession).mockResolvedValue({
        name: 'test',
        project: 'p',
        status: 'working',
        createdAt: 1000,
      });

      const result = await handleToolCall(
        'wait_for_completion',
        { name: 'test', timeout: 200, pollInterval: 100 },
        context
      );

      expect(result).toEqual(
        expect.objectContaining({
          completed: false,
          finalStatus: 'timeout',
          timedOut: true,
        })
      );
    });
  });

  describe('stop_session', () => {
    it('should stop a session', async () => {
      vi.mocked(mockAgentClient.stopSession).mockResolvedValue({ success: true });

      const result = await handleToolCall('stop_session', { name: 'test' }, context);

      expect(mockAgentClient.stopSession).toHaveBeenCalledWith('test');
      expect(result).toEqual({ success: true });
    });
  });

  describe('archive_session', () => {
    it('should archive a session', async () => {
      vi.mocked(mockAgentClient.archiveSession).mockResolvedValue({
        success: true,
        session: { name: 'test' } as any,
      });

      const result = await handleToolCall('archive_session', { name: 'test' }, context);

      expect(mockAgentClient.archiveSession).toHaveBeenCalledWith('test');
      expect(result).toEqual({ success: true, session: { name: 'test' } });
    });
  });

  describe('unknown tool', () => {
    it('should throw for unknown tool', async () => {
      await expect(handleToolCall('unknown_tool', {}, context)).rejects.toThrow(
        'Unknown tool: unknown_tool'
      );
    });
  });
});

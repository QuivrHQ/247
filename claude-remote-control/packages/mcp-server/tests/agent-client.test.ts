import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentClient } from '../src/client/agent-client.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AgentClient', () => {
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient({
      agentUrl: 'http://localhost:4678',
      timeout: 5000,
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listSessions', () => {
    it('should fetch sessions from the API', async () => {
      const mockSessions = [
        { name: 'session-1', project: 'project-1', status: 'idle', createdAt: Date.now() },
        { name: 'session-2', project: 'project-2', status: 'working', createdAt: Date.now() },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessions),
      });

      const sessions = await client.listSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(sessions).toEqual(mockSessions);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(client.listSessions()).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('getSession', () => {
    it('should fetch session status from the API', async () => {
      const mockSession = {
        name: 'test-session',
        project: 'test-project',
        status: 'idle',
        createdAt: Date.now(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const session = await client.getSession('test-session');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session/status',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(session).toEqual(mockSession);
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const session = await client.getSession('nonexistent');

      expect(session).toBeNull();
    });

    it('should encode session name in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'session/with/slashes' }),
      });

      await client.getSession('session/with/slashes');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/session%2Fwith%2Fslashes/status',
        expect.anything()
      );
    });
  });

  describe('spawnSession', () => {
    it('should spawn a new session', async () => {
      const mockResponse = {
        success: true,
        sessionName: 'new-session-123',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.spawnSession({
        prompt: 'Test prompt',
        project: 'test-project',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/spawn',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test prompt', project: 'test-project' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include optional parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.spawnSession({
        prompt: 'Test prompt',
        project: 'test-project',
        worktree: true,
        trustMode: true,
        model: 'opus',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/spawn',
        expect.objectContaining({
          body: JSON.stringify({
            prompt: 'Test prompt',
            project: 'test-project',
            worktree: true,
            trustMode: true,
            model: 'opus',
          }),
        })
      );
    });
  });

  describe('getSessionOutput', () => {
    it('should fetch session output', async () => {
      const mockOutput = {
        sessionName: 'test-session',
        output: 'Hello world!',
        totalLines: 1,
        returnedLines: 1,
        isRunning: false,
        capturedAt: Date.now(),
        source: 'file',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOutput),
      });

      const output = await client.getSessionOutput('test-session');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session/output?lines=1000&format=plain',
        expect.anything()
      );
      expect(output).toEqual(mockOutput);
    });

    it('should support custom lines and format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ output: '' }),
      });

      await client.getSessionOutput('test-session', 500, 'raw');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session/output?lines=500&format=raw',
        expect.anything()
      );
    });
  });

  describe('sendInput', () => {
    it('should send input to a session', async () => {
      const mockResponse = {
        success: true,
        sessionName: 'test-session',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.sendInput('test-session', 'yes');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session/input',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'yes', sendEnter: true }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should support sendEnter=false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await client.sendInput('test-session', 'text', false);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ text: 'text', sendEnter: false }),
        })
      );
    });
  });

  describe('stopSession', () => {
    it('should stop a session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await client.stopSession('test-session');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('archiveSession', () => {
    it('should archive a session', async () => {
      const mockResponse = {
        success: true,
        session: { name: 'test-session', status: 'idle' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.archiveSession('test-session');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/sessions/test-session/archive',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCapacity', () => {
    it('should fetch capacity information', async () => {
      const mockCapacity = {
        max: 4,
        running: 2,
        available: 2,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapacity),
      });

      const capacity = await client.getCapacity();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/capacity',
        expect.anything()
      );
      expect(capacity).toEqual(mockCapacity);
    });
  });

  describe('listProjects', () => {
    it('should fetch project list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: ['project-1', 'project-2'] }),
      });

      const projects = await client.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4678/api/projects',
        expect.anything()
      );
      expect(projects).toEqual(['project-1', 'project-2']);
    });
  });

  describe('timeout handling', () => {
    it('should pass abort signal to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.listSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});

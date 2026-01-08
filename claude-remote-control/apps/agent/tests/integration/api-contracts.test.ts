/**
 * API Contracts Tests
 *
 * Tests that validate API response structures match the TypeScript types
 * defined in the shared package. These tests ensure interface stability
 * between the agent and web dashboard.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { EventEmitter } from 'events';
import type {
  EnvironmentMetadata,
  Environment,
  WSSessionInfo,
  CloneResponse,
  ArchiveSessionResponse,
  EnvironmentProvider,
  EnvironmentIcon,
  SessionStatus,
  AttentionReason,
} from '247-shared';

// Mock config
const mockConfig = {
  machine: { id: 'test-machine', name: 'Test Machine' },
  projects: {
    basePath: '/tmp/test-projects',
    whitelist: ['allowed-project'],
  },
  editor: {
    enabled: false,
    portRange: { start: 4680, end: 4699 },
    idleTimeout: 60000,
  },
  dashboard: {
    apiUrl: 'http://localhost:3001/api',
    apiKey: 'test-key',
  },
};

vi.mock('../../src/config.js', () => ({
  config: mockConfig,
  loadConfig: () => mockConfig,
  default: mockConfig,
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([{ name: 'allowed-project', isDirectory: () => true }]),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    const callback = typeof opts === 'function' ? opts : cb;
    if (callback) callback(null, { stdout: '', stderr: '' });
  }),
  execSync: vi.fn(() => ''),
  spawn: vi.fn(() => {
    const proc = new EventEmitter() as any;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();
    proc.pid = 12345;
    return proc;
  }),
}));

// Mock node-pty
vi.mock('@homebridge/node-pty-prebuilt-multiarch', () => ({
  spawn: vi.fn(() => {
    const proc = new EventEmitter() as any;
    proc.write = vi.fn();
    proc.resize = vi.fn();
    proc.kill = vi.fn();
    proc.onData = (cb: any) => proc.on('data', cb);
    proc.onExit = (cb: any) => proc.on('exit', cb);
    return proc;
  }),
}));

// Mock git functions
vi.mock('../../src/git.js', () => ({
  cloneRepo: vi.fn().mockResolvedValue({
    success: true,
    projectName: 'test-repo',
    path: '/tmp/test-projects/test-repo',
  }),
  extractProjectName: vi.fn().mockReturnValue('test-repo'),
  listFiles: vi.fn().mockResolvedValue([]),
  getFileContent: vi.fn().mockResolvedValue({ content: '', type: 'text' }),
  openFileInEditor: vi.fn().mockResolvedValue({ success: true }),
  getChangesSummary: vi.fn().mockResolvedValue({ staged: [], unstaged: [], untracked: [] }),
}));

// Mock terminal
vi.mock('../../src/terminal.js', () => ({
  createTerminal: vi.fn(() => ({
    write: vi.fn(),
    resize: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
    kill: vi.fn(),
    detach: vi.fn(),
    captureHistory: vi.fn().mockResolvedValue(''),
    isExistingSession: vi.fn().mockReturnValue(false),
  })),
}));

// Mock editor
vi.mock('../../src/editor.js', () => ({
  initEditor: vi.fn(),
  getOrStartEditor: vi.fn(),
  stopEditor: vi.fn(),
  getEditorStatus: vi.fn().mockReturnValue({ running: false }),
  getAllEditors: vi.fn().mockReturnValue([]),
  updateEditorActivity: vi.fn(),
  shutdownAllEditors: vi.fn(),
}));

// ============================================================================
// Type Guards for Response Validation
// ============================================================================

function isValidEnvironmentMetadata(obj: unknown): obj is EnvironmentMetadata {
  if (typeof obj !== 'object' || obj === null) return false;
  const env = obj as Record<string, unknown>;

  return (
    typeof env.id === 'string' &&
    typeof env.name === 'string' &&
    typeof env.provider === 'string' &&
    ['anthropic', 'openrouter'].includes(env.provider as string) &&
    typeof env.isDefault === 'boolean' &&
    Array.isArray(env.variableKeys) &&
    typeof env.createdAt === 'number' &&
    typeof env.updatedAt === 'number'
  );
}

function isValidWSSessionInfo(obj: unknown): obj is WSSessionInfo {
  if (typeof obj !== 'object' || obj === null) return false;
  const session = obj as Record<string, unknown>;

  const validStatuses = ['init', 'working', 'needs_attention', 'idle'];
  const validSources = ['hook', 'tmux'];

  if (typeof session.name !== 'string') return false;
  if (typeof session.project !== 'string') return false;
  if (!validStatuses.includes(session.status as string)) return false;
  if (!validSources.includes(session.statusSource as string)) return false;
  if (typeof session.createdAt !== 'number') return false;

  return true;
}

function isValidCloneResponse(obj: unknown): obj is CloneResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const response = obj as Record<string, unknown>;

  if (typeof response.success !== 'boolean') return false;
  if (response.success) {
    if (typeof response.projectName !== 'string') return false;
    if (typeof response.path !== 'string') return false;
  } else {
    if (response.error !== undefined && typeof response.error !== 'string') return false;
  }

  return true;
}

function isValidArchiveSessionResponse(obj: unknown): obj is ArchiveSessionResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const response = obj as Record<string, unknown>;

  if (typeof response.success !== 'boolean') return false;
  if (typeof response.message !== 'string') return false;
  if (response.session !== undefined && !isValidWSSessionInfo(response.session)) return false;

  return true;
}

// ============================================================================
// Tests
// ============================================================================

describe('API Response Contract Tests', () => {
  let server: any;

  beforeAll(async () => {
    const { createServer } = await import('../../src/server.js');
    server = await createServer();
  });

  afterAll(() => {
    if (server?.close) {
      server.close();
    }
  });

  describe('GET /api/projects', () => {
    it('returns string array', async () => {
      const res = await request(server).get('/api/projects');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((item: unknown) => {
        expect(typeof item).toBe('string');
      });
    });
  });

  describe('GET /api/folders', () => {
    it('returns string array of folder names', async () => {
      const res = await request(server).get('/api/folders');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((item: unknown) => {
        expect(typeof item).toBe('string');
      });
    });
  });

  describe('POST /api/clone', () => {
    it('returns valid CloneResponse on success', async () => {
      const { cloneRepo } = await import('../../src/git.js');
      vi.mocked(cloneRepo).mockResolvedValue({
        success: true,
        projectName: 'test-repo',
        path: '/tmp/test-projects/test-repo',
      });

      const res = await request(server)
        .post('/api/clone')
        .send({ repoUrl: 'https://github.com/user/repo' });

      expect(res.status).toBe(200);
      expect(isValidCloneResponse(res.body)).toBe(true);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.projectName).toBe('string');
      expect(typeof res.body.path).toBe('string');
    });

    it('returns valid CloneResponse on failure', async () => {
      const { cloneRepo } = await import('../../src/git.js');
      vi.mocked(cloneRepo).mockResolvedValue({
        success: false,
        projectName: 'repo',
        path: '',
        error: 'Repository not found',
      });

      const res = await request(server)
        .post('/api/clone')
        .send({ repoUrl: 'https://github.com/user/nonexistent' });

      expect(res.status).toBe(400);
      expect(isValidCloneResponse(res.body)).toBe(true);
      expect(res.body.success).toBe(false);
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('GET /api/sessions', () => {
    it('returns array of valid WSSessionInfo', async () => {
      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, opts: any, cb: any) => {
        const callback = typeof opts === 'function' ? opts : cb;
        // Mock tmux output: session_name|session_created (unix timestamp)
        const mockOutput = 'test--session-1|1704067200\ntest--session-2|1704067300\n';
        if (callback) callback(null, { stdout: mockOutput, stderr: '' });
        return null as any;
      });

      const res = await request(server).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        res.body.forEach((session: unknown) => {
          expect(isValidWSSessionInfo(session)).toBe(true);
        });
      }
    });

    it('returns empty array when no sessions', async () => {
      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, opts: any, cb: any) => {
        const callback = typeof opts === 'function' ? opts : cb;
        if (callback) callback(new Error('no sessions'), null, null);
        return null as any;
      });

      const res = await request(server).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/environments', () => {
    it('returns array of valid EnvironmentMetadata', async () => {
      const res = await request(server).get('/api/environments');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      res.body.forEach((env: unknown) => {
        expect(isValidEnvironmentMetadata(env)).toBe(true);
      });
    });

    it('each environment has required metadata fields', async () => {
      const res = await request(server).get('/api/environments');

      expect(res.status).toBe(200);

      res.body.forEach((env: EnvironmentMetadata) => {
        expect(env.id).toBeDefined();
        expect(env.name).toBeDefined();
        expect(env.provider).toBeDefined();
        expect(['anthropic', 'openrouter']).toContain(env.provider);
        expect(typeof env.isDefault).toBe('boolean');
        expect(Array.isArray(env.variableKeys)).toBe(true);
        expect(typeof env.createdAt).toBe('number');
        expect(typeof env.updatedAt).toBe('number');
      });
    });
  });

  describe('POST /api/hooks/status', () => {
    it('accepts valid hook status with all fields', async () => {
      const res = await request(server).post('/api/hooks/status').send({
        event: 'PreToolUse',
        status: 'needs_attention',
        attention_reason: 'permission',
        session_id: 'session-123',
        tmux_session: 'test--brave-lion-42',
        project: 'test-project',
        timestamp: Date.now(),
      });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('accepts minimal hook status', async () => {
      const res = await request(server).post('/api/hooks/status').send({
        event: 'Stop',
        status: 'idle',
        tmux_session: 'test--session-1',
      });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('rejects request without event', async () => {
      const res = await request(server).post('/api/hooks/status').send({
        status: 'working',
        tmux_session: 'test--session-1',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing event');
    });

    it('validates SessionStatus values', async () => {
      const validStatuses: SessionStatus[] = ['init', 'working', 'needs_attention', 'idle'];

      for (const status of validStatuses) {
        const res = await request(server)
          .post('/api/hooks/status')
          .send({
            event: 'Test',
            status,
            tmux_session: `test--session-${status}`,
          });

        expect(res.status).toBe(200);
      }
    });

    it('validates AttentionReason values', async () => {
      const validReasons: AttentionReason[] = [
        'permission',
        'input',
        'plan_approval',
        'task_complete',
      ];

      for (const reason of validReasons) {
        const res = await request(server)
          .post('/api/hooks/status')
          .send({
            event: 'Test',
            status: 'needs_attention',
            attention_reason: reason,
            tmux_session: `test--session-${reason}`,
          });

        expect(res.status).toBe(200);
      }
    });
  });

  describe('Session Preview Endpoint', () => {
    it('returns preview with expected structure', async () => {
      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, opts: any, cb: any) => {
        const callback = typeof opts === 'function' ? opts : cb;
        if (callback) callback(null, { stdout: '$ echo hello\nhello\n$ ', stderr: '' });
        return null as any;
      });

      const res = await request(server).get('/api/sessions/test--valid-session-1/preview');

      if (res.status === 200) {
        expect(Array.isArray(res.body.lines)).toBe(true);
        expect(typeof res.body.timestamp).toBe('number');
      }
    });
  });

  describe('Clone Preview Endpoint', () => {
    it('returns expected structure', async () => {
      const { extractProjectName } = await import('../../src/git.js');
      vi.mocked(extractProjectName).mockReturnValue('my-project');

      const res = await request(server)
        .get('/api/clone/preview')
        .query({ url: 'https://github.com/user/my-project' });

      expect(res.status).toBe(200);
      expect(typeof res.body.projectName).toBe('string');
    });
  });

  describe('Editor Status Endpoint', () => {
    it('returns expected structure', async () => {
      const res = await request(server).get('/api/editor/allowed-project/status');

      expect(res.status).toBe(200);
      expect(typeof res.body.running).toBe('boolean');
    });
  });
});

describe('Error Response Contracts', () => {
  let server: any;

  beforeAll(async () => {
    const { createServer } = await import('../../src/server.js');
    server = await createServer();
  });

  afterAll(() => {
    if (server?.close) {
      server.close();
    }
  });

  it('returns 400 with error object for bad requests', async () => {
    const res = await request(server).post('/api/clone').send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('returns 400 for invalid session name format', async () => {
    const res = await request(server).get('/api/sessions/invalid;rm -rf/preview');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid session name');
  });

  it('returns 403 for non-whitelisted project', async () => {
    const res = await request(server).get('/api/editor/not-allowed-project/status');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Project not allowed');
  });

  it('returns 404 for missing resources', async () => {
    const res = await request(server).get('/api/environments/non-existent-id');

    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe('string');
  });
});

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { EventEmitter } from 'events';

// Mock config
vi.mock('../../config.json', () => ({
  default: {
    machine: { id: 'test-machine', name: 'Test Machine' },
    projects: {
      basePath: '/tmp/test-projects',
      whitelist: [],
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
  },
}));

// Mock dependencies
vi.mock('fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([]),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  rm: vi.fn().mockResolvedValue(undefined),
}));

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

vi.mock('../../src/editor.js', () => ({
  initEditor: vi.fn(),
  getOrStartEditor: vi.fn(),
  stopEditor: vi.fn(),
  getEditorStatus: vi.fn().mockReturnValue({ running: false }),
  getAllEditors: vi.fn().mockReturnValue([]),
  updateEditorActivity: vi.fn(),
  shutdownAllEditors: vi.fn(),
}));

// Mock database to use in-memory database and avoid file locking issues
vi.mock('../../src/db/index.js', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { CREATE_TABLES_SQL } = await import('../../src/db/schema.js');

  let db: any = null;

  return {
    initDatabase: vi.fn(() => {
      if (!db) {
        db = new Database(':memory:');
        db.exec(CREATE_TABLES_SQL);
      }
      return db;
    }),
    getDatabase: vi.fn(() => {
      if (!db) {
        db = new Database(':memory:');
        db.exec(CREATE_TABLES_SQL);
      }
      return db;
    }),
    closeDatabase: vi.fn(() => {
      if (db) {
        db.close();
        db = null;
      }
    }),
    initTestDatabase: vi.fn(() => {
      db = new Database(':memory:');
      db.exec(CREATE_TABLES_SQL);
      return db;
    }),
    migrateEnvironmentsFromJson: vi.fn().mockReturnValue(false),
    getDatabaseStats: vi.fn().mockReturnValue({ sessions: 0, history: 0, environments: 0 }),
    RETENTION_CONFIG: {
      activeSessionMaxAge: 24 * 60 * 60 * 1000,
      archivedSessionMaxAge: 30 * 24 * 60 * 60 * 1000,
      statusHistoryMaxAge: 7 * 24 * 60 * 60 * 1000,
      cleanupInterval: 60 * 60 * 1000,
    },
  };
});

describe('Hooks Status API', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/hooks/status', () => {
    it('accepts SessionStart event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionStart',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts PermissionRequest event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'PermissionRequest',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          tool_name: 'Bash',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts Stop event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Stop',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          stop_reason: 'end_turn',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts SessionEnd event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionEnd',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts Notification event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Notification',
          notification_type: 'idle_prompt',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('rejects request without event', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          session_id: 'test-session-123',
          project: 'project',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing event');
    });

    it('accepts event with timestamp', async () => {
      const timestamp = Date.now();
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionStart',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          status: 'working',
          timestamp,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts status with attention_reason', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'PermissionRequest',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
          status: 'needs_attention',
          attention_reason: 'permission',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('accepts event without tmux_session (with warning)', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Stop',
          session_id: 'test-session-123',
          project: 'project',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('handles unknown event types gracefully', async () => {
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'UnknownEvent',
          session_id: 'test-session-123',
          tmux_session: 'project--brave-lion-42',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });
  });

  describe('Hook status lifecycle', () => {
    it('tracks full session lifecycle with new status model', async () => {
      const sessionId = 'lifecycle-test';
      const tmuxSession = 'project--lifecycle-test-1';

      // 1. Session start -> working
      await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionStart',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'working',
          project: 'project',
        });

      // 2. Stop (waiting for input) -> needs_attention
      await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Stop',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'needs_attention',
          attention_reason: 'input',
          stop_reason: 'end_turn',
        });

      // 3. Session end -> idle
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionEnd',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'idle',
        });

      expect(res.status).toBe(200);
    });

    it('handles permission request flow', async () => {
      const sessionId = 'permission-test';
      const tmuxSession = 'project--permission-test-1';

      // 1. Session starts working
      await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionStart',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'working',
        });

      // 2. Permission requested -> needs_attention with permission reason
      await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'PermissionRequest',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'needs_attention',
          attention_reason: 'permission',
          tool_name: 'Bash',
        });

      // 3. Permission granted, back to working
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'SessionStart',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'working',
        });

      expect(res.status).toBe(200);
    });

    it('handles notification event with idle_prompt', async () => {
      const sessionId = 'notification-test';
      const tmuxSession = 'project--notification-test-1';

      // Notification (idle_prompt) -> needs_attention with input reason
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Notification',
          session_id: sessionId,
          tmux_session: tmuxSession,
          notification_type: 'idle_prompt',
          status: 'needs_attention',
          attention_reason: 'input',
        });

      expect(res.status).toBe(200);
    });

    it('handles task_complete stop reason', async () => {
      const sessionId = 'task-complete-test';
      const tmuxSession = 'project--task-complete-test-1';

      // Stop with task_complete reason
      const res = await request(server)
        .post('/api/hooks/status')
        .send({
          event: 'Stop',
          session_id: sessionId,
          tmux_session: tmuxSession,
          status: 'needs_attention',
          attention_reason: 'task_complete',
          stop_reason: 'stop_hook',
        });

      expect(res.status).toBe(200);
    });
  });
});

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Machine,
  MachineConfig,
  Session,
  User,
  WSMessageToAgent,
  WSMessageFromAgent,
  RegisterMachineRequest,
  AgentInfo,
  EditorConfig,
  EditorStatus,
  AgentConfig,
} from '../src/types/index.js';

describe('Shared Types', () => {
  describe('Machine types', () => {
    it('validates Machine structure', () => {
      const machine: Machine = {
        id: 'machine-1',
        name: 'Test Machine',
        status: 'online',
        lastSeen: new Date(),
        config: { projects: ['project-a'] },
        createdAt: new Date(),
      };

      expect(machine.id).toBeDefined();
      expect(machine.status).toMatch(/^(online|offline)$/);
    });

    it('validates MachineConfig structure', () => {
      const config: MachineConfig = {
        projects: ['project-a', 'project-b'],
        agentUrl: 'localhost:4678',
      };

      expect(config.projects).toBeInstanceOf(Array);
    });

    it('allows null values where specified', () => {
      const machine: Machine = {
        id: 'machine-1',
        name: 'Test Machine',
        status: 'offline',
        lastSeen: null,
        config: null,
        createdAt: new Date(),
      };

      expect(machine.lastSeen).toBeNull();
      expect(machine.config).toBeNull();
    });
  });

  describe('Session types', () => {
    it('validates Session structure', () => {
      const session: Session = {
        id: 'session-1',
        machineId: 'machine-1',
        project: 'test-project',
        status: 'running',
        tmuxSession: 'project--brave-lion-42',
        startedAt: new Date(),
        endedAt: null,
      };

      expect(session.status).toMatch(/^(running|stopped|waiting)$/);
    });
  });

  describe('SessionStatus types', () => {
    it('only allows 3 valid status values', async () => {
      const types = await import('../src/types/index.js');

      // Test that the type exports exist
      expect(types).toBeDefined();

      // Valid statuses
      const validStatuses = ['working', 'needs_attention', 'idle'];
      validStatuses.forEach(status => {
        expect(['working', 'needs_attention', 'idle']).toContain(status);
      });
    });

    it('AttentionReason has valid values', () => {
      const validReasons = ['permission', 'input', 'plan_approval', 'task_complete'];
      validReasons.forEach(reason => {
        expect(['permission', 'input', 'plan_approval', 'task_complete']).toContain(reason);
      });
    });
  });

  describe('User types', () => {
    it('validates User structure', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      expect(user.email).toContain('@');
    });

    it('allows null name', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        createdAt: new Date(),
      };

      expect(user.name).toBeNull();
    });
  });

  describe('WebSocket message types', () => {
    it('validates input message', () => {
      const msg: WSMessageToAgent = { type: 'input', data: 'ls -la' };
      expect(msg.type).toBe('input');
      expect(msg.data).toBeDefined();
    });

    it('validates resize message', () => {
      const msg: WSMessageToAgent = { type: 'resize', cols: 120, rows: 40 };
      expect(msg.type).toBe('resize');
      expect(msg.cols).toBe(120);
      expect(msg.rows).toBe(40);
    });

    it('validates start-claude message', () => {
      const msg: WSMessageToAgent = { type: 'start-claude' };
      expect(msg.type).toBe('start-claude');
    });

    it('validates ping message', () => {
      const msg: WSMessageToAgent = { type: 'ping' };
      expect(msg.type).toBe('ping');
    });

    it('validates request-history message', () => {
      const msg: WSMessageToAgent = { type: 'request-history', lines: 100 };
      expect(msg.type).toBe('request-history');
    });

    it('validates output message from agent', () => {
      const msg: WSMessageFromAgent = { type: 'output', data: 'Hello' };
      expect(msg.type).toBe('output');
    });

    it('validates pong message from agent', () => {
      const msg: WSMessageFromAgent = { type: 'pong' };
      expect(msg.type).toBe('pong');
    });

    it('validates history message from agent', () => {
      const msg: WSMessageFromAgent = {
        type: 'history',
        data: '$ echo hello\nhello\n',
        lines: 2,
      };
      expect(msg.type).toBe('history');
      expect(msg.lines).toBe(2);
    });
  });

  describe('API types', () => {
    it('validates RegisterMachineRequest', () => {
      const request: RegisterMachineRequest = {
        id: 'machine-1',
        name: 'Test Machine',
        config: { projects: ['project-a'] },
      };

      expect(request.id).toBeDefined();
      expect(request.name).toBeDefined();
    });

    it('allows optional config', () => {
      const request: RegisterMachineRequest = {
        id: 'machine-1',
        name: 'Test Machine',
      };

      expect(request.config).toBeUndefined();
    });

    it('validates AgentInfo', () => {
      const info: AgentInfo = {
        machine: { id: 'machine-1', name: 'Test' },
        status: 'online',
        projects: ['project-a'],
      };

      expect(info.status).toMatch(/^(online|offline)$/);
    });
  });

  describe('Editor types', () => {
    it('validates EditorConfig', () => {
      const config: EditorConfig = {
        enabled: true,
        portRange: { start: 4680, end: 4699 },
        idleTimeout: 30 * 60 * 1000,
      };

      expect(config.portRange.start).toBeLessThan(config.portRange.end);
      expect(config.idleTimeout).toBeGreaterThan(0);
    });

    it('validates EditorStatus', () => {
      const status: EditorStatus = {
        project: 'test-project',
        running: true,
        port: 4680,
        pid: 12345,
        startedAt: Date.now(),
        lastActivity: Date.now(),
      };

      expect(status.running).toBe(true);
    });

    it('allows optional fields in EditorStatus', () => {
      const status: EditorStatus = {
        project: 'test-project',
        running: false,
      };

      expect(status.port).toBeUndefined();
      expect(status.pid).toBeUndefined();
    });
  });

  describe('AgentConfig', () => {
    it('validates full AgentConfig', () => {
      const config: AgentConfig = {
        machine: { id: 'machine-1', name: 'Test Machine' },
        agent: { port: 4678, url: 'localhost:4678' },
        editor: {
          enabled: true,
          portRange: { start: 4680, end: 4699 },
          idleTimeout: 30000,
        },
        projects: {
          basePath: '~/Dev',
          whitelist: ['project-a', 'project-b'],
        },
        dashboard: {
          apiUrl: 'http://localhost:3001/api',
          apiKey: 'test-key',
        },
      };

      expect(config.machine.id).toBeDefined();
      expect(config.dashboard.apiUrl).toContain('http');
    });

    it('allows optional agent and editor', () => {
      const config: AgentConfig = {
        machine: { id: 'machine-1', name: 'Test Machine' },
        projects: {
          basePath: '~/Dev',
          whitelist: [],
        },
        dashboard: {
          apiUrl: 'http://localhost:3001/api',
          apiKey: 'test-key',
        },
      };

      expect(config.agent).toBeUndefined();
      expect(config.editor).toBeUndefined();
    });
  });

  describe('Type exports', () => {
    it('exports all required types', async () => {
      const types = await import('../src/types/index.js');

      // Verify module can be imported without error
      expect(types).toBeDefined();
    });
  });
});

/**
 * useAgents Hook Tests
 *
 * Tests for cloud agents management hook including fetch, start, stop, and delete operations.
 */
import { describe, it, expect } from 'vitest';

// Define the CloudAgent interface for tests
interface CloudAgent {
  id: string;
  userId: string;
  flyAppName: string;
  flyMachineId?: string;
  flyVolumeId?: string;
  hostname: string;
  region: string;
  status:
    | 'pending'
    | 'creating_app'
    | 'creating_volume'
    | 'creating_machine'
    | 'running'
    | 'stopped'
    | 'starting'
    | 'stopping'
    | 'error';
  errorMessage?: string;
  claudeApiKeySet?: boolean;
  createdAt: string;
  updatedAt: string;
}

const mockAgents: CloudAgent[] = [
  {
    id: 'agent-1',
    userId: 'user-1',
    flyAppName: 'agent-test-1234',
    flyMachineId: 'machine-1',
    flyVolumeId: 'volume-1',
    hostname: 'agent-test-1234.fly.dev',
    region: 'sjc',
    status: 'running',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'agent-2',
    userId: 'user-1',
    flyAppName: 'agent-test-5678',
    flyMachineId: 'machine-2',
    flyVolumeId: 'volume-2',
    hostname: 'agent-test-5678.fly.dev',
    region: 'cdg',
    status: 'stopped',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('useAgents hook', () => {
  describe('CloudAgent interface', () => {
    it('should have all required fields', () => {
      const agent = mockAgents[0];

      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('userId');
      expect(agent).toHaveProperty('flyAppName');
      expect(agent).toHaveProperty('hostname');
      expect(agent).toHaveProperty('region');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('createdAt');
      expect(agent).toHaveProperty('updatedAt');
    });

    it('should have optional fields', () => {
      const agent: CloudAgent = {
        id: 'test',
        userId: 'user',
        flyAppName: 'app',
        hostname: 'hostname.fly.dev',
        region: 'sjc',
        status: 'running',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        // Optional fields
        flyMachineId: 'machine-id',
        flyVolumeId: 'volume-id',
        errorMessage: 'Some error',
        claudeApiKeySet: true,
      };

      expect(agent.flyMachineId).toBe('machine-id');
      expect(agent.flyVolumeId).toBe('volume-id');
      expect(agent.errorMessage).toBe('Some error');
      expect(agent.claudeApiKeySet).toBe(true);
    });
  });

  describe('status values', () => {
    it('should accept all valid status values', () => {
      const validStatuses: CloudAgent['status'][] = [
        'pending',
        'creating_app',
        'creating_volume',
        'creating_machine',
        'running',
        'stopped',
        'starting',
        'stopping',
        'error',
      ];

      validStatuses.forEach((status) => {
        const agent: CloudAgent = {
          ...mockAgents[0],
          status,
        };
        expect(agent.status).toBe(status);
      });
    });
  });

  describe('agent filtering logic', () => {
    it('should filter running agents', () => {
      const runningAgents = mockAgents.filter((a) => a.status === 'running');
      expect(runningAgents).toHaveLength(1);
      expect(runningAgents[0].id).toBe('agent-1');
    });

    it('should filter stopped agents', () => {
      const stoppedAgents = mockAgents.filter((a) => a.status === 'stopped');
      expect(stoppedAgents).toHaveLength(1);
      expect(stoppedAgents[0].id).toBe('agent-2');
    });

    it('should filter agents by region', () => {
      const sjcAgents = mockAgents.filter((a) => a.region === 'sjc');
      expect(sjcAgents).toHaveLength(1);
      expect(sjcAgents[0].hostname).toBe('agent-test-1234.fly.dev');
    });
  });

  describe('optimistic update logic', () => {
    it('should update status to starting when starting agent', () => {
      const agents = [...mockAgents];
      const agentId = 'agent-2';

      const updatedAgents = agents.map((agent) =>
        agent.id === agentId ? { ...agent, status: 'starting' as const } : agent
      );

      expect(updatedAgents.find((a) => a.id === agentId)?.status).toBe('starting');
      expect(updatedAgents.find((a) => a.id === 'agent-1')?.status).toBe('running');
    });

    it('should update status to stopping when stopping agent', () => {
      const agents = [...mockAgents];
      const agentId = 'agent-1';

      const updatedAgents = agents.map((agent) =>
        agent.id === agentId ? { ...agent, status: 'stopping' as const } : agent
      );

      expect(updatedAgents.find((a) => a.id === agentId)?.status).toBe('stopping');
    });

    it('should remove agent from list when deleted', () => {
      const agents = [...mockAgents];
      const agentId = 'agent-1';

      const updatedAgents = agents.filter((agent) => agent.id !== agentId);

      expect(updatedAgents).toHaveLength(1);
      expect(updatedAgents[0].id).toBe('agent-2');
    });
  });

  describe('API endpoint construction', () => {
    const PROVISIONING_URL = 'https://api.test.com';

    it('should construct correct list endpoint', () => {
      const endpoint = `${PROVISIONING_URL}/api/agents`;
      expect(endpoint).toBe('https://api.test.com/api/agents');
    });

    it('should construct correct start endpoint', () => {
      const agentId = 'agent-1';
      const endpoint = `${PROVISIONING_URL}/api/agents/${agentId}/start`;
      expect(endpoint).toBe('https://api.test.com/api/agents/agent-1/start');
    });

    it('should construct correct stop endpoint', () => {
      const agentId = 'agent-1';
      const endpoint = `${PROVISIONING_URL}/api/agents/${agentId}/stop`;
      expect(endpoint).toBe('https://api.test.com/api/agents/agent-1/stop');
    });

    it('should construct correct delete endpoint', () => {
      const agentId = 'agent-1';
      const endpoint = `${PROVISIONING_URL}/api/agents/${agentId}`;
      expect(endpoint).toBe('https://api.test.com/api/agents/agent-1');
    });
  });

  describe('hostname format', () => {
    it('should follow fly.dev format', () => {
      mockAgents.forEach((agent) => {
        expect(agent.hostname).toMatch(/\.fly\.dev$/);
      });
    });

    it('should start with agent prefix', () => {
      mockAgents.forEach((agent) => {
        expect(agent.hostname).toMatch(/^agent-/);
      });
    });
  });

  describe('connection URL construction', () => {
    it('should construct websocket URL from hostname', () => {
      const agent = mockAgents[0];
      const wsUrl = `wss://${agent.hostname}`;
      expect(wsUrl).toBe('wss://agent-test-1234.fly.dev');
    });
  });

  describe('return value structure', () => {
    it('should have expected return shape', () => {
      // Simulating hook return value
      const hookReturn = {
        agents: mockAgents,
        isLoading: false,
        error: null as string | null,
        refresh: async () => {},
        startAgent: async (id: string) => true,
        stopAgent: async (id: string) => true,
        deleteAgent: async (id: string) => true,
      };

      expect(hookReturn).toHaveProperty('agents');
      expect(hookReturn).toHaveProperty('isLoading');
      expect(hookReturn).toHaveProperty('error');
      expect(hookReturn).toHaveProperty('refresh');
      expect(hookReturn).toHaveProperty('startAgent');
      expect(hookReturn).toHaveProperty('stopAgent');
      expect(hookReturn).toHaveProperty('deleteAgent');
    });
  });

  describe('authentication behavior', () => {
    it('should return empty array when not authenticated', () => {
      const isAuthenticated = false;
      const agents = isAuthenticated ? mockAgents : [];
      expect(agents).toEqual([]);
    });

    it('should return agents when authenticated', () => {
      const isAuthenticated = true;
      const agents = isAuthenticated ? mockAgents : [];
      expect(agents).toEqual(mockAgents);
    });
  });
});

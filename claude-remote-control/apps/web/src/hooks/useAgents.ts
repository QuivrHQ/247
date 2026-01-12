'use client';

import { useState, useEffect, useCallback } from 'react';

const PROVISIONING_URL = process.env.NEXT_PUBLIC_PROVISIONING_URL;

export interface CloudAgent {
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

interface UseAgentsReturn {
  agents: CloudAgent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startAgent: (id: string) => Promise<boolean>;
  stopAgent: (id: string) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
}

/**
 * Hook to fetch and manage deployed cloud agents
 * Only fetches when user is authenticated
 */
export function useAgents(isAuthenticated: boolean): UseAgentsReturn {
  const [agents, setAgents] = useState<CloudAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!PROVISIONING_URL || !isAuthenticated) {
      setAgents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${PROVISIONING_URL}/api/agents`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAgents([]);
          return;
        }
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const startAgent = useCallback(
    async (id: string): Promise<boolean> => {
      if (!PROVISIONING_URL) return false;

      try {
        const response = await fetch(`${PROVISIONING_URL}/api/agents/${id}/start`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to start agent');
        }

        // Update local state optimistically
        setAgents((prev) =>
          prev.map((agent) => (agent.id === id ? { ...agent, status: 'starting' as const } : agent))
        );

        // Refresh to get actual status
        await fetchAgents();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start agent');
        return false;
      }
    },
    [fetchAgents]
  );

  const stopAgent = useCallback(
    async (id: string): Promise<boolean> => {
      if (!PROVISIONING_URL) return false;

      try {
        const response = await fetch(`${PROVISIONING_URL}/api/agents/${id}/stop`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to stop agent');
        }

        // Update local state optimistically
        setAgents((prev) =>
          prev.map((agent) => (agent.id === id ? { ...agent, status: 'stopping' as const } : agent))
        );

        // Refresh to get actual status
        await fetchAgents();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop agent');
        return false;
      }
    },
    [fetchAgents]
  );

  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    if (!PROVISIONING_URL) return false;

    try {
      const response = await fetch(`${PROVISIONING_URL}/api/agents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete agent');
      }

      // Remove from local state
      setAgents((prev) => prev.filter((agent) => agent.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      return false;
    }
  }, []);

  // Fetch on mount and when auth changes
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refresh: fetchAgents,
    startAgent,
    stopAgent,
    deleteAgent,
  };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiUrl, buildWebSocketUrl } from '@/lib/utils';
import type { Message, SubAgent, Orchestration } from '@/components/orchestrator/types';

interface OrchestratorState {
  orchestration: Orchestration | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface OrchestratorEvent {
  type:
    | 'status-change'
    | 'message'
    | 'subtask-started'
    | 'subtask-completed'
    | 'completed'
    | 'error';
  orchestrationId: string;
  status?: string;
  message?: { role: 'user' | 'assistant'; content: string };
  subtask?: { id: string; name: string; type: string; status: string };
  totalCostUsd?: number;
}

interface UseOrchestratorOptions {
  agentUrl: string;
  project: string;
}

export function useOrchestrator({ agentUrl, project }: UseOrchestratorOptions) {
  const [state, setState] = useState<OrchestratorState>({
    orchestration: null,
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch orchestration data by ID
  const fetchOrchestration = useCallback(
    async (orchestrationId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(buildApiUrl(agentUrl, `/api/orchestrator/${orchestrationId}`));
        if (!response.ok) throw new Error('Failed to fetch orchestration');

        const data = await response.json();

        // Map API response to frontend types
        const orchestration: Orchestration = {
          id: data.orchestration.id,
          name: data.orchestration.name,
          project: data.orchestration.project,
          status: mapStatus(data.orchestration.status),
          currentIteration: 1, // TODO: track iterations
          maxIterations: 5,
          totalCost: data.orchestration.totalCostUsd || 0,
          progress: calculateProgress(data.orchestration.status, data.subtasks),
          agents: data.subtasks.map((subtask: any) => mapSubtask(subtask)),
        };

        const messages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }));

        setState((prev) => ({
          ...prev,
          orchestration,
          messages,
          isLoading: false,
        }));

        return orchestration;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
        return null;
      }
    },
    [agentUrl]
  );

  // Create a new orchestration
  const createOrchestration = useCallback(
    async (task: string, environmentId?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(buildApiUrl(agentUrl, '/api/orchestrator/create'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, project, environmentId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create orchestration');
        }

        const data = await response.json();

        // Initialize orchestration state
        const orchestration: Orchestration = {
          id: data.id,
          name: task.slice(0, 50) + (task.length > 50 ? '...' : ''),
          project,
          status: 'executing',
          currentIteration: 1,
          maxIterations: 5,
          totalCost: 0,
          progress: 0,
          agents: [],
        };

        // Add initial user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: task,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          orchestration,
          messages: [userMessage],
          isLoading: false,
        }));

        return data.id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
        return null;
      }
    },
    [agentUrl, project]
  );

  // Send a message to an existing orchestration
  const sendMessage = useCallback(
    async (orchestrationId: string, message: string, environmentId?: string) => {
      // Optimistically add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      try {
        const response = await fetch(
          buildApiUrl(agentUrl, `/api/orchestrator/${orchestrationId}/message`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, environmentId }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }

        // Update status to executing
        setState((prev) => ({
          ...prev,
          orchestration: prev.orchestration ? { ...prev.orchestration, status: 'executing' } : null,
        }));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, error: errorMsg }));
      }
    },
    [agentUrl]
  );

  // Cancel an orchestration
  const cancelOrchestration = useCallback(
    async (orchestrationId: string) => {
      try {
        const response = await fetch(
          buildApiUrl(agentUrl, `/api/orchestrator/${orchestrationId}/cancel`),
          {
            method: 'POST',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to cancel orchestration');
        }

        setState((prev) => ({
          ...prev,
          orchestration: prev.orchestration ? { ...prev.orchestration, status: 'failed' } : null,
        }));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, error: errorMsg }));
      }
    },
    [agentUrl]
  );

  // Reset state for a new orchestration
  const reset = useCallback(() => {
    setState({
      orchestration: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // List orchestrations for a project
  const listOrchestrations = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl(agentUrl, `/api/orchestrator?project=${project}`));
      if (!response.ok) throw new Error('Failed to fetch orchestrations');
      return (await response.json()) as Array<{
        id: string;
        name: string;
        project: string;
        status: string;
        totalCostUsd: number;
        createdAt: number;
        completedAt: number | null;
      }>;
    } catch (err) {
      console.error('Failed to list orchestrations:', err);
      return [];
    }
  }, [agentUrl, project]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!agentUrl) return;

    const connectWebSocket = () => {
      const wsUrl = buildWebSocketUrl(agentUrl, '/status');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Orchestrator WS] Connected');
        setState((prev) => ({ ...prev, isConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type !== 'orchestrator-event') return;

          const orchEvent = msg.event as OrchestratorEvent;
          setState((prev) => processOrchestratorEvent(prev, orchEvent));
        } catch (err) {
          console.error('[Orchestrator WS] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Orchestrator WS] Disconnected');
        setState((prev) => ({ ...prev, isConnected: false }));

        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('[Orchestrator WS] Error:', err);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [agentUrl]);

  return {
    ...state,
    fetchOrchestration,
    createOrchestration,
    sendMessage,
    cancelOrchestration,
    listOrchestrations,
    reset,
  };
}

// Event processing
function processOrchestratorEvent(
  state: OrchestratorState,
  event: OrchestratorEvent
): OrchestratorState {
  if (!state.orchestration || state.orchestration.id !== event.orchestrationId) {
    return state;
  }

  switch (event.type) {
    case 'status-change':
      return handleStatusChange(state, event);
    case 'message':
      return handleMessageEvent(state, event);
    case 'subtask-started':
      return handleSubtaskStarted(state, event);
    case 'subtask-completed':
      return handleSubtaskCompleted(state, event);
    case 'completed':
      return handleCompleted(state, event);
    case 'error':
      return handleError(state);
    default:
      return state;
  }
}

function handleStatusChange(state: OrchestratorState, event: OrchestratorEvent): OrchestratorState {
  return {
    ...state,
    orchestration: {
      ...state.orchestration!,
      status: mapStatus(event.status || state.orchestration!.status),
    },
  };
}

function handleMessageEvent(state: OrchestratorState, event: OrchestratorEvent): OrchestratorState {
  if (!event.message) return state;

  const isDuplicate = state.messages.some(
    (m) => m.role === event.message!.role && m.content === event.message!.content
  );
  if (isDuplicate) return state;

  const newMessage: Message = {
    id: Date.now().toString(),
    role: event.message.role,
    content: event.message.content,
    timestamp: new Date(),
  };

  return {
    ...state,
    messages: [...state.messages, newMessage],
  };
}

function handleSubtaskStarted(
  state: OrchestratorState,
  event: OrchestratorEvent
): OrchestratorState {
  if (!event.subtask) return state;

  const agentExists = state.orchestration!.agents.some((a) => a.id === event.subtask!.id);
  if (agentExists) return state;

  const newAgent: SubAgent = {
    id: event.subtask.id,
    name: event.subtask.name,
    type: event.subtask.type,
    status: 'running',
    progress: 0,
    output: [],
    cost: 0,
    startedAt: new Date(),
  };

  return {
    ...state,
    orchestration: {
      ...state.orchestration!,
      agents: [...state.orchestration!.agents, newAgent],
    },
  };
}

function handleSubtaskCompleted(
  state: OrchestratorState,
  event: OrchestratorEvent
): OrchestratorState {
  if (!event.subtask) return state;

  return {
    ...state,
    orchestration: {
      ...state.orchestration!,
      agents: state.orchestration!.agents.map((agent) =>
        agent.id === event.subtask!.id
          ? { ...agent, status: 'completed' as const, progress: 100, completedAt: new Date() }
          : agent
      ),
    },
  };
}

function handleCompleted(state: OrchestratorState, event: OrchestratorEvent): OrchestratorState {
  return {
    ...state,
    orchestration: {
      ...state.orchestration!,
      status: 'completed',
      totalCost: event.totalCostUsd || state.orchestration!.totalCost,
      progress: 100,
    },
  };
}

function handleError(state: OrchestratorState): OrchestratorState {
  return {
    ...state,
    orchestration: {
      ...state.orchestration!,
      status: 'failed',
    },
  };
}

// Helper functions
function mapStatus(status: string): Orchestration['status'] {
  const statusMap: Record<string, Orchestration['status']> = {
    planning: 'planning',
    clarifying: 'clarifying',
    executing: 'executing',
    iterating: 'iterating',
    paused: 'paused',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
  };
  return statusMap[status] || 'executing';
}

function mapSubtaskStatus(status: string): SubAgent['status'] {
  switch (status) {
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function getProgressFromStatus(status: string): number {
  switch (status) {
    case 'completed':
      return 100;
    case 'running':
      return 50;
    default:
      return 0;
  }
}

function mapSubtask(subtask: any): SubAgent {
  return {
    id: subtask.id,
    name: subtask.name,
    type: subtask.type as SubAgent['type'],
    status: mapSubtaskStatus(subtask.status),
    progress: getProgressFromStatus(subtask.status),
    output: [],
    cost: subtask.costUsd || 0,
    startedAt: subtask.startedAt ? new Date(subtask.startedAt) : undefined,
    completedAt: subtask.completedAt ? new Date(subtask.completedAt) : undefined,
  };
}

function calculateProgress(status: string, subtasks: any[]): number {
  if (status === 'completed') return 100;
  if (status === 'planning' || status === 'clarifying') return 10;
  if (subtasks.length === 0) return 20;

  const completed = subtasks.filter((s: any) => s.status === 'completed').length;
  const running = subtasks.filter((s: any) => s.status === 'running').length;
  const total = subtasks.length;

  return Math.round(((completed + running * 0.5) / total) * 80) + 20;
}

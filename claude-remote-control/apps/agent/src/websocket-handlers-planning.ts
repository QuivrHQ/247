/**
 * WebSocket handlers for project planning sessions.
 * Manages the interactive planning flow with Claude Code.
 */

import { WebSocket } from 'ws';
import { plannerService } from './services/planner.js';
import type { WSPlanningMessageToAgent, WSPlanningMessageFromAgent } from '247-shared';

// Track planning WebSocket connections
const planningConnections = new Map<string, Set<WebSocket>>();

// Flag to ensure event listeners are only set up once
let eventListenersInitialized = false;

/**
 * Handle a planning WebSocket connection
 */
export function handlePlanningConnection(ws: WebSocket, url: URL): void {
  // Initialize event listeners on first connection
  if (!eventListenersInitialized) {
    setupPlannerEventListeners();
    eventListenersInitialized = true;
  }

  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    ws.close(4000, 'Missing projectId parameter');
    return;
  }

  console.log(`[Planning WS] New connection for project: ${projectId}`);

  // Register this connection for the project
  if (!planningConnections.has(projectId)) {
    planningConnections.set(projectId, new Set());
  }
  planningConnections.get(projectId)!.add(ws);

  // Handle messages from client
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString()) as WSPlanningMessageToAgent;
      await handlePlanningMessageInternal(ws, projectId, message);
    } catch (error) {
      console.error('[Planning WS] Error handling message:', error);
      sendPlanningMessage(ws, {
        type: 'planning-error',
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`[Planning WS] Connection closed for project: ${projectId}`);
    const connections = planningConnections.get(projectId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        planningConnections.delete(projectId);
      }
    }
  });

  // Send initial state if there's an active session
  const existingSession = findSessionByProject(projectId);
  if (existingSession) {
    sendPlanningMessage(ws, {
      type: 'planning-progress',
      projectId,
      phase: existingSession.phase,
      message: 'Reconnected to existing planning session',
    });

    // Send any pending questions
    if (existingSession.questions.length > 0 && existingSession.isWaitingForResponse) {
      const lastQuestion = existingSession.questions[existingSession.questions.length - 1];
      sendPlanningMessage(ws, {
        type: 'planning-question',
        projectId,
        question: lastQuestion,
      });
    }

    // Send plan if ready
    if (existingSession.generatedPlan) {
      sendPlanningMessage(ws, {
        type: 'plan-ready',
        projectId,
        plan: existingSession.generatedPlan.summary,
        issues: existingSession.generatedPlan.issues,
      });
    }
  }
}

/**
 * Handle incoming planning messages (internal)
 */
async function handlePlanningMessageInternal(
  ws: WebSocket,
  projectId: string,
  message: WSPlanningMessageToAgent
): Promise<void> {
  switch (message.type) {
    case 'start-planning': {
      console.log(`[Planning WS] Starting planning for project: ${projectId}, trustMode: ${message.trustMode}`);

      try {
        const sessionId = await plannerService.startPlanning(projectId, message.trustMode);
        sendPlanningMessage(ws, {
          type: 'planning-progress',
          projectId,
          phase: 'gathering',
          message: `Planning session started: ${sessionId}`,
        });
      } catch (error) {
        sendPlanningMessage(ws, {
          type: 'planning-error',
          projectId,
          error: error instanceof Error ? error.message : 'Failed to start planning',
        });
      }
      break;
    }

    case 'answer-question': {
      const session = findSessionByProject(projectId);
      if (!session) {
        sendPlanningMessage(ws, {
          type: 'planning-error',
          projectId,
          error: 'No active planning session',
        });
        return;
      }

      try {
        plannerService.answerQuestion(session.id, message.questionId, message.answer);
      } catch (error) {
        sendPlanningMessage(ws, {
          type: 'planning-error',
          projectId,
          error: error instanceof Error ? error.message : 'Failed to answer question',
        });
      }
      break;
    }

    case 'approve-plan': {
      const session = findSessionByProject(projectId);
      if (!session) {
        sendPlanningMessage(ws, {
          type: 'planning-error',
          projectId,
          error: 'No active planning session',
        });
        return;
      }

      try {
        const issueIds = await plannerService.approvePlan(session.id);
        sendPlanningMessage(ws, {
          type: 'issues-created',
          projectId,
          issueIds,
        });
      } catch (error) {
        sendPlanningMessage(ws, {
          type: 'planning-error',
          projectId,
          error: error instanceof Error ? error.message : 'Failed to approve plan',
        });
      }
      break;
    }

    case 'cancel-planning': {
      const session = findSessionByProject(projectId);
      if (session) {
        plannerService.cancelPlanning(session.id);
      }
      sendPlanningMessage(ws, {
        type: 'planning-progress',
        projectId,
        phase: 'error',
        message: 'Planning cancelled',
      });
      break;
    }

    case 'planning-input': {
      // Direct input to the planning terminal (for advanced users)
      const session = findSessionByProject(projectId);
      if (session && message.input) {
        plannerService.sendInput(session.id, message.input);
      }
      break;
    }
  }
}

/**
 * Set up event listeners for the planner service
 */
function setupPlannerEventListeners(): void {
  plannerService.on('phase-change', (sessionId: string, phase) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'planning-progress',
      projectId: session.projectId,
      phase,
      message: `Phase changed to: ${phase}`,
    });
  });

  plannerService.on('question', (sessionId: string, question) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'planning-question',
      projectId: session.projectId,
      question,
    });
  });

  plannerService.on('progress', (sessionId: string, message) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'planning-progress',
      projectId: session.projectId,
      phase: session.phase,
      message,
    });
  });

  plannerService.on('plan-ready', (sessionId: string, plan) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'plan-ready',
      projectId: session.projectId,
      plan: plan.summary,
      issues: plan.issues,
    });
  });

  plannerService.on('issues-created', (sessionId: string, issueIds) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'issues-created',
      projectId: session.projectId,
      issueIds,
    });
  });

  plannerService.on('error', (sessionId: string, error) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'planning-error',
      projectId: session.projectId,
      error,
    });
  });

  plannerService.on('output', (sessionId: string, output) => {
    const session = plannerService.getSession(sessionId);
    if (!session) return;

    broadcastToProject(session.projectId, {
      type: 'planning-output',
      projectId: session.projectId,
      output,
    });
  });
}

/**
 * Find a planning session by project ID
 */
function findSessionByProject(projectId: string) {
  return plannerService.getSessionByProjectId(projectId);
}

/**
 * Send a message to a specific WebSocket
 */
function sendPlanningMessage(ws: WebSocket, message: WSPlanningMessageFromAgent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast a message to all connections for a project
 */
function broadcastToProject(projectId: string, message: WSPlanningMessageFromAgent): void {
  const connections = planningConnections.get(projectId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  }
}

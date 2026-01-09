/**
 * Orchestrator API routes: create, resume, cancel orchestrations.
 *
 * Uses CLI-based orchestrator that spawns Claude Code CLI,
 * allowing use of the Claude Code subscription instead of API key.
 */

import { Router } from 'express';
import { join } from 'path';
import { config } from '../config.js';
import {
  runOrchestration,
  resumeOrchestration,
  cancelOrchestration,
  getOrchestration,
  getOrchestrationMessages,
  getOrchestrationSubtasks,
  listOrchestrations,
  type OrchestratorEvent,
} from '../orchestrator/index.js';
import { broadcastOrchestratorEvent } from '../websocket-handlers.js';

export function createOrchestratorRoutes(): Router {
  const router = Router();

  // List all orchestrations (optionally filtered by project)
  router.get('/', (req, res) => {
    const { project } = req.query;
    const orchestrations = listOrchestrations(project as string | undefined);

    res.json(
      orchestrations.map((orch) => ({
        id: orch.id,
        name: orch.name,
        project: orch.project,
        status: orch.status,
        totalCostUsd: orch.total_cost_usd,
        createdAt: orch.created_at,
        completedAt: orch.completed_at,
      }))
    );
  });

  // Get a specific orchestration with messages and subtasks
  router.get('/:id', (req, res) => {
    const { id } = req.params;

    const orchestration = getOrchestration(id);
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }

    const messages = getOrchestrationMessages(id);
    const subtasks = getOrchestrationSubtasks(id);

    res.json({
      orchestration: {
        id: orchestration.id,
        sessionId: orchestration.session_id,
        name: orchestration.name,
        project: orchestration.project,
        originalTask: orchestration.original_task,
        status: orchestration.status,
        totalCostUsd: orchestration.total_cost_usd,
        createdAt: orchestration.created_at,
        completedAt: orchestration.completed_at,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.created_at,
      })),
      subtasks: subtasks.map((task) => ({
        id: task.id,
        name: task.name,
        type: task.type,
        status: task.status,
        costUsd: task.cost_usd,
        startedAt: task.started_at,
        completedAt: task.completed_at,
      })),
    });
  });

  // Create a new orchestration
  router.post('/create', async (req, res) => {
    const { task, project } = req.body;

    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'task is required' });
    }

    if (!project || typeof project !== 'string') {
      return res.status(400).json({ error: 'project is required' });
    }

    // Resolve project path (expand ~ to home directory)
    const projectPath = join(config.projects.basePath, project).replace('~', process.env.HOME!);

    // Create event handler for WebSocket broadcasts
    const onMessage = (event: OrchestratorEvent) => {
      broadcastOrchestratorEvent(event);
    };

    try {
      // Start orchestration (runs in background)
      // Uses Claude Code CLI which authenticates via subscription
      const orchestrationId = await runOrchestration(task, {
        project,
        projectPath,
        onMessage,
      });

      res.json({
        id: orchestrationId,
        status: 'executing',
        message: 'Orchestration started',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  // Send a message to an existing orchestration
  router.post('/:id/message', async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const orchestration = getOrchestration(id);
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }

    // Resolve project path (expand ~ to home directory)
    const projectPath = join(config.projects.basePath, orchestration.project).replace(
      '~',
      process.env.HOME!
    );

    // Create event handler
    const onMessage = (event: OrchestratorEvent) => {
      broadcastOrchestratorEvent(event);
    };

    try {
      // Resume orchestration with new message (runs in background)
      // Uses Claude Code CLI which authenticates via subscription
      resumeOrchestration(id, message, {
        project: orchestration.project,
        projectPath,
        onMessage,
      });

      res.json({
        status: 'executing',
        message: 'Message sent',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Cancel an orchestration
  router.post('/:id/cancel', (req, res) => {
    const { id } = req.params;

    const orchestration = getOrchestration(id);
    if (!orchestration) {
      return res.status(404).json({ error: 'Orchestration not found' });
    }

    const cancelled = cancelOrchestration(id);

    if (cancelled) {
      broadcastOrchestratorEvent({
        type: 'status-change',
        orchestrationId: id,
        status: 'cancelled',
      });
    }

    res.json({
      success: true,
      cancelled,
      message: cancelled ? 'Orchestration cancelled' : 'Orchestration was not running',
    });
  });

  return router;
}

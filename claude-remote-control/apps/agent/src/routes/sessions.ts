/**
 * Session API routes: list, preview, kill, archive tmux sessions.
 */

import { Router } from 'express';
import type { SessionStatus, AttentionReason, WSSessionInfo } from '247-shared';
import { tmuxSessionStatus, broadcastSessionRemoved, broadcastSessionArchived } from '../status.js';
import * as sessionsDb from '../db/sessions.js';
import {
  getEnvironmentMetadata,
  getSessionEnvironment,
  clearSessionEnvironment,
} from '../db/environments.js';

export function createSessionRoutes(): Router {
  const router = Router();

  // Enhanced sessions endpoint with detailed info
  router.get('/', async (_req, res) => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(
        'tmux list-sessions -F "#{session_name}|#{session_created}" 2>/dev/null'
      );

      const sessions: WSSessionInfo[] = [];

      for (const line of stdout.trim().split('\n').filter(Boolean)) {
        const [name, created] = line.split('|');
        const [project] = name.split('--');

        let status: SessionStatus = 'init';
        let attentionReason: AttentionReason | undefined;
        let statusSource: 'hook' | 'tmux' = 'tmux';
        let lastEvent: string | undefined;
        let lastStatusChange: number | undefined;

        const hookData = tmuxSessionStatus.get(name);
        if (hookData) {
          status = hookData.status;
          attentionReason = hookData.attentionReason;
          statusSource = 'hook';
          lastEvent = hookData.lastEvent;
          lastStatusChange = hookData.lastStatusChange;
        }

        const envId = getSessionEnvironment(name);
        const envMeta = envId ? getEnvironmentMetadata(envId) : undefined;

        sessions.push({
          name,
          project,
          createdAt: parseInt(created) * 1000,
          status,
          attentionReason,
          statusSource,
          lastActivity: '',
          lastEvent,
          lastStatusChange,
          environmentId: envId,
          environment: envMeta
            ? {
                id: envMeta.id,
                name: envMeta.name,
                provider: envMeta.provider,
                icon: envMeta.icon,
                isDefault: envMeta.isDefault,
              }
            : undefined,
        });
      }

      res.json(sessions);
    } catch {
      res.json([]);
    }
  });

  // Get archived sessions
  router.get('/archived', (_req, res) => {
    const archivedSessions = sessionsDb.getArchivedSessions();

    const sessions: WSSessionInfo[] = archivedSessions.map((session) => {
      const envId = getSessionEnvironment(session.name);
      const envMeta = envId ? getEnvironmentMetadata(envId) : undefined;

      return {
        name: session.name,
        project: session.project,
        createdAt: session.created_at,
        status: session.status,
        attentionReason: session.attention_reason ?? undefined,
        statusSource: 'hook' as const,
        lastEvent: session.last_event ?? undefined,
        lastStatusChange: session.last_status_change,
        archivedAt: session.archived_at ?? undefined,
        environmentId: envId,
        environment: envMeta
          ? {
              id: envMeta.id,
              name: envMeta.name,
              provider: envMeta.provider,
              icon: envMeta.icon,
              isDefault: envMeta.isDefault,
            }
          : undefined,
      };
    });

    res.json(sessions);
  });

  // Get terminal preview (last N lines from tmux pane)
  router.get('/:sessionName/preview', async (req, res) => {
    const { sessionName } = req.params;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    if (!/^[\w-]+$/.test(sessionName)) {
      return res.status(400).json({ error: 'Invalid session name' });
    }

    try {
      const { stdout } = await execAsync(
        `tmux capture-pane -t "${sessionName}" -p -S -20 2>/dev/null`
      );

      const allLines = stdout.split('\n');
      const lines = allLines
        .slice(-16, -1)
        .filter((line) => line.trim() !== '' || allLines.indexOf(line) > allLines.length - 5);

      res.json({
        lines: lines.length > 0 ? lines : ['(empty terminal)'],
        timestamp: Date.now(),
      });
    } catch {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // Kill a tmux session
  router.delete('/:sessionName', async (req, res) => {
    const { sessionName } = req.params;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    if (!/^[\w-]+$/.test(sessionName)) {
      return res.status(400).json({ error: 'Invalid session name' });
    }

    try {
      await execAsync(`tmux kill-session -t "${sessionName}" 2>/dev/null`);
      console.log(`Killed tmux session: ${sessionName}`);

      sessionsDb.deleteSession(sessionName);
      sessionsDb.clearSessionEnvironmentId(sessionName);
      tmuxSessionStatus.delete(sessionName);
      clearSessionEnvironment(sessionName);
      broadcastSessionRemoved(sessionName);

      res.json({ success: true, message: `Session ${sessionName} killed` });
    } catch {
      res.status(404).json({ error: 'Session not found or already killed' });
    }
  });

  // Archive a session (mark as done and keep in history)
  router.post('/:sessionName/archive', async (req, res) => {
    const { sessionName } = req.params;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    if (!/^[\w-]+$/.test(sessionName)) {
      return res.status(400).json({ error: 'Invalid session name' });
    }

    const archivedSession = sessionsDb.archiveSession(sessionName);
    if (!archivedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      await execAsync(`tmux kill-session -t "${sessionName}" 2>/dev/null`);
      console.log(`[Archive] Killed tmux session: ${sessionName}`);
    } catch {
      console.log(`[Archive] Tmux session ${sessionName} was already gone`);
    }

    tmuxSessionStatus.delete(sessionName);

    const envId = getSessionEnvironment(sessionName);
    const envMeta = envId ? getEnvironmentMetadata(envId) : undefined;

    const archivedInfo: WSSessionInfo = {
      name: sessionName,
      project: archivedSession.project,
      createdAt: archivedSession.created_at,
      status: archivedSession.status,
      attentionReason: archivedSession.attention_reason ?? undefined,
      statusSource: 'hook',
      lastEvent: archivedSession.last_event ?? undefined,
      lastStatusChange: archivedSession.last_status_change,
      archivedAt: archivedSession.archived_at ?? undefined,
      environmentId: envId,
      environment: envMeta
        ? {
            id: envMeta.id,
            name: envMeta.name,
            provider: envMeta.provider,
            icon: envMeta.icon,
            isDefault: envMeta.isDefault,
          }
        : undefined,
    };

    broadcastSessionArchived(sessionName, archivedInfo);

    res.json({
      success: true,
      message: `Session ${sessionName} archived`,
      session: archivedInfo,
    });
  });

  return router;
}

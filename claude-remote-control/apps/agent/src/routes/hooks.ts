/**
 * Hooks API routes: receive status updates from Claude Code hooks.
 */

import { Router } from 'express';
import type { SessionStatus, AttentionReason } from '@vibecompany/247-shared';
import { tmuxSessionStatus, broadcastStatusUpdate, type HookStatus } from '../status.js';
import * as sessionsDb from '../db/sessions.js';
import { getEnvironmentMetadata, getSessionEnvironment } from '../db/environments.js';

export function createHooksRoutes(): Router {
  const router = Router();

  // Receive status updates from Claude Code hooks
  router.post('/status', (req, res) => {
    const { event, status, attention_reason, session_id, tmux_session, project, timestamp } =
      req.body;

    if (!event) {
      return res.status(400).json({ error: 'Missing event' });
    }

    const validStatuses: SessionStatus[] = ['init', 'working', 'needs_attention', 'idle'];
    const receivedStatus: SessionStatus = validStatuses.includes(status) ? status : 'working';

    const validReasons: AttentionReason[] = [
      'permission',
      'input',
      'plan_approval',
      'task_complete',
    ];
    const receivedReason: AttentionReason | undefined =
      attention_reason && validReasons.includes(attention_reason) ? attention_reason : undefined;

    const now = Date.now();

    if (tmux_session) {
      const existing = tmuxSessionStatus.get(tmux_session);
      const statusChanged = !existing || existing.status !== receivedStatus;

      const hookData: HookStatus = {
        status: receivedStatus,
        attentionReason: receivedReason,
        lastEvent: event,
        lastActivity: timestamp || now,
        lastStatusChange: statusChanged ? now : existing.lastStatusChange,
        project,
      };

      const sessionProject = tmux_session.split('--')[0] || project;
      const dbSession = sessionsDb.upsertSession(tmux_session, {
        project: sessionProject,
        status: receivedStatus,
        attentionReason: receivedReason,
        lastEvent: event,
        lastActivity: timestamp || now,
        lastStatusChange: statusChanged ? now : (existing?.lastStatusChange ?? now),
        environmentId: getSessionEnvironment(tmux_session),
      });

      tmuxSessionStatus.set(tmux_session, hookData);

      const envId = getSessionEnvironment(tmux_session);
      const envMeta = envId ? getEnvironmentMetadata(envId) : undefined;

      broadcastStatusUpdate({
        name: tmux_session,
        project: sessionProject || project,
        status: hookData.status,
        attentionReason: hookData.attentionReason,
        statusSource: 'hook',
        lastEvent: hookData.lastEvent,
        lastStatusChange: hookData.lastStatusChange,
        createdAt: dbSession.created_at,
        lastActivity: undefined,
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

      console.log(
        `[Hook] ${tmux_session}: ${event} → ${receivedStatus}${receivedReason ? ` (${receivedReason})` : ''}`
      );
    } else {
      console.warn(
        `[Hook] WARNING: Missing tmux_session for ${event} (session_id=${session_id}, project=${project})`
      );
    }

    res.json({ received: true });
  });

  return router;
}

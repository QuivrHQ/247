/**
 * Notification API route: receives hook notifications from Claude Code.
 * Handles permission requests, input prompts, and other attention-requiring events.
 */

import { Router, type Router as RouterType } from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { tmuxSessionStatus, broadcastStatusUpdate, type HookStatus } from '../status.js';
import * as sessionsDb from '../db/sessions.js';
import type { AttentionReason } from '247-shared';

const router: RouterType = Router();

/**
 * Check if a tmux session exists.
 * Prevents ghost sessions from being created by stale notifications.
 */
function tmuxSessionExists(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Notification types from Claude Code
 * - permission_prompt: Claude needs permission to use a tool
 * - idle_prompt: Claude waiting for user input (fires after 60+ seconds idle)
 * - elicitation_dialog: Claude needs MCP tool input
 * - auth_success: Authentication success (informational)
 */
type NotificationType = 'permission_prompt' | 'idle_prompt' | 'elicitation_dialog' | 'auth_success';

/**
 * Notification hook payload from Claude Code
 * Sent when Claude needs user attention (permission, input, etc.)
 */
interface NotificationPayload {
  tmux_session: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  permission_mode?: string;
  hook_event_name?: string;
  // Claude Code notification fields
  notification_type?: NotificationType;
  message?: string;
  // Tool permission fields (when notification_type is permission_prompt)
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

/**
 * Determine attention reason from notification payload.
 * Uses notification_type as the primary signal for precise status detection.
 * Also checks permission_mode to detect plan approval waiting state.
 */
function getAttentionReason(payload: NotificationPayload): AttentionReason {
  // Check permission_mode for plan approval detection
  // When Claude is in plan mode and needs approval, permission_mode will be 'plan'
  if (payload.permission_mode === 'plan') {
    return 'plan_approval';
  }

  // Use notification_type as the primary signal (most reliable)
  switch (payload.notification_type) {
    case 'permission_prompt':
      return 'permission';
    case 'idle_prompt':
      return 'input';
    case 'elicitation_dialog':
      // MCP elicitation is similar to permission request
      return 'permission';
    case 'auth_success':
      // Auth success is informational, but we mark as input in case user needs to continue
      return 'input';
    default:
      // Fallback: check for tool_name (backwards compatibility)
      if (payload.tool_name) {
        return 'permission';
      }
      // Default to input
      return 'input';
  }
}

/**
 * Get a descriptive event name for logging and display
 */
function getEventName(payload: NotificationPayload): string {
  // Check for plan mode first
  if (payload.permission_mode === 'plan') {
    return 'Plan ready for approval';
  }

  switch (payload.notification_type) {
    case 'permission_prompt':
      return payload.tool_name ? `Permission: ${payload.tool_name}` : 'Permission';
    case 'idle_prompt':
      return 'Waiting for input';
    case 'elicitation_dialog':
      return 'MCP input required';
    case 'auth_success':
      return 'Auth success';
    default:
      // Fallback for older payloads
      return payload.tool_name ? `Permission: ${payload.tool_name}` : 'Notification';
  }
}

/**
 * Receive notification from Claude Code hook.
 * Updates session status to 'needs_attention'.
 */
router.post('/', (req, res) => {
  const payload: NotificationPayload = req.body;
  const { tmux_session } = payload;

  if (!tmux_session) {
    return res.status(400).json({ error: 'Missing tmux_session' });
  }

  // Validate that the tmux session actually exists
  if (!tmuxSessionExists(tmux_session)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const now = Date.now();

  // Extract project from cwd or session name
  const project = payload.cwd
    ? path.basename(payload.cwd)
    : tmux_session.split('--')[0] || undefined;

  const existing = tmuxSessionStatus.get(tmux_session);
  const attentionReason = getAttentionReason(payload);
  const eventName = getEventName(payload);
  const statusChanged = !existing || existing.status !== 'needs_attention';

  const hookData: HookStatus = {
    status: 'needs_attention',
    attentionReason,
    hasBeenWorking: existing?.hasBeenWorking ?? true,
    lastEvent: eventName,
    lastActivity: now,
    lastStatusChange: statusChanged ? now : existing?.lastStatusChange || now,
    project,
    transcriptPath: payload.transcript_path,
    // Preserve existing metrics
    model: existing?.model,
    costUsd: existing?.costUsd,
    contextUsage: existing?.contextUsage,
    linesAdded: existing?.linesAdded,
    linesRemoved: existing?.linesRemoved,
  };

  tmuxSessionStatus.set(tmux_session, hookData);

  // Persist to database
  const dbSession = sessionsDb.upsertSession(tmux_session, {
    project: project || tmux_session.split('--')[0] || '',
    status: 'needs_attention',
    attentionReason,
    lastEvent: eventName,
    lastActivity: now,
    lastStatusChange: statusChanged ? now : (existing?.lastStatusChange ?? now),
    // Preserve existing metrics
    model: existing?.model,
    costUsd: existing?.costUsd,
    contextUsage: existing?.contextUsage,
    linesAdded: existing?.linesAdded,
    linesRemoved: existing?.linesRemoved,
  });

  // Broadcast status change to dashboard
  if (statusChanged) {
    broadcastStatusUpdate({
      name: tmux_session,
      project: project || '',
      status: 'needs_attention',
      attentionReason,
      statusSource: 'hook',
      lastEvent: eventName,
      lastStatusChange: hookData.lastStatusChange,
      createdAt: dbSession?.created_at || now,
      lastActivity: now,
      model: hookData.model,
      costUsd: hookData.costUsd,
      contextUsage: hookData.contextUsage,
      linesAdded: hookData.linesAdded,
      linesRemoved: hookData.linesRemoved,
    });

    console.log(
      `[Notification] ${tmux_session}: → needs_attention (${attentionReason}) - ${eventName}`
    );
  }

  res.json({ ok: true });
});

export function createNotificationRoutes(): RouterType {
  return router;
}

export default router;

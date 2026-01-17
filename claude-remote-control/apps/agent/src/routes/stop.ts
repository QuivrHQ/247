/**
 * Stop hook API route: receives notifications when Claude Code finishes responding.
 * This is the most reliable way to detect when Claude has completed its work.
 */

import { Router, type Router as RouterType } from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { tmuxSessionStatus, broadcastStatusUpdate, type HookStatus } from '../status.js';
import * as sessionsDb from '../db/sessions.js';
import { lastHeartbeat } from './heartbeat.js';

const router: RouterType = Router();

/**
 * Check if a tmux session exists.
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
 * Stop hook payload from Claude Code
 * Sent when Claude finishes responding (main agent or subagent)
 */
interface StopPayload {
  tmux_session: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: 'Stop' | 'SubagentStop';
  // Stop-specific fields
  stop_reason?: string;
  num_turns?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
}

/**
 * Receive Stop notification from Claude Code hook.
 * Transitions session to idle state since Claude has finished.
 */
router.post('/', (req, res) => {
  const payload: StopPayload = req.body;
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

  // Only transition to idle if we were working or needs_attention
  // (not if we're already idle)
  const wasActive = existing?.status === 'working' || existing?.status === 'needs_attention';
  if (!wasActive && existing) {
    // Already idle, just acknowledge
    return res.json({ ok: true, message: 'Already idle' });
  }

  const isSubagent = payload.hook_event_name === 'SubagentStop';
  const eventName = isSubagent ? 'Subagent finished' : 'Claude finished';

  // Clear heartbeat tracking for this session
  lastHeartbeat.delete(tmux_session);

  const hookData: HookStatus = {
    status: 'idle',
    hasBeenWorking: existing?.hasBeenWorking ?? true,
    lastEvent: eventName,
    lastActivity: now,
    lastStatusChange: now,
    project,
    transcriptPath: payload.transcript_path,
    // Preserve existing metrics, but update cost if provided
    model: existing?.model,
    costUsd: payload.total_cost_usd ?? existing?.costUsd,
    contextUsage: existing?.contextUsage,
    linesAdded: existing?.linesAdded,
    linesRemoved: existing?.linesRemoved,
  };

  tmuxSessionStatus.set(tmux_session, hookData);

  // Persist to database
  const dbSession = sessionsDb.upsertSession(tmux_session, {
    project: project || tmux_session.split('--')[0] || '',
    status: 'idle',
    lastEvent: eventName,
    lastActivity: now,
    lastStatusChange: now,
    // Preserve existing metrics
    model: existing?.model,
    costUsd: payload.total_cost_usd ?? existing?.costUsd,
    contextUsage: existing?.contextUsage,
    linesAdded: existing?.linesAdded,
    linesRemoved: existing?.linesRemoved,
  });

  // Broadcast status change to dashboard
  broadcastStatusUpdate({
    name: tmux_session,
    project: project || '',
    status: 'idle',
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
    `[Stop] ${tmux_session}: → idle (${eventName}${payload.stop_reason ? `, reason: ${payload.stop_reason}` : ''})`
  );

  res.json({ ok: true });
});

export function createStopRoutes(): RouterType {
  return router;
}

export default router;

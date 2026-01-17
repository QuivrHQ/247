/**
 * Heartbeat timeout monitor.
 * Detects when Claude Code stops sending statusLine updates.
 *
 * Logic:
 * - Heartbeat received → status "working"
 * - Notification hook received → status "needs_attention" (permission request, etc.)
 * - No heartbeat for 3s (and no notification) → status "idle" (Claude stopped)
 * - tmux session removed → cleanup (handled by cleanupStatusMaps)
 *
 * The Notification hook handles "needs_attention" cases. This monitor only handles
 * the transition to "idle" when Claude has truly stopped working.
 */

import { lastHeartbeat } from './routes/heartbeat.js';
import { tmuxSessionStatus, broadcastStatusUpdate } from './status.js';
import * as sessionsDb from './db/sessions.js';

// Timeout threshold: if no heartbeat for 3 seconds, Claude has stopped working
// Note: "needs_attention" is now handled by the Notification hook, not timeout
const HEARTBEAT_TIMEOUT_MS = 3000;

// Check interval: how often we check for timeouts
const CHECK_INTERVAL_MS = 1000;

let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the heartbeat timeout monitor.
 * Checks every second for sessions that haven't sent a heartbeat.
 */
export function startHeartbeatMonitor(): void {
  if (intervalId) {
    console.warn('[HeartbeatMonitor] Already running');
    return;
  }

  intervalId = setInterval(() => {
    const now = Date.now();

    for (const [sessionName, lastBeat] of lastHeartbeat) {
      const timeSinceLastBeat = now - lastBeat;
      const status = tmuxSessionStatus.get(sessionName);

      // Transition to idle if currently "working" and timeout exceeded
      // Note: The Notification hook handles "needs_attention" cases (permission requests, etc.)
      // This timeout only fires when Claude has truly stopped (no heartbeats AND no notification)
      if (timeSinceLastBeat > HEARTBEAT_TIMEOUT_MS && status?.status === 'working') {
        const newStatus = {
          ...status,
          status: 'idle' as const,
          lastEvent: 'HeartbeatTimeout',
          lastStatusChange: now,
        };

        tmuxSessionStatus.set(sessionName, newStatus);

        // Persist to database
        sessionsDb.upsertSession(sessionName, {
          project: status.project || sessionName.split('--')[0] || '',
          status: 'idle',
          lastEvent: 'HeartbeatTimeout',
          lastActivity: status.lastActivity,
          lastStatusChange: now,
        });

        // Get actual createdAt from database to prevent card reordering
        const dbSession = sessionsDb.getSession(sessionName);

        // Broadcast status change
        broadcastStatusUpdate({
          name: sessionName,
          project: status.project || '',
          status: 'idle',
          statusSource: 'hook',
          lastEvent: 'HeartbeatTimeout',
          lastStatusChange: now,
          createdAt: dbSession?.created_at || status.lastActivity || now,
          lastActivity: status.lastActivity,
          model: status.model,
          costUsd: status.costUsd,
          contextUsage: status.contextUsage,
          linesAdded: status.linesAdded,
          linesRemoved: status.linesRemoved,
        });

        console.log(
          `[HeartbeatMonitor] ${sessionName} → idle (no heartbeat for ${timeSinceLastBeat}ms)`
        );
      }
    }
  }, CHECK_INTERVAL_MS);

  console.log('[HeartbeatMonitor] Started');
}

/**
 * Stop the heartbeat monitor.
 * Called during graceful shutdown.
 */
export function stopHeartbeatMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[HeartbeatMonitor] Stopped');
  }
}

/**
 * WebSocket handlers for terminal connections and status subscriptions.
 */

import { WebSocket } from 'ws';
import * as path from 'path';
import { createTerminal } from './terminal.js';
import { config } from './config.js';
import * as sessionsDb from './db/sessions.js';
import {
  getEnvironmentVariables,
  getEnvironmentMetadata,
  setSessionEnvironment,
  clearSessionEnvironment,
  getSessionEnvironment,
} from './db/environments.js';
import {
  tmuxSessionStatus,
  activeConnections,
  statusSubscribers,
  ralphLoopLastStart,
  RALPH_DEBOUNCE_MS,
  generateSessionName,
  broadcastStatusUpdate,
} from './status.js';
import type {
  WSMessageToAgent,
  SessionStatus,
  AttentionReason,
  WSSessionInfo,
  WSStatusMessageFromAgent,
} from '@vibecompany/247-shared';

/**
 * Handle terminal WebSocket connections
 */
export function handleTerminalConnection(ws: WebSocket, url: URL): void {
  const project = url.searchParams.get('project');
  const urlSessionName = url.searchParams.get('session');
  const environmentId = url.searchParams.get('environment');
  const sessionName = urlSessionName || generateSessionName(project || 'unknown');

  // Validate project
  const whitelist = config.projects.whitelist as string[];
  const hasWhitelist = whitelist && whitelist.length > 0;
  const isAllowed = hasWhitelist ? whitelist.includes(project!) : true;
  if (!project || !isAllowed) {
    ws.close(1008, 'Project not allowed');
    return;
  }

  const projectPath = `${config.projects.basePath}/${project}`.replace('~', process.env.HOME!);

  console.log(`New terminal connection for project: ${project}`);
  console.log(`Project path: ${projectPath}`);

  // Async initialization
  (async () => {
    const fs = await import('fs');
    if (!fs.existsSync(projectPath)) {
      console.error(`Path does not exist: ${projectPath}`);
      ws.close(1008, 'Project path not found');
      return;
    }

    const envVars = getEnvironmentVariables(environmentId || undefined);

    let terminal;
    try {
      terminal = createTerminal(projectPath, sessionName, envVars);
      if (environmentId) {
        setSessionEnvironment(sessionName, environmentId);
      }
    } catch (err) {
      console.error('Failed to create terminal:', err);
      clearSessionEnvironment(sessionName);
      ws.close(1011, 'Failed to create terminal');
      return;
    }

    // Track connection
    if (!activeConnections.has(sessionName)) {
      activeConnections.set(sessionName, new Set());
    }
    activeConnections.get(sessionName)!.add(ws);

    // Handle existing session reconnect
    if (terminal.isExistingSession()) {
      console.log(`Reconnecting to existing session '${sessionName}'`);
      terminal
        .captureHistory(10000)
        .then((history) => {
          if (history && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: 'history', data: history, lines: history.split('\n').length })
            );
          }
        })
        .catch((err) => {
          console.error(`Failed to capture history for '${sessionName}':`, err);
        });
    } else {
      // New session - register and broadcast
      const now = Date.now();
      let createdAt = now;

      try {
        const dbSession = sessionsDb.upsertSession(sessionName, {
          project: project!,
          status: 'init',
          attentionReason: undefined,
          lastEvent: 'SessionCreated',
          lastActivity: now,
          lastStatusChange: now,
          environmentId: environmentId || undefined,
        });
        if (dbSession?.created_at) createdAt = dbSession.created_at;
      } catch (err) {
        console.error(`Failed to persist session '${sessionName}':`, err);
      }

      tmuxSessionStatus.set(sessionName, {
        status: 'init',
        lastEvent: 'SessionCreated',
        lastActivity: now,
        lastStatusChange: now,
        project: project!,
      });

      const envMeta = environmentId ? getEnvironmentMetadata(environmentId) : undefined;
      broadcastStatusUpdate({
        name: sessionName,
        project: project!,
        status: 'init',
        statusSource: 'hook',
        lastEvent: 'SessionCreated',
        lastStatusChange: now,
        createdAt,
        lastActivity: undefined,
        environmentId: environmentId || undefined,
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

    // Forward terminal output
    terminal.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    terminal.onExit(({ exitCode }: { exitCode: number }) => {
      console.log(`Terminal exited with code ${exitCode}`);
      if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Terminal closed');
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const msg: WSMessageToAgent = JSON.parse(data.toString());
        handleTerminalMessage(msg, terminal, ws, sessionName, project!, projectPath);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected, tmux session '${sessionName}' preserved`);
      try {
        (terminal as any).removeAllListeners?.('data');
        (terminal as any).removeAllListeners?.('exit');
      } catch {
        /* ignore */
      }
      terminal.detach();

      const connections = activeConnections.get(sessionName);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) activeConnections.delete(sessionName);
      }
      ralphLoopLastStart.delete(projectPath);
    });

    ws.on('error', (err) => console.error('WebSocket error:', err));
  })();
}

/**
 * Handle individual terminal messages
 */
function handleTerminalMessage(
  msg: WSMessageToAgent,
  terminal: ReturnType<typeof createTerminal>,
  ws: WebSocket,
  sessionName: string,
  project: string,
  projectPath: string
): void {
  switch (msg.type) {
    case 'input':
      terminal.write(msg.data);
      if (msg.data.includes('\r') || msg.data.includes('\n')) {
        const existing = tmuxSessionStatus.get(sessionName);
        if (existing?.status === 'needs_attention' && existing?.attentionReason === 'input') {
          const now = Date.now();
          tmuxSessionStatus.set(sessionName, {
            status: 'working',
            lastEvent: 'UserInput',
            lastActivity: now,
            lastStatusChange: now,
            project,
          });
        }
      }
      break;
    case 'resize':
      terminal.resize(msg.cols, msg.rows);
      break;
    case 'start-claude':
      terminal.write('claude\r');
      break;
    case 'start-claude-ralph':
      handleRalphLoop(msg, terminal, sessionName, projectPath);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'request-history':
      terminal
        .captureHistory(msg.lines || 10000)
        .then((history) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: 'history', data: history, lines: history.split('\n').length })
            );
          }
        })
        .catch((err) => console.error(`Failed to capture history:`, err));
      break;
  }
}

/**
 * Handle Ralph Loop start
 */
function handleRalphLoop(
  msg: WSMessageToAgent & { type: 'start-claude-ralph' },
  terminal: ReturnType<typeof createTerminal>,
  sessionName: string,
  projectPath: string
): void {
  const now = Date.now();
  const lastStart = ralphLoopLastStart.get(projectPath);
  if (lastStart && now - lastStart < RALPH_DEBOUNCE_MS) {
    console.log(`[Ralph] Ignoring duplicate for ${projectPath}`);
    return;
  }
  ralphLoopLastStart.set(projectPath, now);

  const ralphConfig = { ...msg.config };

  terminal.onReady(() => {
    (async () => {
      const fsSync = await import('fs');
      const claudeDir = path.join(projectPath, '.claude');
      const ralphStateFile = path.join(claudeDir, 'ralph-loop.local.md');

      if (!fsSync.existsSync(claudeDir)) {
        fsSync.mkdirSync(claudeDir, { recursive: true });
      }

      const ralphState = `---
iteration: 1
maxIterations: ${ralphConfig.maxIterations || 'unlimited'}
completionPromise: ${ralphConfig.completionPromise || 'none'}
useWorktree: ${ralphConfig.useWorktree || false}
active: true
createdAt: ${new Date().toISOString()}
---

# Ralph Loop Task

${ralphConfig.prompt}

---
*This file is auto-generated by 247 Dashboard. Do not edit manually.*
`;
      fsSync.writeFileSync(ralphStateFile, ralphState);

      if (ralphConfig.useWorktree) {
        const branchName = `ralph-${sessionName}-${Date.now()}`;
        terminal.write(
          `git worktree add -b ${branchName} ../ralph-${branchName} 2>/dev/null || echo "Worktree setup skipped"\r`
        );
        terminal.write(`cd ../ralph-${branchName} && `);
      }

      const args: string[] = [];
      if (ralphConfig.maxIterations) args.push(`--max-iterations ${ralphConfig.maxIterations}`);
      if (ralphConfig.completionPromise)
        args.push(`--completion-promise "${ralphConfig.completionPromise}"`);

      const ralphPromptEscaped = ralphConfig.prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
      terminal.write(
        `claude -p '/ralph-loop:ralph-loop "${ralphPromptEscaped}" ${args.join(' ')}'\r`
      );
    })();
  });
}

/**
 * Handle status WebSocket connections (real-time session updates)
 */
export function handleStatusConnection(ws: WebSocket): void {
  console.log('[Status WS] New subscriber connected');
  statusSubscribers.add(ws);

  // Send initial session list
  (async () => {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

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
          environmentId: getSessionEnvironment(name),
        });
      }

      const message: WSStatusMessageFromAgent = { type: 'sessions-list', sessions };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (err) {
      console.error('[Status WS] Failed to get initial sessions:', err);
      if (ws.readyState === WebSocket.OPEN) {
        const message: WSStatusMessageFromAgent = { type: 'sessions-list', sessions: [] };
        ws.send(JSON.stringify(message));
      }
    }
  })();

  ws.on('close', () => {
    statusSubscribers.delete(ws);
    console.log(`[Status WS] Subscriber disconnected (remaining: ${statusSubscribers.size})`);
  });

  ws.on('error', (err) => {
    console.error('[Status WS] Error:', err);
    statusSubscribers.delete(ws);
  });
}

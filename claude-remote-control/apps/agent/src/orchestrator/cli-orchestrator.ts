/**
 * CLI-based Orchestrator
 *
 * Spawns Claude Code CLI instead of using the SDK.
 * This allows using the existing Claude Code subscription (Max plan)
 * instead of requiring a separate API key.
 */

import { spawn, ChildProcess } from 'child_process';
import { getDatabase } from '../db/index.js';
import type {
  DbOrchestration,
  DbOrchestrationMessage,
  DbSubtask,
  OrchestrationStatus,
} from '../db/schema.js';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface OrchestrationConfig {
  project: string;
  projectPath: string;
  onMessage?: (event: OrchestratorEvent) => void;
}

export type OrchestratorEvent =
  | { type: 'status-change'; orchestrationId: string; status: OrchestrationStatus }
  | { type: 'message'; orchestrationId: string; role: 'user' | 'assistant'; content: string }
  | {
      type: 'subtask-started';
      orchestrationId: string;
      subtaskId: string;
      agentType: string;
      agentName: string;
    }
  | { type: 'subtask-completed'; orchestrationId: string; subtaskId: string }
  | { type: 'completed'; orchestrationId: string; totalCostUsd?: number }
  | { type: 'error'; orchestrationId: string; error: string };

// Claude CLI stream-json message types
interface ClaudeStreamMessage {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  message?: {
    content: string | Array<{ type: string; text?: string }>;
  };
  result?: string;
  total_cost_usd?: number;
  duration_ms?: number;
  num_turns?: number;
}

// ============================================================================
// System Prompt Context
// ============================================================================

// Note: Claude Code CLI doesn't support --system-prompt flag directly,
// so we prepend context to the task prompt when needed.

// ============================================================================
// Database Operations
// ============================================================================

function createOrchestration(
  id: string,
  name: string,
  project: string,
  originalTask: string
): DbOrchestration {
  const db = getDatabase();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO orchestrations (id, name, project, original_task, status, total_cost_usd, created_at)
    VALUES (?, ?, ?, ?, 'planning', 0, ?)
  `
  ).run(id, name, project, originalTask, now);

  return {
    id,
    session_id: null,
    name,
    project,
    original_task: originalTask,
    status: 'planning',
    total_cost_usd: 0,
    created_at: now,
    completed_at: null,
  };
}

function updateOrchestrationStatus(id: string, status: OrchestrationStatus): void {
  const db = getDatabase();
  const completedAt =
    status === 'completed' || status === 'failed' || status === 'cancelled' ? Date.now() : null;

  db.prepare(
    `
    UPDATE orchestrations
    SET status = ?, completed_at = ?
    WHERE id = ?
  `
  ).run(status, completedAt, id);
}

function updateOrchestrationSessionId(id: string, sessionId: string): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE orchestrations SET session_id = ? WHERE id = ?
  `
  ).run(sessionId, id);
}

function updateOrchestrationCost(id: string, costUsd: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE orchestrations SET total_cost_usd = ? WHERE id = ?
  `
  ).run(costUsd, id);
}

function saveMessage(
  orchestrationId: string,
  role: 'user' | 'assistant',
  content: string
): DbOrchestrationMessage {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(
      `
    INSERT INTO orchestration_messages (orchestration_id, role, content, created_at)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(orchestrationId, role, content, now);

  return {
    id: result.lastInsertRowid as number,
    orchestration_id: orchestrationId,
    role,
    content,
    created_at: now,
  };
}

// ============================================================================
// Public API
// ============================================================================

export function getOrchestration(id: string): DbOrchestration | undefined {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM orchestrations WHERE id = ?
  `
    )
    .get(id) as DbOrchestration | undefined;
}

export function getOrchestrationMessages(orchestrationId: string): DbOrchestrationMessage[] {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM orchestration_messages
    WHERE orchestration_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(orchestrationId) as DbOrchestrationMessage[];
}

export function getOrchestrationSubtasks(orchestrationId: string): DbSubtask[] {
  const db = getDatabase();
  return db
    .prepare(
      `
    SELECT * FROM subtasks
    WHERE orchestration_id = ?
    ORDER BY started_at ASC
  `
    )
    .all(orchestrationId) as DbSubtask[];
}

export function listOrchestrations(project?: string): DbOrchestration[] {
  const db = getDatabase();

  if (project) {
    return db
      .prepare(
        `
      SELECT * FROM orchestrations
      WHERE project = ?
      ORDER BY created_at DESC
    `
      )
      .all(project) as DbOrchestration[];
  }

  return db
    .prepare(
      `
    SELECT * FROM orchestrations ORDER BY created_at DESC
  `
    )
    .all() as DbOrchestration[];
}

// Map to track active orchestrations and their processes
const activeOrchestrations = new Map<string, ChildProcess>();

/**
 * Run a new orchestration using Claude CLI
 */
export async function runOrchestration(task: string, config: OrchestrationConfig): Promise<string> {
  const orchestrationId = randomUUID();
  const name = task.slice(0, 100);

  // Create orchestration in database
  createOrchestration(orchestrationId, name, config.project, task);

  // Save user message
  saveMessage(orchestrationId, 'user', task);
  config.onMessage?.({ type: 'message', orchestrationId, role: 'user', content: task });

  // Update status to executing
  updateOrchestrationStatus(orchestrationId, 'executing');
  config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

  // Spawn Claude CLI
  const proc = spawn(
    'claude',
    [
      '-p',
      task,
      '--output-format',
      'stream-json',
      '--max-turns',
      '100',
      '--dangerously-skip-permissions',
    ],
    {
      cwd: config.projectPath,
      env: {
        ...process.env,
        // Don't set ANTHROPIC_API_KEY to use subscription auth
        ANTHROPIC_API_KEY: undefined,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  activeOrchestrations.set(orchestrationId, proc);

  // Process stdout (stream-json output)
  let buffer = '';
  proc.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const msg: ClaudeStreamMessage = JSON.parse(line);
          handleClaudeMessage(orchestrationId, msg, config);
        } catch {
          // Non-JSON line, ignore
        }
      }
    }
  });

  // Log stderr for debugging
  proc.stderr?.on('data', (chunk: Buffer) => {
    console.error(`[Orchestrator ${orchestrationId}] stderr:`, chunk.toString());
  });

  // Handle process completion
  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      activeOrchestrations.delete(orchestrationId);

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const msg: ClaudeStreamMessage = JSON.parse(buffer);
          handleClaudeMessage(orchestrationId, msg, config);
        } catch {
          // Ignore
        }
      }

      if (code === 0) {
        updateOrchestrationStatus(orchestrationId, 'completed');
        config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
        resolve(orchestrationId);
      } else {
        updateOrchestrationStatus(orchestrationId, 'failed');
        config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
        config.onMessage?.({
          type: 'error',
          orchestrationId,
          error: `Process exited with code ${code}`,
        });
        resolve(orchestrationId); // Still resolve, the error is handled
      }
    });

    proc.on('error', (err) => {
      activeOrchestrations.delete(orchestrationId);
      updateOrchestrationStatus(orchestrationId, 'failed');
      config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
      config.onMessage?.({ type: 'error', orchestrationId, error: err.message });
      reject(err);
    });
  });
}

/**
 * Resume an existing orchestration with a new user message
 */
export async function resumeOrchestration(
  orchestrationId: string,
  userMessage: string,
  config: OrchestrationConfig
): Promise<void> {
  const orchestration = getOrchestration(orchestrationId);
  if (!orchestration) {
    throw new Error(`Orchestration ${orchestrationId} not found`);
  }

  // Save user message
  saveMessage(orchestrationId, 'user', userMessage);
  config.onMessage?.({ type: 'message', orchestrationId, role: 'user', content: userMessage });

  // For CLI-based orchestrator, we can't easily resume a session
  // Instead, we start a new process with context from previous messages
  const messages = getOrchestrationMessages(orchestrationId);
  const context = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `Previous conversation:\n${context}\n\nNew message from user: ${userMessage}`;

  // Update status
  updateOrchestrationStatus(orchestrationId, 'executing');
  config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

  // Spawn Claude CLI with resume context
  const proc = spawn(
    'claude',
    [
      '-p',
      fullPrompt,
      '--output-format',
      'stream-json',
      '--max-turns',
      '100',
      '--dangerously-skip-permissions',
      ...(orchestration.session_id ? ['--resume', orchestration.session_id] : []),
    ],
    {
      cwd: config.projectPath,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: undefined,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  activeOrchestrations.set(orchestrationId, proc);

  // Process stdout
  let buffer = '';
  proc.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const msg: ClaudeStreamMessage = JSON.parse(line);
          handleClaudeMessage(orchestrationId, msg, config);
        } catch {
          // Non-JSON line, ignore
        }
      }
    }
  });

  proc.stderr?.on('data', (chunk: Buffer) => {
    console.error(`[Orchestrator ${orchestrationId}] stderr:`, chunk.toString());
  });

  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      activeOrchestrations.delete(orchestrationId);

      if (buffer.trim()) {
        try {
          const msg: ClaudeStreamMessage = JSON.parse(buffer);
          handleClaudeMessage(orchestrationId, msg, config);
        } catch {
          // Ignore
        }
      }

      if (code === 0) {
        updateOrchestrationStatus(orchestrationId, 'completed');
        config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
      } else {
        updateOrchestrationStatus(orchestrationId, 'failed');
        config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
      }
      resolve();
    });

    proc.on('error', (err) => {
      activeOrchestrations.delete(orchestrationId);
      updateOrchestrationStatus(orchestrationId, 'failed');
      config.onMessage?.({ type: 'error', orchestrationId, error: err.message });
      reject(err);
    });
  });
}

/**
 * Cancel a running orchestration
 */
export function cancelOrchestration(orchestrationId: string): boolean {
  const proc = activeOrchestrations.get(orchestrationId);
  if (proc) {
    proc.kill('SIGTERM');
    updateOrchestrationStatus(orchestrationId, 'cancelled');
    activeOrchestrations.delete(orchestrationId);
    return true;
  }
  return false;
}

// ============================================================================
// Helpers
// ============================================================================

function handleClaudeMessage(
  orchestrationId: string,
  msg: ClaudeStreamMessage,
  config: OrchestrationConfig
): void {
  // Capture session ID from init message
  if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
    updateOrchestrationSessionId(orchestrationId, msg.session_id);
  }

  // Save and broadcast assistant messages
  if (msg.type === 'assistant' && msg.message?.content) {
    const content = extractTextContent(msg.message.content);
    if (content) {
      saveMessage(orchestrationId, 'assistant', content);
      config.onMessage?.({ type: 'message', orchestrationId, role: 'assistant', content });
    }
  }

  // Handle result
  if (msg.type === 'result') {
    if (msg.total_cost_usd) {
      updateOrchestrationCost(orchestrationId, msg.total_cost_usd);
    }
    config.onMessage?.({ type: 'completed', orchestrationId, totalCostUsd: msg.total_cost_usd });
  }
}

function extractTextContent(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: 'text'; text: string } =>
          block.type === 'text' && typeof block.text === 'string'
      )
      .map((block) => block.text)
      .join('\n');
  }

  return '';
}

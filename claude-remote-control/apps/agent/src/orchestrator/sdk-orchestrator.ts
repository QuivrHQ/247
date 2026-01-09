/**
 * SDK-based Orchestrator
 *
 * Uses Claude Agent SDK with OAuth token authentication,
 * allowing use of the existing Claude Code subscription (Max plan).
 */

import {
  query,
  type Options,
  type SDKMessage,
  type AgentDefinition,
} from '@anthropic-ai/claude-agent-sdk';
import { getDatabase } from '../db/index.js';

// Logger helper
const log = (context: string, ...args: unknown[]) => {
  console.log(`[Orchestrator] ${context}:`, ...args);
};
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
  | {
      type: 'message';
      orchestrationId: string;
      message: { role: 'user' | 'assistant'; content: string };
    }
  | {
      type: 'subtask-started';
      orchestrationId: string;
      subtaskId: string;
      agentType: string;
      agentName: string;
      subtask: { id: string; name: string; type: string; status: string };
    }
  | {
      type: 'subtask-completed';
      orchestrationId: string;
      subtaskId: string;
      subtask: { id: string; name: string; type: string; status: string };
    }
  | { type: 'completed'; orchestrationId: string; totalCostUsd?: number }
  | { type: 'error'; orchestrationId: string; error: string };

// ============================================================================
// System Prompt & Sub-agents
// ============================================================================

const ORCHESTRATOR_SYSTEM_PROMPT = `
Tu es un orchestrateur de tâches complexes. Tu coordonnes des sub-agents spécialisés.

## Tes Sub-Agents Disponibles
- **code-agent**: Expert en écriture et modification de code
- **test-agent**: Expert en tests unitaires et d'intégration
- **review-agent**: Expert en code review et qualité
- **fix-agent**: Expert en correction de bugs

## Principes
1. Clarifie la tâche si elle est ambiguë
2. Décompose en sous-tâches et délègue aux agents appropriés
3. Si un test échoue, utilise fix-agent puis re-teste
4. Escalade les décisions importantes à l'utilisateur
`;

const SUBAGENTS: Record<string, AgentDefinition> = {
  'code-agent': {
    description:
      'Expert en écriture et modification de code. Utilise pour implémenter, refactorer.',
    prompt: 'Tu es un expert développeur. Écris du code propre et maintenable.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
  'test-agent': {
    description: 'Expert en tests. Utilise pour écrire et exécuter des tests.',
    prompt: 'Tu es un expert testing. Écris des tests exhaustifs couvrant les edge cases.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
  'review-agent': {
    description: 'Expert code review. Utilise pour analyser la qualité du code.',
    prompt: 'Tu es un senior reviewer. Identifie bugs, vérifie les bonnes pratiques.',
    tools: ['Read', 'Glob', 'Grep'],
    model: 'haiku',
  },
  'fix-agent': {
    description: 'Expert correction de bugs. Utilise quand des tests échouent.',
    prompt: 'Tu es un expert debugging. Corrige la cause racine sans casser autre chose.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
};

// ============================================================================
// Active Orchestrations
// ============================================================================

const activeOrchestrations = new Map<string, AbortController>();

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

/**
 * Run a new orchestration using Claude Agent SDK
 * Returns immediately and runs in background
 */
export async function runOrchestration(task: string, config: OrchestrationConfig): Promise<string> {
  const orchestrationId = randomUUID();
  const name = task.slice(0, 100);

  log('runOrchestration', `Starting orchestration ${orchestrationId}`);
  log('runOrchestration', `Task: ${task}`);
  log('runOrchestration', `Project path: ${config.projectPath}`);

  // Create orchestration in database
  createOrchestration(orchestrationId, name, config.project, task);

  // Save user message
  saveMessage(orchestrationId, 'user', task);
  config.onMessage?.({
    type: 'message',
    orchestrationId,
    message: { role: 'user', content: task },
  });

  // Update status to executing
  updateOrchestrationStatus(orchestrationId, 'executing');
  config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

  // Run the actual orchestration in background (don't await)
  runOrchestrationAsync(orchestrationId, task, config).catch((error) => {
    log('runOrchestration', `Background error: ${error}`);
  });

  return orchestrationId;
}

/**
 * Internal: Run orchestration asynchronously
 */
async function runOrchestrationAsync(
  orchestrationId: string,
  task: string,
  config: OrchestrationConfig
): Promise<void> {
  // Create abort controller
  const abortController = new AbortController();
  activeOrchestrations.set(orchestrationId, abortController);

  try {
    log('runOrchestrationAsync', `Creating SDK query for ${orchestrationId}`);

    // Create query with SDK - use native Claude CLI binary directly
    const queryInstance = query({
      prompt: task,
      options: {
        pathToClaudeCodeExecutable: '/Users/stan/.local/bin/claude',
        cwd: config.projectPath,
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        agents: SUBAGENTS,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task'],
        permissionMode: 'bypassPermissions',
        maxTurns: 100,
        abortController,
      } as Options,
    });

    log('runOrchestrationAsync', `Starting message stream for ${orchestrationId}`);

    // Stream messages
    let messageCount = 0;
    for await (const message of queryInstance) {
      messageCount++;
      log('runOrchestrationAsync', `Message ${messageCount}: type=${message.type}`);
      handleSDKMessage(orchestrationId, message, config);
    }

    log(
      'runOrchestrationAsync',
      `Stream completed for ${orchestrationId}, ${messageCount} messages`
    );

    updateOrchestrationStatus(orchestrationId, 'completed');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('runOrchestrationAsync', `Error in ${orchestrationId}: ${errorMessage}`);

    // Log full stack trace
    if (error instanceof Error && error.stack) {
      console.error('[Orchestrator] Stack trace:', error.stack);
    }

    updateOrchestrationStatus(orchestrationId, 'failed');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
    config.onMessage?.({ type: 'error', orchestrationId, error: errorMessage });
  } finally {
    activeOrchestrations.delete(orchestrationId);
  }
}

/**
 * Resume an existing orchestration with a new user message
 * Returns immediately and runs in background
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

  log(
    'resumeOrchestration',
    `Resuming ${orchestrationId} with message: ${userMessage.slice(0, 50)}...`
  );

  // Save user message
  saveMessage(orchestrationId, 'user', userMessage);
  config.onMessage?.({
    type: 'message',
    orchestrationId,
    message: { role: 'user', content: userMessage },
  });

  // Update status
  updateOrchestrationStatus(orchestrationId, 'executing');
  config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

  // Run in background (don't await)
  resumeOrchestrationAsync(orchestrationId, userMessage, orchestration.session_id, config).catch(
    (error) => {
      log('resumeOrchestration', `Background error: ${error}`);
    }
  );
}

/**
 * Internal: Resume orchestration asynchronously
 */
async function resumeOrchestrationAsync(
  orchestrationId: string,
  userMessage: string,
  sessionId: string | null,
  config: OrchestrationConfig
): Promise<void> {
  // Create abort controller
  const abortController = new AbortController();
  activeOrchestrations.set(orchestrationId, abortController);

  try {
    log('resumeOrchestrationAsync', `Resuming with session_id: ${sessionId}`);

    // Resume with session ID if available - use native Claude CLI binary directly
    const queryInstance = query({
      prompt: userMessage,
      options: {
        pathToClaudeCodeExecutable: '/Users/stan/.local/bin/claude',
        cwd: config.projectPath,
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        agents: SUBAGENTS,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task'],
        permissionMode: 'bypassPermissions',
        maxTurns: 100,
        abortController,
        ...(sessionId ? { resume: sessionId } : {}),
      } as Options,
    });

    // Stream messages
    let messageCount = 0;
    for await (const message of queryInstance) {
      messageCount++;
      log('resumeOrchestrationAsync', `Message ${messageCount}: type=${message.type}`);
      handleSDKMessage(orchestrationId, message, config);
    }

    log('resumeOrchestrationAsync', `Stream completed, ${messageCount} messages`);

    updateOrchestrationStatus(orchestrationId, 'completed');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('resumeOrchestrationAsync', `Error: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      console.error('[Orchestrator] Stack trace:', error.stack);
    }

    updateOrchestrationStatus(orchestrationId, 'failed');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
    config.onMessage?.({ type: 'error', orchestrationId, error: errorMessage });
  } finally {
    activeOrchestrations.delete(orchestrationId);
  }
}

/**
 * Cancel a running orchestration
 */
export function cancelOrchestration(orchestrationId: string): boolean {
  const controller = activeOrchestrations.get(orchestrationId);
  if (controller) {
    controller.abort();
    updateOrchestrationStatus(orchestrationId, 'cancelled');
    activeOrchestrations.delete(orchestrationId);
    return true;
  }
  return false;
}

// ============================================================================
// Helpers
// ============================================================================

function handleSDKMessage(
  orchestrationId: string,
  message: SDKMessage,
  config: OrchestrationConfig
): void {
  log('handleSDKMessage', `Type: ${message.type}, Keys: ${Object.keys(message).join(', ')}`);

  switch (message.type) {
    case 'system':
      handleSystemMessage(orchestrationId, message);
      break;

    case 'assistant':
      handleAssistantMessage(orchestrationId, message, config);
      break;

    case 'user':
      handleToolResultMessage(orchestrationId, message, config);
      break;

    case 'result':
      handleResultMessage(orchestrationId, message, config);
      break;
  }
}

function handleSystemMessage(orchestrationId: string, message: SDKMessage): void {
  if (!('subtype' in message) || message.subtype !== 'init') return;

  const sessionId = (message as SDKMessage & { session_id: string }).session_id;
  log('handleSystemMessage', `Init message, session_id: ${sessionId}`);
  updateOrchestrationSessionId(orchestrationId, sessionId);
}

function handleAssistantMessage(
  orchestrationId: string,
  message: SDKMessage,
  config: OrchestrationConfig
): void {
  if (!('message' in message) || !message.message?.content) return;
  const messageContent = message.message.content;

  const content = extractTextContent(messageContent);
  log('handleAssistantMessage', `Content: ${content.slice(0, 100)}...`);

  if (content) {
    saveMessage(orchestrationId, 'assistant', content);
    config.onMessage?.({
      type: 'message',
      orchestrationId,
      message: { role: 'assistant', content },
    });
  }

  handleTaskToolCalls(orchestrationId, messageContent, config);
}

function handleTaskToolCalls(
  orchestrationId: string,
  content: unknown,
  config: OrchestrationConfig
): void {
  const toolUses = extractToolUses(content);

  for (const toolUse of toolUses) {
    if (toolUse.name !== 'Task') continue;

    const agentType = String(toolUse.input?.subagent_type || 'unknown');
    const agentName = String(toolUse.input?.description || 'Sub-agent');
    log('handleTaskToolCalls', `Task: ${agentType} - ${agentName}`);

    const db = getDatabase();
    db.prepare(
      `
      INSERT INTO subtasks (id, orchestration_id, name, type, status, started_at)
      VALUES (?, ?, ?, ?, 'running', ?)
    `
    ).run(toolUse.id, orchestrationId, agentName, agentType, Date.now());

    config.onMessage?.({
      type: 'subtask-started',
      orchestrationId,
      subtaskId: toolUse.id,
      agentType,
      agentName,
      subtask: { id: toolUse.id, name: agentName, type: agentType, status: 'running' },
    });
  }
}

function handleToolResultMessage(
  orchestrationId: string,
  message: SDKMessage,
  config: OrchestrationConfig
): void {
  if (!('tool_use_result' in message) && !('parent_tool_use_id' in message)) return;

  const toolResult = message as SDKMessage & {
    tool_use_result?: { tool_use_id?: string };
    parent_tool_use_id?: string;
  };
  const toolUseId = toolResult.parent_tool_use_id || toolResult.tool_use_result?.tool_use_id;
  if (!toolUseId) return;

  log('handleToolResultMessage', `Tool result for: ${toolUseId}`);

  const db = getDatabase();
  const subtask = db.prepare(`SELECT * FROM subtasks WHERE id = ?`).get(toolUseId) as
    | DbSubtask
    | undefined;
  if (!subtask) return;

  db.prepare(
    `
    UPDATE subtasks SET status = 'completed', completed_at = ? WHERE id = ?
  `
  ).run(Date.now(), toolUseId);

  config.onMessage?.({
    type: 'subtask-completed',
    orchestrationId,
    subtaskId: toolUseId,
    subtask: { id: toolUseId, name: subtask.name, type: subtask.type, status: 'completed' },
  });
}

function handleResultMessage(
  orchestrationId: string,
  message: SDKMessage,
  config: OrchestrationConfig
): void {
  const resultMessage = message as SDKMessage & { total_cost_usd?: number };
  log('handleResultMessage', `Cost: ${resultMessage.total_cost_usd}`);

  if (typeof resultMessage.total_cost_usd === 'number') {
    updateOrchestrationCost(orchestrationId, resultMessage.total_cost_usd);
  }

  config.onMessage?.({
    type: 'completed',
    orchestrationId,
    totalCostUsd: resultMessage.total_cost_usd,
  });
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: 'text'; text: string } =>
          typeof block === 'object' &&
          block !== null &&
          block.type === 'text' &&
          typeof block.text === 'string'
      )
      .map((block) => block.text)
      .join('\n');
  }

  return '';
}

interface ToolUseBlock {
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

function extractToolUses(content: unknown): ToolUseBlock[] {
  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter(
    (block): block is ToolUseBlock =>
      typeof block === 'object' &&
      block !== null &&
      block.type === 'tool_use' &&
      typeof block.id === 'string' &&
      typeof block.name === 'string'
  );
}

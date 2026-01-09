import { query, type AgentDefinition, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { getDatabase } from '../db/index.js';
import type {
  DbOrchestration,
  DbOrchestrationMessage,
  DbSubtask,
  OrchestrationStatus,
  SubtaskType,
  SubtaskStatus,
} from '../db/schema.js';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface OrchestrationConfig {
  project: string;
  projectPath: string;
  apiKey: string;
  onMessage?: (message: OrchestratorEvent) => void;
}

export type OrchestratorEvent =
  | { type: 'status-change'; orchestrationId: string; status: OrchestrationStatus }
  | { type: 'message'; orchestrationId: string; role: 'user' | 'assistant'; content: string }
  | {
      type: 'subagent-started';
      orchestrationId: string;
      subtaskId: string;
      agentType: string;
      agentName: string;
    }
  | { type: 'subagent-completed'; orchestrationId: string; subtaskId: string }
  | { type: 'completed'; orchestrationId: string; result: SDKResultMessage }
  | { type: 'error'; orchestrationId: string; error: string };

// ============================================================================
// System Prompt
// ============================================================================

const ORCHESTRATOR_SYSTEM_PROMPT = `# Orchestrateur Multi-Agent 247

Tu coordonnes une équipe de sub-agents spécialisés pour résoudre des tâches complexes de développement logiciel.

## Tes Sub-Agents Disponibles

Tu peux déléguer des tâches à ces agents spécialisés en utilisant le Task tool:

- **code-agent**: Écrit et modifie du code. Utilise pour implémenter des features, refactorer, ou modifier du code existant.
- **test-agent**: Écrit et exécute des tests. Utilise pour créer des tests unitaires, d'intégration, ou pour valider le code.
- **review-agent**: Review le code et suggère des améliorations. Utilise pour analyser la qualité du code et identifier les problèmes.
- **fix-agent**: Corrige les bugs et erreurs identifiés. Utilise quand des tests échouent ou des erreurs sont détectées.

## Principes de Fonctionnement

1. **Clarification d'abord**: Si la tâche est ambiguë, pose des questions à l'utilisateur avant de commencer.
2. **Décomposition**: Décompose les tâches complexes en sous-tâches claires et assignables.
3. **Parallélisation**: Lance les tâches indépendantes en parallèle (max 4 agents simultanés).
4. **Itération automatique**: Si un test échoue, utilise fix-agent pour corriger puis relance les tests.
5. **Autonomie**: Prends des décisions toi-même, n'escalade que pour les choix architecturaux importants.

## Contraintes

- Maximum 4 sub-agents en parallèle
- Délègue TOUJOURS le travail via tes sub-agents, n'écris pas de code directement
- Si tu n'es pas sûr de l'approche, demande à l'utilisateur
- Maximum 5 cycles d'itération avant d'escalader

## Format de Réponse

Explique toujours:
1. Ta compréhension de la tâche
2. Ta stratégie de décomposition
3. Quels agents tu vas utiliser et pourquoi

Sois concis mais informatif.`;

// ============================================================================
// Sub-Agent Definitions
// ============================================================================

const SUBAGENTS: Record<string, AgentDefinition> = {
  'code-agent': {
    description:
      'Expert en écriture et modification de code. Utilise pour implémenter des features, refactorer, ou modifier du code existant.',
    prompt: `Tu es un expert en développement logiciel.

Tes responsabilités:
- Écrire du code propre, maintenable et bien structuré
- Suivre les conventions et patterns du projet existant
- Ajouter des commentaires pertinents quand nécessaire
- Respecter les principes SOLID et DRY

Sois efficace et concentre-toi sur la tâche demandée.`,
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
  'test-agent': {
    description:
      "Expert en tests. Utilise pour écrire des tests unitaires, d'intégration, ou pour exécuter la suite de tests.",
    prompt: `Tu es un expert en testing logiciel.

Tes responsabilités:
- Écrire des tests exhaustifs couvrant les cas nominaux et edge cases
- Utiliser les frameworks de test du projet (vitest, jest, etc.)
- Vérifier que les tests existants passent après modifications
- Proposer une couverture de test appropriée

Sois rigoureux et teste les comportements, pas l'implémentation.`,
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
  'review-agent': {
    description:
      'Expert en code review. Utilise pour analyser la qualité du code, identifier les problèmes, et suggérer des améliorations.',
    prompt: `Tu es un senior developer effectuant une code review.

Tes responsabilités:
- Identifier les bugs potentiels et failles de sécurité
- Vérifier le respect des bonnes pratiques
- Suggérer des améliorations concrètes et actionnables
- Évaluer la maintenabilité et la lisibilité

Sois constructif et priorise les problèmes par importance.`,
    tools: ['Read', 'Glob', 'Grep'],
    model: 'haiku', // More cost-effective for review
  },
  'fix-agent': {
    description:
      'Expert en correction de bugs. Utilise quand des tests échouent ou des erreurs sont identifiées.',
    prompt: `Tu es un expert en debugging et correction de bugs.

Tes responsabilités:
- Analyser les erreurs et stack traces en détail
- Identifier la cause racine du problème
- Corriger le bug sans introduire de régressions
- Vérifier que le fix ne casse pas d'autres fonctionnalités

Sois méthodique et documente tes corrections.`,
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    model: 'sonnet',
  },
};

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
  const updates: Record<string, unknown> = { status };

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.completed_at = Date.now();
  }

  db.prepare(
    `
    UPDATE orchestrations
    SET status = ?, completed_at = ?
    WHERE id = ?
  `
  ).run(status, updates.completed_at ?? null, id);
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

function createSubtask(orchestrationId: string, name: string, type: SubtaskType): DbSubtask {
  const db = getDatabase();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO subtasks (id, orchestration_id, name, type, status, cost_usd, started_at)
    VALUES (?, ?, ?, ?, 'running', 0, ?)
  `
  ).run(id, orchestrationId, name, type, now);

  return {
    id,
    orchestration_id: orchestrationId,
    name,
    type,
    status: 'running',
    cost_usd: 0,
    started_at: now,
    completed_at: null,
  };
}

function updateSubtaskStatus(id: string, status: SubtaskStatus): void {
  const db = getDatabase();
  const updates: Record<string, unknown> = { status };

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = Date.now();
  }

  db.prepare(
    `
    UPDATE subtasks SET status = ?, completed_at = ? WHERE id = ?
  `
  ).run(status, updates.completed_at ?? null, id);
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

// Map to track active orchestrations and their abort controllers
const activeOrchestrations = new Map<string, AbortController>();

/**
 * Run a new orchestration
 */
export async function runOrchestration(task: string, config: OrchestrationConfig): Promise<string> {
  const orchestrationId = randomUUID();
  const name = task.slice(0, 100); // Use first 100 chars as name

  // Create orchestration in database
  createOrchestration(orchestrationId, name, config.project, task);

  // Save user message
  saveMessage(orchestrationId, 'user', task);
  config.onMessage?.({ type: 'message', orchestrationId, role: 'user', content: task });

  // Create abort controller
  const abortController = new AbortController();
  activeOrchestrations.set(orchestrationId, abortController);

  // Track active subtasks by agent_id
  const subtaskMap = new Map<string, string>();

  try {
    // Update status to executing
    updateOrchestrationStatus(orchestrationId, 'executing');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

    // Run query with Claude Agent SDK
    const response = query({
      prompt: task,
      options: {
        model: 'claude-sonnet-4-5-20250514',
        cwd: config.projectPath,
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        agents: SUBAGENTS,
        abortController,
        permissionMode: 'acceptEdits',
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: config.apiKey,
        },

        // Hooks for subagent lifecycle
        hooks: {
          SubagentStart: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name === 'SubagentStart') {
                    const agentType = input.agent_type as SubtaskType;
                    const subtask = createSubtask(orchestrationId, input.agent_type, agentType);
                    subtaskMap.set(input.agent_id, subtask.id);

                    config.onMessage?.({
                      type: 'subagent-started',
                      orchestrationId,
                      subtaskId: subtask.id,
                      agentType: input.agent_type,
                      agentName: input.agent_type,
                    });
                  }
                  return {};
                },
              ],
            },
          ],
          SubagentStop: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name === 'SubagentStop') {
                    const subtaskId = subtaskMap.get(input.agent_id);
                    if (subtaskId) {
                      updateSubtaskStatus(subtaskId, 'completed');
                      config.onMessage?.({
                        type: 'subagent-completed',
                        orchestrationId,
                        subtaskId,
                      });
                      subtaskMap.delete(input.agent_id);
                    }
                  }
                  return {};
                },
              ],
            },
          ],
        },
      },
    });

    // Process messages from the query
    for await (const message of response) {
      // Capture session ID from init message
      if (message.type === 'system' && message.subtype === 'init') {
        updateOrchestrationSessionId(orchestrationId, message.session_id);
      }

      // Save assistant messages
      if (message.type === 'assistant' && message.message?.content) {
        const content = extractTextContent(message.message.content);
        if (content) {
          saveMessage(orchestrationId, 'assistant', content);
          config.onMessage?.({ type: 'message', orchestrationId, role: 'assistant', content });
        }
      }

      // Handle result
      if (message.type === 'result') {
        updateOrchestrationCost(orchestrationId, message.total_cost_usd);

        if (message.subtype === 'success') {
          updateOrchestrationStatus(orchestrationId, 'completed');
          config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
        } else {
          updateOrchestrationStatus(orchestrationId, 'failed');
          config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
          if ('errors' in message && message.errors.length > 0) {
            config.onMessage?.({
              type: 'error',
              orchestrationId,
              error: message.errors.join('\n'),
            });
          }
        }

        config.onMessage?.({ type: 'completed', orchestrationId, result: message });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateOrchestrationStatus(orchestrationId, 'failed');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
    config.onMessage?.({ type: 'error', orchestrationId, error: errorMessage });
  } finally {
    activeOrchestrations.delete(orchestrationId);
  }

  return orchestrationId;
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

  if (!orchestration.session_id) {
    throw new Error(`Orchestration ${orchestrationId} has no session to resume`);
  }

  // Save user message
  saveMessage(orchestrationId, 'user', userMessage);
  config.onMessage?.({ type: 'message', orchestrationId, role: 'user', content: userMessage });

  // Create abort controller
  const abortController = new AbortController();
  activeOrchestrations.set(orchestrationId, abortController);

  // Track active subtasks by agent_id
  const subtaskMap = new Map<string, string>();

  try {
    // Update status
    updateOrchestrationStatus(orchestrationId, 'executing');
    config.onMessage?.({ type: 'status-change', orchestrationId, status: 'executing' });

    // Resume query with Claude Agent SDK
    const response = query({
      prompt: userMessage,
      options: {
        model: 'claude-sonnet-4-5-20250514',
        cwd: config.projectPath,
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        agents: SUBAGENTS,
        abortController,
        permissionMode: 'acceptEdits',
        resume: orchestration.session_id,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: config.apiKey,
        },

        // Hooks for subagent lifecycle
        hooks: {
          SubagentStart: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name === 'SubagentStart') {
                    const agentType = input.agent_type as SubtaskType;
                    const subtask = createSubtask(orchestrationId, input.agent_type, agentType);
                    subtaskMap.set(input.agent_id, subtask.id);

                    config.onMessage?.({
                      type: 'subagent-started',
                      orchestrationId,
                      subtaskId: subtask.id,
                      agentType: input.agent_type,
                      agentName: input.agent_type,
                    });
                  }
                  return {};
                },
              ],
            },
          ],
          SubagentStop: [
            {
              hooks: [
                async (input) => {
                  if (input.hook_event_name === 'SubagentStop') {
                    const subtaskId = subtaskMap.get(input.agent_id);
                    if (subtaskId) {
                      updateSubtaskStatus(subtaskId, 'completed');
                      config.onMessage?.({
                        type: 'subagent-completed',
                        orchestrationId,
                        subtaskId,
                      });
                      subtaskMap.delete(input.agent_id);
                    }
                  }
                  return {};
                },
              ],
            },
          ],
        },
      },
    });

    // Process messages from the query
    for await (const message of response) {
      // Save assistant messages
      if (message.type === 'assistant' && message.message?.content) {
        const content = extractTextContent(message.message.content);
        if (content) {
          saveMessage(orchestrationId, 'assistant', content);
          config.onMessage?.({ type: 'message', orchestrationId, role: 'assistant', content });
        }
      }

      // Handle result
      if (message.type === 'result') {
        updateOrchestrationCost(orchestrationId, message.total_cost_usd);

        if (message.subtype === 'success') {
          updateOrchestrationStatus(orchestrationId, 'completed');
          config.onMessage?.({ type: 'status-change', orchestrationId, status: 'completed' });
        } else {
          updateOrchestrationStatus(orchestrationId, 'failed');
          config.onMessage?.({ type: 'status-change', orchestrationId, status: 'failed' });
          if ('errors' in message && message.errors.length > 0) {
            config.onMessage?.({
              type: 'error',
              orchestrationId,
              error: message.errors.join('\n'),
            });
          }
        }

        config.onMessage?.({ type: 'completed', orchestrationId, result: message });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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

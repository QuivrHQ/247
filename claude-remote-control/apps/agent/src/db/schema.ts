import type { SessionStatus, AttentionReason, EnvironmentProvider } from '247-shared';

// ============================================================================
// Orchestrator Types
// ============================================================================

export type OrchestrationStatus =
  | 'planning'
  | 'clarifying'
  | 'executing'
  | 'iterating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SubtaskType = 'code' | 'test' | 'review' | 'fix';
export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================================================
// Database Row Types
// ============================================================================

export interface DbOrchestration {
  id: string;
  session_id: string | null;
  name: string;
  project: string;
  original_task: string;
  status: OrchestrationStatus;
  total_cost_usd: number;
  created_at: number;
  completed_at: number | null;
}

export interface DbOrchestrationMessage {
  id: number;
  orchestration_id: string;
  role: 'user' | 'assistant';
  content: string; // JSON string
  created_at: number;
}

export interface DbSubtask {
  id: string;
  orchestration_id: string;
  name: string;
  type: SubtaskType;
  status: SubtaskStatus;
  cost_usd: number;
  started_at: number | null;
  completed_at: number | null;
}

export interface DbSession {
  id: number;
  name: string;
  project: string;
  status: SessionStatus;
  attention_reason: AttentionReason | null;
  last_event: string | null;
  last_activity: number;
  last_status_change: number;
  environment_id: string | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  // StatusLine metrics
  model: string | null;
  cost_usd: number | null;
  context_usage: number | null;
  lines_added: number | null;
  lines_removed: number | null;
}

export interface DbStatusHistory {
  id: number;
  session_name: string;
  status: SessionStatus;
  attention_reason: AttentionReason | null;
  event: string | null;
  timestamp: number;
}

export interface DbEnvironment {
  id: string;
  name: string;
  provider: EnvironmentProvider;
  icon: string | null; // Lucide icon name
  is_default: number; // SQLite uses 0/1 for booleans
  variables: string; // JSON string
  created_at: number;
  updated_at: number;
}

export interface DbSessionEnvironment {
  session_name: string;
  environment_id: string;
}

export interface DbSchemaVersion {
  version: number;
  applied_at: number;
}

// ============================================================================
// Input Types for Operations
// ============================================================================

export interface UpsertSessionInput {
  project: string;
  status: SessionStatus;
  attentionReason?: AttentionReason | null;
  lastEvent?: string | null;
  lastActivity: number;
  lastStatusChange: number;
  environmentId?: string | null;
  // StatusLine metrics
  model?: string | null;
  costUsd?: number | null;
  contextUsage?: number | null;
  linesAdded?: number | null;
  linesRemoved?: number | null;
}

export interface UpsertEnvironmentInput {
  id: string;
  name: string;
  provider: EnvironmentProvider;
  isDefault: boolean;
  variables: Record<string, string>;
}

// ============================================================================
// SQL Schema Definitions
// ============================================================================

export const SCHEMA_VERSION = 5;

export const CREATE_TABLES_SQL = `
-- Sessions: current state of terminal sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  project TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'init',
  attention_reason TEXT,
  last_event TEXT,
  last_activity INTEGER NOT NULL,
  last_status_change INTEGER NOT NULL,
  environment_id TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  -- StatusLine metrics (v4)
  model TEXT,
  cost_usd REAL,
  context_usage INTEGER,
  lines_added INTEGER,
  lines_removed INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_name ON sessions(name);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);

-- Status history: audit trail of status changes
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT NOT NULL,
  status TEXT NOT NULL,
  attention_reason TEXT,
  event TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_session ON status_history(session_name);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON status_history(timestamp);

-- Environments: API provider configurations
CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  icon TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  variables TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_environments_default ON environments(is_default);

-- Session-environment mapping
CREATE TABLE IF NOT EXISTS session_environments (
  session_name TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

-- ============================================================================
-- Orchestrator Tables (v5)
-- ============================================================================

-- Orchestrations: parent task coordinated by the orchestrator
CREATE TABLE IF NOT EXISTS orchestrations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  name TEXT NOT NULL,
  project TEXT NOT NULL,
  original_task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  total_cost_usd REAL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_orchestrations_project ON orchestrations(project);
CREATE INDEX IF NOT EXISTS idx_orchestrations_status ON orchestrations(status);
CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at ON orchestrations(created_at);

-- Orchestration messages: conversation history for persistence
CREATE TABLE IF NOT EXISTS orchestration_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orchestration_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orch_messages_orchestration ON orchestration_messages(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_orch_messages_created ON orchestration_messages(created_at);

-- Subtasks: individual tasks executed by sub-agents
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  cost_usd REAL DEFAULT 0,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subtasks_orchestration ON subtasks(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
`;

// ============================================================================
// Retention Configuration
// ============================================================================

export const RETENTION_CONFIG = {
  /** Max age for sessions before cleanup (24 hours) */
  sessionMaxAge: 24 * 60 * 60 * 1000,
  /** Max age for archived sessions before cleanup (30 days) */
  archivedMaxAge: 30 * 24 * 60 * 60 * 1000,
  /** Max age for status history (7 days) */
  historyMaxAge: 7 * 24 * 60 * 60 * 1000,
  /** Cleanup interval (1 hour) */
  cleanupInterval: 60 * 60 * 1000,
};

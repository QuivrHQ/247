/**
 * Type guards for WebSocket protocol validation.
 * Used in tests and can be exported from shared package.
 */

import type {
  WSMessageToAgent,
  WSMessageFromAgent,
  WSStatusMessageToAgent,
  WSStatusMessageFromAgent,
  WSSessionInfo,
  SessionStatus,
  AttentionReason,
  StatusSource,
  RalphLoopConfig,
} from '../../src/types/index.js';

export function isWSMessageToAgent(msg: unknown): msg is WSMessageToAgent {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;

  if (typeof obj.type !== 'string') return false;

  switch (obj.type) {
    case 'input':
      return typeof obj.data === 'string';
    case 'resize':
      return typeof obj.cols === 'number' && typeof obj.rows === 'number';
    case 'start-claude':
    case 'ping':
      return true;
    case 'start-claude-ralph':
      return isValidRalphLoopConfig(obj.config);
    case 'request-history':
      return obj.lines === undefined || typeof obj.lines === 'number';
    default:
      return false;
  }
}

export function isValidRalphLoopConfig(config: unknown): config is RalphLoopConfig {
  if (typeof config !== 'object' || config === null) return false;
  const obj = config as Record<string, unknown>;

  if (typeof obj.prompt !== 'string' || obj.prompt.trim() === '') return false;
  if (obj.maxIterations !== undefined && typeof obj.maxIterations !== 'number') return false;
  if (obj.completionPromise !== undefined && typeof obj.completionPromise !== 'string')
    return false;
  if (obj.useWorktree !== undefined && typeof obj.useWorktree !== 'boolean') return false;

  return true;
}

export function isWSMessageFromAgent(msg: unknown): msg is WSMessageFromAgent {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;

  if (typeof obj.type !== 'string') return false;

  switch (obj.type) {
    case 'output':
      return typeof obj.data === 'string';
    case 'connected':
      return typeof obj.session === 'string';
    case 'disconnected':
    case 'pong':
      return true;
    case 'history':
      return typeof obj.data === 'string' && typeof obj.lines === 'number';
    default:
      return false;
  }
}

export function isWSStatusMessageToAgent(msg: unknown): msg is WSStatusMessageToAgent {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;
  return obj.type === 'status-subscribe' || obj.type === 'status-unsubscribe';
}

export function isWSStatusMessageFromAgent(msg: unknown): msg is WSStatusMessageFromAgent {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;

  if (typeof obj.type !== 'string') return false;

  switch (obj.type) {
    case 'sessions-list':
      return Array.isArray(obj.sessions);
    case 'status-update':
      return typeof obj.session === 'object' && obj.session !== null;
    case 'session-removed':
      return typeof obj.sessionName === 'string';
    case 'session-archived':
      return typeof obj.sessionName === 'string' && typeof obj.session === 'object';
    default:
      return false;
  }
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return value === 'init' || value === 'working' || value === 'needs_attention' || value === 'idle';
}

export function isAttentionReason(value: unknown): value is AttentionReason {
  return (
    value === 'permission' ||
    value === 'input' ||
    value === 'plan_approval' ||
    value === 'task_complete'
  );
}

export function isStatusSource(value: unknown): value is StatusSource {
  return value === 'hook' || value === 'tmux';
}

export function isValidWSSessionInfo(obj: unknown): obj is WSSessionInfo {
  if (typeof obj !== 'object' || obj === null) return false;
  const session = obj as Record<string, unknown>;

  if (typeof session.name !== 'string') return false;
  if (typeof session.project !== 'string') return false;
  if (!isSessionStatus(session.status)) return false;
  if (!isStatusSource(session.statusSource)) return false;
  if (typeof session.createdAt !== 'number') return false;

  if (session.attentionReason !== undefined && !isAttentionReason(session.attentionReason)) {
    return false;
  }

  if (session.lastEvent !== undefined && typeof session.lastEvent !== 'string') return false;
  if (session.lastStatusChange !== undefined && typeof session.lastStatusChange !== 'number')
    return false;
  if (session.lastActivity !== undefined && typeof session.lastActivity !== 'string') return false;
  if (session.archivedAt !== undefined && typeof session.archivedAt !== 'number') return false;
  if (session.environmentId !== undefined && typeof session.environmentId !== 'string')
    return false;

  return true;
}

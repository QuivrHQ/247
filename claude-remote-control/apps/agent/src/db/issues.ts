import { randomUUID } from 'node:crypto';
import { getDatabase } from './index.js';
import type { DbIssue, CreateIssueInput, UpdateIssueInput } from './schema.js';
import type { Issue, IssueStatus, IssuePriority } from '247-shared';

/**
 * Convert DB row to Issue interface
 */
function toIssue(row: DbIssue): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority as IssuePriority,
    sessionName: row.session_name,
    plan: row.plan,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Get an issue by ID
 */
export function getIssue(id: string): Issue | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as DbIssue | undefined;
  return row ? toIssue(row) : null;
}

/**
 * Get all issues
 */
export function getAllIssues(): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM issues ORDER BY order_index ASC, created_at DESC')
    .all() as DbIssue[];
  return rows.map(toIssue);
}

/**
 * Get issues by project
 */
export function getIssuesByProject(projectId: string): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM issues WHERE project_id = ? ORDER BY order_index ASC, created_at DESC')
    .all(projectId) as DbIssue[];
  return rows.map(toIssue);
}

/**
 * Get standalone issues (no project)
 */
export function getStandaloneIssues(): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM issues WHERE project_id IS NULL ORDER BY order_index ASC, created_at DESC')
    .all() as DbIssue[];
  return rows.map(toIssue);
}

/**
 * Get issues by status
 */
export function getIssuesByStatus(status: IssueStatus): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM issues WHERE status = ? ORDER BY order_index ASC, created_at DESC')
    .all(status) as DbIssue[];
  return rows.map(toIssue);
}

/**
 * Get issues by status for a project
 */
export function getIssuesByProjectAndStatus(projectId: string, status: IssueStatus): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM issues WHERE project_id = ? AND status = ? ORDER BY order_index ASC')
    .all(projectId, status) as DbIssue[];
  return rows.map(toIssue);
}

/**
 * Get issue by session name
 */
export function getIssueBySession(sessionName: string): Issue | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM issues WHERE session_name = ?')
    .get(sessionName) as DbIssue | undefined;
  return row ? toIssue(row) : null;
}

/**
 * Get max order index for a project (or standalone issues)
 */
function getMaxOrderIndex(projectId: string | null): number {
  const db = getDatabase();
  let result;
  if (projectId) {
    result = db
      .prepare('SELECT MAX(order_index) as max_order FROM issues WHERE project_id = ?')
      .get(projectId) as { max_order: number | null };
  } else {
    result = db
      .prepare('SELECT MAX(order_index) as max_order FROM issues WHERE project_id IS NULL')
      .get() as { max_order: number | null };
  }
  return result?.max_order ?? -1;
}

/**
 * Create a new issue
 */
export function createIssue(input: CreateIssueInput): Issue {
  const db = getDatabase();
  const now = Date.now();
  const id = randomUUID();
  const orderIndex = getMaxOrderIndex(input.projectId ?? null) + 1;

  const stmt = db.prepare(`
    INSERT INTO issues (
      id, project_id, title, description, status, priority,
      plan, order_index, created_at, updated_at
    )
    VALUES (
      @id, @projectId, @title, @description, @status, @priority,
      @plan, @orderIndex, @createdAt, @updatedAt
    )
  `);

  stmt.run({
    id,
    projectId: input.projectId ?? null,
    title: input.title,
    description: input.description ?? null,
    status: 'backlog',
    priority: input.priority ?? 0,
    plan: input.plan ?? null,
    orderIndex,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[DB] Created issue: ${input.title} (${id})`);
  return getIssue(id)!;
}

/**
 * Create multiple issues (for batch creation from plan)
 */
export function createIssues(projectId: string | null, issues: CreateIssueInput[]): Issue[] {
  const db = getDatabase();
  const now = Date.now();
  let orderIndex = getMaxOrderIndex(projectId) + 1;

  const stmt = db.prepare(`
    INSERT INTO issues (
      id, project_id, title, description, status, priority,
      plan, order_index, created_at, updated_at
    )
    VALUES (
      @id, @projectId, @title, @description, @status, @priority,
      @plan, @orderIndex, @createdAt, @updatedAt
    )
  `);

  const createdIssues: Issue[] = [];

  const insertMany = db.transaction(() => {
    for (const input of issues) {
      const id = randomUUID();
      stmt.run({
        id,
        projectId,
        title: input.title,
        description: input.description ?? null,
        status: 'backlog',
        priority: input.priority ?? 0,
        plan: input.plan ?? null,
        orderIndex: orderIndex++,
        createdAt: now,
        updatedAt: now,
      });
      createdIssues.push(getIssue(id)!);
    }
  });

  insertMany();
  console.log(`[DB] Created ${createdIssues.length} issues for project ${projectId ?? 'standalone'}`);
  return createdIssues;
}

/**
 * Update an issue
 */
export function updateIssue(id: string, input: UpdateIssueInput): Issue | null {
  const db = getDatabase();
  const now = Date.now();

  const existing = getIssue(id);
  if (!existing) {
    return null;
  }

  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, unknown> = { id, updatedAt: now };

  if (input.title !== undefined) {
    updates.push('title = @title');
    params.title = input.title;
  }
  if (input.description !== undefined) {
    updates.push('description = @description');
    params.description = input.description;
  }
  if (input.status !== undefined) {
    updates.push('status = @status');
    params.status = input.status;
    // Set completed_at when marking as done
    if (input.status === 'done' && existing.status !== 'done') {
      updates.push('completed_at = @completedAt');
      params.completedAt = now;
    } else if (input.status !== 'done' && existing.status === 'done') {
      // Clear completed_at if moving out of done
      updates.push('completed_at = NULL');
    }
  }
  if (input.priority !== undefined) {
    updates.push('priority = @priority');
    params.priority = input.priority;
  }
  if (input.sessionName !== undefined) {
    updates.push('session_name = @sessionName');
    params.sessionName = input.sessionName;
  }
  if (input.plan !== undefined) {
    updates.push('plan = @plan');
    params.plan = input.plan;
  }
  if (input.orderIndex !== undefined) {
    updates.push('order_index = @orderIndex');
    params.orderIndex = input.orderIndex;
  }

  const stmt = db.prepare(`
    UPDATE issues SET ${updates.join(', ')}
    WHERE id = @id
  `);

  stmt.run(params);
  console.log(`[DB] Updated issue: ${id}`);
  return getIssue(id);
}

/**
 * Update issue status
 */
export function updateIssueStatus(id: string, status: IssueStatus): boolean {
  const db = getDatabase();
  const now = Date.now();

  const existing = getIssue(id);
  if (!existing) {
    return false;
  }

  let completedAt: number | null = existing.completedAt;
  if (status === 'done' && existing.status !== 'done') {
    completedAt = now;
  } else if (status !== 'done') {
    completedAt = null;
  }

  const result = db
    .prepare(`
      UPDATE issues SET
        status = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(status, completedAt, now, id);

  if (result.changes > 0) {
    console.log(`[DB] Updated issue status: ${id} -> ${status}`);
  }
  return result.changes > 0;
}

/**
 * Link issue to session
 */
export function linkIssueToSession(id: string, sessionName: string): boolean {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(`
      UPDATE issues SET
        session_name = ?,
        status = 'in_progress',
        updated_at = ?
      WHERE id = ?
    `)
    .run(sessionName, now, id);

  if (result.changes > 0) {
    console.log(`[DB] Linked issue ${id} to session ${sessionName}`);
  }
  return result.changes > 0;
}

/**
 * Unlink issue from session
 */
export function unlinkIssueFromSession(id: string): boolean {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(`
      UPDATE issues SET
        session_name = NULL,
        updated_at = ?
      WHERE id = ?
    `)
    .run(now, id);

  return result.changes > 0;
}

/**
 * Complete an issue
 */
export function completeIssue(id: string): Issue | null {
  const db = getDatabase();
  const now = Date.now();

  const existing = getIssue(id);
  if (!existing) {
    return null;
  }

  db.prepare(`
    UPDATE issues SET
      status = 'done',
      session_name = NULL,
      completed_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(now, now, id);

  console.log(`[DB] Completed issue: ${id}`);
  return getIssue(id);
}

/**
 * Delete an issue
 */
export function deleteIssue(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM issues WHERE id = ?').run(id);
  if (result.changes > 0) {
    console.log(`[DB] Deleted issue: ${id}`);
  }
  return result.changes > 0;
}

/**
 * Delete all issues for a project
 */
export function deleteIssuesByProject(projectId: string): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM issues WHERE project_id = ?').run(projectId);
  if (result.changes > 0) {
    console.log(`[DB] Deleted ${result.changes} issues for project ${projectId}`);
  }
  return result.changes;
}

/**
 * Reorder issues within a project/standalone group
 */
export function reorderIssues(issueIds: string[]): boolean {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE issues SET order_index = ?, updated_at = ?
    WHERE id = ?
  `);

  const reorder = db.transaction(() => {
    issueIds.forEach((id, index) => {
      stmt.run(index, now, id);
    });
  });

  reorder();
  console.log(`[DB] Reordered ${issueIds.length} issues`);
  return true;
}

/**
 * Move issue to different project
 */
export function moveIssueToProject(id: string, projectId: string | null): Issue | null {
  const db = getDatabase();
  const now = Date.now();
  const orderIndex = getMaxOrderIndex(projectId) + 1;

  const result = db
    .prepare(`
      UPDATE issues SET
        project_id = ?,
        order_index = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(projectId, orderIndex, now, id);

  if (result.changes === 0) {
    return null;
  }

  console.log(`[DB] Moved issue ${id} to project ${projectId ?? 'standalone'}`);
  return getIssue(id);
}

/**
 * Get count of issues by status for a project
 */
export function getIssueCountsByProject(projectId: string): Record<IssueStatus, number> {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT status, COUNT(*) as count
      FROM issues
      WHERE project_id = ?
      GROUP BY status
    `)
    .all(projectId) as { status: IssueStatus; count: number }[];

  const counts: Record<IssueStatus, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    done: 0,
  };

  for (const row of rows) {
    counts[row.status] = row.count;
  }

  return counts;
}

/**
 * Get in-progress issues (issues that have active sessions)
 */
export function getInProgressIssues(): Issue[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM issues WHERE status = 'in_progress' ORDER BY updated_at DESC")
    .all() as DbIssue[];
  return rows.map(toIssue);
}

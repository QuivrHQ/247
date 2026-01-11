import { randomUUID } from 'node:crypto';
import { getDatabase } from './index.js';
import type { DbProject, CreateProjectInput, UpdateProjectInput } from './schema.js';
import type { Project, ProjectStatus } from '247-shared';

/**
 * Convert DB row to Project interface
 */
function toProject(row: DbProject): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    trustMode: row.trust_mode === 1,
    worktreePath: row.worktree_path,
    branchName: row.branch_name,
    plan: row.plan,
    baseProject: row.base_project,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

/**
 * Get a project by ID
 */
export function getProject(id: string): Project | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject | undefined;
  return row ? toProject(row) : null;
}

/**
 * Get all active (non-archived) projects
 */
export function getAllProjects(): Project[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC')
    .all() as DbProject[];
  return rows.map(toProject);
}

/**
 * Get all archived projects
 */
export function getArchivedProjects(): Project[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM projects WHERE archived_at IS NOT NULL ORDER BY archived_at DESC')
    .all() as DbProject[];
  return rows.map(toProject);
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): Project[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM projects WHERE status = ? AND archived_at IS NULL ORDER BY updated_at DESC')
    .all(status) as DbProject[];
  return rows.map(toProject);
}

/**
 * Get projects by base project (whitelist reference)
 */
export function getProjectsByBaseProject(baseProject: string): Project[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM projects WHERE base_project = ? ORDER BY updated_at DESC')
    .all(baseProject) as DbProject[];
  return rows.map(toProject);
}

/**
 * Create a new project
 */
export function createProject(input: CreateProjectInput): Project {
  const db = getDatabase();
  const now = Date.now();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO projects (
      id, name, description, status, trust_mode,
      base_project, created_at, updated_at
    )
    VALUES (
      @id, @name, @description, @status, @trustMode,
      @baseProject, @createdAt, @updatedAt
    )
  `);

  stmt.run({
    id,
    name: input.name,
    description: input.description ?? null,
    status: 'planning',
    trustMode: input.trustMode ? 1 : 0,
    baseProject: input.baseProject,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[DB] Created project: ${input.name} (${id})`);
  return getProject(id)!;
}

/**
 * Update a project
 */
export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const db = getDatabase();
  const now = Date.now();

  const existing = getProject(id);
  if (!existing) {
    return null;
  }

  const updates: string[] = ['updated_at = @updatedAt'];
  const params: Record<string, unknown> = { id, updatedAt: now };

  if (input.name !== undefined) {
    updates.push('name = @name');
    params.name = input.name;
  }
  if (input.description !== undefined) {
    updates.push('description = @description');
    params.description = input.description;
  }
  if (input.status !== undefined) {
    updates.push('status = @status');
    params.status = input.status;
  }
  if (input.trustMode !== undefined) {
    updates.push('trust_mode = @trustMode');
    params.trustMode = input.trustMode ? 1 : 0;
  }
  if (input.worktreePath !== undefined) {
    updates.push('worktree_path = @worktreePath');
    params.worktreePath = input.worktreePath;
  }
  if (input.branchName !== undefined) {
    updates.push('branch_name = @branchName');
    params.branchName = input.branchName;
  }
  if (input.plan !== undefined) {
    updates.push('plan = @plan');
    params.plan = input.plan;
  }

  const stmt = db.prepare(`
    UPDATE projects SET ${updates.join(', ')}
    WHERE id = @id
  `);

  stmt.run(params);
  console.log(`[DB] Updated project: ${id}`);
  return getProject(id);
}

/**
 * Update project status
 */
export function updateProjectStatus(id: string, status: ProjectStatus): boolean {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(`
      UPDATE projects SET
        status = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(status, now, id);

  if (result.changes > 0) {
    console.log(`[DB] Updated project status: ${id} -> ${status}`);
  }
  return result.changes > 0;
}

/**
 * Update project plan
 */
export function updateProjectPlan(id: string, plan: string): boolean {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(`
      UPDATE projects SET
        plan = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(plan, now, id);

  return result.changes > 0;
}

/**
 * Update project worktree info
 */
export function updateProjectWorktree(
  id: string,
  worktreePath: string,
  branchName: string
): boolean {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(`
      UPDATE projects SET
        worktree_path = ?,
        branch_name = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(worktreePath, branchName, now, id);

  return result.changes > 0;
}

/**
 * Archive a project
 */
export function archiveProject(id: string): Project | null {
  const db = getDatabase();
  const now = Date.now();

  const existing = getProject(id);
  if (!existing) {
    return null;
  }

  if (existing.archivedAt) {
    return existing;
  }

  db.prepare(`
    UPDATE projects SET
      archived_at = ?,
      status = 'archived',
      updated_at = ?
    WHERE id = ?
  `).run(now, now, id);

  console.log(`[DB] Archived project: ${id}`);
  return getProject(id);
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  if (result.changes > 0) {
    console.log(`[DB] Deleted project: ${id}`);
  }
  return result.changes > 0;
}

/**
 * Get project with issue counts
 */
export function getProjectWithCounts(id: string): Project | null {
  const db = getDatabase();

  const row = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM issues WHERE project_id = p.id) as issue_count,
      (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'done') as issues_done
    FROM projects p
    WHERE p.id = ?
  `).get(id) as (DbProject & { issue_count: number; issues_done: number }) | undefined;

  if (!row) {
    return null;
  }

  const project = toProject(row);
  project.issueCount = row.issue_count;
  project.issuesDone = row.issues_done;
  return project;
}

/**
 * Get all projects with issue counts
 */
export function getAllProjectsWithCounts(): Project[] {
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM issues WHERE project_id = p.id) as issue_count,
      (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'done') as issues_done
    FROM projects p
    WHERE p.archived_at IS NULL
    ORDER BY p.updated_at DESC
  `).all() as (DbProject & { issue_count: number; issues_done: number })[];

  return rows.map((row) => {
    const project = toProject(row);
    project.issueCount = row.issue_count;
    project.issuesDone = row.issues_done;
    return project;
  });
}

/**
 * Cleanup old archived projects
 */
export function cleanupArchivedProjects(maxAgeMs: number): number {
  const db = getDatabase();
  const cutoff = Date.now() - maxAgeMs;

  const result = db
    .prepare('DELETE FROM projects WHERE archived_at IS NOT NULL AND archived_at < ?')
    .run(cutoff);

  if (result.changes > 0) {
    console.log(`[DB] Cleaned up ${result.changes} old archived projects`);
  }

  return result.changes;
}

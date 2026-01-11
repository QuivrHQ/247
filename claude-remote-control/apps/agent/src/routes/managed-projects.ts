/**
 * Managed Projects API routes: CRUD operations for Project entities.
 * These are the Linear-like project management entities, not filesystem projects.
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import {
  getProject,
  getAllProjectsWithCounts,
  getArchivedProjects,
  getProjectsByStatus,
  createProject,
  updateProject,
  updateProjectStatus,
  updateProjectPlan,
  archiveProject,
  deleteProject,
} from '../db/projects.js';
import { getIssuesByProject, createIssues } from '../db/issues.js';
import { generatePlanningPrompt } from '../lib/planning-prompt.js';
import type { CreateProjectRequest, UpdateProjectRequest, ProjectStatus } from '247-shared';

// Helper to check if a folder exists in basePath
function isValidBaseProject(projectName: string): boolean {
  const basePath = config.projects.basePath.replace('~', process.env.HOME || '');
  const projectPath = path.join(basePath, projectName);
  try {
    return fs.existsSync(projectPath) && fs.statSync(projectPath).isDirectory();
  } catch {
    return false;
  }
}

export function createManagedProjectRoutes(): Router {
  const router = Router();

  // List all projects (with issue counts)
  router.get('/', (req, res) => {
    const includeArchived = req.query.archived === 'true';
    const status = req.query.status as ProjectStatus | undefined;

    if (status) {
      res.json({
        success: true,
        projects: getProjectsByStatus(status),
      });
    } else if (includeArchived) {
      res.json({
        success: true,
        projects: [...getAllProjectsWithCounts(), ...getArchivedProjects()],
      });
    } else {
      res.json({
        success: true,
        projects: getAllProjectsWithCounts(),
      });
    }
  });

  // Get single project with issues
  router.get('/:id', (req, res) => {
    const project = getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const issues = getIssuesByProject(req.params.id);
    res.json({
      success: true,
      project,
      issues,
    });
  });

  // Create project
  router.post('/', (req, res) => {
    const body = req.body as CreateProjectRequest;

    if (!body.name) {
      return res.status(400).json({ success: false, error: 'Missing required field: name' });
    }

    if (!body.baseProject) {
      return res.status(400).json({ success: false, error: 'Missing required field: baseProject' });
    }

    // Validate baseProject exists as a folder in basePath
    if (!isValidBaseProject(body.baseProject)) {
      return res.status(400).json({
        success: false,
        error: `Invalid baseProject: ${body.baseProject}. Folder does not exist in ${config.projects.basePath}`,
      });
    }

    try {
      const project = createProject({
        name: body.name,
        description: body.description ?? null,
        trustMode: body.trustMode ?? false,
        baseProject: body.baseProject,
      });

      res.status(201).json({
        success: true,
        project,
      });
    } catch (err) {
      console.error('[ManagedProjects] Create error:', err);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  });

  // Update project
  router.patch('/:id', (req, res) => {
    const body = req.body as UpdateProjectRequest;

    const updated = updateProject(req.params.id, {
      name: body.name,
      description: body.description,
      status: body.status,
      trustMode: body.trustMode,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      project: updated,
    });
  });

  // Update project status
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body as { status: ProjectStatus };

    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing required field: status' });
    }

    const success = updateProjectStatus(req.params.id, status);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      project: getProject(req.params.id),
    });
  });

  // Update project plan
  router.patch('/:id/plan', (req, res) => {
    const { plan } = req.body as { plan: string };

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Missing required field: plan' });
    }

    const success = updateProjectPlan(req.params.id, plan);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      project: getProject(req.params.id),
    });
  });

  // Archive project
  router.post('/:id/archive', (req, res) => {
    const archived = archiveProject(req.params.id);
    if (!archived) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      project: archived,
    });
  });

  // Delete project
  router.delete('/:id', (req, res) => {
    const deleted = deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true });
  });

  // Get issues for project
  router.get('/:id/issues', (req, res) => {
    const project = getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const issues = getIssuesByProject(req.params.id);
    res.json({
      success: true,
      issues,
    });
  });

  // Batch create issues for project (from plan)
  router.post('/:id/issues/batch', (req, res) => {
    const project = getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { issues: issueSpecs } = req.body as {
      issues: Array<{
        title: string;
        description?: string;
        priority?: number;
        plan?: string;
      }>;
    };

    if (!issueSpecs || !Array.isArray(issueSpecs)) {
      return res.status(400).json({ success: false, error: 'Missing required field: issues (array)' });
    }

    try {
      const createdIssues = createIssues(
        req.params.id,
        issueSpecs.map((spec) => ({
          title: spec.title,
          description: spec.description,
          priority: (spec.priority ?? 0) as 0 | 1 | 2 | 3 | 4,
          plan: spec.plan,
        }))
      );

      // Update project status to active if it was planning
      if (project.status === 'planning') {
        updateProjectStatus(req.params.id, 'active');
      }

      res.status(201).json({
        success: true,
        issues: createdIssues,
      });
    } catch (err) {
      console.error('[ManagedProjects] Batch create issues error:', err);
      res.status(500).json({ success: false, error: 'Failed to create issues' });
    }
  });

  // Start planning session - returns info needed to launch a Claude session with planning prompt
  router.post('/:id/start-planning', (req, res) => {
    const project = getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!project.baseProject) {
      return res.status(400).json({ success: false, error: 'Project has no baseProject configured' });
    }

    // Generate session name from project name
    const sessionName = `planning-${project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

    // Get the codebase path
    const basePath = config.projects.basePath.replace('~', process.env.HOME || '');
    const projectPath = path.join(basePath, project.baseProject);

    // Generate the planning prompt
    const agentPort = config.agent?.port ?? 4678;
    const prompt = generatePlanningPrompt(
      project.id,
      project.name,
      project.description ?? '',
      `http://localhost:${agentPort}`
    );

    res.json({
      success: true,
      sessionName,
      projectPath,
      baseProject: project.baseProject,
      prompt,
    });
  });

  return router;
}

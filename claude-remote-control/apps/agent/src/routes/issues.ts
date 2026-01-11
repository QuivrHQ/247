/**
 * Issues API routes: CRUD operations for Issue entities.
 */

import { Router } from 'express';
import {
  getIssue,
  getAllIssues,
  getIssuesByProject,
  getStandaloneIssues,
  getIssuesByStatus,
  getIssueBySession,
  createIssue,
  updateIssue,
  updateIssueStatus,
  linkIssueToSession,
  unlinkIssueFromSession,
  completeIssue,
  deleteIssue,
  reorderIssues,
  moveIssueToProject,
} from '../db/issues.js';
import { getProject, updateProjectStatus } from '../db/projects.js';
import type { CreateIssueRequest, UpdateIssueRequest, IssueStatus } from '247-shared';

export function createIssueRoutes(): Router {
  const router = Router();

  // List all issues (with filters)
  router.get('/', (req, res) => {
    const { projectId, status, standalone } = req.query;

    let issues;
    if (standalone === 'true') {
      issues = getStandaloneIssues();
    } else if (projectId && typeof projectId === 'string') {
      issues = getIssuesByProject(projectId);
    } else if (status && typeof status === 'string') {
      issues = getIssuesByStatus(status as IssueStatus);
    } else {
      issues = getAllIssues();
    }

    res.json({
      success: true,
      issues,
    });
  });

  // Get single issue
  router.get('/:id', (req, res) => {
    const issue = getIssue(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    // Include project if exists
    let project = null;
    if (issue.projectId) {
      project = getProject(issue.projectId);
    }

    res.json({
      success: true,
      issue: { ...issue, project },
    });
  });

  // Get issue by session name
  router.get('/by-session/:sessionName', (req, res) => {
    const issue = getIssueBySession(req.params.sessionName);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found for session' });
    }

    res.json({
      success: true,
      issue,
    });
  });

  // Create standalone issue
  router.post('/', (req, res) => {
    const body = req.body as CreateIssueRequest;

    if (!body.title) {
      return res.status(400).json({ success: false, error: 'Missing required field: title' });
    }

    // Validate project exists if projectId provided
    if (body.projectId) {
      const project = getProject(body.projectId);
      if (!project) {
        return res.status(400).json({ success: false, error: 'Project not found' });
      }
    }

    try {
      const issue = createIssue({
        projectId: body.projectId ?? null,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        plan: body.plan ?? null,
      });

      res.status(201).json({
        success: true,
        issue,
      });
    } catch (err) {
      console.error('[Issues] Create error:', err);
      res.status(500).json({ success: false, error: 'Failed to create issue' });
    }
  });

  // Update issue
  router.patch('/:id', (req, res) => {
    const body = req.body as UpdateIssueRequest;

    const updated = updateIssue(req.params.id, {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      plan: body.plan,
      orderIndex: body.orderIndex,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({
      success: true,
      issue: updated,
    });
  });

  // Update issue status
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body as { status: IssueStatus };

    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing required field: status' });
    }

    const success = updateIssueStatus(req.params.id, status);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    const issue = getIssue(req.params.id);

    // Check if all issues in project are done -> update project status
    if (issue?.projectId && status === 'done') {
      const projectIssues = getIssuesByProject(issue.projectId);
      const allDone = projectIssues.every((i) => i.status === 'done');
      if (allDone) {
        updateProjectStatus(issue.projectId, 'completed');
      }
    }

    res.json({
      success: true,
      issue,
    });
  });

  // Launch issue (create terminal session)
  router.post('/:id/launch', async (req, res) => {
    const issue = getIssue(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    if (issue.sessionName) {
      return res.status(400).json({
        success: false,
        error: 'Issue already has an active session',
        sessionName: issue.sessionName,
      });
    }

    // This endpoint returns info for the client to create a terminal connection
    // The actual session will be created when connecting to the WebSocket
    res.json({
      success: true,
      issue,
      message: 'Issue ready to launch. Connect to terminal WebSocket with issueId parameter.',
    });
  });

  // Link issue to session (called by terminal WebSocket handler)
  router.post('/:id/link-session', (req, res) => {
    const { sessionName } = req.body as { sessionName: string };

    if (!sessionName) {
      return res.status(400).json({ success: false, error: 'Missing required field: sessionName' });
    }

    const success = linkIssueToSession(req.params.id, sessionName);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({
      success: true,
      issue: getIssue(req.params.id),
    });
  });

  // Unlink issue from session
  router.post('/:id/unlink-session', (req, res) => {
    const success = unlinkIssueFromSession(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({
      success: true,
      issue: getIssue(req.params.id),
    });
  });

  // Complete issue
  router.post('/:id/complete', (req, res) => {
    const completed = completeIssue(req.params.id);
    if (!completed) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    // Check if all issues in project are done -> update project status
    if (completed.projectId) {
      const projectIssues = getIssuesByProject(completed.projectId);
      const allDone = projectIssues.every((i) => i.status === 'done');
      if (allDone) {
        updateProjectStatus(completed.projectId, 'completed');
      }
    }

    res.json({
      success: true,
      issue: completed,
    });
  });

  // Delete issue
  router.delete('/:id', (req, res) => {
    const deleted = deleteIssue(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({ success: true });
  });

  // Reorder issues
  router.post('/reorder', (req, res) => {
    const { issueIds } = req.body as { issueIds: string[] };

    if (!issueIds || !Array.isArray(issueIds)) {
      return res.status(400).json({ success: false, error: 'Missing required field: issueIds (array)' });
    }

    const success = reorderIssues(issueIds);
    res.json({ success });
  });

  // Move issue to different project
  router.post('/:id/move', (req, res) => {
    const { projectId } = req.body as { projectId: string | null };

    // Validate project exists if projectId provided
    if (projectId) {
      const project = getProject(projectId);
      if (!project) {
        return res.status(400).json({ success: false, error: 'Target project not found' });
      }
    }

    const moved = moveIssueToProject(req.params.id, projectId);
    if (!moved) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({
      success: true,
      issue: moved,
    });
  });

  return router;
}

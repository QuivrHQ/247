/**
 * Editor API routes: start/stop code-server, status checks.
 */

import { Router } from 'express';
import type { AgentConfig } from '247-shared';
import { config } from '../config.js';
import {
  getOrStartEditor,
  stopEditor,
  getEditorStatus,
  getAllEditors,
  updateEditorActivity,
} from '../editor.js';

// Helper to check if project is allowed (whitelist empty = allow any)
export function isProjectAllowed(project: string): boolean {
  const whitelist = config.projects.whitelist as string[];
  const hasWhitelist = whitelist && whitelist.length > 0;
  return hasWhitelist ? whitelist.includes(project) : true;
}

export function createEditorRoutes(): Router {
  const router = Router();
  const typedConfig = config as unknown as AgentConfig;

  // Get editor status for a project
  router.get('/:project/status', (req, res) => {
    const { project } = req.params;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    res.json(getEditorStatus(project));
  });

  // Start editor for a project
  router.post('/:project/start', async (req, res) => {
    const { project } = req.params;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    if (!typedConfig.editor?.enabled) {
      return res.status(400).json({ error: 'Editor is disabled in config' });
    }

    try {
      const editor = await getOrStartEditor(project);
      res.json({
        success: true,
        port: editor.port,
        startedAt: editor.startedAt,
      });
    } catch (err) {
      console.error('[Editor] Failed to start:', err);
      res.status(500).json({ error: 'Failed to start editor', message: (err as Error).message });
    }
  });

  // Stop editor for a project
  router.post('/:project/stop', (req, res) => {
    const { project } = req.params;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    const stopped = stopEditor(project);
    res.json({ success: stopped });
  });

  // List all running editors
  router.get('/', (_req, res) => {
    res.json(getAllEditors());
  });

  return router;
}

// Export helper for proxy middleware
export { updateEditorActivity, getOrStartEditor };

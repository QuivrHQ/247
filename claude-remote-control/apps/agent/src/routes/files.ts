/**
 * File explorer API routes: list files, get content, open in editor.
 */

import { Router } from 'express';
import { listFiles, getFileContent, openFileInEditor, getChangesSummary } from '../git.js';
import { config } from '../config.js';
import { isProjectAllowed } from './editor.js';

export function createFilesRoutes(): Router {
  const router = Router();

  // Get files tree with git status for a project
  router.get('/:project', async (req, res) => {
    const { project } = req.params;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    try {
      const projectPath = `${config.projects.basePath}/${project}`.replace('~', process.env.HOME!);

      const fs = await import('fs');
      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const files = await listFiles(projectPath);
      const summary = await getChangesSummary(projectPath);

      res.json({ files, summary });
    } catch (err) {
      console.error('[Files] Failed to list files:', err);
      res.status(500).json({ error: 'Failed to list files', message: (err as Error).message });
    }
  });

  // Get content of a specific file
  router.get('/:project/content', async (req, res) => {
    const { project } = req.params;
    const { path: filePath } = req.query;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    if (filePath.includes('..') || filePath.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    try {
      const projectPath = `${config.projects.basePath}/${project}`.replace('~', process.env.HOME!);
      const content = await getFileContent(projectPath, filePath);

      res.json(content);
    } catch (err) {
      console.error('[Files] Failed to get file content:', err);
      res.status(500).json({ error: 'Failed to read file', message: (err as Error).message });
    }
  });

  // Open a file in the local editor
  router.post('/:project/open', async (req, res) => {
    const { project } = req.params;
    const { path: filePath } = req.body;

    if (!isProjectAllowed(project)) {
      return res.status(403).json({ error: 'Project not allowed' });
    }

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'Missing path in body' });
    }

    if (filePath.includes('..') || filePath.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    try {
      const projectPath = `${config.projects.basePath}/${project}`.replace('~', process.env.HOME!);
      const result = await openFileInEditor(projectPath, filePath);

      if (result.success) {
        res.json({ success: true, command: result.command });
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      console.error('[Files] Failed to open file:', err);
      res.status(500).json({ error: 'Failed to open file', message: (err as Error).message });
    }
  });

  return router;
}

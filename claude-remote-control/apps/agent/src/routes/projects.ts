/**
 * Project-related API routes: listing, cloning, folder scanning.
 */

import { Router } from 'express';
import { cloneRepo, extractProjectName } from '../git.js';
import { config } from '../config.js';

export function createProjectRoutes(): Router {
  const router = Router();

  // List whitelisted projects
  router.get('/projects', (_req, res) => {
    res.json(config.projects.whitelist);
  });

  // Dynamic folder listing - scans basePath for directories
  router.get('/folders', async (_req, res) => {
    try {
      const fs = await import('fs/promises');
      const basePath = config.projects.basePath.replace('~', process.env.HOME!);

      const entries = await fs.readdir(basePath, { withFileTypes: true });
      const folders = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort();

      res.json(folders);
    } catch (err) {
      console.error('Failed to list folders:', err);
      res.status(500).json({ error: 'Failed to list folders' });
    }
  });

  // Clone a git repository
  router.post('/clone', async (req, res) => {
    const { repoUrl, projectName } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Missing repoUrl' });
    }

    try {
      const result = await cloneRepo(repoUrl, config.projects.basePath, projectName);

      if (result.success) {
        res.json({
          success: true,
          projectName: result.projectName,
          path: result.path,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          projectName: result.projectName,
        });
      }
    } catch (err) {
      console.error('Clone error:', err);
      res.status(500).json({ error: 'Internal server error during clone' });
    }
  });

  // Preview what project name would be extracted from a URL
  router.get('/clone/preview', (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    const projectName = extractProjectName(url);
    res.json({ projectName });
  });

  return router;
}

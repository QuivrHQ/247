/**
 * Environment API routes: CRUD operations for environment configurations.
 */

import { Router } from 'express';
import {
  getEnvironmentsMetadata,
  getEnvironmentMetadata,
  getEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../db/environments.js';

export function createEnvironmentRoutes(): Router {
  const router = Router();

  // List all environments (metadata only - no secret values)
  router.get('/', (_req, res) => {
    res.json(getEnvironmentsMetadata());
  });

  // Get single environment metadata
  router.get('/:id', (req, res) => {
    const metadata = getEnvironmentMetadata(req.params.id);
    if (!metadata) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json(metadata);
  });

  // Get full environment data (including secret values) - for local editing only
  router.get('/:id/full', (req, res) => {
    const env = getEnvironment(req.params.id);
    if (!env) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json(env);
  });

  // Create environment
  router.post('/', (req, res) => {
    const { name, provider, icon, isDefault, variables } = req.body;

    if (!name || !provider) {
      return res.status(400).json({ error: 'Missing required fields: name, provider' });
    }

    try {
      const env = createEnvironment({
        name,
        provider,
        icon,
        isDefault,
        variables: variables ?? {},
      });
      // Return metadata only (not the actual secrets)
      res.status(201).json({
        id: env.id,
        name: env.name,
        provider: env.provider,
        icon: env.icon,
        isDefault: env.isDefault,
        variableKeys: Object.keys(env.variables),
        createdAt: env.createdAt,
        updatedAt: env.updatedAt,
      });
    } catch (err) {
      console.error('[Environments] Create error:', err);
      res.status(500).json({ error: 'Failed to create environment' });
    }
  });

  // Update environment
  router.put('/:id', (req, res) => {
    const { name, provider, icon, isDefault, variables } = req.body;

    const updated = updateEnvironment(req.params.id, {
      name,
      provider,
      icon,
      isDefault,
      variables,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Return metadata only
    res.json({
      id: updated.id,
      name: updated.name,
      provider: updated.provider,
      icon: updated.icon,
      isDefault: updated.isDefault,
      variableKeys: Object.keys(updated.variables),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });

  // Delete environment
  router.delete('/:id', (req, res) => {
    const deleted = deleteEnvironment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json({ success: true });
  });

  return router;
}

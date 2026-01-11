/**
 * Hook for fetching and managing projects
 */
import { useState, useEffect, useCallback } from 'react';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '247-shared';
import { buildApiUrl } from '@/lib/utils';

interface UseProjectsOptions {
  agentUrl: string;
  pollInterval?: number;
}

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
  archiveProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects({ agentUrl, pollInterval = 30000 }: UseProjectsOptions): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!agentUrl) return;

    try {
      const url = buildApiUrl(agentUrl, '/api/managed-projects');
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data.projects || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [agentUrl]);

  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project> => {
    const url = buildApiUrl(agentUrl, '/api/managed-projects');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to create project');
    }

    const result = await response.json();
    await fetchProjects(); // Refresh list
    return result.project;
  }, [agentUrl, fetchProjects]);

  const updateProject = useCallback(async (id: string, data: UpdateProjectRequest): Promise<Project> => {
    const url = buildApiUrl(agentUrl, `/api/managed-projects/${id}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to update project');
    }

    const result = await response.json();
    await fetchProjects(); // Refresh list
    return result.project;
  }, [agentUrl, fetchProjects]);

  const archiveProject = useCallback(async (id: string): Promise<void> => {
    const url = buildApiUrl(agentUrl, `/api/managed-projects/${id}/archive`);
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to archive project');
    }

    await fetchProjects();
  }, [agentUrl, fetchProjects]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const url = buildApiUrl(agentUrl, `/api/managed-projects/${id}`);
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to delete project');
    }

    await fetchProjects();
  }, [agentUrl, fetchProjects]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0 || !agentUrl) return;

    const interval = setInterval(fetchProjects, pollInterval);
    return () => clearInterval(interval);
  }, [fetchProjects, pollInterval, agentUrl]);

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
  };
}

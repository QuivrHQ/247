/**
 * Hook for fetching and managing issues
 */
import { useState, useEffect, useCallback } from 'react';
import type { Issue, IssueStatus, IssuePriority } from '247-shared';
import { buildApiUrl } from '@/lib/utils';

interface CreateIssueInput {
  projectId?: string | null;
  title: string;
  description?: string | null;
  priority?: IssuePriority;
  plan?: string | null;
}

interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  plan?: string | null;
}

interface UseIssuesOptions {
  agentUrl: string;
  projectId?: string | null;
  pollInterval?: number;
}

interface UseIssuesResult {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createIssue: (data: CreateIssueInput) => Promise<Issue>;
  updateIssue: (id: string, data: UpdateIssueInput) => Promise<Issue>;
  updateIssueStatus: (id: string, status: IssueStatus) => Promise<Issue>;
  launchIssue: (id: string, environmentId?: string) => Promise<{ sessionName: string }>;
  completeIssue: (id: string) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  reorderIssues: (issueIds: string[]) => Promise<void>;
  // Grouped by status for Kanban view
  issuesByStatus: Record<IssueStatus, Issue[]>;
}

export function useIssues({ agentUrl, projectId, pollInterval = 30000 }: UseIssuesOptions): UseIssuesResult {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!agentUrl) return;

    try {
      let url: string;
      if (projectId) {
        url = buildApiUrl(agentUrl, `/api/managed-projects/${projectId}/issues`);
      } else {
        url = buildApiUrl(agentUrl, '/api/issues');
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.statusText}`);
      }

      const data = await response.json();
      setIssues(data.issues || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  }, [agentUrl, projectId]);

  const createIssue = useCallback(async (data: CreateIssueInput): Promise<Issue> => {
    const url = buildApiUrl(agentUrl, '/api/issues');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to create issue');
    }

    const result = await response.json();
    await fetchIssues();
    return result.issue;
  }, [agentUrl, fetchIssues]);

  const updateIssue = useCallback(async (id: string, data: UpdateIssueInput): Promise<Issue> => {
    const url = buildApiUrl(agentUrl, `/api/issues/${id}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to update issue');
    }

    const result = await response.json();
    await fetchIssues();
    return result.issue;
  }, [agentUrl, fetchIssues]);

  const updateIssueStatus = useCallback(async (id: string, status: IssueStatus): Promise<Issue> => {
    const url = buildApiUrl(agentUrl, `/api/issues/${id}/status`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to update issue status');
    }

    const result = await response.json();
    await fetchIssues();
    return result.issue;
  }, [agentUrl, fetchIssues]);

  const launchIssue = useCallback(async (id: string, environmentId?: string): Promise<{ sessionName: string }> => {
    const url = buildApiUrl(agentUrl, `/api/issues/${id}/launch`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environmentId }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to launch issue');
    }

    const result = await response.json();
    await fetchIssues();
    return { sessionName: result.sessionName };
  }, [agentUrl, fetchIssues]);

  const completeIssue = useCallback(async (id: string): Promise<void> => {
    const url = buildApiUrl(agentUrl, `/api/issues/${id}/complete`);
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to complete issue');
    }

    await fetchIssues();
  }, [agentUrl, fetchIssues]);

  const deleteIssue = useCallback(async (id: string): Promise<void> => {
    const url = buildApiUrl(agentUrl, `/api/issues/${id}`);
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to delete issue');
    }

    await fetchIssues();
  }, [agentUrl, fetchIssues]);

  const reorderIssues = useCallback(async (issueIds: string[]): Promise<void> => {
    const url = buildApiUrl(agentUrl, '/api/issues/reorder');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueIds }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to reorder issues');
    }

    await fetchIssues();
  }, [agentUrl, fetchIssues]);

  // Initial fetch
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0 || !agentUrl) return;

    const interval = setInterval(fetchIssues, pollInterval);
    return () => clearInterval(interval);
  }, [fetchIssues, pollInterval, agentUrl]);

  // Group issues by status for Kanban view
  const issuesByStatus: Record<IssueStatus, Issue[]> = {
    backlog: issues.filter((i) => i.status === 'backlog'),
    todo: issues.filter((i) => i.status === 'todo'),
    in_progress: issues.filter((i) => i.status === 'in_progress'),
    done: issues.filter((i) => i.status === 'done'),
  };

  return {
    issues,
    loading,
    error,
    refresh: fetchIssues,
    createIssue,
    updateIssue,
    updateIssueStatus,
    launchIssue,
    completeIssue,
    deleteIssue,
    reorderIssues,
    issuesByStatus,
  };
}

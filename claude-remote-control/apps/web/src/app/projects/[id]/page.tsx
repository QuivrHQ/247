'use client';

/**
 * Project detail page - Shows project info and issues kanban board
 */
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  GitBranch,
  Clock,
  MoreHorizontal,
  Play,
  Archive,
  Trash2,
  Plus,
  Sparkles,
  Settings,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useProjects } from '@/hooks/useProjects';
import { useIssues } from '@/hooks/useIssues';
import { IssueBoard } from '@/components/issues/IssueBoard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/time';
import type { Project, Issue, IssueStatus } from '247-shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Get agent URL from localStorage
function getAgentUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('agentConnectionUrl') || 'http://localhost:4678';
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const agentUrl = getAgentUrl();

  const { projects, archiveProject, deleteProject } = useProjects({ agentUrl });
  const {
    issues,
    issuesByStatus,
    loading: issuesLoading,
    updateIssueStatus,
    launchIssue,
    deleteIssue,
    createIssue,
  } = useIssues({ agentUrl, projectId: id });

  const project = projects.find((p) => p.id === id);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueStatus, setNewIssueStatus] = useState<IssueStatus>('backlog');

  // Handle issue click - could open a sidebar or navigate
  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    // For now, we could show a detail panel
    // In the future, this could navigate to /issues/[id]
  };

  // Handle status change
  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      await updateIssueStatus(issueId, newStatus);
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  // Handle launch issue with Claude
  const handleLaunch = async (issueId: string) => {
    try {
      const result = await launchIssue(issueId);
      // Navigate to the session
      router.push(`/?session=${encodeURIComponent(result.sessionName)}`);
    } catch (err) {
      console.error('Failed to launch issue:', err);
    }
  };

  // Handle delete issue
  const handleDelete = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    try {
      await deleteIssue(issueId);
    } catch (err) {
      console.error('Failed to delete issue:', err);
    }
  };

  // Handle create issue
  const handleCreateIssue = (status: IssueStatus) => {
    setNewIssueStatus(status);
    setShowNewIssue(true);
  };

  // Handle archive project
  const handleArchive = async () => {
    if (!project) return;
    if (!confirm('Archive this project?')) return;
    try {
      await archiveProject(project.id);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to archive project:', err);
    }
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(project.id);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  // Handle continue planning - start a new planning session
  const handleContinuePlanning = async () => {
    if (!project) return;
    try {
      const res = await fetch(
        `${agentUrl}/api/managed-projects/${project.id}/start-planning`,
        { method: 'POST' }
      );

      if (res.ok) {
        const { sessionName, baseProject } = await res.json();
        // Navigate to home page with session and planning project ID
        // The agent will generate the prompt based on the project
        const params = new URLSearchParams({
          project: baseProject,
          session: sessionName,
          create: 'true',
          planningProjectId: project.id,
        });
        router.push(`/?${params.toString()}`);
      }
    } catch (err) {
      console.error('Failed to start planning session:', err);
    }
  };

  if (!agentUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Agent Connected</h2>
          <p className="text-zinc-400">Configure your agent connection first.</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <Link href="/projects" className="text-orange-400 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
            <Link href="/projects" className="hover:text-white transition-colors">
              Projects
            </Link>
            <span>/</span>
            <span className="text-white">{project.name}</span>
          </div>

          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/projects"
                className="p-2 rounded-lg hover:bg-white/5 transition-colors mt-1"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-display font-bold">{project.name}</h1>
                {project.description && (
                  <p className="text-zinc-400 mt-1 max-w-2xl">{project.description}</p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
                  {project.branchName && (
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4" />
                      <span>{project.branchName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Updated {formatDistanceToNow(project.updatedAt)}</span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      project.status === 'planning' && 'bg-purple-500/20 text-purple-300',
                      project.status === 'active' && 'bg-cyan-500/20 text-cyan-300',
                      project.status === 'completed' && 'bg-green-500/20 text-green-300',
                      project.status === 'archived' && 'bg-zinc-500/20 text-zinc-400'
                    )}
                  >
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {project.status === 'planning' && (
                <button
                  onClick={handleContinuePlanning}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
                    'hover:from-orange-600 hover:to-orange-700'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Continue Planning</span>
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-zinc-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {project.status !== 'archived' && (
                    <DropdownMenuItem
                      onClick={handleArchive}
                      className="flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDeleteProject}
                    className="flex items-center gap-2 text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Issues Board */}
      <main className="flex-1 overflow-hidden bg-zinc-950">
        {issuesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <IssueBoard
            issuesByStatus={issuesByStatus}
            onIssueClick={handleIssueClick}
            onStatusChange={handleStatusChange}
            onLaunch={handleLaunch}
            onDelete={handleDelete}
            onCreateIssue={handleCreateIssue}
          />
        )}
      </main>

      {/* New Issue Modal - Simple inline form for now */}
      {showNewIssue && (
        <NewIssueModal
          status={newIssueStatus}
          onClose={() => setShowNewIssue(false)}
          onCreate={async (title, description) => {
            await createIssue({
              projectId: id,
              title,
              description,
            });
            setShowNewIssue(false);
          }}
        />
      )}
    </div>
  );
}

// Simple inline modal for creating issues
function NewIssueModal({
  status,
  onClose,
  onCreate,
}: {
  status: IssueStatus;
  onClose: () => void;
  onCreate: (title: string, description?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(title.trim(), description.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-xl border border-white/10 p-4"
      >
        <h3 className="font-semibold mb-4">New Issue</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10',
              'text-white placeholder:text-zinc-500',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/50'
            )}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10',
              'text-white placeholder:text-zinc-500 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/50'
            )}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg bg-orange-500 text-white font-medium',
                'hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

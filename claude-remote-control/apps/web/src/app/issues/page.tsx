'use client';

/**
 * All Issues page - Global kanban board across all projects
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, ListTodo, Filter, LayoutGrid, List } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';
import { IssueBoard } from '@/components/issues/IssueBoard';
import { cn } from '@/lib/utils';
import type { Issue, IssueStatus } from '247-shared';

// Get agent URL from localStorage
function getAgentUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('agentConnectionUrl') || 'http://localhost:4678';
}

export default function IssuesPage() {
  const router = useRouter();
  const agentUrl = getAgentUrl();

  const {
    issues,
    issuesByStatus,
    loading,
    error,
    updateIssueStatus,
    launchIssue,
    deleteIssue,
    createIssue,
  } = useIssues({ agentUrl });

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueStatus, setNewIssueStatus] = useState<IssueStatus>('backlog');

  // Handle issue click
  const handleIssueClick = (issue: Issue) => {
    // Could navigate to issue detail or show panel
    console.log('Issue clicked:', issue);
  };

  // Handle status change
  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      await updateIssueStatus(issueId, newStatus);
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  // Handle launch with Claude
  const handleLaunch = async (issueId: string) => {
    try {
      const result = await launchIssue(issueId);
      router.push(`/?session=${encodeURIComponent(result.sessionName)}`);
    } catch (err) {
      console.error('Failed to launch issue:', err);
    }
  };

  // Handle delete
  const handleDelete = async (issueId: string) => {
    if (!confirm('Delete this issue?')) return;
    try {
      await deleteIssue(issueId);
    } catch (err) {
      console.error('Failed to delete issue:', err);
    }
  };

  // Handle create
  const handleCreateIssue = (status: IssueStatus) => {
    setNewIssueStatus(status);
    setShowNewIssue(true);
  };

  if (!agentUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ListTodo className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Agent Connected</h2>
          <p className="text-zinc-400">Configure your agent connection to view issues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">All Issues</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {issues.length} issues across all projects
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('board')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'board' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleCreateIssue('backlog')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-orange-500 hover:bg-orange-600 text-white'
                )}
              >
                <Plus className="w-4 h-4" />
                <span>New Issue</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden bg-zinc-950">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-400 mb-2">{error}</div>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ListTodo className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No issues yet</h2>
              <p className="text-zinc-400 mb-6">Create your first issue to get started</p>
              <button
                onClick={() => handleCreateIssue('backlog')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-orange-500 hover:bg-orange-600 text-white'
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Create Issue</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <IssueBoard
            issuesByStatus={issuesByStatus}
            onIssueClick={handleIssueClick}
            onStatusChange={handleStatusChange}
            onLaunch={handleLaunch}
            onDelete={handleDelete}
            onCreateIssue={handleCreateIssue}
          />
        ) : (
          /* List View */
          <div className="p-6 max-w-4xl mx-auto">
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => handleIssueClick(issue)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                    'bg-zinc-900/50 border-white/5 hover:bg-zinc-900 hover:border-white/10'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{issue.title}</h4>
                    {issue.description && (
                      <p className="text-sm text-zinc-500 truncate">{issue.description}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      issue.status === 'backlog' && 'bg-zinc-500/20 text-zinc-400',
                      issue.status === 'todo' && 'bg-zinc-500/20 text-zinc-300',
                      issue.status === 'in_progress' && 'bg-cyan-500/20 text-cyan-300',
                      issue.status === 'done' && 'bg-green-500/20 text-green-300'
                    )}
                  >
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New Issue Modal */}
      {showNewIssue && (
        <NewIssueModal
          onClose={() => setShowNewIssue(false)}
          onCreate={async (title, description) => {
            await createIssue({ title, description });
            setShowNewIssue(false);
          }}
        />
      )}
    </div>
  );
}

// Simple inline modal for creating issues
function NewIssueModal({
  onClose,
  onCreate,
}: {
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
        <h3 className="font-semibold mb-4">New Standalone Issue</h3>
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

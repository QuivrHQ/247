'use client';

/**
 * Projects list page - Linear-style project overview
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Search, SlidersHorizontal } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { cn } from '@/lib/utils';
import type { Project, ProjectStatus } from '247-shared';

// Get agent URL from localStorage
function getAgentUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('agentConnectionUrl') || 'http://localhost:4678';
}

// Get available codebases by scanning the basePath directory (same as New Session modal)
function useBaseProjects(agentUrl: string): string[] {
  const [baseProjects, setBaseProjects] = useState<string[]>([]);

  useEffect(() => {
    if (!agentUrl) return;

    // Use /api/folders which dynamically scans the projects directory
    fetch(`${agentUrl}/api/folders`)
      .then((res) => res.json())
      .then((data) => {
        setBaseProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => setBaseProjects([]));
  }, [agentUrl]);

  return baseProjects;
}

export default function ProjectsPage() {
  const agentUrl = getAgentUrl();
  const { projects, loading, error, createProject, archiveProject, deleteProject } = useProjects({
    agentUrl,
  });
  const baseProjects = useBaseProjects(agentUrl);

  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group by status
  const activeProjects = filteredProjects.filter((p) => p.status !== 'archived');
  const archivedProjects = filteredProjects.filter((p) => p.status === 'archived');


  if (!agentUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FolderKanban className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Agent Connected</h2>
          <p className="text-zinc-400">Configure your agent connection to view projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold">Projects</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage your development projects and track progress
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'bg-orange-500 hover:bg-orange-600 text-white'
              )}
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-800/50 border border-white/5',
                  'text-sm text-white placeholder:text-zinc-500',
                  'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50'
                )}
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              {(['all', 'planning', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    statusFilter === status
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-400 mb-2">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <FolderKanban className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h2>
              <p className="text-zinc-400 mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first project to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    'bg-orange-500 hover:bg-orange-600 text-white'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Projects */}
              {activeProjects.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                    Active Projects ({activeProjects.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onArchive={archiveProject}
                        onDelete={deleteProject}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Archived Projects */}
              {statusFilter === 'all' && archivedProjects.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                    Archived ({archivedProjects.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {archivedProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onDelete={deleteProject}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={createProject}
        baseProjects={baseProjects}
        agentUrl={agentUrl}
      />
    </div>
  );
}

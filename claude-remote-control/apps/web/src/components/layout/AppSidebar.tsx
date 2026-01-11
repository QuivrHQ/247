'use client';

/**
 * Linear-style sidebar navigation
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  ListTodo,
  Terminal,
  Settings,
  ChevronDown,
  Plus,
  Sparkles,
  Search,
} from 'lucide-react';
import type { Project } from '247-shared';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  projects: Project[];
  onNewProject: () => void;
  onSearch: () => void;
  className?: string;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, isActive, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        'hover:bg-white/5',
        isActive && 'bg-white/10 text-orange-400'
      )}
    >
      <span className="w-5 h-5 flex items-center justify-center opacity-70">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </Link>
  );
}

export function AppSidebar({ projects, onNewProject, onSearch, className }: AppSidebarProps) {
  const pathname = usePathname();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const planningProjects = projects.filter((p) => p.status === 'planning');

  return (
    <aside
      className={cn(
        'w-60 h-full flex flex-col bg-zinc-950 border-r border-white/5',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-lg">247</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-zinc-400 hover:bg-white/10 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <NavItem
          href="/"
          icon={<Terminal className="w-4 h-4" />}
          label="Sessions"
          isActive={pathname === '/'}
        />

        <NavItem
          href="/issues"
          icon={<ListTodo className="w-4 h-4" />}
          label="All Issues"
          isActive={pathname === '/issues'}
        />

        {/* Projects Section */}
        <div className="mt-4">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
          >
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                !projectsExpanded && '-rotate-90'
              )}
            />
            <span>Projects</span>
            <span className="ml-auto text-zinc-600">{activeProjects.length}</span>
          </button>

          <AnimatePresence>
            {projectsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 mt-1">
                  {activeProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        'hover:bg-white/5',
                        pathname === `/projects/${project.id}` && 'bg-white/10 text-orange-400'
                      )}
                    >
                      <FolderKanban className="w-4 h-4 opacity-50" />
                      <span className="truncate flex-1">{project.name}</span>
                      {project.status === 'planning' && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                          Planning
                        </span>
                      )}
                      {project.issueCount !== undefined && project.issueCount > 0 && (
                        <span className="text-xs text-zinc-500">{project.issueCount}</span>
                      )}
                    </Link>
                  ))}

                  {/* New Project Button */}
                  <button
                    onClick={onNewProject}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <NavItem
          href="/settings"
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          isActive={pathname === '/settings'}
        />
      </div>
    </aside>
  );
}

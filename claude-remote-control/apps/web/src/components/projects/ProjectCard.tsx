'use client';

/**
 * Project card component for the projects list
 */
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FolderKanban,
  Clock,
  GitBranch,
  MoreHorizontal,
  Play,
  Archive,
  Trash2,
  ListTodo,
} from 'lucide-react';
import type { Project, ProjectStatus } from '247-shared';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/time';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Planning' },
  active: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'Active' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Completed' },
  archived: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', label: 'Archived' },
};

export function ProjectCard({ project, onArchive, onDelete }: ProjectCardProps) {
  const statusStyle = STATUS_STYLES[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'block p-4 rounded-xl border border-white/5 bg-zinc-900/50',
          'hover:bg-zinc-900 hover:border-white/10 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-orange-500/50'
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-zinc-400 truncate mt-0.5">{project.description}</p>
            )}
          </div>
          <span className={cn('text-xs px-2 py-1 rounded-full', statusStyle.bg, statusStyle.text)}>
            {statusStyle.label}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {project.issueCount !== undefined && (
            <div className="flex items-center gap-1">
              <ListTodo className="w-3.5 h-3.5" />
              <span>{project.issueCount} issues</span>
            </div>
          )}
          {project.branchName && (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{project.branchName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDistanceToNow(project.updatedAt)}</span>
          </div>
        </div>
      </Link>

      {/* Actions dropdown */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Open Project</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {project.status !== 'archived' && onArchive && (
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onArchive(project.id);
                }}
                className="flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                <span>Archive</span>
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onDelete(project.id);
                }}
                className="flex items-center gap-2 text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

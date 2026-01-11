'use client';

/**
 * Kanban board for issues - Linear-style drag and drop interface
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle,
  CircleDot,
  PlayCircle,
  CheckCircle2,
  Plus,
  MoreHorizontal,
  Play,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { Issue, IssueStatus, IssuePriority } from '247-shared';
import { cn } from '@/lib/utils';
import { ISSUE_STATUS_LABELS, ISSUE_PRIORITY_LABELS } from '247-shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IssueBoardProps {
  issuesByStatus: Record<IssueStatus, Issue[]>;
  onIssueClick: (issue: Issue) => void;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onLaunch: (issueId: string) => void;
  onDelete: (issueId: string) => void;
  onCreateIssue: (status: IssueStatus) => void;
}

const COLUMN_CONFIG: Record<IssueStatus, { icon: React.ReactNode; color: string }> = {
  backlog: { icon: <Circle className="w-4 h-4" />, color: 'text-zinc-400' },
  todo: { icon: <CircleDot className="w-4 h-4" />, color: 'text-zinc-300' },
  in_progress: { icon: <PlayCircle className="w-4 h-4" />, color: 'text-cyan-400' },
  done: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-400' },
};

const PRIORITY_STYLES: Record<IssuePriority, { bg: string; border: string }> = {
  0: { bg: 'bg-transparent', border: 'border-transparent' },
  1: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
  2: { bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  3: { bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  4: { bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
  onStatusChange: (newStatus: IssueStatus) => void;
  onLaunch: () => void;
  onDelete: () => void;
}

function IssueCard({ issue, onClick, onStatusChange, onLaunch, onDelete }: IssueCardProps) {
  const priorityStyle = PRIORITY_STYLES[issue.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <div
        onClick={onClick}
        className={cn(
          'p-3 rounded-lg border cursor-pointer transition-all',
          'bg-zinc-900/50 hover:bg-zinc-900',
          'border-white/5 hover:border-white/10',
          priorityStyle.border,
          issue.priority > 2 && priorityStyle.bg
        )}
      >
        {/* Title */}
        <h4 className="font-medium text-sm text-white mb-1 pr-6">{issue.title}</h4>

        {/* Description preview */}
        {issue.description && (
          <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{issue.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs">
          {issue.priority > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs',
                issue.priority === 4 && 'bg-red-500/20 text-red-300',
                issue.priority === 3 && 'bg-orange-500/20 text-orange-300',
                issue.priority === 2 && 'bg-blue-500/20 text-blue-300',
                issue.priority === 1 && 'bg-zinc-500/20 text-zinc-300'
              )}
            >
              {ISSUE_PRIORITY_LABELS[issue.priority]}
            </span>
          )}
          {issue.sessionName && (
            <span className="text-cyan-400 text-xs">Running</span>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {issue.status !== 'in_progress' && (
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onLaunch();
                  }}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Launch with Claude</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Status transitions */}
              {issue.status !== 'todo' && (
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onStatusChange('todo');
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Move to Todo</span>
                </DropdownMenuItem>
              )}
              {issue.status !== 'in_progress' && (
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onStatusChange('in_progress');
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Move to In Progress</span>
                </DropdownMenuItem>
              )}
              {issue.status !== 'done' && (
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onStatusChange('done');
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Move to Done</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center gap-2 text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

interface ColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onLaunch: (issueId: string) => void;
  onDelete: (issueId: string) => void;
  onCreateIssue: () => void;
}

function Column({
  status,
  issues,
  onIssueClick,
  onStatusChange,
  onLaunch,
  onDelete,
  onCreateIssue,
}: ColumnProps) {
  const config = COLUMN_CONFIG[status];
  const label = ISSUE_STATUS_LABELS[status];

  return (
    <div className="flex flex-col min-w-[280px] w-[280px]">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-3 border-b border-white/5">
        <span className={config.color}>{config.icon}</span>
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-zinc-500 ml-1">{issues.length}</span>
        <button
          onClick={onCreateIssue}
          className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
        >
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => onIssueClick(issue)}
              onStatusChange={(newStatus) => onStatusChange(issue.id, newStatus)}
              onLaunch={() => onLaunch(issue.id)}
              onDelete={() => onDelete(issue.id)}
            />
          ))}
        </AnimatePresence>

        {issues.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}

export function IssueBoard({
  issuesByStatus,
  onIssueClick,
  onStatusChange,
  onLaunch,
  onDelete,
  onCreateIssue,
}: IssueBoardProps) {
  const columns: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done'];

  return (
    <div className="flex gap-4 h-full overflow-x-auto p-4">
      {columns.map((status) => (
        <Column
          key={status}
          status={status}
          issues={issuesByStatus[status]}
          onIssueClick={onIssueClick}
          onStatusChange={onStatusChange}
          onLaunch={onLaunch}
          onDelete={onDelete}
          onCreateIssue={() => onCreateIssue(status)}
        />
      ))}
    </div>
  );
}

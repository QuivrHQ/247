'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  MessageSquare,
  Shield,
  Circle,
  Clock,
  Zap,
  Activity,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useSessionPolling } from '@/contexts/SessionPollingContext';
import { type SessionStatus, type AttentionReason } from '247-shared';
import { formatRelativeTime } from '@/lib/time';
import { cn } from '@/lib/utils';

interface ActivityItem {
  sessionName: string;
  displayName: string;
  machineId: string;
  machineName: string;
  project: string;
  status: SessionStatus;
  attentionReason?: AttentionReason;
  timestamp: number;
  statusSource?: 'hook' | 'tmux';
}

interface RecentActivityFeedProps {
  onSelectSession: (machineId: string, project: string, sessionName: string) => void;
  limit?: number;
}

const statusConfig: Record<
  SessionStatus,
  {
    icon: typeof Loader2;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  init: {
    icon: Loader2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Starting',
  },
  working: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Working',
  },
  needs_attention: {
    icon: MessageSquare,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Attention',
  },
  idle: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Idle',
  },
};

// Icons for specific attention reasons
const attentionIcons: Record<AttentionReason, typeof Loader2> = {
  permission: Shield,
  input: MessageSquare,
  plan_approval: FileText,
  task_complete: CheckCircle,
};

const attentionLabels: Record<AttentionReason, string> = {
  permission: 'Permission',
  input: 'Waiting',
  plan_approval: 'Plan Ready',
  task_complete: 'Done',
};

export function RecentActivityFeed({ onSelectSession, limit = 15 }: RecentActivityFeedProps) {
  const { sessionsByMachine } = useSessionPolling();

  // Aggregate all sessions from all online machines, sorted by activity
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [];

    sessionsByMachine.forEach((machineData) => {
      for (const session of machineData.sessions) {
        const displayName = session.name.split('--')[1] || session.name;
        items.push({
          sessionName: session.name,
          displayName,
          machineId: machineData.machineId,
          machineName: machineData.machineName,
          project: session.project,
          status: session.status as SessionStatus,
          attentionReason: session.attentionReason as AttentionReason | undefined,
          timestamp: session.lastStatusChange || session.createdAt,
          statusSource: session.statusSource,
        });
      }
    });

    // Sort by timestamp (most recent first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items.slice(0, limit);
  }, [sessionsByMachine, limit]);

  // Count items needing attention
  const needsAttentionCount = activityItems.filter(
    (item) => item.status === 'needs_attention'
  ).length;

  if (activityItems.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-white/40" />
          <h3 className="text-sm font-medium text-white/60">Recent Activity</h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Clock className="h-5 w-5 text-white/20" />
          </div>
          <p className="text-sm text-white/30">No recent activity</p>
          <p className="mt-1 text-xs text-white/20">Sessions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-white/40" />
          <h3 className="text-sm font-medium text-white/60">Recent Activity</h3>
        </div>
        {needsAttentionCount > 0 && (
          <span className="rounded-full border border-orange-500/30 bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
            {needsAttentionCount} need attention
          </span>
        )}
      </div>

      {/* Activity List */}
      <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-2 flex-1 space-y-1 overflow-y-auto px-2">
        <AnimatePresence mode="popLayout">
          {activityItems.map((item, index) => {
            const config = statusConfig[item.status] || statusConfig.idle;
            // Use attention-specific icon if available
            const Icon =
              item.status === 'needs_attention' && item.attentionReason
                ? attentionIcons[item.attentionReason]
                : config.icon;
            // Use attention-specific label if available
            const label =
              item.status === 'needs_attention' && item.attentionReason
                ? attentionLabels[item.attentionReason]
                : config.label;
            const needsAttention = item.status === 'needs_attention';

            return (
              <motion.button
                key={`${item.machineId}-${item.sessionName}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                onClick={() => onSelectSession(item.machineId, item.project, item.sessionName)}
                className={cn(
                  'group w-full rounded-xl p-3 text-left transition-all',
                  'border',
                  needsAttention
                    ? 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10'
                    : 'border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/5'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                      config.bgColor
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        config.color,
                        item.status === 'working' && 'animate-spin'
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {item.displayName}
                      </span>
                      {item.statusSource === 'hook' && (
                        <Zap className="h-3 w-3 flex-shrink-0 text-emerald-400/60" />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-white/40">{item.machineName}</span>
                      <span className="text-white/20">·</span>
                      <span className="truncate text-xs text-white/30">{item.project}</span>
                    </div>
                  </div>

                  {/* Time & Status */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-white/30">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <span
                      className={cn('rounded px-1.5 py-0.5 text-xs', config.bgColor, config.color)}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                {/* Attention pulse */}
                {needsAttention && (
                  <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl border border-orange-500/30" />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

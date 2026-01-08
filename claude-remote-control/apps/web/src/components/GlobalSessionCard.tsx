'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  MessageSquare,
  Shield,
  Circle,
  Loader2,
  Monitor,
  Activity,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { type SessionWithMachine } from '@/contexts/SessionPollingContext';
import { type SessionStatus, type AttentionReason } from '247-shared';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/time';

interface GlobalSessionCardProps {
  session: SessionWithMachine;
  onClick: () => void;
}

const statusConfig: Record<
  SessionStatus,
  {
    icon: typeof Zap;
    color: string;
    bgColor: string;
    borderColor: string;
    glow: string;
    label: string;
  }
> = {
  init: {
    icon: Loader2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    label: 'Starting',
  },
  working: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    label: 'Working',
  },
  needs_attention: {
    icon: MessageSquare,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
    label: 'Attention',
  },
  idle: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    glow: 'shadow-gray-500/20',
    label: 'Idle',
  },
};

// Icons for specific attention reasons
const attentionIcons: Record<AttentionReason, typeof Zap> = {
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

// Format time since status change
function formatStatusTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function GlobalSessionCard({ session, onClick }: GlobalSessionCardProps) {
  const [, setTick] = useState(0);

  // Update time display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const status = session.status;
  const attentionReason = session.attentionReason;
  const config = statusConfig[status] || statusConfig.idle;

  // Use attention-specific icon if available
  const Icon =
    status === 'needs_attention' && attentionReason ? attentionIcons[attentionReason] : config.icon;

  // Use attention-specific label if available
  const label =
    status === 'needs_attention' && attentionReason
      ? attentionLabels[attentionReason]
      : config.label;

  // Extract readable session name (part after --)
  const displayName = session.name.split('--')[1] || session.name;

  // Check if needs attention
  const needsAttention = status === 'needs_attention';
  const statusTime = formatStatusTime(session.lastStatusChange);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-xl p-4 text-left transition-all',
        'border bg-[#12121a]/50 hover:bg-[#12121a]',
        needsAttention
          ? cn('border-orange-500/40', 'shadow-lg shadow-orange-500/10')
          : 'border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${status}-${attentionReason}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
              config.bgColor,
              'border',
              config.borderColor,
              needsAttention && 'ring-2 ring-orange-500/40 ring-offset-2 ring-offset-[#0a0a10]'
            )}
          >
            <Icon className={cn('h-6 w-6', config.color, status === 'working' && 'animate-spin')} />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Session name + status */}
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate font-semibold text-white">{displayName}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${status}-${attentionReason}`}
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  config.bgColor,
                  config.color,
                  'border',
                  config.borderColor
                )}
              >
                {label}
              </motion.span>
            </AnimatePresence>
            {statusTime && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Activity className="h-3 w-3" />
                {statusTime}
              </span>
            )}
          </div>

          {/* Project */}
          <div className="mb-2 text-sm text-white/60">{session.project}</div>

          {/* Machine + Created */}
          <div className="flex items-center gap-3 text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              <span>{session.machineName}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(session.createdAt)}</span>
            </div>
            {session.statusSource === 'hook' && (
              <span
                className="flex items-center gap-0.5 text-emerald-400/60"
                title="Real-time via WebSocket"
              >
                <Zap className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>

        {/* Arrow indicator on hover */}
        <div className="self-center opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="h-5 w-5 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Attention pulse overlay */}
      {needsAttention && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl border border-orange-500/40" />
      )}
    </button>
  );
}

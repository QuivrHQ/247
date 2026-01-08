'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/time';
import { StatusRing } from '@/components/ui/StatusRing';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { SessionStatus, AttentionReason } from '@vibecompany/247-shared';

export interface SessionMiniCardProps {
  session: {
    name: string;
    project: string;
    status: SessionStatus;
    attentionReason?: AttentionReason;
    machineId: string;
    createdAt: number;
  };
  isActive: boolean;
  onClick: () => void;
  onKill?: () => Promise<void>;
  onArchive?: () => Promise<void>;
}

export function SessionMiniCard({
  session,
  isActive,
  onClick,
  onKill,
  onArchive,
}: SessionMiniCardProps) {
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isKilling, setIsKilling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const displayName = session.name.split('--')[1] || session.name;

  // Show archive button for "done" sessions (idle or task_complete)
  const canArchive =
    onArchive &&
    (session.status === 'idle' ||
      (session.status === 'needs_attention' && session.attentionReason === 'task_complete'));

  const handleKillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowKillConfirm(true);
  };

  const handleKillConfirm = async () => {
    if (!onKill) return;
    setIsKilling(true);
    try {
      await onKill();
      setShowKillConfirm(false);
    } finally {
      setIsKilling(false);
    }
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirm = async () => {
    if (!onArchive) return;
    setIsArchiving(true);
    try {
      await onArchive();
      setShowArchiveConfirm(false);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        data-testid="session-mini-card"
        data-active={isActive}
        className={cn(
          'relative w-full rounded-xl p-3 text-left transition-all',
          'min-h-[72px] touch-manipulation border',
          isActive
            ? 'border-orange-500/30 bg-white/10 shadow-lg shadow-orange-500/10'
            : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
        )}
      >
        {/* Action buttons */}
        {(onKill || canArchive) && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
            {canArchive && (
              <button
                onClick={handleArchiveClick}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md',
                  'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60',
                  'touch-manipulation transition-all active:scale-90'
                )}
                aria-label="Archive session"
                data-testid="archive-button"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            )}
            {onKill && (
              <button
                onClick={handleKillClick}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md',
                  'bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400',
                  'touch-manipulation transition-all active:scale-90'
                )}
                aria-label="Kill session"
                data-testid="kill-button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <StatusRing status={session.status} size={24} showPulse={!isActive} />

          <div className="min-w-0 flex-1 pr-14">
            <div className="truncate font-mono text-sm text-white" data-testid="session-name">
              {displayName}
            </div>
            <div
              className="mt-0.5 truncate text-[11px] text-white/40"
              data-testid="session-project"
            >
              {session.project}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="h-3 w-3" />
              <span data-testid="session-time">{formatRelativeTime(session.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="mobileActiveSessionIndicator"
            className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500"
            data-testid="active-indicator"
          />
        )}
      </motion.button>

      <ConfirmDialog
        open={showKillConfirm}
        onOpenChange={setShowKillConfirm}
        title="Terminate session?"
        description={`This will kill the session "${displayName}" (${session.project}). This action cannot be undone.`}
        confirmText="Terminate"
        variant="destructive"
        onConfirm={handleKillConfirm}
        isLoading={isKilling}
      />

      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive session?"
        description={`Archive "${displayName}" (${session.project})? The terminal will be closed but the session will be kept in history.`}
        confirmText="Archive"
        variant="default"
        onConfirm={handleArchiveConfirm}
        isLoading={isArchiving}
      />
    </>
  );
}

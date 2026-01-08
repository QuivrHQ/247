'use client';

import { Search, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  project: string;
  sessionName: string;
  connectionState: 'connected' | 'disconnected' | 'reconnecting';
  connected: boolean;
  copied: boolean;
  searchVisible: boolean;
  claudeStatus?: 'init' | 'working' | 'needs_attention' | 'idle';
  onStartClaude: () => void;
  onCopySelection: () => void;
  onToggleSearch: () => void;
  /** Mobile mode for responsive styling */
  isMobile?: boolean;
}

export function Toolbar({
  project,
  sessionName,
  connectionState,
  connected,
  copied,
  searchVisible,
  claudeStatus,
  onStartClaude,
  onCopySelection,
  onToggleSearch,
  isMobile = false,
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-white/5 bg-[#0d0d14]/80 backdrop-blur-sm',
        isMobile ? 'px-2 py-1.5' : 'gap-3 px-4 py-2'
      )}
    >
      {/* Project & Session Info - truncated on mobile */}
      <div className={cn('flex min-w-0 items-center gap-2', isMobile && 'flex-1 overflow-hidden')}>
        {!isMobile && (
          <>
            <span className="text-sm font-medium text-white/60">{project}</span>
            <span className="text-white/20">/</span>
          </>
        )}
        <span className={cn('font-mono text-white/40', isMobile ? 'truncate text-xs' : 'text-sm')}>
          {sessionName.split('--')[1] || 'new session'}
        </span>
      </div>

      {/* Connection Status Indicator */}
      {connectionState === 'reconnecting' && (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          {!isMobile && <span className="text-xs text-amber-400/60">Reconnecting...</span>}
        </div>
      )}

      {!isMobile && <div className="flex-1" />}

      {/* Actions */}
      <div className={cn('flex flex-shrink-0 items-center', isMobile ? 'gap-1' : 'gap-2')}>
        {/* Start Claude Button */}
        {claudeStatus !== 'working' && (
          <button
            onClick={onStartClaude}
            disabled={!connected}
            className={cn(
              'flex touch-manipulation items-center justify-center gap-2 rounded-lg font-medium transition-all',
              isMobile ? 'min-h-[40px] min-w-[40px] p-2' : 'px-3 py-1.5 text-sm',
              connected
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-amber-400'
                : 'cursor-not-allowed bg-white/5 text-white/30'
            )}
            title="Start Claude"
          >
            <Sparkles className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
            {!isMobile && <span>Start Claude</span>}
          </button>
        )}

        {/* Copy Button */}
        <button
          onClick={onCopySelection}
          className={cn(
            'touch-manipulation rounded-lg transition-colors',
            'text-white/40 hover:bg-white/5 hover:text-white',
            isMobile ? 'min-h-[40px] min-w-[40px] p-2' : 'p-2'
          )}
          title="Copy selection"
        >
          {copied ? (
            <Check className={cn('text-emerald-400', isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
          ) : (
            <Copy className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          )}
        </button>

        {/* Search Button */}
        <button
          onClick={onToggleSearch}
          className={cn(
            'touch-manipulation rounded-lg transition-colors',
            isMobile ? 'min-h-[40px] min-w-[40px] p-2' : 'p-2',
            searchVisible
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:bg-white/5 hover:text-white'
          )}
          title="Search (⌘⇧F)"
        >
          <Search className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
        </button>
      </div>
    </div>
  );
}

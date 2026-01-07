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
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2',
        'bg-[#0d0d14]/80 backdrop-blur-sm',
        'border-b border-white/5'
      )}
    >
      {/* Project & Session Info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white/60">{project}</span>
        <span className="text-white/20">/</span>
        <span className="font-mono text-sm text-white/40">
          {sessionName.split('--')[1] || 'new session'}
        </span>
      </div>

      {/* Connection Status Indicator */}
      {connectionState === 'reconnecting' && (
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span className="text-xs text-amber-400/60">Reconnecting...</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Start Claude Button */}
        {claudeStatus !== 'working' && (
          <button
            onClick={onStartClaude}
            disabled={!connected}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5',
              'text-sm font-medium transition-all',
              connected
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-amber-400'
                : 'cursor-not-allowed bg-white/5 text-white/30'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>Start Claude</span>
          </button>
        )}

        {/* Copy Button */}
        <button
          onClick={onCopySelection}
          className={cn(
            'rounded-lg p-2 transition-colors',
            'text-white/40 hover:bg-white/5 hover:text-white'
          )}
          title="Copy selection"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>

        {/* Search Button */}
        <button
          onClick={onToggleSearch}
          className={cn(
            'rounded-lg p-2 transition-colors',
            searchVisible
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:bg-white/5 hover:text-white'
          )}
          title="Search (⌘⇧F)"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

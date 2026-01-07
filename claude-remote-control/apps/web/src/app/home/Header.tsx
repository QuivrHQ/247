'use client';

import {
  Monitor,
  Plus,
  Activity,
  AlertCircle,
  Wifi,
  Maximize2,
  Minimize2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedSession } from './types';

interface HeaderProps {
  agentUrl: string;
  sessionCount: number;
  needsAttention: number;
  selectedSession: SelectedSession | null;
  isFullscreen: boolean;
  onConnectionSettingsClick: () => void;
  onToggleFullscreen: () => void;
  onNewSession: () => void;
}

export function Header({
  agentUrl,
  sessionCount,
  needsAttention,
  selectedSession,
  isFullscreen,
  onConnectionSettingsClick,
  onToggleFullscreen,
  onNewSession,
}: HeaderProps) {
  if (isFullscreen && selectedSession) {
    return null;
  }

  return (
    <header className="z-40 flex-none border-b border-white/5 bg-[#0a0a10]/80 backdrop-blur-xl">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-amber-500/20">
              <Zap className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">247</h1>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <p className="font-mono text-[10px] text-white/40">{agentUrl}</p>
              </div>
            </div>
          </div>

          {/* Global Stats */}
          <div className="hidden items-center gap-6 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 md:flex">
            <div className="flex items-center gap-2 text-xs">
              <Monitor className="h-3.5 w-3.5 text-white/30" />
              <span className="text-white/60">Local Agent</span>
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                Online
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-xs">
              <Activity className="h-3.5 w-3.5 text-white/30" />
              <span className="font-medium text-white/80">{sessionCount}</span>
              <span className="text-white/30">active sessions</span>
            </div>
            {needsAttention > 0 && (
              <>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-medium text-orange-400">
                    {needsAttention} action{needsAttention !== 1 ? 's' : ''} needed
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onConnectionSettingsClick}
              className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              title="Connection settings"
            >
              <Wifi className="h-4 w-4" />
            </button>

            {selectedSession && (
              <button
                onClick={onToggleFullscreen}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                title={isFullscreen ? 'Exit fullscreen (⌘F)' : 'Fullscreen (⌘F)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}

            <div className="mx-1 h-4 w-px bg-white/10" />

            <button
              onClick={onNewSession}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                'bg-white text-black hover:bg-white/90',
                'shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] active:scale-[0.98]'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

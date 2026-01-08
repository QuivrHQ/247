'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, WifiOff, RefreshCw } from 'lucide-react';
import { FileExplorer } from './FileExplorer';

const Terminal = dynamic(() => import('./Terminal').then((mod) => mod.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-[#0d0d14]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
    </div>
  ),
});
import { EditorTerminalTabs, type ActiveTab } from './EditorTerminalTabs';
import { StatusBadge, type SessionStatus } from './ui/status-badge';
import { type SessionInfo } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { RalphLoopConfig } from '@vibecompany/247-shared';

interface SessionViewProps {
  sessionName: string;
  project: string;
  agentUrl: string;
  sessionInfo?: SessionInfo;
  environmentId?: string;
  ralphConfig?: RalphLoopConfig;
  onBack: () => void;
  onSessionCreated?: (sessionName: string) => void;
  /** Mobile mode for responsive styling */
  isMobile?: boolean;
}

export function SessionView({
  sessionName,
  project,
  agentUrl,
  sessionInfo,
  environmentId,
  ralphConfig,
  onBack,
  onSessionCreated,
  isMobile = false,
}: SessionViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('terminal');

  // Derive display name from session name
  const displayName = sessionName.split('--')[1] || sessionName;
  const isNewSession = sessionName.endsWith('--new');

  const handleSessionCreated = useCallback(
    (actualSessionName: string) => {
      onSessionCreated?.(actualSessionName);
    },
    [onSessionCreated]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between',
          'bg-[#0d0d14]/80 backdrop-blur-xl',
          'border-b border-white/5',
          isMobile ? 'px-3 py-2' : 'px-4 py-2.5'
        )}
      >
        {/* Left: Back + Session Info */}
        <div className={cn('flex items-center', isMobile ? 'gap-2' : 'gap-4')}>
          <button
            onClick={onBack}
            className={cn(
              'flex items-center gap-2 rounded-lg',
              'text-white/50 hover:bg-white/5 hover:text-white',
              'group touch-manipulation transition-all',
              isMobile ? 'min-h-[40px] min-w-[40px] p-2' : 'px-3 py-1.5'
            )}
          >
            <ArrowLeft
              className={cn(
                'transition-transform group-hover:-translate-x-0.5',
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              )}
            />
            {!isMobile && <span className="text-sm font-medium">Back</span>}
          </button>

          {!isMobile && <div className="h-5 w-px bg-white/10" />}

          {/* Session name */}
          <div className={cn('flex items-center', isMobile ? 'gap-2' : 'gap-3')}>
            {sessionInfo && (
              <StatusBadge
                status={sessionInfo.status as SessionStatus}
                size={isMobile ? 'sm' : 'md'}
                showTooltip={!isMobile}
              />
            )}
            <div className={isMobile ? 'max-w-[120px]' : ''}>
              <div className="flex items-center gap-2">
                <h1
                  className={cn(
                    'font-mono font-semibold text-white',
                    isMobile ? 'truncate text-sm' : 'text-base'
                  )}
                >
                  {isNewSession ? 'New Session' : displayName}
                </h1>
                {ralphConfig && !isMobile && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                    <RefreshCw className="h-3 w-3" />
                    Ralph Loop
                  </span>
                )}
              </div>
              {!isMobile && <p className="text-xs text-white/40">{project}</p>}
            </div>
          </div>
        </div>

        {/* Right: Connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {!isMobile && <span className="text-xs text-emerald-400">Connected</span>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <WifiOff className="h-3 w-3 text-red-400" />
              {!isMobile && <span className="text-xs text-red-400">Disconnected</span>}
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <EditorTerminalTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        editorEnabled={true}
        isMobile={isMobile}
      />

      {/* Content - min-h-0 and w-full are critical for nested flex containers */}
      <div className="min-h-0 w-full flex-1 overflow-hidden">
        {activeTab === 'terminal' ? (
          <Terminal
            key={`${project}-${sessionName}`}
            agentUrl={agentUrl}
            project={project}
            sessionName={isNewSession ? undefined : sessionName}
            environmentId={environmentId}
            ralphConfig={ralphConfig}
            onConnectionChange={setIsConnected}
            onSessionCreated={handleSessionCreated}
            claudeStatus={sessionInfo?.status}
            isMobile={isMobile}
          />
        ) : (
          <FileExplorer key={`files-${project}`} agentUrl={agentUrl} project={project} />
        )}
      </div>
    </div>
  );
}

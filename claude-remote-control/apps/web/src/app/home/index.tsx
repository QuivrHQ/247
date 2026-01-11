'use client';

import { useState } from 'react';
import { Zap, Loader2, ArrowDown } from 'lucide-react';
import { HomeSidebar } from '@/components/HomeSidebar';
import { SessionView } from '@/components/SessionView';
import { NewSessionModal } from '@/components/NewSessionModal';
import { AgentConnectionSettings } from '@/components/AgentConnectionSettings';
import { MobileStatusStrip } from '@/components/mobile';
import { InstallBanner } from '@/components/InstallBanner';
import { SlideOverPanel } from '@/components/ui/SlideOverPanel';
import { ConnectionGuide } from '@/components/ConnectionGuide';
import { EnvironmentsList } from '@/components/EnvironmentsList';
import { LoadingView } from './LoadingView';
import { NoConnectionView } from './NoConnectionView';
import { Header } from './Header';
import { useHomeState } from './useHomeState';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSessionPolling } from '@/contexts/SessionPollingContext';

export function HomeContent() {
  const isMobile = useIsMobile();

  // Set CSS variable for viewport height (handles mobile keyboard)
  useViewportHeight();

  const {
    loading,
    agentConnection,
    connectionModalOpen,
    setConnectionModalOpen,
    newSessionOpen,
    setNewSessionOpen,
    selectedSession,
    setSelectedSession,
    isFullscreen,
    setIsFullscreen,
    allSessions,
    needsAttention,
    currentMachine,
    getArchivedSessions,
    getAgentUrl,
    getSelectedSessionInfo,
    handleSelectSession,
    handleStartSession,
    handleSessionCreated,
    handleSessionKilled,
    handleSessionArchived,
    handleConnectionSaved,
    handleConnectionCleared,
    clearSessionFromUrl,
  } = useHomeState();

  // Slide-over panel states
  const [guideOpen, setGuideOpen] = useState(false);
  const [environmentsOpen, setEnvironmentsOpen] = useState(false);

  // Pull-to-refresh for mobile PWA
  const { refreshMachine } = useSessionPolling();
  const { pullDistance, isRefreshing, isPulling, isThresholdReached, handlers } = usePullToRefresh({
    onRefresh: async () => {
      if (currentMachine) {
        await refreshMachine(currentMachine.id);
      }
    },
    disabled: !isMobile,
  });

  if (loading) {
    return <LoadingView />;
  }

  if (!agentConnection) {
    return (
      <NoConnectionView
        modalOpen={connectionModalOpen}
        onModalOpenChange={setConnectionModalOpen}
        onConnectionSaved={handleConnectionSaved}
      />
    );
  }

  // Handler for menu button in session view (desktop only - goes back to session list)
  const handleMenuClick = () => {
    setSelectedSession(null);
    clearSessionFromUrl();
  };

  // Connected state - Split View Layout
  return (
    <main
      className="h-screen-safe flex flex-col overflow-hidden bg-[#0a0a10]"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (isPulling || isRefreshing) && (
        <div
          className="pointer-events-none fixed left-0 right-0 z-50 flex justify-center"
          style={{
            top: 0,
            transform: `translateY(${Math.min(pullDistance - 30, 50)}px)`,
            opacity: Math.min(pullDistance / 40, 1),
            transition: isRefreshing ? 'none' : 'opacity 0.1s ease-out',
          }}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isThresholdReached || isRefreshing
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-white/10 text-white/60'
            }`}
            style={{
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowDown
                className="h-5 w-5 transition-transform duration-150"
                style={{
                  transform: isThresholdReached ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Mobile Status Strip - always visible on mobile when connected */}
      {isMobile && (
        <MobileStatusStrip
          sessions={allSessions}
          currentSession={selectedSession}
          onSelectSession={handleSelectSession}
          onNewSession={() => setNewSessionOpen(true)}
          onOpenGuide={() => setGuideOpen(true)}
          onOpenEnvironments={() => setEnvironmentsOpen(true)}
          onConnectionSettingsClick={() => setConnectionModalOpen(true)}
          onSessionKilled={handleSessionKilled}
        />
      )}

      {/* Header - always visible on desktop */}
      {!isMobile && (
        <Header
          agentUrl={agentConnection.url}
          sessionCount={allSessions.length}
          needsAttention={needsAttention}
          selectedSession={selectedSession}
          isFullscreen={isFullscreen}
          onConnectionSettingsClick={() => setConnectionModalOpen(true)}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          onNewSession={() => setNewSessionOpen(true)}
          onOpenGuide={() => setGuideOpen(true)}
          onOpenEnvironments={() => setEnvironmentsOpen(true)}
          isMobile={false}
          onMobileMenuClick={() => {}}
        />
      )}

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile and in fullscreen */}
        {!isFullscreen && !isMobile && (
          <HomeSidebar
            sessions={allSessions}
            archivedSessions={getArchivedSessions()}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onDeselectSession={handleMenuClick}
            onSessionKilled={handleSessionKilled}
            onSessionArchived={handleSessionArchived}
          />
        )}

        {/* Main Content Area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {selectedSession ? (
            <SessionView
              sessionName={selectedSession.sessionName}
              project={selectedSession.project}
              agentUrl={getAgentUrl()}
              sessionInfo={getSelectedSessionInfo()}
              environmentId={selectedSession.environmentId}
              ralphConfig={selectedSession.ralphConfig}
              planningProjectId={selectedSession.planningProjectId}
              onMenuClick={handleMenuClick}
              onSessionCreated={handleSessionCreated}
              isMobile={isMobile}
            />
          ) : (
            // Empty state when no session selected
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/10 bg-orange-500/5">
                  <Zap className="h-8 w-8 text-orange-500/30" />
                </div>
                <p className="text-sm text-white/40">Select a session or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Settings Modal */}
      <AgentConnectionSettings
        open={connectionModalOpen}
        onOpenChange={setConnectionModalOpen}
        onSave={handleConnectionSaved}
        onDisconnect={handleConnectionCleared}
        hasConnection={!!agentConnection}
      />

      {/* New Session Modal */}
      <NewSessionModal
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        machines={currentMachine ? [currentMachine] : []}
        onStartSession={handleStartSession}
      />

      {/* Guide Slide-Over Panel */}
      <SlideOverPanel open={guideOpen} onClose={() => setGuideOpen(false)} title="Connection Guide">
        <ConnectionGuide />
      </SlideOverPanel>

      {/* Environments Slide-Over Panel */}
      <SlideOverPanel
        open={environmentsOpen}
        onClose={() => setEnvironmentsOpen(false)}
        title="Environments"
      >
        <EnvironmentsList machines={currentMachine ? [currentMachine] : []} />
      </SlideOverPanel>

      {/* PWA Install Banner - only on mobile */}
      {isMobile && <InstallBanner />}
    </main>
  );
}

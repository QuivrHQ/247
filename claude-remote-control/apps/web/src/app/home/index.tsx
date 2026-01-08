'use client';

import { useState } from 'react';
import { HomeSidebar } from '@/components/HomeSidebar';
import { DashboardContent } from '@/components/DashboardContent';
import { SessionView } from '@/components/SessionView';
import { NewSessionModal } from '@/components/NewSessionModal';
import { AgentConnectionSettings } from '@/components/AgentConnectionSettings';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer';
import { LoadingView } from './LoadingView';
import { NoConnectionView } from './NoConnectionView';
import { Header } from './Header';
import { useHomeState } from './useHomeState';
import { useIsMobile } from '@/hooks/useMediaQuery';

export function HomeContent() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    loading,
    agentConnection,
    connectionModalOpen,
    setConnectionModalOpen,
    newSessionOpen,
    setNewSessionOpen,
    activeTab,
    setActiveTab,
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
    clearSessionFromUrl,
  } = useHomeState();

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

  // Connected state - Split View Layout
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0a0a10]">
      <Header
        agentUrl={agentConnection.url}
        sessionCount={allSessions.length}
        needsAttention={needsAttention}
        selectedSession={selectedSession}
        isFullscreen={isFullscreen}
        onConnectionSettingsClick={() => setConnectionModalOpen(true)}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        onNewSession={() => setNewSessionOpen(true)}
        isMobile={isMobile}
        onMobileMenuClick={() => setMobileMenuOpen(true)}
      />

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <MobileSidebarDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title={`${allSessions.length} Session${allSessions.length !== 1 ? 's' : ''}`}
        >
          <HomeSidebar
            sessions={allSessions}
            archivedSessions={getArchivedSessions()}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onNewSession={() => {
              setMobileMenuOpen(false);
              setNewSessionOpen(true);
            }}
            onSessionKilled={handleSessionKilled}
            onSessionArchived={handleSessionArchived}
            isMobileDrawer={true}
            onMobileSessionSelect={() => setMobileMenuOpen(false)}
          />
        </MobileSidebarDrawer>
      )}

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        {!isFullscreen && !isMobile && (
          <HomeSidebar
            sessions={allSessions}
            archivedSessions={getArchivedSessions()}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onNewSession={() => setNewSessionOpen(true)}
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
              onBack={() => {
                setSelectedSession(null);
                clearSessionFromUrl();
              }}
              onSessionCreated={handleSessionCreated}
              isMobile={isMobile}
            />
          ) : (
            <DashboardContent
              machines={currentMachine ? [currentMachine] : []}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSelectSession={(machineId, sessionName) => {
                const session = allSessions.find(
                  (s) => s.machineId === machineId && s.name === sessionName
                );
                if (session) {
                  handleSelectSession(machineId, sessionName, session.project);
                }
              }}
              onNewSession={() => setNewSessionOpen(true)}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {/* Connection Settings Modal */}
      <AgentConnectionSettings
        open={connectionModalOpen}
        onOpenChange={setConnectionModalOpen}
        onSave={handleConnectionSaved}
      />

      {/* New Session Modal */}
      <NewSessionModal
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        machines={currentMachine ? [currentMachine] : []}
        onStartSession={handleStartSession}
      />
    </main>
  );
}

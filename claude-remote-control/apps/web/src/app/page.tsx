'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Plus,
  Zap,
  Activity,
  AlertCircle,
  Wifi,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { HomeSidebar } from '@/components/HomeSidebar';
import { DashboardContent } from '@/components/DashboardContent';
import { SessionView } from '@/components/SessionView';
import { NewSessionModal } from '@/components/NewSessionModal';
import { AgentConnectionSettings, loadAgentConnection, saveAgentConnection } from '@/components/AgentConnectionSettings';
import { useSessionPolling, type SessionWithMachine } from '@/contexts/SessionPollingContext';
import { cn } from '@/lib/utils';

// Local "machine" derived from localStorage connection
interface LocalMachine {
  id: string;
  name: string;
  status: 'online' | 'offline';
  config?: {
    projects: string[];
    agentUrl: string;
  };
}

interface SelectedSession {
  machineId: string;
  sessionName: string;
  project: string;
}

type ViewTab = 'sessions' | 'environments' | 'guide';

const DEFAULT_MACHINE_ID = 'local-agent';

export default function Home() {
  const { setMachines: setPollingMachines, getAllSessions } = useSessionPolling();
  const [agentConnection, setAgentConnection] = useState<ReturnType<typeof loadAgentConnection>>(null);
  const [machines, setMachines] = useState<LocalMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('sessions');

  // Selected session for split view
  const [selectedSession, setSelectedSession] = useState<SelectedSession | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load agent connection from localStorage
  useEffect(() => {
    const connection = loadAgentConnection();
    setAgentConnection(connection);

    if (connection) {
      const machine: LocalMachine = {
        id: DEFAULT_MACHINE_ID,
        name: connection.name || 'Local Agent',
        status: 'online',
        config: {
          projects: [],
          agentUrl: connection.url,
        },
      };
      setMachines([machine]);
      setPollingMachines([machine]);
    }

    setLoading(false);
  }, [setPollingMachines]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K to open new session modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (agentConnection) {
          setNewSessionOpen(true);
        } else {
          setConnectionModalOpen(true);
        }
      }

      // Escape to deselect session (when not in fullscreen)
      if (e.key === 'Escape' && selectedSession && !isFullscreen) {
        e.preventDefault();
        setSelectedSession(null);
      }

      // ⌘F to toggle fullscreen when session is selected
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && selectedSession) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agentConnection, selectedSession, isFullscreen]);

  // Select session handler
  const handleSelectSession = useCallback(
    (machineId: string, sessionName: string, project: string) => {
      setSelectedSession({ machineId, sessionName, project });
    },
    []
  );

  // Start new session
  const handleStartSession = useCallback(
    (machineId: string, project: string, environmentId?: string) => {
      // Create a new session placeholder name
      const newSessionName = `${project}--new`;
      setSelectedSession({
        machineId,
        sessionName: newSessionName,
        project
      });
      setNewSessionOpen(false);
    },
    []
  );

  // Handle session created (update name from --new to actual)
  const handleSessionCreated = useCallback((actualSessionName: string) => {
    if (selectedSession) {
      setSelectedSession(prev => prev ? { ...prev, sessionName: actualSessionName } : null);
    }
  }, [selectedSession]);

  // Handle session killed
  const handleSessionKilled = useCallback((machineId: string, sessionName: string) => {
    if (selectedSession?.sessionName === sessionName) {
      setSelectedSession(null);
    }
  }, [selectedSession]);

  // Connection saved handler
  const handleConnectionSaved = useCallback((connection: ReturnType<typeof saveAgentConnection>) => {
    setAgentConnection(connection);
    const machine: LocalMachine = {
      id: DEFAULT_MACHINE_ID,
      name: connection.name || 'Local Agent',
      status: 'online',
      config: {
        projects: [],
        agentUrl: connection.url,
      },
    };
    setMachines([machine]);
    setPollingMachines([machine]);
  }, [setPollingMachines]);

  // Stats
  const onlineMachines = machines.filter((m) => m.status === 'online');
  const allSessions = getAllSessions();
  const needsAttention = allSessions.filter(
    (s) => s.status === 'waiting' || s.status === 'permission'
  ).length;

  // Get agent URL for selected session
  const getAgentUrl = useCallback(() => {
    if (!selectedSession || !agentConnection) return '';
    return agentConnection.url;
  }, [selectedSession, agentConnection]);

  // Get session info for selected session
  const getSelectedSessionInfo = useCallback(() => {
    if (!selectedSession) return undefined;
    return allSessions.find(
      s => s.name === selectedSession.sessionName && s.machineId === selectedSession.machineId
    );
  }, [selectedSession, allSessions]);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a0a10] via-[#0d0d14] to-[#0a0a10] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
      </main>
    );
  }

  // No connection state
  if (!agentConnection) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a0a10] via-[#0d0d14] to-[#0a0a10]">
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a10]/80 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Claude Remote Control</h1>
                  <p className="text-sm text-white/40">Not connected</p>
                </div>
              </div>
              <button
                onClick={() => setConnectionModalOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                  'text-white shadow-lg shadow-orange-500/20'
                )}
              >
                <Wifi className="w-4 h-4" />
                <span>Connect Agent</span>
              </button>
            </div>
          </div>
        </header>

        {/* No Connection Content */}
        <div className="flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Wifi className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Connect Your Agent</h2>
            <p className="text-white/40 mb-6">
              Connect to your local Claude Code agent to start managing sessions remotely.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setConnectionModalOpen(true)}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                  'text-white shadow-lg shadow-orange-500/20'
                )}
              >
                <Wifi className="w-4 h-4" />
                Connect Agent
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                  'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                )}
              >
                <HelpCircle className="w-4 h-4" />
                View Connection Guide
              </button>
            </div>
          </motion.div>
        </div>

        <AgentConnectionSettings
          open={connectionModalOpen}
          onOpenChange={setConnectionModalOpen}
          onSave={handleConnectionSaved}
        />
      </main>
    );
  }

  // Connected state - Split View Layout
  return (
    <main className="h-screen flex flex-col bg-gradient-to-b from-[#0a0a10] via-[#0d0d14] to-[#0a0a10] overflow-hidden">
      {/* Compact Header */}
      <header className={cn(
        'flex-none z-40 backdrop-blur-xl bg-[#0a0a10]/80 border-b border-white/5',
        isFullscreen && selectedSession && 'hidden'
      )}>
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Claude Remote Control</h1>
                <p className="text-xs text-white/40">{agentConnection.url}</p>
              </div>
            </div>

            {/* Global Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="w-3.5 h-3.5 text-white/40" />
                <span className="text-emerald-400 font-medium">{onlineMachines.length}</span>
                <span className="text-white/30">agent{onlineMachines.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2 text-xs">
                <Activity className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/70 font-medium">{allSessions.length}</span>
                <span className="text-white/30">sessions</span>
              </div>
              {needsAttention > 0 && (
                <>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-orange-400 font-medium">{needsAttention}</span>
                    <span className="text-white/30">need attention</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConnectionModalOpen(true)}
                className="p-1.5 rounded-lg text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Connection settings"
              >
                <Wifi className="w-4 h-4" />
              </button>

              {selectedSession && (
                <button
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                  title={isFullscreen ? 'Exit fullscreen (⌘F)' : 'Fullscreen (⌘F)'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => setNewSessionOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all',
                  'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                  'text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Session</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isFullscreen && (
          <HomeSidebar
            sessions={allSessions}
            selectedSession={selectedSession}
            onSelectSession={handleSelectSession}
            onNewSession={() => setNewSessionOpen(true)}
            onSessionKilled={handleSessionKilled}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSession ? (
            <SessionView
              sessionName={selectedSession.sessionName}
              project={selectedSession.project}
              agentUrl={getAgentUrl()}
              sessionInfo={getSelectedSessionInfo()}
              onBack={() => setSelectedSession(null)}
              onSessionCreated={handleSessionCreated}
            />
          ) : (
            <DashboardContent
              sessions={allSessions}
              machines={machines}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSelectSession={(machineId, sessionName) => {
                const session = allSessions.find(s => s.machineId === machineId && s.name === sessionName);
                if (session) {
                  handleSelectSession(machineId, sessionName, session.project);
                }
              }}
              onNewSession={() => setNewSessionOpen(true)}
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
        machines={machines}
        onStartSession={handleStartSession}
      />
    </main>
  );
}

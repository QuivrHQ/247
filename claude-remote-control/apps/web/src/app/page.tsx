'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Plus,
  RefreshCw,
  Zap,
  Activity,
  AlertCircle,
  LayoutGrid,
  List,
  Settings,
} from 'lucide-react';
import { MachineCard } from '@/components/MachineCard';
import { NewSessionModal } from '@/components/NewSessionModal';
import { SessionListView } from '@/components/SessionListView';
import { EnvironmentsList } from '@/components/EnvironmentsList';
import { useSessionPolling } from '@/contexts/SessionPollingContext';
import { cn } from '@/lib/utils';

interface Machine {
  id: string;
  name: string;
  status: string;
  tunnelUrl: string | null;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
  lastSeen: string | null;
  createdAt: string;
}

type ViewTab = 'sessions' | 'machines' | 'environments';

export default function Home() {
  const router = useRouter();
  const { setMachines: setPollingMachines, sessionsByMachine, getAllSessions } = useSessionPolling();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('sessions');

  const fetchMachines = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      try {
        const response = await fetch('/api/machines');
        const data = await response.json();
        setMachines(data);
        setPollingMachines(data);
      } catch (err) {
        console.error('Failed to fetch machines:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [setPollingMachines]
  );

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(() => fetchMachines(), 30000);
    return () => clearInterval(interval);
  }, [fetchMachines]);

  // Keyboard shortcut: ⌘K to open new session modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setNewSessionOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigate to session (new URL format)
  const handleSelectSession = useCallback(
    (machineId: string, sessionName: string) => {
      router.push(`/s/${machineId}/${encodeURIComponent(sessionName)}`);
    },
    [router]
  );

  // Start new session
  const handleStartSession = useCallback(
    (machineId: string, project: string, environmentId?: string) => {
      // Navigate to new session URL pattern with optional environment
      let url = `/s/${machineId}/${encodeURIComponent(`${project}--new`)}`;
      if (environmentId) {
        url += `?env=${encodeURIComponent(environmentId)}`;
      }
      router.push(url);
    },
    [router]
  );

  // Machine click (go to machine's terminal page - for machines tab)
  const handleMachineClick = useCallback(
    (machineId: string) => {
      // If machine has sessions, go to the first one
      const machineSessions = sessionsByMachine.get(machineId)?.sessions || [];
      if (machineSessions.length > 0) {
        handleSelectSession(machineId, machineSessions[0].name);
      } else {
        // No sessions, open new session modal for this machine
        setNewSessionOpen(true);
      }
    },
    [sessionsByMachine, handleSelectSession]
  );

  // Stats
  const onlineMachines = machines.filter((m) => m.status === 'online');
  const offlineMachines = machines.filter((m) => m.status !== 'online');
  const allSessions = getAllSessions();

  // Calculate attention count
  const needsAttention = allSessions.filter(
    (s) => s.status === 'waiting' || s.status === 'permission'
  ).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a10] via-[#0d0d14] to-[#0a0a10]">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a10]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Claude Remote Control</h1>
                <p className="text-sm text-white/40">Mission Control</p>
              </div>
            </div>

            {/* Global Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="w-4 h-4 text-white/40" />
                <span className="text-emerald-400 font-medium">{onlineMachines.length}</span>
                <span className="text-white/30">/ {machines.length} machines</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-white/40" />
                <span className="text-white/70 font-medium">{allSessions.length}</span>
                <span className="text-white/30">sessions</span>
              </div>
              {needsAttention > 0 && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 font-medium">{needsAttention}</span>
                    <span className="text-white/30">need attention</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchMachines(true)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-white/40 hover:text-white hover:bg-white/5'
                )}
                aria-label="Refresh"
              >
                <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
              </button>

              <button
                onClick={() => setNewSessionOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                  'text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30',
                  'active:scale-[0.98]'
                )}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Session</span>
                <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] bg-white/20 rounded ml-1">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === 'sessions'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-white/50 border-transparent hover:text-white/70'
              )}
            >
              <List className="w-4 h-4" />
              Sessions
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'sessions' ? 'bg-orange-500/20' : 'bg-white/10'
                )}
              >
                {allSessions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('machines')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === 'machines'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-white/50 border-transparent hover:text-white/70'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Machines
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  activeTab === 'machines' ? 'bg-orange-500/20' : 'bg-white/10'
                )}
              >
                {machines.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('environments')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === 'environments'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-white/50 border-transparent hover:text-white/70'
              )}
            >
              <Settings className="w-4 h-4" />
              Environments
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          // Loading State
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : machines.length === 0 ? (
          // Empty State - No machines
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Monitor className="w-10 h-10 text-white/20" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">No machines registered</h2>
              <p className="text-white/40 mb-6">
                Start a local agent to register your first machine and begin managing Claude Code
                sessions remotely.
              </p>
              <code className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 font-mono">
                pnpm dev:agent
              </code>
            </motion.div>
          </div>
        ) : (
          // Content based on active tab
          <AnimatePresence mode="wait">
            {activeTab === 'sessions' ? (
              <motion.div
                key="sessions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {allSessions.length === 0 ? (
                  // No sessions empty state
                  <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-white/20" />
                      </div>
                      <h3 className="text-lg font-medium text-white/80 mb-2">No active sessions</h3>
                      <p className="text-sm text-white/40 mb-6">
                        Start a new session to begin working with Claude Code
                      </p>
                      <button
                        onClick={() => setNewSessionOpen(true)}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                          'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                          'text-white shadow-lg shadow-orange-500/20'
                        )}
                      >
                        <Plus className="w-4 h-4" />
                        New Session
                      </button>
                    </div>
                  </div>
                ) : (
                  <SessionListView
                    sessions={allSessions}
                    onSelectSession={handleSelectSession}
                  />
                )}
              </motion.div>
            ) : activeTab === 'machines' ? (
              <motion.div
                key="machines"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Machines</h2>
                  <span className="text-sm text-white/30">
                    {onlineMachines.length} online, {offlineMachines.length} offline
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {/* Online machines first */}
                    {onlineMachines.map((machine, index) => (
                      <motion.div
                        key={machine.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <MachineCard
                          machine={machine}
                          onClick={() => handleMachineClick(machine.id)}
                        />
                      </motion.div>
                    ))}

                    {/* Offline machines */}
                    {offlineMachines.map((machine, index) => (
                      <motion.div
                        key={machine.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.2,
                          delay: (onlineMachines.length + index) * 0.05,
                        }}
                      >
                        <MachineCard
                          machine={machine}
                          onClick={() => handleMachineClick(machine.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="environments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <EnvironmentsList machines={machines} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

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

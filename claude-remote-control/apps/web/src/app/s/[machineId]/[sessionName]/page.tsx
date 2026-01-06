'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  WifiOff,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { Editor } from '@/components/Editor';
import { EditorTerminalTabs, type ActiveTab } from '@/components/EditorTerminalTabs';
import { SessionSidebar } from '@/components/SessionSidebar';
import { NewSessionModal } from '@/components/NewSessionModal';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type SessionStatus } from '@/components/ui/status-badge';
import { type SessionInfo } from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface Machine {
  id: string;
  name: string;
  status: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = params.machineId as string;
  const sessionName = decodeURIComponent(params.sessionName as string);
  const environmentId = searchParams.get('env') || undefined;

  // Extract project from session name (format: project--adjective-noun-number)
  const projectFromSession = sessionName.split('--')[0];

  const [machine, setMachine] = useState<Machine | null>(null);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('terminal');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  const agentUrl = machine?.config?.agentUrl || 'localhost:4678';

  // Current session info
  const currentSessionInfo = useMemo(() => {
    return sessions.find((s) => s.name === sessionName);
  }, [sessions, sessionName]);

  const currentProject = currentSessionInfo?.project || projectFromSession;

  // Fetch machine data and all machines for the modal
  useEffect(() => {
    Promise.all([
      fetch(`/api/machines/${machineId}`).then((r) => {
        if (!r.ok) throw new Error('Machine not found');
        return r.json();
      }),
      fetch('/api/machines').then((r) => r.json()),
    ])
      .then(([currentMachine, machines]) => {
        setMachine(currentMachine);
        setAllMachines(machines);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [machineId]);

  // Fetch projects, sessions and folders
  useEffect(() => {
    if (!machine) return;

    const url = machine.config?.agentUrl || 'localhost:4678';
    const protocol = url.includes('localhost') ? 'http' : 'https';

    const fetchData = async () => {
      try {
        const [projectsRes, sessionsRes] = await Promise.all([
          fetch(`${protocol}://${url}/api/projects`),
          fetch(`${protocol}://${url}/api/sessions`),
        ]);

        if (projectsRes.ok) {
          const p: string[] = await projectsRes.json();
          setProjects(p);
        }

        if (sessionsRes.ok) {
          const s: SessionInfo[] = await sessionsRes.json();
          setSessions(s);
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
      }
    };

    fetchData();

    // Poll for sessions every 3s
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [machine]);

  // Navigate to a different session
  const handleSelectSession = useCallback(
    (newSessionName: string | null, project: string) => {
      if (newSessionName) {
        router.push(`/s/${machineId}/${encodeURIComponent(newSessionName)}`);
      }
    },
    [machineId, router]
  );

  // Handle new session button click - open modal
  const handleNewSessionClick = useCallback(() => {
    setShowNewSessionModal(true);
  }, []);

  // Handle new session creation from modal
  const handleNewSession = useCallback(
    (targetMachineId: string, project: string, envId?: string) => {
      setShowNewSessionModal(false);
      let url = `/s/${targetMachineId}/${encodeURIComponent(`${project}--new`)}`;
      if (envId) {
        url += `?env=${encodeURIComponent(envId)}`;
      }
      router.push(url);
    },
    [router]
  );

  // Handle session killed
  const handleSessionKilled = useCallback(() => {
    // Go back to dashboard
    router.push('/');
  }, [router]);

  // Handle session created - update URL with actual session name
  const handleSessionCreated = useCallback(
    (actualSessionName: string) => {
      if (actualSessionName && actualSessionName !== sessionName) {
        router.replace(`/s/${machineId}/${encodeURIComponent(actualSessionName)}`);
      }
    },
    [machineId, sessionName, router]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !machine) {
    return <ErrorState error={error} />;
  }

  return (
    <div
      className={cn(
        'h-screen flex flex-col overflow-hidden',
        'bg-gradient-to-br from-[#0a0a10] via-[#0d0d14] to-[#0a0a10]'
      )}
    >
      {/* Top Header */}
      <header
        className={cn(
          'flex items-center justify-between px-4 py-2.5',
          'bg-[#0d0d14]/80 backdrop-blur-xl',
          'border-b border-white/5'
        )}
      >
        {/* Left: Navigation & Session Info */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg',
              'text-white/50 hover:text-white hover:bg-white/5',
              'transition-all group'
            )}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div className="h-5 w-px bg-white/10" />

          {/* Session name - primary */}
          <div className="flex items-center gap-3">
            {currentSessionInfo && (
              <StatusBadge
                status={currentSessionInfo.status as SessionStatus}
                size="md"
                showTooltip
              />
            )}
            <div>
              <h1 className="text-base font-semibold text-white font-mono">
                {sessionName.split('--')[1] || sessionName}
              </h1>
              <p className="text-xs text-white/40">
                {currentProject} <span className="text-white/20">•</span>{' '}
                <span className="text-white/30">{machine.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full',
              'text-xs font-medium',
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Disconnected</span>
              </>
            )}
          </div>

          {/* Notifications Toggle */}
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              notificationsEnabled
                ? 'text-white/60 hover:text-white hover:bg-white/5'
                : 'text-white/30 hover:text-white/50 hover:bg-white/5'
            )}
            title={notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session Sidebar */}
        <SessionSidebar
          sessions={sessions}
          projects={projects}
          currentSessionName={sessionName}
          currentProject={currentProject}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSessionClick}
          onSessionKilled={handleSessionKilled}
          agentUrl={agentUrl}
        />

        {/* Terminal/Editor Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <EditorTerminalTabs activeTab={activeTab} onTabChange={setActiveTab} editorEnabled={true} />

          {/* Content based on active tab */}
          {activeTab === 'terminal' ? (
            <Terminal
              key={`${currentProject}-${sessionName}`}
              agentUrl={agentUrl}
              project={currentProject}
              sessionName={sessionName.endsWith('--new') ? undefined : sessionName}
              environmentId={environmentId}
              onConnectionChange={setIsConnected}
              onSessionCreated={handleSessionCreated}
              claudeStatus={currentSessionInfo?.status}
            />
          ) : (
            <Editor key={`editor-${currentProject}`} agentUrl={agentUrl} project={currentProject} />
          )}
        </main>
      </div>

      {/* New Session Modal */}
      <NewSessionModal
        open={showNewSessionModal}
        onOpenChange={setShowNewSessionModal}
        machines={allMachines}
        onStartSession={handleNewSession}
      />
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-[#0a0a10]">
      <header className="bg-[#0d0d14] border-b border-white/5">
        <div className="px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-6 w-16 bg-white/5" />
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg bg-white/5" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-24 bg-white/5" />
            </div>
          </div>
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded-full bg-white/5" />
        </div>
      </header>
      <div className="flex-1 flex">
        <div className="w-80 border-r border-white/5 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Skeleton className="h-6 w-48 mx-auto bg-white/5" />
            <Skeleton className="h-4 w-32 mx-auto bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Error state
function ErrorState({ error }: { error: string | null }) {
  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a10] p-4">
      <Card className="p-8 text-center max-w-md bg-[#12121a] border-white/10">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Session not found</h2>
        <p className="text-white/50 mb-6">
          {error || 'The session you are looking for does not exist or the machine is unavailable.'}
        </p>
        <Link
          href="/"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-orange-500 hover:bg-orange-400 text-white font-medium',
            'transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </Card>
    </div>
  );
}

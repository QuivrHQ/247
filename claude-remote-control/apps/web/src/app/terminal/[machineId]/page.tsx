'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Monitor,
  Wifi,
  WifiOff,
  Settings,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { SessionSidebar } from '@/components/SessionSidebar';
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

// Generate human-readable session names (duplicated from Terminal for preview)
function generateSessionName(project: string): string {
  const adjectives = ['brave', 'swift', 'calm', 'bold', 'wise', 'keen', 'fair', 'wild', 'bright', 'cool'];
  const nouns = ['lion', 'hawk', 'wolf', 'bear', 'fox', 'owl', 'deer', 'lynx', 'eagle', 'tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${project}--${adj}-${noun}-${num}`;
}

export default function TerminalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const machineId = params.machineId as string;

  const urlProject = searchParams.get('project');
  const urlSession = searchParams.get('session');

  const [machine, setMachine] = useState<Machine | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(urlProject || '');
  const [selectedSession, setSelectedSession] = useState<string>(urlSession || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const agentUrl = machine?.config?.agentUrl || 'localhost:4678';

  // Current session info
  const currentSessionInfo = useMemo(() => {
    return sessions.find((s) => s.name === selectedSession);
  }, [sessions, selectedSession]);

  // Sync URL params to state
  useEffect(() => {
    if (urlProject && urlProject !== selectedProject) {
      setSelectedProject(urlProject);
    }
    if (urlSession && urlSession !== selectedSession) {
      setSelectedSession(urlSession);
    }
  }, [urlProject, urlSession]);

  // Update URL when session changes
  const updateUrl = useCallback(
    (session: string | null, project: string) => {
      const params = new URLSearchParams();
      if (project) params.set('project', project);
      if (session) params.set('session', session);
      router.replace(`/terminal/${machineId}?${params.toString()}`, { scroll: false });
    },
    [machineId, router]
  );

  // Fetch machine data
  useEffect(() => {
    fetch(`/api/machines/${machineId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Machine not found');
        return r.json();
      })
      .then((data) => {
        setMachine(data);
        if (!urlProject && data.config?.projects?.length > 0) {
          setSelectedProject(data.config.projects[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [machineId, urlProject]);

  // Fetch projects and sessions
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
          if (!selectedProject && p.length > 0) {
            setSelectedProject(p[0]);
          }
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
  }, [machine, selectedProject]);

  // Handle session selection
  const handleSelectSession = useCallback(
    (sessionName: string | null, project: string) => {
      setSelectedProject(project);
      setSelectedSession(sessionName || '');
      updateUrl(sessionName, project);
    },
    [updateUrl]
  );

  // Handle new session creation
  const handleNewSession = useCallback(
    (project: string) => {
      setSelectedProject(project);
      setSelectedSession('');
      updateUrl(null, project);
    },
    [updateUrl]
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
        {/* Left: Navigation & Machine Info */}
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

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br from-orange-500/20 to-amber-500/20',
                'border border-orange-500/20'
              )}
            >
              <Monitor className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">{machine.name}</h1>
              <p className="text-xs text-white/40 font-mono">{agentUrl}</p>
            </div>
          </div>
        </div>

        {/* Center: Current Session Info */}
        <AnimatePresence mode="wait">
          {currentSessionInfo && (
            <motion.div
              key={currentSessionInfo.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3"
            >
              <StatusBadge
                status={currentSessionInfo.status as SessionStatus}
                size="md"
                showTooltip
              />
              <span className="text-sm text-white/60 font-mono">
                {currentSessionInfo.name.split('--')[1] || currentSessionInfo.name}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

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
            {notificationsEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
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
          currentSessionName={selectedSession || null}
          currentProject={selectedProject}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          agentUrl={agentUrl}
        />

        {/* Terminal Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedProject ? (
            <Terminal
              key={`${selectedProject}-${selectedSession || 'new'}`}
              agentUrl={agentUrl}
              project={selectedProject}
              sessionName={selectedSession || undefined}
              onConnectionChange={setIsConnected}
              claudeStatus={currentSessionInfo?.status}
            />
          ) : (
            <EmptyState onSelectProject={(p) => handleNewSession(p)} projects={projects} />
          )}
        </main>
      </div>
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
            <Skeleton className="w-10 h-10 rounded-xl bg-white/5" />
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
        <h2 className="text-xl font-semibold text-white mb-2">Machine not found</h2>
        <p className="text-white/50 mb-6">
          {error || 'The machine you are looking for does not exist or is unavailable.'}
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

// Empty state when no project selected
function EmptyState({
  onSelectProject,
  projects,
}: {
  onSelectProject: (project: string) => void;
  projects: string[];
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className={cn(
            'w-20 h-20 rounded-2xl mx-auto mb-6',
            'bg-gradient-to-br from-orange-500/20 to-amber-500/20',
            'border border-orange-500/20',
            'flex items-center justify-center'
          )}
        >
          <Monitor className="w-10 h-10 text-orange-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Select a project</h2>
        <p className="text-white/50 mb-6">
          Choose a project from the sidebar or create a new session to get started.
        </p>
        {projects.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {projects.slice(0, 5).map((project) => (
              <button
                key={project}
                onClick={() => onSelectProject(project)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white',
                  'border border-white/10 hover:border-white/20',
                  'transition-all'
                )}
              >
                {project}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

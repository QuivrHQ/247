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
  Plus,
  X,
  FolderOpen,
  GitBranch,
  ChevronDown,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { Editor } from '@/components/Editor';
import { EditorTerminalTabs, type ActiveTab } from '@/components/EditorTerminalTabs';
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

export default function TerminalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const machineId = params.machineId as string;

  const urlProject = searchParams.get('project');
  const urlSession = searchParams.get('session');
  const urlEnvironment = searchParams.get('environment');

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
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('terminal');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);

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

  // Fetch projects, sessions and folders
  useEffect(() => {
    if (!machine) return;

    const url = machine.config?.agentUrl || 'localhost:4678';
    const protocol = url.includes('localhost') ? 'http' : 'https';

    const fetchData = async () => {
      try {
        const [projectsRes, sessionsRes, foldersRes] = await Promise.all([
          fetch(`${protocol}://${url}/api/projects`),
          fetch(`${protocol}://${url}/api/sessions`),
          fetch(`${protocol}://${url}/api/folders`),
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

        if (foldersRes.ok) {
          const f: string[] = await foldersRes.json();
          setFolders(f);
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
      setShowEmptyState(false);
      updateUrl(sessionName, project);
    },
    [updateUrl]
  );

  // Handle new session button click - open modal
  const handleNewSessionClick = useCallback((_project: string) => {
    setShowNewSessionModal(true);
  }, []);

  // Handle new session creation from modal
  const handleNewSession = useCallback(
    (project: string) => {
      setSelectedProject(project);
      setSelectedSession('');
      setShowEmptyState(false);
      setShowNewSessionModal(false);
      updateUrl(null, project);
    },
    [updateUrl]
  );

  // Handle session killed
  const handleSessionKilled = useCallback(() => {
    setSelectedSession('');
    setShowEmptyState(true);
    updateUrl(null, selectedProject);
  }, [selectedProject, updateUrl]);

  // Handle session created - sync URL with actual session name
  const handleSessionCreated = useCallback(
    (sessionName: string) => {
      if (sessionName && sessionName !== selectedSession) {
        setSelectedSession(sessionName);
        updateUrl(sessionName, selectedProject);
      }
    },
    [selectedSession, selectedProject, updateUrl]
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
          onNewSession={handleNewSessionClick}
          onSessionKilled={handleSessionKilled}
          agentUrl={agentUrl}
        />

        {/* Terminal/Editor Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedProject ? (
            <EmptyState onSelectProject={(p) => handleNewSession(p)} projects={projects} />
          ) : showEmptyState ? (
            <NoActiveSession onNewSession={() => handleNewSession(selectedProject)} />
          ) : (
            <>
              {/* Tab Bar */}
              <EditorTerminalTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                editorEnabled={true}
              />

              {/* Content based on active tab */}
              {activeTab === 'terminal' ? (
                <Terminal
                  key={`${selectedProject}-${selectedSession || 'new'}`}
                  agentUrl={agentUrl}
                  project={selectedProject}
                  sessionName={selectedSession || undefined}
                  environmentId={currentSessionInfo?.environmentId || urlEnvironment || undefined}
                  onConnectionChange={setIsConnected}
                  onSessionCreated={handleSessionCreated}
                  claudeStatus={currentSessionInfo?.status}
                />
              ) : (
                <Editor
                  key={`editor-${selectedProject}`}
                  agentUrl={agentUrl}
                  project={selectedProject}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* New Session Modal */}
      <NewSessionProjectModal
        open={showNewSessionModal}
        onOpenChange={setShowNewSessionModal}
        folders={folders}
        currentProject={selectedProject}
        machineName={machine.name}
        agentUrl={agentUrl}
        onStartSession={handleNewSession}
      />
    </div>
  );
}

// New Session Project Modal
interface NewSessionProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: string[];
  currentProject: string;
  machineName: string;
  agentUrl: string;
  onStartSession: (project: string) => void;
}

function NewSessionProjectModal({
  open,
  onOpenChange,
  folders,
  currentProject,
  machineName,
  agentUrl,
  onStartSession,
}: NewSessionProjectModalProps) {
  const [selectedProject, setSelectedProject] = useState<string>(currentProject);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // Clone state
  const [activeTab, setActiveTab] = useState<'select' | 'clone'>('select');
  const [repoUrl, setRepoUrl] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [previewedName, setPreviewedName] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<string[]>(folders);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedProject(currentProject || (folders[0] || ''));
      setProjectDropdownOpen(false);
      setActiveTab('select');
      setRepoUrl('');
      setCustomProjectName('');
      setPreviewedName('');
      setCloneError(null);
      setCloneSuccess(null);
      setLocalFolders(folders);
    }
  }, [open, currentProject, folders]);

  // Preview project name from URL
  useEffect(() => {
    if (!repoUrl) {
      setPreviewedName('');
      return;
    }

    const previewName = async () => {
      try {
        const protocol = agentUrl.includes('localhost') ? 'http' : 'https';
        const response = await fetch(
          `${protocol}://${agentUrl}/api/clone/preview?url=${encodeURIComponent(repoUrl)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPreviewedName(data.projectName);
        }
      } catch {
        const parts = repoUrl.replace(/\.git$/, '').split('/');
        setPreviewedName(parts[parts.length - 1] || '');
      }
    };

    const timer = setTimeout(previewName, 300);
    return () => clearTimeout(timer);
  }, [repoUrl, agentUrl]);

  // Handle clone
  const handleClone = async () => {
    if (!repoUrl) return;

    setCloning(true);
    setCloneError(null);
    setCloneSuccess(null);

    try {
      const protocol = agentUrl.includes('localhost') ? 'http' : 'https';

      const response = await fetch(`${protocol}://${agentUrl}/api/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          projectName: customProjectName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCloneSuccess(data.projectName);
        setLocalFolders((prev) => [...prev, data.projectName].sort());
        setSelectedProject(data.projectName);
        setTimeout(() => {
          setActiveTab('select');
          setRepoUrl('');
          setCustomProjectName('');
          setCloneSuccess(null);
        }, 1500);
      } else {
        setCloneError(data.error || 'Clone failed');
      }
    } catch {
      setCloneError('Network error - could not connect to agent');
    } finally {
      setCloning(false);
    }
  };

  // Keyboard shortcut handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
      if (e.key === 'Enter' && selectedProject && activeTab === 'select') {
        onStartSession(selectedProject);
      }
    },
    [onOpenChange, onStartSession, selectedProject, activeTab]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleStart = () => {
    if (selectedProject) {
      onStartSession(selectedProject);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full max-w-lg mx-4',
              'bg-[#0d0d14] border border-white/10 rounded-2xl',
              'shadow-2xl shadow-black/50'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">New Session</h2>
                  <p className="text-sm text-white/40">{machineName}</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Tab Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('select')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'select'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                  )}
                >
                  <FolderOpen className="w-4 h-4" />
                  Select Folder
                </button>
                <button
                  onClick={() => setActiveTab('clone')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'clone'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                  )}
                >
                  <GitBranch className="w-4 h-4" />
                  Clone Repo
                </button>
              </div>

              {/* Select Folder Tab */}
              {activeTab === 'select' && (
                <>
                  <label className="block text-sm font-medium text-white/60 mb-3">
                    Select Project
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl text-left',
                        'bg-white/5 border border-white/10',
                        'hover:bg-white/10 hover:border-white/20',
                        'flex items-center justify-between',
                        'transition-all'
                      )}
                    >
                      <span className={selectedProject ? 'text-white' : 'text-white/40'}>
                        {selectedProject || 'Choose a project...'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-white/40 transition-transform',
                          projectDropdownOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {projectDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'absolute top-full left-0 right-0 mt-2 z-10',
                            'bg-[#12121a] border border-white/10 rounded-xl',
                            'shadow-xl shadow-black/50',
                            'max-h-64 overflow-y-auto'
                          )}
                        >
                          {localFolders.length > 0 ? (
                            localFolders.map((folder) => (
                              <button
                                key={folder}
                                onClick={() => {
                                  setSelectedProject(folder);
                                  setProjectDropdownOpen(false);
                                }}
                                className={cn(
                                  'w-full px-4 py-2.5 text-left',
                                  'hover:bg-white/5 transition-colors',
                                  'first:rounded-t-xl last:rounded-b-xl',
                                  selectedProject === folder
                                    ? 'text-orange-400 bg-orange-500/10'
                                    : 'text-white/80'
                                )}
                              >
                                {folder}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-white/30 text-sm">
                              No folders found
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Clone Repo Tab */}
              {activeTab === 'clone' && (
                <div className="space-y-4">
                  {/* Success Message */}
                  {cloneSuccess && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">
                        Successfully cloned <strong>{cloneSuccess}</strong>
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {cloneError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{cloneError}</span>
                    </div>
                  )}

                  {/* Repo URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/repo or git@github.com:user/repo"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-white/5 border border-white/10',
                        'text-white placeholder:text-white/30',
                        'focus:outline-none focus:border-orange-500/50 focus:bg-white/10',
                        'transition-all'
                      )}
                    />
                  </div>

                  {/* Project Name (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      Project Name <span className="text-white/30">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value)}
                      placeholder={previewedName || 'Auto-detected from URL'}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl',
                        'bg-white/5 border border-white/10',
                        'text-white placeholder:text-white/30',
                        'focus:outline-none focus:border-orange-500/50 focus:bg-white/10',
                        'transition-all'
                      )}
                    />
                    {previewedName && !customProjectName && (
                      <p className="text-xs text-white/40 mt-1.5">
                        Will be cloned as: <span className="text-orange-400">{previewedName}</span>
                      </p>
                    )}
                  </div>

                  {/* Clone Button */}
                  <button
                    onClick={handleClone}
                    disabled={!repoUrl || cloning}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                      repoUrl && !cloning
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {cloning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cloning...
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-4 h-4" />
                        Clone Repository
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer - only show start button when on select tab */}
            {activeTab === 'select' && (
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-white/30">
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50 font-mono">
                    Enter
                  </kbd>{' '}
                  to start
                </p>
                <button
                  onClick={handleStart}
                  disabled={!selectedProject}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                    selectedProject
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Start Session
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

// Empty state when session is killed
function NoActiveSession({ onNewSession }: { onNewSession: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className={cn(
            'w-20 h-20 rounded-2xl mx-auto mb-6',
            'bg-gradient-to-br from-zinc-500/20 to-zinc-600/20',
            'border border-zinc-500/20',
            'flex items-center justify-center'
          )}
        >
          <Monitor className="w-10 h-10 text-zinc-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Session terminee</h2>
        <p className="text-white/50 mb-6">
          La session a ete fermee. Creez une nouvelle session ou selectionnez-en une existante.
        </p>
        <button
          onClick={onNewSession}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
            'bg-gradient-to-r from-orange-500 to-amber-500',
            'hover:from-orange-400 hover:to-amber-400',
            'text-white font-medium',
            'shadow-lg shadow-orange-500/20',
            'transition-all'
          )}
        >
          <Plus className="w-4 h-4" />
          Nouvelle session
        </button>
      </div>
    </div>
  );
}

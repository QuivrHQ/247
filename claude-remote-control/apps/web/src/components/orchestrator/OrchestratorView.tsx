'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  DollarSign,
  GitBranch,
  Loader2,
  Pause,
  Play,
  X,
  Cpu,
  Activity,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Plus,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import { cn, buildApiUrl } from '@/lib/utils';
import { StatusLED } from './StatusLED';
import { SegmentedProgress } from './SegmentedProgress';
import { AgentCard } from './AgentCard';
import { ChatMessage } from './ChatMessage';
import { DecisionModal } from './DecisionModal';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import { loadAgentConnection } from '@/components/AgentConnectionSettings';
import { ProjectDropdown } from '@/components/NewSessionModal/ProjectDropdown';
import type { Orchestration } from './types';

export function OrchestratorView() {
  const searchParams = useSearchParams();
  const orchestrationId = searchParams.get('id');
  const projectParam = searchParams.get('project');

  // Load agent connection from localStorage
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [project, setProject] = useState<string>(projectParam || '');
  const [folders, setFolders] = useState<string[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  useEffect(() => {
    const connection = loadAgentConnection();
    if (connection?.url) {
      setAgentUrl(connection.url);
    }
  }, []);

  // Fetch available folders from agent
  useEffect(() => {
    if (!agentUrl) return;

    const fetchFolders = async () => {
      setLoadingFolders(true);
      try {
        const response = await fetch(buildApiUrl(agentUrl, '/api/folders'));
        if (response.ok) {
          const folderList: string[] = await response.json();
          setFolders(folderList);
        }
      } catch (err) {
        console.error('Failed to fetch folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };

    fetchFolders();
  }, [agentUrl, project, projectParam]);

  // Use the orchestrator hook
  const {
    orchestration,
    messages,
    isConnected,
    isLoading,
    error,
    fetchOrchestration,
    createOrchestration,
    sendMessage,
    cancelOrchestration,
    listOrchestrations,
    reset,
  } = useOrchestrator({
    agentUrl: agentUrl || 'localhost:4678',
    project,
  });

  const [input, setInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [orchestrationList, setOrchestrationList] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
      totalCostUsd: number;
      createdAt: number;
    }>
  >([]);
  const [showList, setShowList] = useState(!orchestrationId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing orchestration if ID is provided
  useEffect(() => {
    if (orchestrationId && agentUrl) {
      fetchOrchestration(orchestrationId);
    }
  }, [orchestrationId, agentUrl, fetchOrchestration]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch orchestration list when showing list view
  useEffect(() => {
    if (agentUrl && project && showList) {
      listOrchestrations().then(setOrchestrationList);
    }
  }, [agentUrl, project, showList, listOrchestrations]);

  const activeAgents = orchestration?.agents.filter((a) => a.status === 'running').length || 0;
  const completedAgents = orchestration?.agents.filter((a) => a.status === 'completed').length || 0;
  const failedAgents = orchestration?.agents.filter((a) => a.status === 'failed').length || 0;

  const handleSend = async () => {
    if (!input.trim() || !project) return;

    const message = input.trim();
    setInput('');

    if (orchestration) {
      // Send message to existing orchestration
      await sendMessage(orchestration.id, message);
    } else {
      // Create new orchestration
      await createOrchestration(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancel = async () => {
    if (orchestration) {
      await cancelOrchestration(orchestration.id);
    }
  };

  // Show empty state if no agent URL configured
  if (!agentUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080c] text-zinc-100">
        <div className="space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h2 className="text-xl font-semibold">No Agent Connected</h2>
          <p className="max-w-md text-zinc-400">
            Configure your agent connection in the dashboard settings to use the orchestrator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Show project selector if no project specified
  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080c] text-zinc-100">
        <div className="w-full max-w-md space-y-6 px-4 text-center">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20">
                <FolderOpen className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Select a Project</h2>
            <p className="text-zinc-400">Choose a project folder to start orchestrating tasks.</p>
          </div>
          <div className="space-y-4 text-left">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-400">Project Folder</label>
              <ProjectDropdown
                folders={folders}
                selectedProject={project}
                onSelectProject={setProject}
                loading={loadingFolders}
                accentColor="purple"
              />
            </div>
            {folders.length === 0 && !loadingFolders && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400/80">
                No projects found. Make sure your agent is running and has projects configured.
              </p>
            )}
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080c] text-zinc-100">
        <div className="space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="text-xl font-semibold">Error</h2>
          <p className="max-w-md text-zinc-400">{error}</p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show orchestration list when no specific ID
  if (showList && project) {
    return (
      <div className="flex h-screen flex-col bg-[#08080c] text-zinc-100">
        {/* Header */}
        <header className="border-b border-zinc-800/60 bg-zinc-950/90 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="-ml-2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Orchestrations</h1>
                  <p className="font-mono text-xs text-zinc-500">{project}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowList(false)}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-cyan-400 transition-colors hover:bg-cyan-500/30"
            >
              <Plus className="h-4 w-4" />
              New Orchestration
            </button>
          </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {orchestrationList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                <Sparkles className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-zinc-400">No orchestrations yet</p>
              <p className="mt-1 text-sm text-zinc-600">Start a new one to get going!</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-3">
              {orchestrationList.map((orch) => (
                <Link
                  key={orch.id}
                  href={`/orchestrator?project=${project}&id=${orch.id}`}
                  className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-zinc-200 transition-colors group-hover:text-cyan-400">
                        {orch.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(orch.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 font-mono text-xs',
                          getOrchestrationStatusClass(orch.status)
                        )}
                      >
                        {orch.status}
                      </span>
                      <span className="font-mono text-xs text-zinc-500">
                        ${orch.totalCostUsd.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#08080c] text-zinc-100">
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 213, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 213, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          {/* Left: Back + Title */}
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <Link
              href="/"
              className="-ml-2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                </div>
                {(orchestration?.status === 'executing' || isLoading) && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,255,213,0.6)]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
                    Orchestrator
                  </h1>
                  {orchestration && <StatusBadge status={orchestration.status} />}
                  {!orchestration && !isLoading && (
                    <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      New
                    </span>
                  )}
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                </div>
                <p className="max-w-[200px] truncate font-mono text-xs text-zinc-500 md:max-w-md">
                  {orchestration?.name || `Project: ${project}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Stats + Controls */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Stats - hidden on mobile, only show when orchestration exists */}
            {orchestration && (
              <div className="hidden items-center gap-6 text-sm md:flex">
                <StatItem
                  icon={<Activity className="h-4 w-4 text-cyan-400" />}
                  value={activeAgents}
                  total={orchestration.agents.length}
                  label="active"
                  accentColor="cyan"
                />
                <StatItem
                  icon={<GitBranch className="h-4 w-4 text-amber-400" />}
                  value={orchestration.currentIteration}
                  total={orchestration.maxIterations}
                  label="iter"
                  accentColor="amber"
                />
                <StatItem
                  icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
                  value={orchestration.totalCost.toFixed(2)}
                  label=""
                  accentColor="emerald"
                />
              </div>
            )}

            {/* Connection indicator */}
            <div
              className={cn(
                'hidden items-center gap-1.5 text-xs md:flex',
                isConnected ? 'text-emerald-400' : 'text-zinc-500'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isConnected ? 'bg-emerald-400' : 'bg-zinc-500'
                )}
              />
              {isConnected ? 'Live' : 'Offline'}
            </div>

            {/* Controls - only show when orchestration exists */}
            {orchestration && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={cn(
                    'rounded-lg border p-2 transition-all duration-200',
                    isPaused
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  )}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-all duration-200 hover:border-red-500/30 hover:text-red-400"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar - only show when orchestration exists */}
        {orchestration && (
          <div className="px-4 pb-3 md:px-6">
            <div className="flex items-center gap-3">
              <span className="w-10 font-mono text-xs tabular-nums text-zinc-500">
                {orchestration.progress}%
              </span>
              <SegmentedProgress value={orchestration.progress} segments={50} className="flex-1" />
            </div>
          </div>
        )}
      </header>

      {/* Mobile stats bar - only show when orchestration exists */}
      {orchestration && (
        <div className="flex items-center justify-around border-b border-zinc-800/40 bg-zinc-950/50 px-4 py-2 md:hidden">
          <StatItem
            icon={<Activity className="h-3.5 w-3.5 text-cyan-400" />}
            value={activeAgents}
            total={orchestration.agents.length}
            label=""
            accentColor="cyan"
            compact
          />
          <StatItem
            icon={<GitBranch className="h-3.5 w-3.5 text-amber-400" />}
            value={orchestration.currentIteration}
            total={orchestration.maxIterations}
            label=""
            accentColor="amber"
            compact
          />
          <StatItem
            icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}
            value={`$${orchestration.totalCost.toFixed(2)}`}
            label=""
            accentColor="emerald"
            compact
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Chat panel */}
        <div className="flex flex-1 flex-col border-r border-zinc-800/40 md:w-[45%] md:max-w-[600px]">
          {/* Messages */}
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {/* Empty state for new orchestration */}
            {messages.length === 0 && !isLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm space-y-3 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                    <Sparkles className="h-8 w-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-200">Start a new orchestration</h3>
                  <p className="text-sm text-zinc-500">
                    Describe a complex task and the orchestrator will break it down into subtasks,
                    ask clarifying questions, and coordinate multiple AI agents to complete it.
                  </p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="space-y-3 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
                  <p className="text-sm text-zinc-500">Loading orchestration...</p>
                </div>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((message, i) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={i === messages.length - 1}
                />
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-zinc-800/40 bg-zinc-950/60 p-3 md:p-4">
            <div className="flex items-end gap-2 md:gap-3">
              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    orchestration
                      ? 'Answer questions or provide guidance...'
                      : "Describe your task (e.g., 'Add tests to the auth module')..."
                  }
                  rows={1}
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'rounded-xl p-3 transition-all duration-200',
                  input.trim() && !isLoading
                    ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/30'
                    : 'cursor-not-allowed border border-zinc-800 bg-zinc-900 text-zinc-600'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Agents panel */}
        <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950/20">
          {/* Panel header */}
          <div className="flex-shrink-0 border-b border-zinc-800/40 px-4 py-3 md:px-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span>Sub-Agents</span>
                <span className="ml-1 font-mono text-xs text-zinc-600">
                  {completedAgents}/{orchestration?.agents.length || 0}
                </span>
              </h2>
              {failedAgents > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{failedAgents} retrying</span>
                </div>
              )}
            </div>
          </div>

          {/* Agents grid */}
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800 flex-1 overflow-y-auto p-4 md:p-6">
            {/* Empty state when no agents */}
            {(!orchestration || orchestration.agents.length === 0) && (
              <div className="flex h-full items-center justify-center">
                <div className="space-y-2 text-center text-zinc-500">
                  <Cpu className="mx-auto h-8 w-8 opacity-40" />
                  <p className="text-sm">No agents deployed yet</p>
                  <p className="text-xs text-zinc-600">
                    Agents will appear here once the orchestrator starts execution
                  </p>
                </div>
              </div>
            )}

            {orchestration && orchestration.agents.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
                  {orchestration.agents.map((agent, i) => (
                    <AgentCard key={agent.id} agent={agent} index={i} />
                  ))}
                </div>

                {/* Iteration log */}
                {orchestration.currentIteration > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
                  >
                    <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
                      <GitBranch className="h-3.5 w-3.5" />
                      Iteration Log
                    </h3>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-start gap-2 text-zinc-400">
                        <span className="flex-shrink-0 text-amber-500">
                          #{orchestration.currentIteration}
                        </span>
                        <span className="text-zinc-500">Iteration in progress...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      <DecisionModal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title="Max iterations reached"
        description="The orchestrator has reached the maximum number of iterations. How would you like to proceed?"
        options={[
          { label: 'Continue with 3 more iterations', value: 'continue' },
          { label: 'Stop and show results', value: 'stop' },
          { label: 'Cancel orchestration', value: 'cancel' },
        ]}
        onSelect={(value) => {
          console.log('Selected:', value);
          setShowDecisionModal(false);
        }}
      />
    </div>
  );
}

// Helper functions
function getOrchestrationStatusClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'executing':
      return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30';
  }
}

// Status badge component
const STATUS_CONFIG: Record<Orchestration['status'], { color: string; label: string }> = {
  planning: { color: 'violet', label: 'Planning' },
  clarifying: { color: 'amber', label: 'Clarifying' },
  executing: { color: 'cyan', label: 'Executing' },
  iterating: { color: 'orange', label: 'Iterating' },
  paused: { color: 'zinc', label: 'Paused' },
  completed: { color: 'emerald', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
};

function getStatusLEDState(status: Orchestration['status']): 'running' | 'completed' | 'pending' {
  switch (status) {
    case 'executing':
      return 'running';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

function StatusBadge({ status }: { status: Orchestration['status'] }) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        `bg-${config.color}-500/10 border-${config.color}-500/30 text-${config.color}-400`
      )}
    >
      <StatusLED status={getStatusLEDState(status)} size="sm" />
      {config.label}
    </div>
  );
}

// Stat item component
function StatItem({
  icon,
  value,
  total,
  label,
  accentColor,
  compact = false,
}: {
  icon: React.ReactNode;
  value: number | string;
  total?: number;
  label: string;
  accentColor: 'cyan' | 'amber' | 'emerald';
  compact?: boolean;
}) {
  const colorClasses = {
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className={cn('flex items-center gap-2 text-zinc-400', compact && 'text-xs')}>
      {icon}
      <span className="font-mono">
        <span className={colorClasses[accentColor]}>{value}</span>
        {total !== undefined && (
          <>
            <span className="text-zinc-600">/</span>
            <span>{total}</span>
          </>
        )}
      </span>
      {label && <span className="text-xs text-zinc-600">{label}</span>}
    </div>
  );
}

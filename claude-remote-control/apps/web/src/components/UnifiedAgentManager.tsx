'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Monitor,
  Globe,
  Cloud,
  Wifi,
  WifiOff,
  Play,
  Moon,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Server,
  Github,
  ChevronRight,
  Activity,
  Rocket,
  Unplug,
  Home,
  ArrowLeft,
  AlertTriangle,
  Check,
  Copy,
  ChevronDown,
  Info,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn, buildWebSocketUrl, stripProtocol } from '@/lib/utils';
import type { StoredAgentConnection } from './AgentConnectionSettings';
import type { CloudAgent } from '@/hooks/useAgents';
import type { FlyioStatus } from '@/hooks/useFlyioStatus';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedAgentManagerProps {
  open: boolean;
  onClose: () => void;
  // Connected agents (from localStorage)
  connectedAgents: StoredAgentConnection[];
  // Connection status per agent
  agentStatuses: Map<string, 'online' | 'offline' | 'connecting'>;
  // Session count per agent
  sessionCounts: Map<string, number>;
  // Handlers for connected agents
  onDisconnectAgent: (id: string) => void;
  onConnectNewAgent: (connection: Omit<StoredAgentConnection, 'id' | 'createdAt'>) => void;
  // Cloud-related props
  isAuthenticated: boolean;
  flyioStatus: FlyioStatus | null;
  flyioLoading?: boolean;
  cloudAgents: CloudAgent[];
  cloudAgentsLoading?: boolean;
  // Cloud handlers
  onSignIn?: () => void;
  onFlyioConnect?: () => void;
  onFlyioDisconnect?: () => void;
  onLaunchCloudAgent?: () => void;
  onStartCloudAgent?: (id: string) => Promise<boolean>;
  onStopCloudAgent?: (id: string) => Promise<boolean>;
  onDeleteCloudAgent?: (id: string) => Promise<boolean>;
}

type ViewState = 'main' | 'add-local' | 'add-tailscale' | 'add-custom';
type AgentMethod = 'localhost' | 'tailscale' | 'custom' | 'cloud';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const connectionStatusConfig = {
  online: {
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    label: 'Online',
    pulse: true,
  },
  offline: {
    color: 'bg-red-500/60',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Offline',
    pulse: false,
  },
  connecting: {
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'Connecting',
    pulse: true,
  },
};

const cloudStatusConfig: Record<
  CloudAgent['status'],
  { color: string; textColor: string; bgColor: string; label: string; canConnect: boolean }
> = {
  pending: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Pending',
    canConnect: false,
  },
  creating_app: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_volume: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_machine: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  running: {
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    label: 'Running',
    canConnect: true,
  },
  stopped: {
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Sleeping',
    canConnect: true,
  },
  starting: {
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Waking...',
    canConnect: false,
  },
  stopping: {
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Stopping...',
    canConnect: false,
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Error',
    canConnect: false,
  },
};

const methodConfig: Record<AgentMethod, { icon: typeof Monitor; color: string; label: string }> = {
  localhost: { icon: Monitor, color: 'emerald', label: 'Local' },
  tailscale: { icon: Globe, color: 'blue', label: 'Tailscale' },
  custom: { icon: Wifi, color: 'amber', label: 'Custom' },
  cloud: { icon: Cloud, color: 'purple', label: 'Cloud' },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Slide-over animation variants
const slideVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

// Connected agent card
function ConnectedAgentCard({
  agent,
  status,
  sessionCount,
  onDisconnect,
  isOnlyAgent,
}: {
  agent: StoredAgentConnection;
  status: 'online' | 'offline' | 'connecting';
  sessionCount: number;
  onDisconnect: () => void;
  isOnlyAgent: boolean;
}) {
  const methodCfg = methodConfig[agent.method];
  const statusCfg = connectionStatusConfig[status];
  const Icon = methodCfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-3">
        {/* Icon with status ring */}
        <div className="relative shrink-0">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                methodCfg.color === 'emerald'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : methodCfg.color === 'blue'
                    ? 'rgba(59, 130, 246, 0.15)'
                    : methodCfg.color === 'purple'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{
                color:
                  status === 'online'
                    ? methodCfg.color === 'emerald'
                      ? 'rgb(16, 185, 129)'
                      : methodCfg.color === 'blue'
                        ? 'rgb(59, 130, 246)'
                        : methodCfg.color === 'purple'
                          ? 'rgb(168, 85, 247)'
                          : 'rgb(245, 158, 11)'
                    : 'rgba(255, 255, 255, 0.3)',
              }}
            />
          </div>
          {/* Status dot */}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a10]',
              statusCfg.color
            )}
          />
        </div>

        {/* Agent info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{agent.name}</p>
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                statusCfg.bgColor,
                statusCfg.textColor
              )}
            >
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-white/40">{agent.url}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor:
                  methodCfg.color === 'emerald'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : methodCfg.color === 'blue'
                      ? 'rgba(59, 130, 246, 0.15)'
                      : methodCfg.color === 'purple'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                color:
                  methodCfg.color === 'emerald'
                    ? 'rgb(16, 185, 129)'
                    : methodCfg.color === 'blue'
                      ? 'rgb(59, 130, 246)'
                      : methodCfg.color === 'purple'
                        ? 'rgb(168, 85, 247)'
                        : 'rgb(245, 158, 11)',
              }}
            >
              {methodCfg.label}
            </span>
            {sessionCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Activity className="h-3 w-3" />
                {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Disconnect button */}
        <button
          onClick={onDisconnect}
          disabled={isOnlyAgent}
          className={cn(
            'shrink-0 rounded-lg p-2 transition-all',
            isOnlyAgent
              ? 'cursor-not-allowed text-white/10'
              : 'text-white/30 hover:bg-red-500/10 hover:text-red-400'
          )}
          title={isOnlyAgent ? 'Cannot disconnect only agent' : 'Disconnect'}
        >
          <WifiOff className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Cloud agent card (not yet connected)
function CloudAgentCard({
  agent,
  isConnected,
  onConnect,
  onStart,
  onStop,
  onDelete,
  loadingAction,
}: {
  agent: CloudAgent;
  isConnected: boolean;
  onConnect: () => void;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
  loadingAction: string | null;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const statusCfg = cloudStatusConfig[agent.status];
  const isLoading = !!loadingAction;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group relative rounded-xl border p-3 transition-colors',
        isConnected
          ? 'border-purple-500/30 bg-purple-500/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
            <Cloud className="h-5 w-5 text-purple-400" />
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a10]',
              statusCfg.color
            )}
          />
        </div>

        {/* Agent info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-sm text-white">{agent.hostname}</p>
            {isConnected && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                Connected
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                statusCfg.bgColor,
                statusCfg.textColor
              )}
            >
              {statusCfg.label}
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
              {agent.region.toUpperCase()}
            </span>
          </div>
          {agent.status === 'error' && agent.errorMessage && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400/80">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{agent.errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {showDeleteConfirm ? (
          <>
            <span className="text-xs text-white/50">Delete this agent?</span>
            <button
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              disabled={isLoading}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
            >
              {loadingAction === 'delete' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isLoading}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              No
            </button>
          </>
        ) : (
          <>
            {!isConnected && statusCfg.canConnect && (
              <button
                onClick={onConnect}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  agent.status === 'stopped'
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                )}
              >
                {agent.status === 'stopped' ? (
                  <>
                    <Moon className="h-3 w-3" />
                    Wake & Connect
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3" />
                    Connect
                  </>
                )}
              </button>
            )}

            {agent.status === 'stopped' && (
              <button
                onClick={onStart}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {loadingAction === 'start' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Wake
              </button>
            )}

            {agent.status === 'running' && (
              <button
                onClick={onStop}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {loadingAction === 'stop' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Moon className="h-3 w-3" />
                )}
                Sleep
              </button>
            )}

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-50"
              title="Delete agent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Add agent option card
function AddAgentOption({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor,
  onClick,
}: {
  icon: typeof Monitor;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/10">
        <Icon className="h-5 w-5 text-white/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{title}</span>
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', badgeColor)}>
            {badge}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/40">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40" />
    </button>
  );
}

// Tailscale setup guide
function TailscaleGuide() {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const steps = [
    { label: 'Install Tailscale', command: 'brew install tailscale' },
    { label: 'Login to your tailnet', command: 'tailscale up' },
    { label: 'Enable Funnel', command: 'tailscale funnel --bg --https=4678 localhost:4678' },
    { label: 'Get your URL', command: 'tailscale funnel status' },
  ];

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
          <Info className="h-4 w-4" />
          <span>Setup Tailscale Funnel</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-blue-400 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 border-t border-blue-500/10 p-3 pt-2.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-medium text-blue-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs text-white/60">{step.label}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-white/5 px-2 py-1 font-mono text-xs text-white/80">
                        {step.command}
                      </code>
                      <button
                        onClick={() => copyToClipboard(step.command)}
                        className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add agent form views
function AddAgentForm({
  type,
  onBack,
  onSubmit,
}: {
  type: 'local' | 'tailscale' | 'custom';
  onBack: () => void;
  onSubmit: (connection: Omit<StoredAgentConnection, 'id' | 'createdAt'>) => void;
}) {
  const [url, setUrl] = useState(type === 'local' ? '4678' : '');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const getFullUrl = useCallback(() => {
    if (type === 'local') return `localhost:${url}`;
    return url;
  }, [type, url]);

  const getName = useCallback(() => {
    if (type === 'local') return 'Same Computer';
    if (type === 'tailscale') return 'Tailscale Funnel';
    return 'Custom URL';
  }, [type]);

  const handleTest = async () => {
    const fullUrl = getFullUrl();
    if (!fullUrl) return;

    setTestState('testing');
    try {
      const wsUrl = buildWebSocketUrl(fullUrl, '/terminal?project=test&session=test-connection');
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        setTestState('error');
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        setTestState('success');
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setTestState('error');
      };
    } catch {
      setTestState('error');
    }
  };

  const handleSubmit = () => {
    const fullUrl = stripProtocol(getFullUrl());
    if (!fullUrl) return;

    onSubmit({
      url: fullUrl,
      name: getName(),
      method: type === 'local' ? 'localhost' : type,
    });
  };

  const titles = {
    local: 'Local Agent',
    tailscale: 'Tailscale Connection',
    custom: 'Custom URL',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-white">{titles[type]}</h3>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {type === 'local' && (
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">Agent Port</label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-white/50">localhost:</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value.replace(/\D/g, ''))}
                placeholder="4678"
                className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="mt-3 flex gap-2">
              {['4678', '4679', '4680'].map((port) => (
                <button
                  key={port}
                  onClick={() => setUrl(port)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-mono text-xs transition-all',
                    url === port
                      ? 'border border-orange-500/30 bg-orange-500/20 text-orange-400'
                      : 'border border-white/10 bg-white/5 text-white/40 hover:bg-white/10'
                  )}
                >
                  {port}
                </button>
              ))}
            </div>
          </div>
        )}

        {(type === 'tailscale' || type === 'custom') && (
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">Agent URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={type === 'tailscale' ? 'machine.tailnet.ts.net' : '192.168.1.100:4678'}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        )}

        {type === 'tailscale' && <TailscaleGuide />}

        {type === 'custom' && (
          <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="text-xs">
              <p className="mb-1 font-medium text-amber-400">Security Warning</p>
              <p className="text-white/50">
                Custom URLs may expose your agent to the internet. Ensure you have proper
                authentication.
              </p>
            </div>
          </div>
        )}

        {/* URL preview */}
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-white/40" />
            <span className="font-mono text-white/60">{getFullUrl() || '...'}</span>
          </div>
        </div>

        {/* Test result */}
        <AnimatePresence>
          {testState !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs',
                testState === 'testing' && 'bg-white/5 text-white/60',
                testState === 'success' && 'bg-emerald-500/20 text-emerald-400',
                testState === 'error' && 'bg-red-500/20 text-red-400'
              )}
            >
              {testState === 'testing' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Testing connection...</span>
                </>
              )}
              {testState === 'success' && (
                <>
                  <Check className="h-4 w-4" />
                  <span>Connection successful!</span>
                </>
              )}
              {testState === 'error' && (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Could not connect. Check your settings.</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testState === 'testing' || !getFullUrl()}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              testState === 'testing'
                ? 'cursor-wait bg-white/5 text-white/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            {testState === 'testing' ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!getFullUrl()}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
              'hover:shadow-lg hover:shadow-orange-500/20',
              !getFullUrl() && 'cursor-not-allowed opacity-50'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Connect
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Fly.io status card
function FlyioStatusCard({
  status,
  loading,
  onConnect,
  onDisconnect,
}: {
  status: FlyioStatus | null;
  loading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const isConnected = status?.connected === true;

  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        isConnected ? 'border-purple-500/20 bg-purple-500/5' : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            isConnected ? 'bg-purple-500/20' : 'bg-white/10'
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
          ) : isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          ) : (
            <Cloud className="h-4 w-4 text-white/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Fly.io</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                isConnected ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/40'
              )}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {isConnected && status?.orgName && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-white/40">{status.orgName}</p>
          )}
        </div>
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
            title="Disconnect"
          >
            <Unplug className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedAgentManager({
  open,
  onClose,
  connectedAgents,
  agentStatuses,
  sessionCounts,
  onDisconnectAgent,
  onConnectNewAgent,
  isAuthenticated,
  flyioStatus,
  flyioLoading,
  cloudAgents,
  cloudAgentsLoading,
  onSignIn,
  onFlyioConnect,
  onFlyioDisconnect,
  onLaunchCloudAgent,
  onStartCloudAgent,
  onStopCloudAgent,
  onDeleteCloudAgent,
}: UnifiedAgentManagerProps) {
  const [view, setView] = useState<ViewState>('main');
  const [cloudAgentLoadingActions, setCloudAgentLoadingActions] = useState<Record<string, string>>(
    {}
  );

  // Get connected agent URLs to check which cloud agents are already connected
  const connectedUrls = new Set(connectedAgents.map((a) => a.url.toLowerCase()));

  // Filter cloud agents that aren't connected yet
  const availableCloudAgents = cloudAgents.filter(
    (agent) => !connectedUrls.has(`wss://${agent.hostname}`.toLowerCase())
  );

  // Handle cloud agent actions
  const handleCloudAction = async (
    agentId: string,
    action: 'start' | 'stop' | 'delete',
    handler?: (id: string) => Promise<boolean>
  ) => {
    if (!handler) return;
    setCloudAgentLoadingActions((prev) => ({ ...prev, [agentId]: action }));
    try {
      await handler(agentId);
    } finally {
      setCloudAgentLoadingActions((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
    }
  };

  // Handle connect to cloud agent
  const handleConnectCloudAgent = (agent: CloudAgent) => {
    onConnectNewAgent({
      url: `wss://${agent.hostname}`,
      name: `Cloud Agent (${agent.region})`,
      method: 'cloud',
      isCloud: true,
      cloudAgentId: agent.id,
    });
  };

  // Handle new connection from form
  const handleNewConnection = (connection: Omit<StoredAgentConnection, 'id' | 'createdAt'>) => {
    onConnectNewAgent(connection);
    setView('main');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-[#0a0a10] shadow-2xl sm:max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                  <Zap className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Agent Manager</h2>
                  <p className="text-[11px] text-white/40">
                    {connectedAgents.length} connected
                    {availableCloudAgents.length > 0 &&
                      ` · ${availableCloudAgents.length} cloud available`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {view === 'main' ? (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 p-4"
                  >
                    {/* Connected Agents Section */}
                    <section>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                          Connected Agents
                        </h3>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          {
                            connectedAgents.filter((a) => agentStatuses.get(a.id) === 'online')
                              .length
                          }{' '}
                          online
                        </span>
                      </div>

                      {connectedAgents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                          <WifiOff className="mx-auto mb-2 h-8 w-8 text-white/20" />
                          <p className="text-sm text-white/40">No agents connected</p>
                          <p className="mt-1 text-xs text-white/25">Add an agent to get started</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <AnimatePresence>
                            {connectedAgents.map((agent) => (
                              <ConnectedAgentCard
                                key={agent.id}
                                agent={agent}
                                status={agentStatuses.get(agent.id) || 'connecting'}
                                sessionCount={sessionCounts.get(agent.id) || 0}
                                onDisconnect={() => onDisconnectAgent(agent.id)}
                                isOnlyAgent={connectedAgents.length === 1}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </section>

                    {/* Add Agent Section */}
                    <section>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                        Add Agent
                      </h3>
                      <div className="space-y-2">
                        <AddAgentOption
                          icon={Home}
                          title="Same Computer"
                          description="Agent running on this device"
                          badge="Safest"
                          badgeColor="bg-emerald-500/20 text-emerald-400"
                          onClick={() => setView('add-local')}
                        />
                        <AddAgentOption
                          icon={Globe}
                          title="Tailscale Funnel"
                          description="Secure remote access via Tailscale"
                          badge="Secure"
                          badgeColor="bg-blue-500/20 text-blue-400"
                          onClick={() => setView('add-tailscale')}
                        />
                        <AddAgentOption
                          icon={Wifi}
                          title="Custom URL"
                          description="Any accessible endpoint"
                          badge="Advanced"
                          badgeColor="bg-amber-500/20 text-amber-400"
                          onClick={() => setView('add-custom')}
                        />
                        {onLaunchCloudAgent && isAuthenticated && flyioStatus?.connected && (
                          <button
                            onClick={onLaunchCloudAgent}
                            className="flex w-full items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-violet-500/10 p-3 text-left transition-all hover:border-purple-500/30 hover:from-purple-500/15 hover:to-violet-500/15"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                              <Rocket className="h-5 w-5 text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  Launch Cloud Agent
                                </span>
                                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                                  ~$5/mo
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-white/40">
                                Deploy on Fly.io infrastructure
                              </p>
                            </div>
                            <Plus className="h-4 w-4 shrink-0 text-purple-400" />
                          </button>
                        )}
                      </div>
                    </section>

                    {/* Cloud Agents Section */}
                    {isAuthenticated && (
                      <section>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                          Cloud Infrastructure
                        </h3>

                        {/* Fly.io Status */}
                        <FlyioStatusCard
                          status={flyioStatus}
                          loading={flyioLoading}
                          onConnect={onFlyioConnect}
                          onDisconnect={onFlyioDisconnect}
                        />

                        {/* Cloud Agents List */}
                        {flyioStatus?.connected && (
                          <div className="mt-3">
                            {cloudAgentsLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                              </div>
                            ) : cloudAgents.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                                <Cloud className="mx-auto mb-2 h-8 w-8 text-purple-400/30" />
                                <p className="text-sm text-white/40">No cloud agents</p>
                                <p className="mt-1 text-xs text-white/25">
                                  Launch your first agent above
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <AnimatePresence>
                                  {cloudAgents.map((agent) => (
                                    <CloudAgentCard
                                      key={agent.id}
                                      agent={agent}
                                      isConnected={connectedUrls.has(
                                        `wss://${agent.hostname}`.toLowerCase()
                                      )}
                                      onConnect={() => handleConnectCloudAgent(agent)}
                                      onStart={() =>
                                        handleCloudAction(agent.id, 'start', onStartCloudAgent)
                                      }
                                      onStop={() =>
                                        handleCloudAction(agent.id, 'stop', onStopCloudAgent)
                                      }
                                      onDelete={() =>
                                        handleCloudAction(agent.id, 'delete', onDeleteCloudAgent)
                                      }
                                      loadingAction={cloudAgentLoadingActions[agent.id] || null}
                                    />
                                  ))}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Sign In Prompt */}
                    {!isAuthenticated && onSignIn && (
                      <section className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/10 p-4">
                        <div className="text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">
                            <Cloud className="h-6 w-6 text-purple-400" />
                          </div>
                          <h3 className="text-sm font-semibold text-white">Cloud Agents</h3>
                          <p className="mt-1 text-xs text-white/50">
                            Sign in to deploy agents on Fly.io
                          </p>
                          <button
                            onClick={onSignIn}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
                          >
                            <Github className="h-4 w-4" />
                            Sign in with GitHub
                          </button>
                        </div>
                      </section>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key={view} className="p-4">
                    <AddAgentForm
                      type={view.replace('add-', '') as 'local' | 'tailscale' | 'custom'}
                      onBack={() => setView('main')}
                      onSubmit={handleNewConnection}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
              <p className="text-center text-[10px] text-white/30">
                Connections saved locally in your browser
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

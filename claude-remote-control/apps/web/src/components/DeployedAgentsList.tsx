'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Play, Trash2, Loader2, AlertCircle, ExternalLink, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CloudAgent } from '@/hooks/useAgents';

interface DeployedAgentsListProps {
  agents: CloudAgent[];
  isLoading?: boolean;
  onConnect: (agent: CloudAgent) => void;
  onStart: (id: string) => Promise<boolean>;
  onStop: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const statusConfig: Record<
  CloudAgent['status'],
  { color: string; bgColor: string; label: string; canConnect: boolean }
> = {
  pending: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Pending',
    canConnect: false,
  },
  creating_app: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_volume: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  creating_machine: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Creating...',
    canConnect: false,
  },
  running: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Running',
    canConnect: true,
  },
  stopped: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Sleeping',
    canConnect: true, // Fly.io auto-starts on connect
  },
  starting: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Waking up...',
    canConnect: false,
  },
  stopping: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Stopping...',
    canConnect: false,
  },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Error', canConnect: false },
};

export function DeployedAgentsList({
  agents,
  isLoading,
  onConnect,
  onStart,
  onStop,
  onDelete,
}: DeployedAgentsListProps) {
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mt-6 flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (agents.length === 0) {
    return null;
  }

  const handleAction = async (
    id: string,
    action: 'start' | 'stop' | 'delete',
    handler: () => Promise<boolean>
  ) => {
    setLoadingActions((prev) => ({ ...prev, [id]: action }));
    try {
      await handler();
    } finally {
      setLoadingActions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (action === 'delete') {
        setDeleteConfirm(null);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-6 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5"
    >
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-white/60" />
          <h3 className="text-sm font-medium text-white/80">Your Cloud Agents</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
            {agents.length}
          </span>
        </div>
      </div>

      {/* Agents List */}
      <div className="divide-y divide-white/5">
        <AnimatePresence>
          {agents.map((agent) => {
            const config = statusConfig[agent.status];
            const isLoading = !!loadingActions[agent.id];
            const isDeleting = loadingActions[agent.id] === 'delete';
            const showDeleteConfirm = deleteConfirm === agent.id;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Agent Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('inline-flex h-2 w-2 shrink-0 rounded-full', config.bgColor)}
                      />
                      <span className="truncate font-mono text-sm text-white/90">
                        {agent.hostname}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          config.bgColor,
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/40">
                        {agent.region.toUpperCase()}
                      </span>
                    </div>
                    {agent.status === 'error' && agent.errorMessage && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400/80">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{agent.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {showDeleteConfirm ? (
                      <>
                        <span className="text-xs text-white/50">Delete?</span>
                        <button
                          onClick={() => handleAction(agent.id, 'delete', () => onDelete(agent.id))}
                          disabled={isDeleting}
                          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleting}
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Connect Button */}
                        {config.canConnect && (
                          <button
                            onClick={() => onConnect(agent)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              agent.status === 'stopped'
                                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
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

                        {/* Wake/Stop Button */}
                        {agent.status === 'stopped' && (
                          <button
                            onClick={() => handleAction(agent.id, 'start', () => onStart(agent.id))}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
                            title="Wake the agent without connecting"
                          >
                            {loadingActions[agent.id] === 'start' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Wake
                          </button>
                        )}
                        {agent.status === 'running' && (
                          <button
                            onClick={() => handleAction(agent.id, 'stop', () => onStop(agent.id))}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-50"
                            title="Put agent to sleep (auto-wakes on connect)"
                          >
                            {loadingActions[agent.id] === 'stop' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Moon className="h-3 w-3" />
                            )}
                            Sleep
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirm(agent.id)}
                          disabled={isLoading}
                          className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-50"
                          title="Delete agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

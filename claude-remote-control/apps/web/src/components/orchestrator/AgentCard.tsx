'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Zap,
  GitBranch,
  Activity,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusLED } from './StatusLED';
import { SegmentedProgress } from './SegmentedProgress';
import type { SubAgent } from './types';

interface AgentCardProps {
  agent: SubAgent;
  index: number;
}

interface AgentTypeConfig {
  icon: typeof Terminal;
  color: string;
  borderColor: string;
  bgColor: string;
}

function createConfig(icon: typeof Terminal, colorName: string): AgentTypeConfig {
  return {
    icon,
    color: `text-${colorName}-400`,
    borderColor: `border-${colorName}-500/30`,
    bgColor: `bg-${colorName}-500/5`,
  };
}

const AGENT_CONFIGS: Record<string, AgentTypeConfig> = {
  code: createConfig(Terminal, 'violet'),
  test: createConfig(Zap, 'cyan'),
  review: createConfig(GitBranch, 'amber'),
  fix: createConfig(Activity, 'emerald'),
  'general-purpose': createConfig(Activity, 'blue'),
  explore: createConfig(GitBranch, 'orange'),
};

const DEFAULT_CONFIG = createConfig(Activity, 'zinc');

function getAgentConfig(type: string): AgentTypeConfig {
  const normalizedType = type.toLowerCase().replace('-agent', '');
  return AGENT_CONFIGS[normalizedType] || DEFAULT_CONFIG;
}

function getStatusBorderClass(status: SubAgent['status']): string {
  switch (status) {
    case 'running':
      return 'border-cyan-500/30';
    case 'completed':
      return 'border-emerald-500/20';
    case 'failed':
      return 'border-red-500/30';
    default:
      return 'border-zinc-800/60';
  }
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const config = getAgentConfig(agent.type);
  const TypeIcon = config.icon;

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [agent.output]);

  const runningTime = agent.startedAt
    ? Math.floor((Date.now() - agent.startedAt.getTime()) / 1000)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08,
        duration: 0.3,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-zinc-950/60 backdrop-blur-sm',
        getStatusBorderClass(agent.status)
      )}
    >
      {/* Animated gradient border for running agents */}
      {agent.status === 'running' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/40 p-3">
        <div className="flex items-center gap-2.5">
          <StatusLED status={agent.status} />
          <div
            className={cn('flex h-6 w-6 items-center justify-center rounded-lg', config.bgColor)}
          >
            <TypeIcon className={cn('h-3.5 w-3.5', config.color)} />
          </div>
          <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
          {agent.cost > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-zinc-600" />
              {agent.cost.toFixed(2)}
            </span>
          )}
          {agent.status === 'running' && runningTime > 0 && (
            <span className="flex items-center gap-1 text-cyan-500/70">
              <Clock className="h-3 w-3" />
              {runningTime}s
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      {agent.status !== 'pending' && (
        <div className="px-3 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-mono tabular-nums text-zinc-500">{agent.progress}%</span>
          </div>
          <SegmentedProgress
            value={agent.progress}
            segments={12}
            accentColor={agent.status === 'completed' ? 'emerald' : 'cyan'}
          />
        </div>
      )}

      {/* Output stream */}
      <div
        ref={outputRef}
        className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800 h-20 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
      >
        {agent.status === 'pending' ? (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Waiting...
            </span>
          </div>
        ) : agent.output.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {agent.output.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="text-zinc-400"
              >
                <span className="mr-1.5 select-none text-cyan-600/60">›</span>
                {line.replace(/^> /, '')}
              </motion.div>
            ))}
            {agent.status === 'running' && (
              <span className="ml-3 inline-block h-3.5 w-1.5 animate-pulse bg-cyan-400/80" />
            )}
          </div>
        )}
      </div>

      {/* Status footer */}
      {agent.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
        >
          <div className="flex items-center gap-2 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </div>
        </motion.div>
      )}
      {agent.status === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-red-500/20 bg-red-500/5 px-3 py-2"
        >
          <div className="flex items-center gap-2 text-[11px] text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Failed - will retry</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

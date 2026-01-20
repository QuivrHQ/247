'use client';

import { motion } from 'framer-motion';
import { Monitor, ArrowRight } from 'lucide-react';
import { useSessionPolling } from '@/contexts/SessionPollingContext';
import { cn } from '@/lib/utils';

interface Machine {
  id: string;
  name: string;
  status: string;
  color?: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

interface MachineCardProps {
  machine: Machine;
  onClick: () => void;
}

export function MachineCard({ machine, onClick }: MachineCardProps) {
  const { getSessionsForMachine } = useSessionPolling();

  const sessions = getSessionsForMachine(machine.id);
  const isOnline = machine.status === 'online';
  const agentUrl = machine.config?.agentUrl || 'localhost:4678';
  const hasCustomColor = !!machine.color;

  return (
    <motion.button
      onClick={isOnline ? onClick : undefined}
      disabled={!isOnline}
      whileHover={isOnline ? { scale: 1.02 } : undefined}
      whileTap={isOnline ? { scale: 0.98 } : undefined}
      className={cn(
        'group relative w-full rounded-2xl p-5 text-left transition-all',
        'border',
        isOnline
          ? 'cursor-pointer border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-xl hover:shadow-black/20'
          : 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50'
      )}
      style={
        hasCustomColor && isOnline
          ? { borderColor: `${machine.color}40` }
          : undefined
      }
    >
      {/* Top row: Icon + Name + Status */}
      <div className="flex items-start gap-4">
        {/* Machine Icon */}
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
            'border',
            !hasCustomColor && isOnline
              ? 'border-white/10 bg-gradient-to-br from-white/10 to-white/5'
              : !hasCustomColor
                ? 'border-white/5 bg-white/5'
                : ''
          )}
          style={
            hasCustomColor
              ? {
                  backgroundColor: isOnline ? `${machine.color}26` : `${machine.color}10`,
                  borderColor: isOnline ? `${machine.color}40` : `${machine.color}20`,
                }
              : undefined
          }
        >
          <Monitor
            className={cn('h-6 w-6', !hasCustomColor && (isOnline ? 'text-white/70' : 'text-white/30'))}
            style={hasCustomColor ? { color: isOnline ? machine.color : `${machine.color}60` } : undefined}
          />
        </div>

        {/* Machine Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Custom color indicator */}
            {hasCustomColor && (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: machine.color }}
              />
            )}
            <span
              className={cn(
                'truncate text-lg font-semibold',
                isOnline ? 'text-white' : 'text-white/40'
              )}
            >
              {machine.name}
            </span>
            <span
              className={cn(
                'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                isOnline ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-red-400/50'
              )}
            />
          </div>
          <p
            className={cn(
              'mt-0.5 truncate font-mono text-sm',
              isOnline ? 'text-white/40' : 'text-white/20'
            )}
          >
            {agentUrl}
          </p>
        </div>

        {/* Arrow indicator */}
        {isOnline && (
          <ArrowRight className="mt-1 h-5 w-5 flex-shrink-0 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-white/40" />
        )}
      </div>

      {/* Session count */}
      {isOnline && sessions.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-white/30">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Offline overlay text */}
      {!isOnline && <div className="mt-4 text-sm text-white/30">Machine offline</div>}
    </motion.button>
  );
}

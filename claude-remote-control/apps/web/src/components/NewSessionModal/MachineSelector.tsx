'use client';

import { Monitor } from 'lucide-react';
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

interface MachineSelectorProps {
  machines: Machine[];
  selectedMachine: Machine | null;
  onSelectMachine: (machine: Machine) => void;
}

export function MachineSelector({
  machines,
  selectedMachine,
  onSelectMachine,
}: MachineSelectorProps) {
  const onlineMachines = machines.filter((m) => m.status === 'online');
  const offlineMachines = machines.filter((m) => m.status !== 'online');

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-white/60">Select Machine</label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {onlineMachines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => onSelectMachine(machine)}
            className={cn(
              'rounded-xl p-4 text-left transition-all',
              'border',
              selectedMachine?.id === machine.id
                ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Monitor
                className={cn(
                  'h-4 w-4',
                  selectedMachine?.id === machine.id ? 'text-orange-400' : 'text-white/50'
                )}
              />
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                )}
              />
            </div>
            <p
              className={cn(
                'truncate font-medium',
                selectedMachine?.id === machine.id ? 'text-white' : 'text-white/80'
              )}
            >
              {machine.name}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-white/30">
              {machine.config?.agentUrl || 'localhost:4678'}
            </p>
          </button>
        ))}

        {offlineMachines.map((machine) => (
          <div
            key={machine.id}
            className={cn(
              'rounded-xl p-4',
              'border border-white/5 bg-white/[0.02]',
              'cursor-not-allowed opacity-50'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-white/30" />
              <span className="h-2 w-2 rounded-full bg-red-400/50" />
            </div>
            <p className="truncate font-medium text-white/40">{machine.name}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-white/20">offline</p>
          </div>
        ))}
      </div>

      {machines.length === 0 && (
        <div className="py-8 text-center text-white/30">
          <Monitor className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No machines registered</p>
        </div>
      )}

      {machines.length > 0 && onlineMachines.length === 0 && (
        <div className="py-8 text-center text-white/30">
          <Monitor className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>All machines are offline</p>
        </div>
      )}
    </div>
  );
}

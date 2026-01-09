'use client';

import { cn } from '@/lib/utils';

interface StatusLEDProps {
  status: 'pending' | 'running' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusLED({ status, size = 'md' }: StatusLEDProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  const statusStyles = {
    pending: {
      bg: 'bg-zinc-500',
      glow: '',
    },
    running: {
      bg: 'bg-cyan-400',
      glow: 'shadow-[0_0_10px_rgba(0,255,213,0.6)]',
    },
    completed: {
      bg: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    },
    failed: {
      bg: 'bg-red-500',
      glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    },
  };

  const style = statusStyles[status];

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={cn('rounded-full', sizeClasses[size], style.bg, style.glow)} />
      {status === 'running' && (
        <span
          className={cn(
            'absolute animate-ping rounded-full opacity-60',
            sizeClasses[size],
            'bg-cyan-400'
          )}
        />
      )}
    </span>
  );
}

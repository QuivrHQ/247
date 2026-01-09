'use client';

import { cn } from '@/lib/utils';

interface SegmentedProgressProps {
  value: number;
  segments?: number;
  className?: string;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'violet';
}

export function SegmentedProgress({
  value,
  segments = 20,
  className,
  accentColor = 'cyan',
}: SegmentedProgressProps) {
  const filledSegments = Math.floor((value / 100) * segments);

  const colorClasses = {
    cyan: 'bg-cyan-400 shadow-[0_0_4px_rgba(0,255,213,0.4)]',
    emerald: 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]',
    amber: 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]',
    violet: 'bg-violet-400 shadow-[0_0_4px_rgba(167,139,250,0.4)]',
  };

  return (
    <div className={cn('flex gap-[2px]', className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 flex-1 rounded-[1px] transition-all duration-300',
            i < filledSegments ? colorClasses[accentColor] : 'bg-zinc-800/80'
          )}
          style={{
            transitionDelay: `${i * 10}ms`,
          }}
        />
      ))}
    </div>
  );
}

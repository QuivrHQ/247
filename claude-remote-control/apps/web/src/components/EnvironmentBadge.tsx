'use client';

import { Zap, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentProvider } from '@claude-remote/shared';

const providerConfig: Record<
  EnvironmentProvider,
  {
    icon: typeof Zap;
    label: string;
    color: string;
    bg: string;
  }
> = {
  anthropic: {
    icon: Zap,
    label: 'Anthropic',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  openrouter: {
    icon: Globe,
    label: 'OpenRouter',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

interface EnvironmentBadgeProps {
  provider: EnvironmentProvider;
  name?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function EnvironmentBadge({
  provider,
  name,
  size = 'sm',
  showLabel = true,
  className,
}: EnvironmentBadgeProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  if (!showLabel) {
    // Icon only mode
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-md border',
          config.bg,
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6',
          className
        )}
        title={name || config.label}
      >
        <Icon className={cn(config.color, size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border',
        config.bg,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      <Icon className={cn(config.color, size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span className={cn('font-medium', config.color)}>{name || config.label}</span>
    </div>
  );
}

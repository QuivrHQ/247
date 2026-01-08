'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Globe,
  Bot,
  Brain,
  Cpu,
  Server,
  Cloud,
  Rocket,
  FlaskConical,
  Code,
  Bug,
  Wrench,
  Shield,
  Lock,
  Star,
  Sparkles,
  Flame,
  Moon,
  Sun,
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ENVIRONMENT_ICON_OPTIONS,
  DEFAULT_PROVIDER_ICONS,
  type EnvironmentIcon,
  type EnvironmentProvider,
} from '247-shared';

// Map icon names to Lucide components
const iconMap: Record<EnvironmentIcon, LucideIcon> = {
  zap: Zap,
  globe: Globe,
  bot: Bot,
  brain: Brain,
  cpu: Cpu,
  server: Server,
  cloud: Cloud,
  rocket: Rocket,
  flask: FlaskConical,
  code: Code,
  bug: Bug,
  wrench: Wrench,
  shield: Shield,
  lock: Lock,
  star: Star,
  sparkles: Sparkles,
  flame: Flame,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
};

/**
 * Get the Lucide icon component for an icon name
 * Falls back to Zap if not found
 */
export function getIconComponent(iconName: string | null | undefined): LucideIcon {
  if (iconName && iconName in iconMap) {
    return iconMap[iconName as EnvironmentIcon];
  }
  return Zap;
}

/**
 * Get the effective icon for an environment (custom or provider default)
 */
export function getEffectiveIcon(
  icon: string | null | undefined,
  provider: EnvironmentProvider
): EnvironmentIcon {
  return (icon as EnvironmentIcon) ?? DEFAULT_PROVIDER_ICONS[provider];
}

interface IconPickerProps {
  value: EnvironmentIcon | null;
  onChange: (icon: EnvironmentIcon | null) => void;
  provider: EnvironmentProvider;
  className?: string;
}

export function IconPicker({ value, onChange, provider, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveIcon = getEffectiveIcon(value, provider);
  const CurrentIcon = getIconComponent(effectiveIcon);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          'border border-white/10 bg-white/5',
          'transition-all hover:border-white/20 hover:bg-white/10',
          'focus:outline-none focus:ring-2 focus:ring-orange-500/50'
        )}
      >
        <CurrentIcon className="h-5 w-5 text-orange-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-0 top-full z-50 mt-2',
              'rounded-xl border border-white/10 bg-[#12121a] p-3',
              'shadow-xl shadow-black/50',
              'grid grid-cols-5 gap-2',
              'min-w-[220px]'
            )}
          >
            {ENVIRONMENT_ICON_OPTIONS.map((iconName) => {
              const Icon = iconMap[iconName];
              const isSelected =
                value === iconName || (!value && iconName === DEFAULT_PROVIDER_ICONS[provider]);
              const isProviderDefault = iconName === DEFAULT_PROVIDER_ICONS[provider];

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    // If selecting provider default, store null
                    onChange(isProviderDefault ? null : iconName);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex h-9 min-h-[36px] w-9 min-w-[36px] flex-shrink-0 items-center justify-center rounded-lg',
                    'relative transition-all',
                    isSelected
                      ? 'border border-orange-500/50 bg-orange-500/20'
                      : 'border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  )}
                  title={iconName + (isProviderDefault ? ' (default)' : '')}
                >
                  <Icon
                    className={cn('h-4 w-4', isSelected ? 'text-orange-400' : 'text-white/60')}
                  />
                  {isProviderDefault && !value && (
                    <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

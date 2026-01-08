'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Globe, Check, Star, Settings } from 'lucide-react';
import { cn, buildApiUrl } from '@/lib/utils';
import type { EnvironmentMetadata, EnvironmentProvider } from '247-shared';

const providerConfig: Record<
  EnvironmentProvider,
  { icon: typeof Zap; label: string; color: string }
> = {
  anthropic: { icon: Zap, label: 'Anthropic', color: 'text-orange-400' },
  openrouter: { icon: Globe, label: 'OpenRouter', color: 'text-emerald-400' },
};

interface EnvironmentSelectorProps {
  agentUrl: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onManageClick?: () => void;
  className?: string;
}

export function EnvironmentSelector({
  agentUrl,
  selectedId,
  onSelect,
  onManageClick,
  className,
}: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = useState<EnvironmentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const response = await fetch(buildApiUrl(agentUrl, '/api/environments'));
        if (response.ok) {
          const data: EnvironmentMetadata[] = await response.json();
          setEnvironments(data);

          // Auto-select default if nothing selected
          if (!selectedId) {
            const defaultEnv = data.find((e) => e.isDefault);
            if (defaultEnv) {
              onSelect(defaultEnv.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch environments:', err);
      } finally {
        setLoading(false);
      }
    };

    if (agentUrl) {
      fetchEnvironments();
    }
  }, [agentUrl, selectedId, onSelect]);

  const selected = environments.find((e) => e.id === selectedId);
  const SelectedIcon = selected ? providerConfig[selected.provider].icon : Zap;

  if (loading) {
    return <div className={cn('h-12 animate-pulse rounded-xl bg-white/5', className)} />;
  }

  if (environments.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40',
          className
        )}
      >
        No environments configured
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-left',
          'border border-white/10 bg-white/5',
          'hover:border-white/20 hover:bg-white/10',
          'flex items-center justify-between',
          'transition-all'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              'border border-white/10 bg-white/5'
            )}
          >
            <SelectedIcon
              className={cn(
                'h-4 w-4',
                selected ? providerConfig[selected.provider].color : 'text-white/40'
              )}
            />
          </div>
          <div>
            <span className={cn('block', selected ? 'text-white' : 'text-white/40')}>
              {selected?.name || 'Select environment...'}
            </span>
            {selected?.isDefault && (
              <span className="flex items-center gap-1 text-[10px] text-orange-400">
                <Star className="h-2.5 w-2.5 fill-current" /> Default
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-0 right-0 top-full z-20 mt-2',
              'rounded-xl border border-white/10 bg-[#12121a]',
              'shadow-xl shadow-black/50',
              'overflow-hidden'
            )}
          >
            <div className="max-h-64 overflow-y-auto">
              {environments.map((env) => {
                const Icon = providerConfig[env.provider].icon;
                const config = providerConfig[env.provider];
                return (
                  <button
                    key={env.id}
                    onClick={() => {
                      onSelect(env.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left',
                      'transition-colors hover:bg-white/5',
                      selectedId === env.id && 'bg-white/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        'border border-white/10 bg-white/5',
                        selectedId === env.id && 'border-orange-500/30'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate font-medium',
                            selectedId === env.id ? 'text-orange-400' : 'text-white/80'
                          )}
                        >
                          {env.name}
                        </span>
                        {env.isDefault && (
                          <Star className="h-3 w-3 flex-shrink-0 fill-orange-400 text-orange-400" />
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-white/30">{config.label}</div>
                    </div>
                    {selectedId === env.id && <Check className="h-4 w-4 text-orange-400" />}
                  </button>
                );
              })}
            </div>

            {/* Manage button */}
            {onManageClick && (
              <button
                onClick={() => {
                  setOpen(false);
                  onManageClick();
                }}
                className="flex w-full items-center justify-center gap-2 border-t border-white/5 px-4 py-2.5 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Environments
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

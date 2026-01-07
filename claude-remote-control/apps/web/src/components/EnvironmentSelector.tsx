'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Globe, Check, Star, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentMetadata, EnvironmentProvider } from '@vibecompany/247-shared';

const providerConfig: Record<EnvironmentProvider, { icon: typeof Zap; label: string; color: string }> = {
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
        const protocol = agentUrl.includes('localhost') ? 'http' : 'https';
        const response = await fetch(`${protocol}://${agentUrl}/api/environments`);
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
    return (
      <div className={cn('h-12 bg-white/5 rounded-xl animate-pulse', className)} />
    );
  }

  if (environments.length === 0) {
    return (
      <div className={cn('px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm', className)}>
        No environments configured
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full px-4 py-3 rounded-xl text-left',
          'bg-white/5 border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'flex items-center justify-between',
          'transition-all'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              'bg-white/5 border border-white/10'
            )}
          >
            <SelectedIcon
              className={cn(
                'w-4 h-4',
                selected ? providerConfig[selected.provider].color : 'text-white/40'
              )}
            />
          </div>
          <div>
            <span className={cn('block', selected ? 'text-white' : 'text-white/40')}>
              {selected?.name || 'Select environment...'}
            </span>
            {selected?.isDefault && (
              <span className="text-[10px] text-orange-400 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" /> Default
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 text-white/40 transition-transform', open && 'rotate-180')}
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
              'absolute top-full left-0 right-0 mt-2 z-20',
              'bg-[#12121a] border border-white/10 rounded-xl',
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
                      'w-full px-4 py-3 text-left flex items-center gap-3',
                      'hover:bg-white/5 transition-colors',
                      selectedId === env.id && 'bg-white/5'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        'bg-white/5 border border-white/10',
                        selectedId === env.id && 'border-orange-500/30'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium truncate',
                            selectedId === env.id ? 'text-orange-400' : 'text-white/80'
                          )}
                        >
                          {env.name}
                        </span>
                        {env.isDefault && (
                          <Star className="w-3 h-3 text-orange-400 fill-orange-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-white/30 mt-0.5">{config.label}</div>
                    </div>
                    {selectedId === env.id && <Check className="w-4 h-4 text-orange-400" />}
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
                className="w-full px-4 py-2.5 text-sm text-white/40 hover:text-white hover:bg-white/5 border-t border-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage Environments
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

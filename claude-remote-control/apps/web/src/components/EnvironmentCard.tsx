'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Globe, Star, Pencil, Trash2, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentMetadata, EnvironmentProvider } from '@vibecompany/247-shared';

const providerConfig: Record<
  EnvironmentProvider,
  {
    icon: typeof Zap;
    label: string;
    color: string;
    borderColor: string;
    bgHover: string;
  }
> = {
  anthropic: {
    icon: Zap,
    label: 'Anthropic',
    color: 'text-orange-400',
    borderColor: 'border-l-orange-500',
    bgHover: 'hover:bg-orange-500/5',
  },
  openrouter: {
    icon: Globe,
    label: 'OpenRouter',
    color: 'text-emerald-400',
    borderColor: 'border-l-emerald-500',
    bgHover: 'hover:bg-emerald-500/5',
  },
};

interface EnvironmentCardProps {
  environment: EnvironmentMetadata;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export function EnvironmentCard({
  environment,
  onEdit,
  onDelete,
  onSetDefault,
}: EnvironmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = providerConfig[environment.provider];
  const Icon = config.icon;
  const variableCount = environment.variableKeys?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-white/[0.02] border border-white/10',
        'border-l-4',
        config.borderColor,
        config.bgHover,
        'transition-all duration-200'
      )}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Header: Icon + Default Badge */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'bg-white/5 border border-white/10'
            )}
          >
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>

          {environment.isDefault && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
              <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
              <span className="text-[10px] font-medium text-orange-400 uppercase tracking-wide">
                Default
              </span>
            </div>
          )}
        </div>

        {/* Name & Provider */}
        <h3 className="text-base font-medium text-white mb-1">{environment.name}</h3>
        <p className="text-sm text-white/40 mb-3">{config.label}</p>

        {/* Variable Count */}
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Key className="w-3.5 h-3.5" />
          <span>
            {variableCount} variable{variableCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Hover Actions */}
      <motion.div
        initial={false}
        animate={{
          height: isHovered ? 'auto' : 0,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
        className="overflow-hidden border-t border-white/5"
      >
        <div className="flex items-center gap-2 p-3 bg-white/[0.02]">
          {/* Set Default Button */}
          {!environment.isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-white/5 hover:bg-orange-500/20 text-white/60 hover:text-orange-400',
                'border border-white/10 hover:border-orange-500/30',
                'transition-all'
              )}
            >
              <Star className="w-3.5 h-3.5" />
              Set Default
            </button>
          )}

          <div className="flex-1" />

          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white',
              'border border-white/10 hover:border-white/20',
              'transition-all'
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400',
              'border border-white/10 hover:border-red-500/30',
              'transition-all'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Add New Environment Card
export function AddEnvironmentCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'w-full h-full min-h-[180px] rounded-xl',
        'bg-white/[0.02] border-2 border-dashed border-white/10',
        'hover:bg-white/5 hover:border-white/20',
        'flex flex-col items-center justify-center gap-3',
        'text-white/40 hover:text-white/60',
        'transition-all duration-200',
        'group'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-white/5 border border-white/10',
          'group-hover:bg-orange-500/10 group-hover:border-orange-500/20',
          'transition-all'
        )}
      >
        <Zap className="w-6 h-6 group-hover:text-orange-400 transition-colors" />
      </div>
      <span className="text-sm font-medium">Add Environment</span>
    </motion.button>
  );
}

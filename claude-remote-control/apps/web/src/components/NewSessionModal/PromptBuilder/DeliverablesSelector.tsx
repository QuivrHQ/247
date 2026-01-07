'use client';

import { Package, FlaskConical, FileText, Code, BookOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RalphDeliverable } from '@vibecompany/247-shared';

interface DeliverablesSelectorProps {
  selected: RalphDeliverable[];
  onChange: (selected: RalphDeliverable[]) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
}

const DELIVERABLE_OPTIONS: {
  id: RalphDeliverable;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: 'tests',
    label: 'Tests',
    icon: <FlaskConical className="h-3.5 w-3.5" />,
    description: '>80% coverage',
  },
  {
    id: 'readme',
    label: 'README',
    icon: <FileText className="h-3.5 w-3.5" />,
    description: 'Documentation',
  },
  {
    id: 'types',
    label: 'Types',
    icon: <Code className="h-3.5 w-3.5" />,
    description: 'TypeScript',
  },
  {
    id: 'docs',
    label: 'JSDoc',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    description: 'Comments',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: <Plus className="h-3.5 w-3.5" />,
    description: 'Your own',
  },
];

export function DeliverablesSelector({
  selected,
  onChange,
  customValue,
  onCustomChange,
}: DeliverablesSelectorProps) {
  const toggleDeliverable = (id: RalphDeliverable) => {
    if (selected.includes(id)) {
      onChange(selected.filter((d) => d !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const showCustomInput = selected.includes('custom');

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-[10px] font-bold text-purple-400">
          3
        </span>
        <Package className="h-3 w-3" />
        Deliverables
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          Optional
        </span>
      </label>
      <p className="ml-7 text-xs text-white/30">What files/outputs are expected?</p>

      {/* Deliverable chips */}
      <div className="ml-7 flex flex-wrap gap-2">
        {DELIVERABLE_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggleDeliverable(option.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2',
                'border transition-all duration-200',
                isSelected
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
              )}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
              {isSelected && (
                <span className="text-[10px] text-purple-400/60">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom deliverable input */}
      {showCustomInput && (
        <div className="ml-7">
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="Describe your custom deliverable..."
            className={cn(
              'w-full rounded-lg px-3 py-2',
              'border border-purple-500/30 bg-white/5',
              'text-sm text-white placeholder:text-white/25',
              'focus:border-purple-500/50 focus:outline-none',
              'transition-all duration-200'
            )}
          />
        </div>
      )}
    </div>
  );
}

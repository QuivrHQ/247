'use client';

import { useState } from 'react';
import { Wand2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionPreviewProps {
  instruction: string;
  signal: string;
  onSignalChange: (signal: string) => void;
}

export function CompletionPreview({
  instruction: _instruction,
  signal,
  onSignalChange,
}: CompletionPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
          <Wand2 className="h-3 w-3 text-purple-400" />
          Completion Instruction
          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
            Auto-Generated
          </span>
        </label>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1 text-xs text-purple-400 transition-colors hover:text-purple-300"
        >
          <Settings2 className="h-3 w-3" />
          {isEditing ? 'Done' : 'Customize'}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
        {/* Left accent bar */}
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-purple-500/50 via-purple-500/30 to-purple-500/50" />

        <p className="pl-2 font-mono text-sm text-white/70">
          When you have fully completed this task, output exactly:{' '}
          <code className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-300">
            &lt;promise&gt;{signal || 'COMPLETE'}&lt;/promise&gt;
          </code>
        </p>

        {isEditing && (
          <div className="mt-3 border-t border-purple-500/20 pl-2 pt-3">
            <label className="mb-1.5 block text-xs text-white/40">Completion Signal</label>
            <input
              type="text"
              value={signal}
              onChange={(e) => onSignalChange(e.target.value)}
              placeholder="COMPLETE"
              className={cn(
                'w-full rounded-lg px-3 py-2',
                'border border-purple-500/30 bg-white/5',
                'text-sm text-white placeholder:text-white/30',
                'focus:border-purple-500/50 focus:outline-none',
                'transition-all duration-200'
              )}
            />
            <p className="mt-1.5 text-[10px] text-white/30">
              The exact text Claude outputs to signal task completion
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

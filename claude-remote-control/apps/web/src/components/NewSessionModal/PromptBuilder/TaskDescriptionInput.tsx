'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskDescriptionInput({ value, onChange }: TaskDescriptionInputProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-[10px] font-bold text-purple-400">
          1
        </span>
        <FileText className="h-3 w-3" />
        Task Description
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
          Required
        </span>
      </label>
      <p className="ml-7 text-xs text-white/30">What should Claude accomplish?</p>
      <div className="group relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Implement user authentication with JWT tokens. Include login, logout, and token refresh endpoints..."
          rows={4}
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'border border-white/10 bg-white/5',
            'text-white placeholder:text-white/25',
            'focus:border-purple-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-purple-500/20',
            'resize-none transition-all duration-200'
          )}
        />
        {value.length > 0 && (
          <div className="absolute bottom-3 right-3 text-xs text-white/30">
            {value.length} chars
          </div>
        )}
      </div>
    </div>
  );
}

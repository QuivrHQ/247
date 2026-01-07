'use client';

import { Check, AlertCircle, GitBranch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloneRepoTabProps {
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  customProjectName: string;
  onCustomProjectNameChange: (name: string) => void;
  previewedName: string;
  cloning: boolean;
  cloneError: string | null;
  cloneSuccess: string | null;
  onClone: () => void;
}

export function CloneRepoTab({
  repoUrl,
  onRepoUrlChange,
  customProjectName,
  onCustomProjectNameChange,
  previewedName,
  cloning,
  cloneError,
  cloneSuccess,
  onClone,
}: CloneRepoTabProps) {
  return (
    <div className="space-y-4">
      {cloneSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-400">
          <Check className="h-4 w-4" />
          <span className="text-sm">
            Successfully cloned <strong>{cloneSuccess}</strong>
          </span>
        </div>
      )}

      {cloneError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{cloneError}</span>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-white/60">Repository URL</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => onRepoUrlChange(e.target.value)}
          placeholder="https://github.com/user/repo or git@github.com:user/repo"
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'border border-white/10 bg-white/5',
            'text-white placeholder:text-white/30',
            'focus:border-orange-500/50 focus:bg-white/10 focus:outline-none',
            'transition-all'
          )}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white/60">
          Project Name <span className="text-white/30">(optional)</span>
        </label>
        <input
          type="text"
          value={customProjectName}
          onChange={(e) => onCustomProjectNameChange(e.target.value)}
          placeholder={previewedName || 'Auto-detected from URL'}
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'border border-white/10 bg-white/5',
            'text-white placeholder:text-white/30',
            'focus:border-orange-500/50 focus:bg-white/10 focus:outline-none',
            'transition-all'
          )}
        />
        {previewedName && !customProjectName && (
          <p className="mt-1.5 text-xs text-white/40">
            Will be cloned as: <span className="text-orange-400">{previewedName}</span>
          </p>
        )}
      </div>

      <button
        onClick={onClone}
        disabled={!repoUrl || cloning}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition-all',
          repoUrl && !cloning
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-400 hover:to-amber-400'
            : 'cursor-not-allowed bg-white/5 text-white/30'
        )}
      >
        {cloning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cloning...
          </>
        ) : (
          <>
            <GitBranch className="h-4 w-4" />
            Clone Repository
          </>
        )}
      </button>
    </div>
  );
}

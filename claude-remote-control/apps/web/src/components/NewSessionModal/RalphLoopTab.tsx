'use client';

import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnvironmentSelector } from '../EnvironmentSelector';
import { ProjectDropdown } from './ProjectDropdown';

interface RalphLoopTabProps {
  folders: string[];
  selectedProject: string;
  onSelectProject: (project: string) => void;
  loadingFolders: boolean;
  ralphPrompt: string;
  onRalphPromptChange: (prompt: string) => void;
  ralphMaxIterations: number;
  onRalphMaxIterationsChange: (iterations: number) => void;
  ralphCompletionPromise: string;
  onRalphCompletionPromiseChange: (promise: string) => void;
  ralphUseWorktree: boolean;
  onRalphUseWorktreeChange: (use: boolean) => void;
  agentUrl: string;
  selectedEnvironment: string | null;
  onSelectEnvironment: (id: string | null) => void;
  onManageEnvironments: () => void;
  envRefreshKey: number;
  onStartRalphLoop: () => void;
  isValid: boolean;
}

export function RalphLoopTab({
  folders,
  selectedProject,
  onSelectProject,
  loadingFolders,
  ralphPrompt,
  onRalphPromptChange,
  ralphMaxIterations,
  onRalphMaxIterationsChange,
  ralphCompletionPromise,
  onRalphCompletionPromiseChange,
  ralphUseWorktree,
  onRalphUseWorktreeChange,
  agentUrl,
  selectedEnvironment,
  onSelectEnvironment,
  onManageEnvironments,
  envRefreshKey,
  onStartRalphLoop,
  isValid,
}: RalphLoopTabProps) {
  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
        <p className="text-sm text-purple-300">
          <strong>Ralph Loop</strong> iteratively feeds Claude the same prompt until completion.
          Claude sees its previous work in files and improves each iteration.
        </p>
      </div>

      {/* Project Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-white/60">Project</label>
        <ProjectDropdown
          folders={folders}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          loading={loadingFolders}
          accentColor="purple"
        />
      </div>

      {/* Prompt Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-white/60">
          Task Prompt <span className="text-red-400">*</span>
        </label>
        <textarea
          value={ralphPrompt}
          onChange={(e) => onRalphPromptChange(e.target.value)}
          placeholder="Implement feature X with tests. Output <promise>COMPLETE</promise> when done."
          rows={4}
          className={cn(
            'w-full rounded-xl px-4 py-3',
            'border border-white/10 bg-white/5',
            'text-white placeholder:text-white/30',
            'focus:border-purple-500/50 focus:bg-white/10 focus:outline-none',
            'resize-none transition-all'
          )}
        />
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/60">Max Iterations</label>
          <input
            type="number"
            value={ralphMaxIterations}
            onChange={(e) => onRalphMaxIterationsChange(parseInt(e.target.value) || 0)}
            min={1}
            max={100}
            className={cn(
              'w-full rounded-xl px-4 py-3',
              'border border-white/10 bg-white/5',
              'text-white placeholder:text-white/30',
              'focus:border-purple-500/50 focus:bg-white/10 focus:outline-none',
              'transition-all'
            )}
          />
          <p className="mt-1 text-xs text-white/30">Safety limit (recommended)</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/60">Completion Promise</label>
          <input
            type="text"
            value={ralphCompletionPromise}
            onChange={(e) => onRalphCompletionPromiseChange(e.target.value)}
            placeholder="COMPLETE"
            className={cn(
              'w-full rounded-xl px-4 py-3',
              'border border-white/10 bg-white/5',
              'text-white placeholder:text-white/30',
              'focus:border-purple-500/50 focus:bg-white/10 focus:outline-none',
              'transition-all'
            )}
          />
          <p className="mt-1 text-xs text-white/30">Text that signals completion</p>
        </div>
      </div>

      {/* Worktree Option */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <input
          type="checkbox"
          id="useWorktree"
          checked={ralphUseWorktree}
          onChange={(e) => onRalphUseWorktreeChange(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
        />
        <label htmlFor="useWorktree" className="flex-1 cursor-pointer">
          <span className="block text-sm font-medium text-white">Use Git Worktree</span>
          <span className="text-xs text-white/40">
            Create an isolated branch for this loop (recommended for parallel loops)
          </span>
        </label>
      </div>

      {/* Environment Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-white/60">Environment</label>
        <EnvironmentSelector
          key={`ralph-${envRefreshKey}`}
          agentUrl={agentUrl}
          selectedId={selectedEnvironment}
          onSelect={onSelectEnvironment}
          onManageClick={onManageEnvironments}
        />
      </div>

      {/* Start Button */}
      <button
        onClick={onStartRalphLoop}
        disabled={!selectedProject || !isValid}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition-all',
          selectedProject && isValid
            ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 hover:from-purple-400 hover:to-violet-400'
            : 'cursor-not-allowed bg-white/5 text-white/30'
        )}
      >
        <Play className="h-4 w-4" />
        Start Ralph Loop
      </button>
    </div>
  );
}

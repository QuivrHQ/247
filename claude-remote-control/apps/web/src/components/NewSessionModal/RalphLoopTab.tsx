'use client';

import { Play, Shield, GitBranch, AlertTriangle, Sparkles, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnvironmentSelector } from '../EnvironmentSelector';
import { ProjectDropdown } from './ProjectDropdown';
import { ToggleSwitch } from '../ui/toggle-switch';
import { PromptBuilder } from './PromptBuilder';
import type { RalphDeliverable } from '247-shared';

interface RalphLoopTabProps {
  folders: string[];
  selectedProject: string;
  onSelectProject: (project: string) => void;
  loadingFolders: boolean;

  // Prompt Builder props
  taskDescription: string;
  onTaskDescriptionChange: (desc: string) => void;
  successCriteria: string[];
  onSuccessCriteriaChange: (criteria: string[]) => void;
  deliverables: RalphDeliverable[];
  onDeliverablesChange: (deliverables: RalphDeliverable[]) => void;
  customDeliverable: string;
  onCustomDeliverableChange: (value: string) => void;
  ralphCompletionPromise: string;
  onRalphCompletionPromiseChange: (promise: string) => void;
  completionInstruction: string;
  fullPrompt: string;
  isPreviewExpanded: boolean;
  onPreviewExpandedChange: (expanded: boolean) => void;

  // Other settings
  ralphMaxIterations: number;
  onRalphMaxIterationsChange: (iterations: number) => void;
  ralphUseWorktree: boolean;
  onRalphUseWorktreeChange: (use: boolean) => void;
  ralphTrustMode: boolean;
  onRalphTrustModeChange: (trust: boolean) => void;

  // Environment & actions
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
  taskDescription,
  onTaskDescriptionChange,
  successCriteria,
  onSuccessCriteriaChange,
  deliverables,
  onDeliverablesChange,
  customDeliverable,
  onCustomDeliverableChange,
  ralphCompletionPromise,
  onRalphCompletionPromiseChange,
  completionInstruction,
  fullPrompt,
  isPreviewExpanded,
  onPreviewExpandedChange,
  ralphMaxIterations,
  onRalphMaxIterationsChange,
  ralphUseWorktree,
  onRalphUseWorktreeChange,
  ralphTrustMode,
  onRalphTrustModeChange,
  agentUrl,
  selectedEnvironment,
  onSelectEnvironment,
  onManageEnvironments,
  envRefreshKey,
  onStartRalphLoop,
  isValid,
}: RalphLoopTabProps) {
  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent px-4 py-3">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Ralph Loop</h3>
            <p className="text-xs text-white/50">Iterative AI loop that refines until completion</p>
          </div>
        </div>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/40">
          Project
        </label>
        <ProjectDropdown
          folders={folders}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          loading={loadingFolders}
          accentColor="purple"
        />
      </div>

      {/* Prompt Builder */}
      <PromptBuilder
        taskDescription={taskDescription}
        onTaskDescriptionChange={onTaskDescriptionChange}
        successCriteria={successCriteria}
        onSuccessCriteriaChange={onSuccessCriteriaChange}
        deliverables={deliverables}
        onDeliverablesChange={onDeliverablesChange}
        customDeliverable={customDeliverable}
        onCustomDeliverableChange={onCustomDeliverableChange}
        completionSignal={ralphCompletionPromise}
        onCompletionSignalChange={onRalphCompletionPromiseChange}
        completionInstruction={completionInstruction}
        fullPrompt={fullPrompt}
        isPreviewExpanded={isPreviewExpanded}
        onPreviewExpandedChange={onPreviewExpandedChange}
      />

      {/* Options Row */}
      <div className="flex items-start gap-4">
        {/* Max Iterations */}
        <div className="flex-shrink-0 space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
            <Hash className="h-3 w-3" />
            Max Iterations
          </label>
          <div className="relative">
            <input
              type="number"
              value={ralphMaxIterations}
              onChange={(e) => onRalphMaxIterationsChange(parseInt(e.target.value) || 0)}
              min={1}
              max={100}
              className={cn(
                'w-24 rounded-xl px-4 py-3',
                'border border-white/10 bg-white/5',
                'text-white placeholder:text-white/30',
                'focus:border-purple-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-purple-500/20',
                'transition-all duration-200',
                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
              )}
            />
          </div>
        </div>

        {/* Toggle Options - inline */}
        <div className="flex-1 space-y-2">
          <ToggleSwitch
            checked={ralphTrustMode}
            onCheckedChange={onRalphTrustModeChange}
            label="Trust Mode"
            description="Auto-accept all tool permissions"
            icon={<Shield className="h-4 w-4" />}
            accentColor="amber"
            warningIcon={<AlertTriangle className="h-3 w-3" />}
            warningText="Full autonomy"
          />

          <ToggleSwitch
            checked={ralphUseWorktree}
            onCheckedChange={onRalphUseWorktreeChange}
            label="Git Worktree"
            description="Isolated branch for this loop"
            icon={<GitBranch className="h-4 w-4" />}
            accentColor="purple"
          />
        </div>
      </div>

      {/* Environment Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider text-white/40">
          Environment
        </label>
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
          'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3.5 font-medium transition-all duration-300',
          selectedProject && isValid
            ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
            : 'cursor-not-allowed bg-white/5 text-white/30'
        )}
      >
        {/* Animated background */}
        {selectedProject && isValid && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}

        <span className="relative flex items-center gap-2">
          <Play
            className={cn(
              'h-4 w-4',
              selectedProject && isValid && 'transition-transform group-hover:scale-110'
            )}
          />
          Start Ralph Loop
        </span>
      </button>
    </div>
  );
}

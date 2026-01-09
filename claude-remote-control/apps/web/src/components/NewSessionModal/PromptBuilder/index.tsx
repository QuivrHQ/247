'use client';

import { Plus } from 'lucide-react';
import type { RalphDeliverable } from '247-shared';
import { TaskDescriptionInput } from './TaskDescriptionInput';
import { SuccessCriteriaInput } from './SuccessCriteriaInput';
import { DeliverablesSelector } from './DeliverablesSelector';
import { CompletionPreview } from './CompletionPreview';
import { FullPromptPreview } from './FullPromptPreview';

interface PromptBuilderProps {
  // Task description
  taskDescription: string;
  onTaskDescriptionChange: (value: string) => void;

  // Success criteria
  successCriteria: string[];
  onSuccessCriteriaChange: (criteria: string[]) => void;

  // Deliverables
  deliverables: RalphDeliverable[];
  onDeliverablesChange: (deliverables: RalphDeliverable[]) => void;
  customDeliverable: string;
  onCustomDeliverableChange: (value: string) => void;

  // Completion
  completionSignal: string;
  onCompletionSignalChange: (signal: string) => void;
  completionInstruction: string;

  // Full prompt preview
  fullPrompt: string;
  isPreviewExpanded: boolean;
  onPreviewExpandedChange: (expanded: boolean) => void;
}

export function PromptBuilder({
  taskDescription,
  onTaskDescriptionChange,
  successCriteria,
  onSuccessCriteriaChange,
  deliverables,
  onDeliverablesChange,
  customDeliverable,
  onCustomDeliverableChange,
  completionSignal,
  onCompletionSignalChange,
  completionInstruction,
  fullPrompt,
  isPreviewExpanded,
  onPreviewExpandedChange,
}: PromptBuilderProps) {
  return (
    <div className="space-y-5 rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent p-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-purple-500/10 pb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
          <span className="text-xs text-purple-400">AI</span>
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
          Prompt Builder
        </h3>
        <span className="ml-auto text-[10px] text-white/30">
          Following Ralph Wiggum best practices
        </span>
      </div>

      {/* Section 1: Task Description */}
      <TaskDescriptionInput value={taskDescription} onChange={onTaskDescriptionChange} />

      {/* Section 2: Success Criteria */}
      <SuccessCriteriaInput criteria={successCriteria} onChange={onSuccessCriteriaChange} />

      {/* Section 3: Deliverables */}
      <DeliverablesSelector
        selected={deliverables}
        onChange={onDeliverablesChange}
        customValue={customDeliverable}
        onCustomChange={onCustomDeliverableChange}
      />

      {/* Visual Connector */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
          <Plus className="h-3 w-3" />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      </div>

      {/* Section 4: Auto-Generated Completion */}
      <CompletionPreview
        instruction={completionInstruction}
        signal={completionSignal}
        onSignalChange={onCompletionSignalChange}
      />

      {/* Full Prompt Preview */}
      <FullPromptPreview
        fullPrompt={fullPrompt}
        isExpanded={isPreviewExpanded}
        onExpandedChange={onPreviewExpandedChange}
      />
    </div>
  );
}

// Re-export components for direct use if needed
export { TaskDescriptionInput } from './TaskDescriptionInput';
export { SuccessCriteriaInput } from './SuccessCriteriaInput';
export { DeliverablesSelector } from './DeliverablesSelector';
export { CompletionPreview } from './CompletionPreview';
export { FullPromptPreview } from './FullPromptPreview';
export { buildRalphPrompt, buildCompletionInstruction } from './prompt-templates';

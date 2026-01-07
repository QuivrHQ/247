'use client';

import { useState, useMemo } from 'react';
import type { RalphLoopConfig, RalphDeliverable } from '@vibecompany/247-shared';
import {
  buildRalphPrompt,
  buildCompletionInstruction,
  getDefaultPromptBuilder,
} from '../PromptBuilder/prompt-templates';

interface UseRalphLoopResult {
  // Prompt Builder state
  taskDescription: string;
  setTaskDescription: (desc: string) => void;
  successCriteria: string[];
  setSuccessCriteria: (criteria: string[]) => void;
  deliverables: RalphDeliverable[];
  setDeliverables: (deliverables: RalphDeliverable[]) => void;
  customDeliverable: string;
  setCustomDeliverable: (value: string) => void;

  // Completion settings
  ralphCompletionPromise: string;
  setRalphCompletionPromise: (promise: string) => void;

  // Other settings
  ralphMaxIterations: number;
  setRalphMaxIterations: (iterations: number) => void;
  ralphUseWorktree: boolean;
  setRalphUseWorktree: (use: boolean) => void;
  ralphTrustMode: boolean;
  setRalphTrustMode: (trust: boolean) => void;

  // UI state
  isPreviewExpanded: boolean;
  setPreviewExpanded: (expanded: boolean) => void;

  // Computed values
  completionInstruction: string;
  fullPrompt: string;

  // Helpers
  getRalphConfig: () => RalphLoopConfig;
  isValid: boolean;
  resetRalphState: () => void;

  // Legacy support (for backward compatibility)
  ralphPrompt: string;
  setRalphPrompt: (prompt: string) => void;
}

export function useRalphLoop(): UseRalphLoopResult {
  // Prompt Builder state
  const [taskDescription, setTaskDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState<RalphDeliverable[]>(['tests']);
  const [customDeliverable, setCustomDeliverable] = useState('');

  // Completion settings
  const [ralphCompletionPromise, setRalphCompletionPromise] = useState('COMPLETE');

  // Other settings
  const [ralphMaxIterations, setRalphMaxIterations] = useState<number>(10);
  const [ralphUseWorktree, setRalphUseWorktree] = useState(false);
  const [ralphTrustMode, setRalphTrustMode] = useState(false);

  // UI state
  const [isPreviewExpanded, setPreviewExpanded] = useState(false);

  // Computed: Completion instruction text
  const completionInstruction = useMemo(
    () => buildCompletionInstruction(ralphCompletionPromise),
    [ralphCompletionPromise]
  );

  // Computed: Full assembled prompt
  const fullPrompt = useMemo(
    () =>
      buildRalphPrompt(
        {
          taskDescription,
          successCriteria,
          deliverables,
          customDeliverable,
        },
        ralphCompletionPromise
      ),
    [taskDescription, successCriteria, deliverables, customDeliverable, ralphCompletionPromise]
  );

  // Build config for sending to agent
  const getRalphConfig = (): RalphLoopConfig => ({
    prompt: fullPrompt,
    maxIterations: ralphMaxIterations > 0 ? ralphMaxIterations : undefined,
    completionPromise: ralphCompletionPromise.trim() || undefined,
    useWorktree: ralphUseWorktree,
    trustMode: ralphTrustMode,
  });

  // Validation
  const isValid = taskDescription.trim().length > 0;

  // Reset all state
  const resetRalphState = () => {
    const defaults = getDefaultPromptBuilder();
    setTaskDescription(defaults.taskDescription);
    setSuccessCriteria(defaults.successCriteria);
    setDeliverables(defaults.deliverables);
    setCustomDeliverable(defaults.customDeliverable || '');
    setRalphMaxIterations(10);
    setRalphCompletionPromise('COMPLETE');
    setRalphUseWorktree(false);
    setRalphTrustMode(false);
    setPreviewExpanded(false);
  };

  return {
    // Prompt Builder state
    taskDescription,
    setTaskDescription,
    successCriteria,
    setSuccessCriteria,
    deliverables,
    setDeliverables,
    customDeliverable,
    setCustomDeliverable,

    // Completion settings
    ralphCompletionPromise,
    setRalphCompletionPromise,

    // Other settings
    ralphMaxIterations,
    setRalphMaxIterations,
    ralphUseWorktree,
    setRalphUseWorktree,
    ralphTrustMode,
    setRalphTrustMode,

    // UI state
    isPreviewExpanded,
    setPreviewExpanded,

    // Computed values
    completionInstruction,
    fullPrompt,

    // Helpers
    getRalphConfig,
    isValid,
    resetRalphState,

    // Legacy support
    ralphPrompt: fullPrompt,
    setRalphPrompt: setTaskDescription, // Maps to taskDescription for basic usage
  };
}

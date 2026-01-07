/**
 * Prompt templates and builders for Ralph Loop.
 * Constructs prompts following Ralph Wiggum best practices.
 */

import type { RalphPromptBuilder } from '@vibecompany/247-shared';
import { RALPH_DELIVERABLE_LABELS } from '@vibecompany/247-shared';

/**
 * Build the completion instruction that tells Claude when the task is done.
 */
export function buildCompletionInstruction(signal: string): string {
  const safeSignal = signal.trim() || 'COMPLETE';
  return `When you have fully completed this task, output exactly: <promise>${safeSignal}</promise>`;
}

/**
 * Build a complete Ralph Loop prompt from structured input.
 * Combines task description, success criteria, deliverables, and completion instruction.
 */
export function buildRalphPrompt(builder: RalphPromptBuilder, completionSignal: string): string {
  const parts: string[] = [];

  // 1. Task Description (required)
  const taskDescription = builder.taskDescription.trim();
  if (!taskDescription) {
    return '';
  }
  parts.push(taskDescription);

  // 2. Success Criteria (optional)
  const criteria = builder.successCriteria.filter((c) => c.trim());
  if (criteria.length > 0) {
    parts.push('');
    parts.push('## Success Criteria');
    criteria.forEach((criterion, i) => {
      parts.push(`${i + 1}. ${criterion.trim()}`);
    });
  }

  // 3. Expected Deliverables (optional)
  const deliverableTexts = builder.deliverables
    .map((d) => {
      if (d === 'custom') {
        return builder.customDeliverable?.trim() || '';
      }
      return RALPH_DELIVERABLE_LABELS[d];
    })
    .filter(Boolean);

  if (deliverableTexts.length > 0) {
    parts.push('');
    parts.push('## Expected Deliverables');
    deliverableTexts.forEach((text) => {
      parts.push(`- ${text}`);
    });
  }

  // 4. Completion Instruction (always added)
  parts.push('');
  parts.push(buildCompletionInstruction(completionSignal));

  return parts.join('\n');
}

/**
 * Validate a RalphPromptBuilder has minimum required fields.
 */
export function isValidPromptBuilder(builder: RalphPromptBuilder): boolean {
  return builder.taskDescription.trim().length > 0;
}

/**
 * Get default prompt builder state.
 */
export function getDefaultPromptBuilder(): RalphPromptBuilder {
  return {
    taskDescription: '',
    successCriteria: [],
    deliverables: ['tests'],
    customDeliverable: '',
  };
}

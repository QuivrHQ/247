'use client';

import { useState } from 'react';
import { CheckCircle, Plus, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RALPH_SUCCESS_CRITERIA_SUGGESTIONS } from '247-shared';

interface SuccessCriteriaInputProps {
  criteria: string[];
  onChange: (criteria: string[]) => void;
}

export function SuccessCriteriaInput({ criteria, onChange }: SuccessCriteriaInputProps) {
  const [newCriterion, setNewCriterion] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addCriterion = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !criteria.includes(trimmed)) {
      onChange([...criteria, trimmed]);
    }
    setNewCriterion('');
    setShowSuggestions(false);
  };

  const removeCriterion = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCriterion.trim()) {
      e.preventDefault();
      addCriterion(newCriterion);
    }
  };

  // Filter suggestions to only show ones not already added
  const availableSuggestions = RALPH_SUCCESS_CRITERIA_SUGGESTIONS.filter(
    (s) => !criteria.includes(s)
  );

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-[10px] font-bold text-purple-400">
          2
        </span>
        <CheckCircle className="h-3 w-3" />
        Success Criteria
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          Optional
        </span>
      </label>
      <p className="ml-7 text-xs text-white/30">How will Claude know the task is complete?</p>

      {/* Existing criteria */}
      {criteria.length > 0 && (
        <div className="ml-7 space-y-1.5">
          {criteria.map((criterion, index) => (
            <div
              key={index}
              className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="font-mono text-xs text-emerald-400">{index + 1}.</span>
              <span className="flex-1 text-sm text-white/70">{criterion}</span>
              <button
                onClick={() => removeCriterion(index)}
                className="rounded p-1 text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new criterion */}
      <div className="relative ml-7">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Add a criterion..."
            className={cn(
              'flex-1 rounded-lg px-3 py-2',
              'border border-white/10 bg-white/5',
              'text-sm text-white placeholder:text-white/25',
              'focus:border-purple-500/30 focus:outline-none',
              'transition-all duration-200'
            )}
          />
          <button
            onClick={() => addCriterion(newCriterion)}
            disabled={!newCriterion.trim()}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2',
              'text-xs font-medium transition-all duration-200',
              newCriterion.trim()
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'cursor-not-allowed bg-white/5 text-white/30'
            )}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {/* Quick suggestions */}
        {showSuggestions && availableSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-white/10 bg-[#1a1a2e] p-2 shadow-xl">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/30">
              <Sparkles className="h-3 w-3" />
              Quick add
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {availableSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addCriterion(suggestion)}
                  className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60 transition-all hover:bg-purple-500/20 hover:text-purple-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Eye, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullPromptPreviewProps {
  fullPrompt: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function FullPromptPreview({
  fullPrompt,
  isExpanded,
  onExpandedChange,
}: FullPromptPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!fullPrompt) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {/* Header - always visible */}
      <button
        onClick={() => onExpandedChange(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-white/40" />
          <span className="text-sm font-medium text-white/60">Preview Full Prompt</span>
          <span className="text-xs text-white/30">({fullPrompt.length} chars)</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white/40 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-white/5">
          <div className="relative p-4">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>

            {/* Prompt Content */}
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap pr-20 font-mono text-sm text-white/70">
              {fullPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

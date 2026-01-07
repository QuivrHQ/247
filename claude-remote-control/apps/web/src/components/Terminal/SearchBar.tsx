'use client';

import { forwardRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  visible: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onClose: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ visible, query, onQueryChange, onFindNext, onFindPrevious, onClose }, ref) => {
    if (!visible) return null;

    return (
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2',
          'bg-[#0d0d14]/90 backdrop-blur-sm',
          'border-b border-white/5'
        )}
      >
        <Search className="h-4 w-4 text-white/30" />
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search in terminal..."
          className={cn(
            'flex-1 bg-transparent text-sm text-white placeholder:text-white/30',
            'focus:outline-none'
          )}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={onFindPrevious}
            className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            title="Previous (⇧↵)"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onFindNext}
            className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            title="Next (↵)"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

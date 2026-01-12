'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectDropdownProps {
  folders: string[];
  selectedProject: string;
  onSelectProject: (project: string) => void;
  loading: boolean;
  accentColor?: 'orange' | 'purple';
}

export function ProjectDropdown({
  folders,
  selectedProject,
  onSelectProject,
  loading,
  accentColor = 'orange',
}: ProjectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when dropdown opens, reset search when closed
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Filter folders based on search query
  const filteredFolders = folders.filter((folder) =>
    folder.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClass =
    accentColor === 'purple'
      ? 'bg-purple-500/10 text-purple-400'
      : 'bg-orange-500/10 text-orange-400';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-left',
          'border border-white/10 bg-white/5',
          'hover:border-white/20 hover:bg-white/10',
          'flex items-center justify-between',
          'transition-all'
        )}
      >
        <span className={selectedProject ? 'text-white' : 'text-white/40'}>
          {selectedProject || 'Choose a project...'}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-0 right-0 top-full z-10 mt-2',
              'rounded-xl border border-white/10 bg-[#12121a]',
              'shadow-xl shadow-black/50',
              'flex max-h-64 flex-col overflow-hidden'
            )}
          >
            {/* Search input */}
            <div className="flex-shrink-0 border-b border-white/10 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className={cn(
                    'w-full rounded-lg py-2 pl-9 pr-3 text-sm',
                    'border border-white/10 bg-white/5',
                    'text-white placeholder:text-white/30',
                    'focus:border-white/20 focus:outline-none'
                  )}
                />
              </div>
            </div>

            {/* Folders list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-white/30">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading folders...
                </div>
              ) : filteredFolders.length > 0 ? (
                filteredFolders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => {
                      onSelectProject(folder);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left',
                      'transition-colors hover:bg-white/5',
                      selectedProject === folder ? selectedClass : 'text-white/80'
                    )}
                  >
                    {folder}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-white/30">
                  {folders.length > 0 ? 'No matching projects' : 'No folders found'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

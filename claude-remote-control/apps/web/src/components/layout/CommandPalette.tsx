'use client';

/**
 * Command palette (Cmd+K) for quick navigation and actions
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FolderKanban,
  ListTodo,
  Terminal,
  Plus,
  Settings,
  ArrowRight,
} from 'lucide-react';
import type { Project } from '247-shared';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'action' | 'project';
}

export function CommandPalette({ isOpen, onClose, projects }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build command list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      // Navigation
      {
        id: 'nav-sessions',
        label: 'Go to Sessions',
        description: 'View terminal sessions',
        icon: <Terminal className="w-4 h-4" />,
        action: () => router.push('/'),
        category: 'navigation',
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        description: 'View all projects',
        icon: <FolderKanban className="w-4 h-4" />,
        action: () => router.push('/projects'),
        category: 'navigation',
      },
      {
        id: 'nav-issues',
        label: 'Go to Issues',
        description: 'View all issues',
        icon: <ListTodo className="w-4 h-4" />,
        action: () => router.push('/issues'),
        category: 'navigation',
      },
      // Actions
      {
        id: 'action-new-project',
        label: 'Create Project',
        description: 'Start a new project',
        icon: <Plus className="w-4 h-4" />,
        action: () => router.push('/projects?new=true'),
        category: 'action',
      },
      {
        id: 'action-new-issue',
        label: 'Create Issue',
        description: 'Create a standalone issue',
        icon: <Plus className="w-4 h-4" />,
        action: () => router.push('/issues?new=true'),
        category: 'action',
      },
      // Projects
      ...projects.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        description: `Open project`,
        icon: <FolderKanban className="w-4 h-4" />,
        action: () => router.push(`/projects/${project.id}`),
        category: 'project' as const,
      })),
    ];

    return cmds;
  }, [projects, router]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) =>
            i < filteredCommands.length - 1 ? i + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) =>
            i > 0 ? i - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="relative w-full max-w-xl mx-4 bg-zinc-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <Search className="w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands, projects..."
              className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none"
              autoFocus
            />
            <kbd className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500">
                No results found
              </div>
            ) : (
              <>
                {/* Group by category */}
                {['navigation', 'action', 'project'].map((category) => {
                  const categoryCommands = filteredCommands.filter(
                    (c) => c.category === category
                  );
                  if (categoryCommands.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-4 py-1 text-xs text-zinc-500 uppercase tracking-wider">
                        {category === 'navigation' && 'Navigation'}
                        {category === 'action' && 'Actions'}
                        {category === 'project' && 'Projects'}
                      </div>
                      {categoryCommands.map((cmd) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => {
                              cmd.action();
                              onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                              globalIndex === selectedIndex
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'text-zinc-300 hover:bg-white/5'
                            )}
                          >
                            <span className="text-zinc-400">{cmd.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{cmd.label}</div>
                              {cmd.description && (
                                <div className="text-xs text-zinc-500 truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {globalIndex === selectedIndex && (
                              <ArrowRight className="w-4 h-4 text-orange-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 px-1 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 px-1 rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 px-1 rounded">ESC</kbd> Close
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

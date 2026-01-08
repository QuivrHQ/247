'use client';

import { useEffect } from 'react';
import { TerminalSquare, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActiveTab = 'terminal' | 'editor';

interface EditorTerminalTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  editorEnabled?: boolean;
  /** Mobile mode for responsive styling */
  isMobile?: boolean;
}

export function EditorTerminalTabs({
  activeTab,
  onTabChange,
  editorEnabled = true,
  isMobile = false,
}: EditorTerminalTabsProps) {
  // Keyboard shortcuts: Option+T for terminal, Option+E for editor
  // Use e.code because Option+key produces special chars on Mac
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.code === 'KeyT') {
          e.preventDefault();
          onTabChange('terminal');
        } else if (e.code === 'KeyE' && editorEnabled) {
          e.preventDefault();
          onTabChange('editor');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTabChange, editorEnabled]);

  return (
    <div
      className={cn('flex items-center gap-1 px-2 py-1.5', 'border-b border-white/5 bg-[#0d0d14]')}
    >
      {/* Terminal Tab */}
      <button
        onClick={() => onTabChange('terminal')}
        className={cn(
          'flex items-center gap-2 rounded-md',
          'touch-manipulation font-medium transition-all',
          isMobile ? 'min-h-[40px] px-3 py-2 text-xs' : 'px-3 py-1.5 text-sm',
          activeTab === 'terminal'
            ? 'bg-white/10 text-white'
            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
        )}
      >
        <TerminalSquare className={isMobile ? 'h-4 w-4' : 'h-4 w-4'} />
        <span>Terminal</span>
        {!isMobile && (
          <kbd
            className={cn(
              'ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]',
              activeTab === 'terminal' ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/30'
            )}
          >
            ⌥T
          </kbd>
        )}
      </button>

      {/* Editor Tab */}
      {editorEnabled && (
        <button
          onClick={() => onTabChange('editor')}
          className={cn(
            'flex items-center gap-2 rounded-md',
            'touch-manipulation font-medium transition-all',
            isMobile ? 'min-h-[40px] px-3 py-2 text-xs' : 'px-3 py-1.5 text-sm',
            activeTab === 'editor'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:bg-white/5 hover:text-white/80'
          )}
        >
          <Code className={isMobile ? 'h-4 w-4' : 'h-4 w-4'} />
          <span>Editor</span>
          {!isMobile && (
            <kbd
              className={cn(
                'ml-1 rounded px-1.5 py-0.5 font-mono text-[10px]',
                activeTab === 'editor' ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/30'
              )}
            >
              ⌥E
            </kbd>
          )}
        </button>
      )}
    </div>
  );
}

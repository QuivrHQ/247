'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Settings, List, HelpCircle } from 'lucide-react';
import { EnvironmentsList } from './EnvironmentsList';
import { ConnectionGuide } from './ConnectionGuide';
import { cn } from '@/lib/utils';

export type ViewTab = 'environments' | 'guide';

interface Machine {
  id: string;
  name: string;
  status: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

interface DashboardContentProps {
  // sessions prop removed as it's no longer needed for the list
  machines: Machine[];
  activeTab: ViewTab | null; // null means "welcome" screen
  onTabChange: (tab: ViewTab | null) => void;
  onSelectSession: (machineId: string, sessionName: string) => void; // Kept (maybe used by other components?)
  onNewSession: () => void;
  /** Mobile mode for responsive styling */
  isMobile?: boolean;
}

export function DashboardContent({
  machines,
  activeTab,
  onTabChange,
  onNewSession,
  isMobile = false,
}: DashboardContentProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <div className={cn('border-b border-white/5 pt-4', isMobile ? 'px-3' : 'px-6')}>
        <div className={cn('flex', isMobile ? 'scrollbar-none gap-0.5 overflow-x-auto' : 'gap-1')}>
          {/* Welcome Tab */}
          <button
            onClick={() => onTabChange(null)}
            className={cn(
              '-mb-px flex touch-manipulation items-center gap-2 border-b-2 text-sm font-medium transition-all',
              isMobile ? 'min-h-[44px] whitespace-nowrap px-3 py-2.5' : 'px-4 py-3',
              activeTab === null
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-white/50 hover:text-white/70'
            )}
          >
            <Zap className="h-4 w-4" />
            {!isMobile && 'Overview'}
          </button>
          <button
            onClick={() => onTabChange('environments')}
            className={cn(
              '-mb-px flex touch-manipulation items-center gap-2 border-b-2 text-sm font-medium transition-all',
              isMobile ? 'min-h-[44px] whitespace-nowrap px-3 py-2.5' : 'px-4 py-3',
              activeTab === 'environments'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-white/50 hover:text-white/70'
            )}
          >
            <Settings className="h-4 w-4" />
            {isMobile ? 'Env' : 'Environments'}
          </button>
          <button
            onClick={() => onTabChange('guide')}
            className={cn(
              '-mb-px flex touch-manipulation items-center gap-2 border-b-2 text-sm font-medium transition-all',
              isMobile ? 'min-h-[44px] whitespace-nowrap px-3 py-2.5' : 'px-4 py-3',
              activeTab === 'guide'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-white/50 hover:text-white/70'
            )}
          >
            <HelpCircle className="h-4 w-4" />
            {isMobile ? 'Guide' : 'Connection Guide'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-auto', isMobile ? 'p-4' : 'p-6')}>
        <AnimatePresence mode="wait">
          {activeTab === null ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-amber-500/20 shadow-2xl shadow-orange-500/10">
                  <Zap className="h-10 w-10 text-orange-500" />
                </div>

                <h2 className="mb-3 text-3xl font-bold text-white">Welcome to 247</h2>
                <p className="mb-10 max-w-md text-lg text-white/40">
                  Select a session from the sidebar to continue working, or start a new task below.
                </p>

                <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
                  <button
                    onClick={onNewSession}
                    className={cn(
                      'flex items-center justify-center gap-3 rounded-xl px-8 py-4 font-semibold transition-all',
                      'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                      'text-white shadow-lg shadow-orange-500/20 hover:scale-[1.02] hover:shadow-orange-500/40',
                      'active:scale-[0.98]'
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Start New Session</span>
                  </button>

                  <button
                    onClick={() => onTabChange('guide')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-8 py-4 font-medium transition-all',
                      'border border-white/10 bg-white/5 text-white/70',
                      'hover:border-white/20 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span>View Guide</span>
                  </button>
                </div>

                <div className="mt-16 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10">
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                      <List className="h-4 w-4 text-blue-400" />
                    </div>
                    <h3 className="mb-1 font-medium text-white">Session History</h3>
                    <p className="text-xs text-white/30">
                      Access past conversations and terminals from the sidebar.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10">
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                      <Settings className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="mb-1 font-medium text-white">Environments</h3>
                    <p className="text-xs text-white/30">
                      Manage API keys and environment variables.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-white/10">
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                      <Zap className="h-4 w-4 text-purple-400" />
                    </div>
                    <h3 className="mb-1 font-medium text-white">Real-time</h3>
                    <p className="text-xs text-white/30">
                      Live terminal streaming and instant feedback.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'environments' ? (
            <motion.div
              key="environments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <EnvironmentsList machines={machines} />
            </motion.div>
          ) : (
            <motion.div
              key="guide"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ConnectionGuide />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

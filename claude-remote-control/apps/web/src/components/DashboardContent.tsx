'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Settings, List, HelpCircle } from 'lucide-react';
import { SessionListView } from './SessionListView';
import { EnvironmentsList } from './EnvironmentsList';
import { ConnectionGuide } from './ConnectionGuide';
import { type SessionWithMachine } from '@/contexts/SessionPollingContext';
import { cn } from '@/lib/utils';

type ViewTab = 'sessions' | 'environments' | 'guide';

interface Machine {
  id: string;
  name: string;
  status: 'online' | 'offline';
  config?: {
    projects: string[];
    agentUrl: string;
  };
}

interface DashboardContentProps {
  sessions: SessionWithMachine[];
  machines: Machine[];
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onSelectSession: (machineId: string, sessionName: string) => void;
  onNewSession: () => void;
}

export function DashboardContent({
  sessions,
  machines,
  activeTab,
  onTabChange,
  onSelectSession,
  onNewSession,
}: DashboardContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-white/5 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => onTabChange('sessions')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === 'sessions'
                ? 'text-orange-400 border-orange-400'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <List className="w-4 h-4" />
            Sessions
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                activeTab === 'sessions' ? 'bg-orange-500/20' : 'bg-white/10'
              )}
            >
              {sessions.length}
            </span>
          </button>
          <button
            onClick={() => onTabChange('environments')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === 'environments'
                ? 'text-orange-400 border-orange-400'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <Settings className="w-4 h-4" />
            Environments
          </button>
          <button
            onClick={() => onTabChange('guide')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === 'guide'
                ? 'text-orange-400 border-orange-400'
                : 'text-white/50 border-transparent hover:text-white/70'
            )}
          >
            <HelpCircle className="w-4 h-4" />
            Connection Guide
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'sessions' ? (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {sessions.length === 0 ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-lg font-medium text-white/80 mb-2">No active sessions</h3>
                    <p className="text-sm text-white/40 mb-6">
                      Start a new session to begin working with Claude Code
                    </p>
                    <button
                      onClick={onNewSession}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                        'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                        'text-white shadow-lg shadow-orange-500/20'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      New Session
                    </button>
                  </div>
                </div>
              ) : (
                <SessionListView sessions={sessions} onSelectSession={onSelectSession} />
              )}
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

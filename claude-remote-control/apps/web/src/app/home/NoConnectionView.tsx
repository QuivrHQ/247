'use client';

import { motion } from 'framer-motion';
import { Zap, Wifi, HelpCircle } from 'lucide-react';
import {
  AgentConnectionSettings,
  type saveAgentConnection,
} from '@/components/AgentConnectionSettings';
import { cn } from '@/lib/utils';

interface NoConnectionViewProps {
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  onConnectionSaved: (connection: ReturnType<typeof saveAgentConnection>) => void;
}

export function NoConnectionView({
  modalOpen,
  onModalOpenChange,
  onConnectionSaved,
}: NoConnectionViewProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0a10] selection:bg-orange-500/20">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-orange-500/10 mix-blend-screen blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 mix-blend-screen blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex max-w-lg flex-col items-center px-6 text-center"
      >
        <div className="group relative mb-8 cursor-pointer" onClick={() => onModalOpenChange(true)}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#1c1c24] to-[#121218] shadow-2xl transition-transform duration-500 group-hover:scale-105">
            <Zap className="h-10 w-10 text-orange-500 transition-colors duration-500 group-hover:text-amber-400" />
          </div>

          {/* Status dot */}
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a10]">
            <div className="h-4 w-4 rounded-full border border-white/10 bg-white/10 transition-colors group-hover:border-orange-400 group-hover:bg-orange-500" />
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">Connect Agent</h1>
        <p className="mb-10 text-lg leading-relaxed text-white/40">
          Remote control for your local Claude Code agent.
          <br />
          Monitor sessions, edit files, and approve commands.
        </p>

        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <button
            onClick={() => onModalOpenChange(true)}
            className={cn(
              'group inline-flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-4 font-semibold transition-all sm:w-auto',
              'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
              'hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(249,115,22,0.4)]',
              'active:scale-[0.98]'
            )}
          >
            <Wifi className="h-5 w-5" />
            <span>Connect Now</span>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <span className="text-xs uppercase tracking-wider opacity-60">Local</span>
          </button>

          <a
            href="https://docs.anthropic.com/en/docs/agents-and-tools/python-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 font-medium transition-all sm:w-auto',
              'border border-white/5 bg-white/5 text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white'
            )}
          >
            <HelpCircle className="h-5 w-5" />
            <span>Guide</span>
          </a>
        </div>

        <p className="mt-8 font-mono text-xs text-white/20">v0.1.0 • waiting for connection</p>
      </motion.div>

      <AgentConnectionSettings
        open={modalOpen}
        onOpenChange={onModalOpenChange}
        onSave={onConnectionSaved}
      />
    </main>
  );
}

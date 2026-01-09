'use client';

import { motion } from 'framer-motion';
import { Cpu, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from './types';

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  onOptionSelect?: (option: string) => void;
}

export function ChatMessage({ message, isLast: _isLast, onOptionSelect }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Format timestamp
  const time = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-medium',
          isUser
            ? 'border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-400'
            : isSystem
              ? 'border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400'
              : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isSystem ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Cpu className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn('max-w-[85%] flex-1 space-y-2', isUser ? 'text-right' : 'text-left')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-md border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-cyan-600/10 text-cyan-50'
              : isSystem
                ? 'rounded-tl-md border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5 font-mono text-xs text-amber-200/90'
                : 'rounded-tl-md border border-zinc-800/60 bg-zinc-900/80 text-zinc-300'
          )}
        >
          {/* Render message with markdown-like formatting */}
          <MessageContent content={message.content} />
        </div>

        {/* Options for clarification questions */}
        {message.options && message.options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn('flex flex-wrap gap-2', isUser ? 'justify-end' : 'justify-start')}
          >
            {message.options.map((option) => (
              <button
                key={option}
                onClick={() => onOptionSelect?.(option)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-400"
              >
                {option}
              </button>
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        <div className={cn('font-mono text-[10px] text-zinc-600', isUser ? 'pr-1' : 'pl-1')}>
          {time}
        </div>
      </div>
    </motion.div>
  );
}

// Simple markdown-like content renderer
function MessageContent({ content }: { content: string }) {
  // Split content into lines for numbered lists
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Check for numbered list items
        const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*-?\s*(.*)$/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="font-mono text-xs text-cyan-500/60">{numberedMatch[1]}.</span>
              <span>
                <span className="font-medium text-zinc-200">{numberedMatch[2]}</span>
                {numberedMatch[3] && <span className="text-zinc-400"> - {numberedMatch[3]}</span>}
              </span>
            </div>
          );
        }

        // Check for bold text
        const parts = line.split(/\*\*(.+?)\*\*/g);
        if (parts.length > 1) {
          return (
            <p key={i}>
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <span key={j} className="font-medium text-zinc-200">
                    {part}
                  </span>
                ) : (
                  part
                )
              )}
            </p>
          );
        }

        // Regular line
        if (line.trim()) {
          return <p key={i}>{line}</p>;
        }

        return null;
      })}
    </div>
  );
}

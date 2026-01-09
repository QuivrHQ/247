'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionOption {
  label: string;
  value: string;
  description?: string;
  variant?: 'default' | 'primary' | 'danger';
}

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  options: DecisionOption[];
  onSelect: (value: string) => void;
}

export function DecisionModal({
  isOpen,
  onClose,
  title,
  description,
  options,
  onSelect,
}: DecisionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 outline-none"
            tabIndex={-1}
          >
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950 shadow-2xl shadow-amber-500/10">
              {/* Glow effect */}
              <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />

              {/* Header */}
              <div className="relative px-6 pb-4 pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 px-6 pb-6">
                {options.map((option, index) => (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelect(option.value)}
                    className={cn(
                      'group w-full rounded-xl px-4 py-3 text-left transition-all duration-200',
                      'border',
                      option.variant === 'primary'
                        ? 'border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/20'
                        : option.variant === 'danger'
                          ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            option.variant === 'primary'
                              ? 'text-cyan-300'
                              : option.variant === 'danger'
                                ? 'text-red-400'
                                : 'text-zinc-200'
                          )}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <p className="mt-0.5 text-xs text-zinc-500">{option.description}</p>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100',
                          option.variant === 'primary'
                            ? 'text-cyan-400'
                            : option.variant === 'danger'
                              ? 'text-red-400'
                              : 'text-zinc-400'
                        )}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

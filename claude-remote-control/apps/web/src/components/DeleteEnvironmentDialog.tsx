'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentMetadata } from '247-shared';

interface DeleteEnvironmentDialogProps {
  environment: EnvironmentMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteEnvironmentDialog({
  environment,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteEnvironmentDialogProps) {
  if (!environment) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => !loading && onOpenChange(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative mx-4 w-full max-w-md',
              'rounded-2xl border border-white/10 bg-[#0d0d14]',
              'shadow-2xl shadow-black/50'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Delete Environment</h2>
                  <p className="text-sm text-white/40">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-white/70">
                Are you sure you want to delete{' '}
                <span className="font-medium text-white">{environment.name}</span>?
              </p>
              {environment.isDefault && (
                <p className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-sm text-orange-400/80">
                  This is your default environment. Deleting it will remove the default selection.
                </p>
              )}
              <p className="mt-3 text-sm text-white/40">
                All configuration including API keys stored in this environment will be permanently
                removed.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-xl px-4 py-2.5 font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all',
                  'border border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Environment'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

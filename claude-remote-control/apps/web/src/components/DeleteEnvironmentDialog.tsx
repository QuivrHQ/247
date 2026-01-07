'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentMetadata } from '@vibecompany/247-shared';

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
              'relative w-full max-w-md mx-4',
              'bg-[#0d0d14] border border-white/10 rounded-2xl',
              'shadow-2xl shadow-black/50'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Delete Environment</h2>
                  <p className="text-sm text-white/40">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-white/70">
                Are you sure you want to delete{' '}
                <span className="font-medium text-white">{environment.name}</span>?
              </p>
              {environment.isDefault && (
                <p className="mt-3 text-sm text-orange-400/80 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                  This is your default environment. Deleting it will remove the default selection.
                </p>
              )}
              <p className="mt-3 text-sm text-white/40">
                All configuration including API keys stored in this environment will be permanently
                removed.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                  'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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

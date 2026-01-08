'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  children,
  title,
}: MobileSidebarDrawerProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px]',
              'bg-gradient-to-b from-[#0d0d14] to-[#0a0a10]',
              'border-r border-white/10 shadow-2xl',
              'flex flex-col',
              'md:hidden',
              // Safe area padding for iOS
              'pt-[env(safe-area-inset-top)]',
              'pb-[env(safe-area-inset-bottom)]',
              'pl-[env(safe-area-inset-left)]'
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Navigation menu'}
          >
            {/* Drawer Header with Close Button */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              {title && <h2 className="text-sm font-medium text-white/80">{title}</h2>}
              <button
                onClick={onClose}
                className={cn(
                  'ml-auto flex h-10 w-10 items-center justify-center rounded-lg',
                  'text-white/50 hover:bg-white/10 hover:text-white',
                  'touch-manipulation transition-colors',
                  'active:scale-95'
                )}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

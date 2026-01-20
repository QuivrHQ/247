'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// Predefined color palette
export const AGENT_COLORS = [
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Slate', hex: '#64748b' },
] as const;

export interface EditAgentModalProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentColor?: string;
  onSave: (id: string, data: { name: string; color?: string }) => Promise<void>;
}

export function EditAgentModal({
  open,
  onClose,
  agentId,
  agentName,
  agentColor,
  onSave,
}: EditAgentModalProps) {
  const [name, setName] = useState(agentName);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(agentColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (open) {
      setName(agentName);
      setSelectedColor(agentColor);
      setError(null);
    }
  }, [open, agentName, agentColor]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(agentId, { name: name.trim(), color: selectedColor });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Pencil className="h-4 w-4 text-white/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Edit Machine</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 p-6">
                {/* Name input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Machine Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter machine name"
                    className={cn(
                      'w-full rounded-xl px-4 py-3',
                      'border border-white/10 bg-white/5',
                      'text-white placeholder:text-white/30',
                      'focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20'
                    )}
                    autoFocus
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-white/70">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {/* No color option */}
                    <button
                      onClick={() => setSelectedColor(undefined)}
                      className={cn(
                        'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        selectedColor === undefined
                          ? 'border-white ring-2 ring-white/30 ring-offset-2 ring-offset-[#12121a]'
                          : 'border-white/20 hover:border-white/40'
                      )}
                      title="No color"
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-white/10 to-white/5" />
                      {selectedColor === undefined && (
                        <Check className="absolute h-4 w-4 text-white" />
                      )}
                    </button>

                    {/* Color options */}
                    {AGENT_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setSelectedColor(color.hex)}
                        className={cn(
                          'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                          selectedColor === color.hex
                            ? 'ring-2 ring-offset-2 ring-offset-[#12121a]'
                            : 'border-transparent hover:scale-110'
                        )}
                        style={{
                          backgroundColor: color.hex,
                          borderColor: selectedColor === color.hex ? color.hex : 'transparent',
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ['--tw-ring-color' as any]: selectedColor === color.hex ? `${color.hex}50` : undefined,
                        }}
                        title={color.name}
                      >
                        {selectedColor === color.hex && (
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                    'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
                    'hover:shadow-lg hover:shadow-orange-500/20',
                    (saving || !name.trim()) && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

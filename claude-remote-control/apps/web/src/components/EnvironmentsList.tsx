'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Monitor, Zap, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnvironmentCard, AddEnvironmentCard } from './EnvironmentCard';
import { EnvironmentFormModal } from './EnvironmentFormModal';
import { DeleteEnvironmentDialog } from './DeleteEnvironmentDialog';
import type { EnvironmentMetadata } from '@vibecompany/247-shared';

interface Machine {
  id: string;
  name: string;
  status: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

interface EnvironmentsListProps {
  machines: Machine[];
}

export function EnvironmentsList({ machines }: EnvironmentsListProps) {
  const onlineMachines = machines.filter((m) => m.status === 'online');

  // Selected machine state
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(onlineMachines[0] || null);
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);

  // Environments data
  const [environments, setEnvironments] = useState<EnvironmentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<EnvironmentMetadata | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEnvironment, setDeletingEnvironment] = useState<EnvironmentMetadata | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Agent URL helper
  const getAgentUrl = useCallback(() => {
    return selectedMachine?.config?.agentUrl || 'localhost:4678';
  }, [selectedMachine]);

  const getProtocol = useCallback(() => {
    const url = getAgentUrl();
    return url.includes('localhost') ? 'http' : 'https';
  }, [getAgentUrl]);

  // Fetch environments
  const fetchEnvironments = useCallback(async () => {
    if (!selectedMachine) {
      setEnvironments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getProtocol()}://${getAgentUrl()}/api/environments`);
      if (response.ok) {
        const data: EnvironmentMetadata[] = await response.json();
        setEnvironments(data);
      } else {
        setError('Failed to load environments');
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
      setError('Could not connect to agent');
    } finally {
      setLoading(false);
    }
  }, [selectedMachine, getAgentUrl, getProtocol]);

  // Fetch when machine changes
  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  // Update selected machine when online machines change
  useEffect(() => {
    if (!selectedMachine && onlineMachines.length > 0) {
      setSelectedMachine(onlineMachines[0]);
    } else if (selectedMachine && !onlineMachines.find((m) => m.id === selectedMachine.id)) {
      setSelectedMachine(onlineMachines[0] || null);
    }
  }, [onlineMachines, selectedMachine]);

  // Handle edit
  const handleEdit = (env: EnvironmentMetadata) => {
    setEditingEnvironment(env);
    setFormModalOpen(true);
  };

  // Handle delete
  const handleDeleteClick = (env: EnvironmentMetadata) => {
    setDeletingEnvironment(env);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEnvironment) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(
        `${getProtocol()}://${getAgentUrl()}/api/environments/${deletingEnvironment.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchEnvironments();
        setDeleteDialogOpen(false);
        setDeletingEnvironment(null);
      }
    } catch (err) {
      console.error('Failed to delete environment:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle set default
  const handleSetDefault = async (env: EnvironmentMetadata) => {
    try {
      const response = await fetch(
        `${getProtocol()}://${getAgentUrl()}/api/environments/${env.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDefault: true }),
        }
      );

      if (response.ok) {
        await fetchEnvironments();
      }
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  // Handle form close
  const handleFormClose = (open: boolean) => {
    setFormModalOpen(open);
    if (!open) {
      setEditingEnvironment(null);
    }
  };

  // Handle save success
  const handleSaved = () => {
    fetchEnvironments();
  };

  // No online machines
  if (onlineMachines.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Monitor className="h-8 w-8 text-white/20" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-white/80">No machines online</h3>
          <p className="text-sm text-white/40">
            Start an agent on your machine to manage environments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Machine Selector + Add Button */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Machine Selector */}
        <div className="relative">
          <button
            onClick={() => setMachineDropdownOpen(!machineDropdownOpen)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-2.5',
              'border border-white/10 bg-white/5',
              'hover:border-white/20 hover:bg-white/10',
              'transition-all'
            )}
          >
            <Monitor className="h-4 w-4 text-white/50" />
            <span className="font-medium text-white">
              {selectedMachine?.name || 'Select machine'}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-white/40 transition-transform',
                machineDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {machineDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'absolute left-0 top-full z-20 mt-2',
                  'min-w-[200px]',
                  'rounded-xl border border-white/10 bg-[#12121a]',
                  'shadow-xl shadow-black/50',
                  'overflow-hidden'
                )}
              >
                {onlineMachines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => {
                      setSelectedMachine(machine);
                      setMachineDropdownOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2.5 text-left',
                      'transition-colors hover:bg-white/5',
                      selectedMachine?.id === machine.id
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'text-white/80'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    {machine.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setEditingEnvironment(null);
            setFormModalOpen(true);
          }}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-all',
            'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
            'text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30'
          )}
        >
          <Plus className="h-4 w-4" />
          New Environment
        </button>
      </div>

      {/* Content */}
      {loading ? (
        // Loading State
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[140px] animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Zap className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-white/80">Connection Error</h3>
            <p className="mb-4 text-sm text-white/40">{error}</p>
            <button
              onClick={fetchEnvironments}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium',
                'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                'border border-white/10 transition-all'
              )}
            >
              <Loader2 className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      ) : environments.length === 0 ? (
        // Empty State
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Zap className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-white/80">No environments configured</h3>
            <p className="mb-6 text-sm text-white/40">
              Create your first environment to manage API keys for Claude Code
            </p>
            <button
              onClick={() => {
                setEditingEnvironment(null);
                setFormModalOpen(true);
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all',
                'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
                'text-white shadow-lg shadow-orange-500/20'
              )}
            >
              <Plus className="h-4 w-4" />
              Create Environment
            </button>
          </div>
        </div>
      ) : (
        // Environments Grid
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {environments.map((env, index) => (
              <motion.div
                key={env.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <EnvironmentCard
                  environment={env}
                  onEdit={() => handleEdit(env)}
                  onDelete={() => handleDeleteClick(env)}
                  onSetDefault={() => handleSetDefault(env)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Card */}
          <AddEnvironmentCard
            onClick={() => {
              setEditingEnvironment(null);
              setFormModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Form Modal */}
      <EnvironmentFormModal
        open={formModalOpen}
        onOpenChange={handleFormClose}
        agentUrl={getAgentUrl()}
        editingEnvironment={editingEnvironment}
        onSaved={handleSaved}
      />

      {/* Delete Dialog */}
      <DeleteEnvironmentDialog
        environment={deletingEnvironment}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}

'use client';

/**
 * Modal for creating a new project
 * Supports both manual creation and AI-assisted planning
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  FolderKanban,
  Zap,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreateProjectRequest, Project } from '247-shared';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectRequest) => Promise<Project>;
  baseProjects: string[]; // Available projects from whitelist
  agentUrl: string;
}

type Mode = 'select' | 'manual' | 'ai-plan';

export function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
  baseProjects,
  agentUrl,
}: NewProjectModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseProject, setBaseProject] = useState('');
  const [trustMode, setTrustMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update baseProject when baseProjects loads
  useEffect(() => {
    if (baseProjects.length > 0 && !baseProject) {
      setBaseProject(baseProjects[0]);
    }
  }, [baseProjects, baseProject]);

  const resetForm = () => {
    setMode('select');
    setName('');
    setDescription('');
    setBaseProject(baseProjects[0] || '');
    setTrustMode(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseProject) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const project = await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        baseProject,
        trustMode: mode === 'ai-plan' ? trustMode : undefined,
      });

      // If AI planning mode, start planning session and redirect
      if (mode === 'ai-plan' && project) {
        const planningRes = await fetch(
          `${agentUrl}/api/managed-projects/${project.id}/start-planning`,
          { method: 'POST' }
        );

        if (planningRes.ok) {
          const { sessionName } = await planningRes.json();
          // Navigate to home page with session and planning project ID
          // The agent will generate the prompt based on the project
          const params = new URLSearchParams({
            project: baseProject,
            session: sessionName,
            create: 'true',
            planningProjectId: project.id,
          });
          handleClose();
          router.push(`/?${params.toString()}`);
          return;
        }
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold">New Project</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {mode === 'select' ? (
              /* Mode Selection */
              <div className="space-y-3">
                <p className="text-sm text-zinc-400 mb-4">
                  How would you like to create your project?
                </p>

                {/* Manual Option */}
                <button
                  onClick={() => setMode('manual')}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                    'border-white/5 hover:border-white/10 hover:bg-white/5'
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <FolderKanban className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Create Manually</h3>
                    <p className="text-sm text-zinc-500">
                      Set up a project and add issues yourself
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </button>

                {/* AI Planning Option */}
                <button
                  onClick={() => setMode('ai-plan')}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                    'border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/5',
                    'bg-gradient-to-r from-orange-500/10 to-transparent'
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-300">Plan with Claude</h3>
                    <p className="text-sm text-zinc-500">
                      Let Claude help you break down the project into issues
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-orange-400" />
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-2"
                >
                  ← Back
                </button>

                {/* Mode indicator */}
                {mode === 'ai-plan' && (
                  <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-500/10 px-3 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    <span>Claude will help plan this project</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Add user authentication"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10',
                      'text-white placeholder:text-zinc-500',
                      'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50'
                    )}
                    autoFocus
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Description {mode === 'ai-plan' && <span className="text-zinc-500">(helps Claude understand)</span>}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      mode === 'ai-plan'
                        ? "Describe what you want to build. Be specific about features, constraints, and preferences..."
                        : "Optional description"
                    }
                    rows={mode === 'ai-plan' ? 4 : 2}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10',
                      'text-white placeholder:text-zinc-500 resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50'
                    )}
                  />
                </div>

                {/* Base Project (Codebase) */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Codebase
                  </label>
                  <select
                    value={baseProject}
                    onChange={(e) => setBaseProject(e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10',
                      'text-white',
                      'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50',
                      !baseProject && 'text-zinc-500'
                    )}
                    required
                  >
                    {baseProjects.length === 0 ? (
                      <option value="" disabled>
                        No codebases configured
                      </option>
                    ) : (
                      baseProjects.map((proj) => (
                        <option key={proj} value={proj}>
                          {proj}
                        </option>
                      ))
                    )}
                  </select>
                  {baseProjects.length === 0 && (
                    <p className="text-xs text-zinc-500 mt-1.5">
                      Configure your projects whitelist in the agent config.json
                    </p>
                  )}
                </div>

                {/* Trust Mode (AI Planning only) */}
                {mode === 'ai-plan' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setTrustMode(!trustMode)}
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        trustMode ? 'bg-orange-500' : 'bg-zinc-700'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          trustMode ? 'left-5' : 'left-1'
                        )}
                      />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <span className="font-medium text-sm">Trust Mode</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Claude will create the plan without asking questions
                      </p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || !baseProject || isSubmitting}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
                      'bg-orange-500 hover:bg-orange-600 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : mode === 'ai-plan' ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Start Planning</span>
                      </>
                    ) : (
                      <>
                        <FolderKanban className="w-4 h-4" />
                        <span>Create Project</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

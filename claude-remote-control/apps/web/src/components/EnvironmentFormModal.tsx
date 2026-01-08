'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Zap, Globe, Eye, EyeOff, AlertCircle, Star } from 'lucide-react';
import { cn, buildApiUrl } from '@/lib/utils';
import type {
  EnvironmentProvider,
  Environment,
  EnvironmentMetadata,
  EnvironmentIcon,
} from '247-shared';
import { ENVIRONMENT_PRESETS } from '247-shared';
import { IconPicker } from './IconPicker';

interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

const providerConfig: Record<
  EnvironmentProvider,
  { icon: typeof Zap; label: string; color: string }
> = {
  anthropic: { icon: Zap, label: 'Anthropic', color: 'orange' },
  openrouter: { icon: Globe, label: 'OpenRouter', color: 'emerald' },
};

interface EnvironmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentUrl: string;
  editingEnvironment?: EnvironmentMetadata | null;
  onSaved?: () => void;
}

export function EnvironmentFormModal({
  open,
  onOpenChange,
  agentUrl,
  editingEnvironment,
  onSaved,
}: EnvironmentFormModalProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<EnvironmentProvider>('anthropic');
  const [icon, setIcon] = useState<EnvironmentIcon | null>(null);
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load full environment data when editing
  useEffect(() => {
    if (!open) {
      // Reset form when closed
      setName('');
      setProvider('anthropic');
      setIcon(null);
      setVariables([]);
      setIsDefault(false);
      setShowSecrets({});
      setError(null);
      return;
    }

    if (editingEnvironment) {
      // Load full environment data for editing
      const loadEnvironment = async () => {
        try {
          const response = await fetch(
            buildApiUrl(agentUrl, `/api/environments/${editingEnvironment.id}/full`)
          );
          if (response.ok) {
            const env: Environment = await response.json();
            setName(env.name);
            setProvider(env.provider);
            setIcon(env.icon);
            setIsDefault(env.isDefault);
            setVariables(
              Object.entries(env.variables).map(([key, value]) => ({
                key,
                value,
                isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN'),
              }))
            );
          }
        } catch (err) {
          console.error('Failed to load environment:', err);
          setError('Failed to load environment data');
        }
      };
      loadEnvironment();
    } else {
      // New environment - use preset
      const preset = ENVIRONMENT_PRESETS[provider];
      setVariables(
        Object.entries(preset.defaultVariables).map(([key, value]) => ({
          key,
          value,
          isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN'),
        }))
      );
    }
  }, [open, editingEnvironment, agentUrl, provider]);

  // Update variables when provider changes (only for new environments)
  useEffect(() => {
    if (!editingEnvironment && open) {
      const preset = ENVIRONMENT_PRESETS[provider];
      setVariables(
        Object.entries(preset.defaultVariables).map(([key, value]) => ({
          key,
          value,
          isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN'),
        }))
      );
    }
  }, [provider, editingEnvironment, open]);

  const addVariable = () => {
    setVariables([...variables, { key: '', value: '', isSecret: false }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: keyof EnvVariable, value: string | boolean) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  // Strip markdown link format: [text](url) -> url
  const stripMarkdownLink = (value: string): string => {
    const markdownLinkRegex = /^\[([^\]]+)\]\(([^)]+)\)$/;
    const match = value.match(markdownLinkRegex);
    if (match) {
      return match[2]; // Return the URL part
    }
    return value;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const variablesObj: Record<string, string> = {};
    variables.forEach((v) => {
      if (v.key.trim()) {
        // Clean up markdown links from values (e.g., pasted URLs)
        variablesObj[v.key.trim()] = stripMarkdownLink(v.value);
      }
    });

    try {
      const url = editingEnvironment
        ? buildApiUrl(agentUrl, `/api/environments/${editingEnvironment.id}`)
        : buildApiUrl(agentUrl, '/api/environments');

      const response = await fetch(url, {
        method: editingEnvironment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          provider,
          icon,
          isDefault,
          variables: variablesObj,
        }),
      });

      if (response.ok) {
        onSaved?.();
        onOpenChange(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save environment');
      }
    } catch (err) {
      console.error('Failed to save environment:', err);
      setError('Network error - could not connect to agent');
    } finally {
      setSaving(false);
    }
  };

  // Allow environments with no variables (for using system defaults)
  const isValid = name.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden',
              'rounded-2xl border border-white/10 bg-[#0d0d14]',
              'shadow-2xl shadow-black/50'
            )}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                  <Zap className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingEnvironment ? 'Edit Environment' : 'New Environment'}
                  </h2>
                  <p className="text-sm text-white/40">Configure API provider settings</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className="mb-3 block text-sm font-medium text-white/60">Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    Object.entries(providerConfig) as [
                      EnvironmentProvider,
                      typeof providerConfig.anthropic,
                    ][]
                  ).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = provider === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setProvider(key)}
                        disabled={!!editingEnvironment}
                        className={cn(
                          'rounded-xl p-4 text-left transition-all',
                          'border',
                          isSelected
                            ? `bg-${config.color}-500/10 border-${config.color}-500/50`
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
                          editingEnvironment && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-5 w-5',
                              isSelected ? `text-${config.color}-400` : 'text-white/50'
                            )}
                          />
                          <div>
                            <span
                              className={cn(
                                'font-medium',
                                isSelected ? 'text-white' : 'text-white/60'
                              )}
                            >
                              {config.label}
                            </span>
                            <p className="mt-0.5 text-xs text-white/30">
                              {ENVIRONMENT_PRESETS[key].description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Icon */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-white/60">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Production, Development"
                    className={cn(
                      'w-full rounded-xl px-4 py-3',
                      'border border-white/10 bg-white/5',
                      'text-white placeholder:text-white/30',
                      'focus:border-orange-500/50 focus:bg-white/10 focus:outline-none',
                      'transition-all'
                    )}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/60">Icon</label>
                  <IconPicker value={icon} onChange={setIcon} provider={provider} />
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-white/60">Environment Variables</label>
                  <div className="flex items-center gap-2">
                    {variables.length > 0 && (
                      <button
                        onClick={() => setVariables([])}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/40 transition-all hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={addVariable}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Variable
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <input
                        type="text"
                        value={variable.key}
                        onChange={(e) => updateVariable(index, 'key', e.target.value)}
                        placeholder="KEY_NAME"
                        className={cn(
                          'flex-1 rounded-lg px-3 py-2 font-mono text-sm',
                          'border border-white/10 bg-white/5',
                          'text-white placeholder:text-white/30',
                          'focus:border-orange-500/50 focus:outline-none',
                          'transition-all'
                        )}
                      />
                      <span className="text-white/20">=</span>
                      <div className="relative flex-1">
                        <input
                          type={variable.isSecret && !showSecrets[index] ? 'password' : 'text'}
                          value={variable.value}
                          onChange={(e) => updateVariable(index, 'value', e.target.value)}
                          placeholder={variable.isSecret ? 'sk-...' : 'value'}
                          className={cn(
                            'w-full rounded-lg px-3 py-2 pr-10 font-mono text-sm',
                            'border border-white/10 bg-white/5',
                            'text-white placeholder:text-white/30',
                            'focus:border-orange-500/50 focus:outline-none',
                            'transition-all'
                          )}
                        />
                        {variable.isSecret && (
                          <button
                            onClick={() =>
                              setShowSecrets({ ...showSecrets, [index]: !showSecrets[index] })
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/30 transition-colors hover:text-white/60"
                          >
                            {showSecrets[index] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => removeVariable(index)}
                        className="rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {variables.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-white/30">
                      <Zap className="mx-auto mb-2 h-6 w-6 opacity-50" />
                      <p className="text-sm">No variables configured</p>
                      <p className="mt-1 text-xs text-white/20">
                        Will use system environment variables
                      </p>
                      <button
                        onClick={addVariable}
                        className="mt-3 text-sm text-orange-400 hover:text-orange-300"
                      >
                        Add a variable
                      </button>
                    </div>
                  )}
                </div>

                {/* Warning for secrets */}
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-400/80">
                    API keys are stored locally on this machine and never sent to the cloud.
                  </p>
                </div>
              </div>

              {/* Default Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="font-medium text-white/80">Set as default</p>
                    <p className="text-sm text-white/40">Use this environment for new sessions</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDefault(!isDefault)}
                  className={cn(
                    'h-7 w-12 rounded-full transition-all',
                    isDefault ? 'bg-orange-500' : 'bg-white/10'
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                      isDefault ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2.5 font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid || saving}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all',
                  isValid && !saving
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-400 hover:to-amber-400'
                    : 'cursor-not-allowed bg-white/5 text-white/30'
                )}
              >
                {saving ? 'Saving...' : editingEnvironment ? 'Save Changes' : 'Create Environment'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

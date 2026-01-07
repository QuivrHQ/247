'use client';

import { useState, useEffect } from 'react';

interface Machine {
  id: string;
  name: string;
  status: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

interface UseCloneResult {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  customProjectName: string;
  setCustomProjectName: (name: string) => void;
  previewedName: string;
  cloning: boolean;
  cloneError: string | null;
  cloneSuccess: string | null;
  handleClone: () => Promise<string | null>;
  resetCloneState: () => void;
}

export function useClone(selectedMachine: Machine | null): UseCloneResult {
  const [repoUrl, setRepoUrl] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');
  const [previewedName, setPreviewedName] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  // Preview project name from URL
  useEffect(() => {
    if (!repoUrl || !selectedMachine) {
      setPreviewedName('');
      return;
    }

    const previewName = async () => {
      try {
        const agentUrl = selectedMachine.config?.agentUrl || 'localhost:4678';
        const protocol = agentUrl.includes('localhost') ? 'http' : 'https';
        const response = await fetch(
          `${protocol}://${agentUrl}/api/clone/preview?url=${encodeURIComponent(repoUrl)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPreviewedName(data.projectName);
        }
      } catch {
        const parts = repoUrl.replace(/\.git$/, '').split('/');
        setPreviewedName(parts[parts.length - 1] || '');
      }
    };

    const timer = setTimeout(previewName, 300);
    return () => clearTimeout(timer);
  }, [repoUrl, selectedMachine]);

  const handleClone = async (): Promise<string | null> => {
    if (!selectedMachine || !repoUrl) return null;

    setCloning(true);
    setCloneError(null);
    setCloneSuccess(null);

    try {
      const agentUrl = selectedMachine.config?.agentUrl || 'localhost:4678';
      const protocol = agentUrl.includes('localhost') ? 'http' : 'https';

      const response = await fetch(`${protocol}://${agentUrl}/api/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          projectName: customProjectName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCloneSuccess(data.projectName);
        return data.projectName;
      } else {
        setCloneError(data.error || 'Clone failed');
        return null;
      }
    } catch {
      setCloneError('Network error - could not connect to agent');
      return null;
    } finally {
      setCloning(false);
    }
  };

  const resetCloneState = () => {
    setRepoUrl('');
    setCustomProjectName('');
    setPreviewedName('');
    setCloneError(null);
    setCloneSuccess(null);
  };

  return {
    repoUrl,
    setRepoUrl,
    customProjectName,
    setCustomProjectName,
    previewedName,
    cloning,
    cloneError,
    cloneSuccess,
    handleClone,
    resetCloneState,
  };
}

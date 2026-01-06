'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionList } from './SessionList';

interface Machine {
  id: string;
  name: string;
  status: string;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
}

interface SessionInfo {
  name: string;
  project: string;
  createdAt: number;
  status: 'running' | 'waiting' | 'stopped' | 'ended' | 'idle' | 'permission';
  statusSource?: 'hook' | 'tmux';
  lastActivity?: string;
  lastEvent?: string;
}

interface MachineCardProps {
  machine: Machine;
  onConnect: (machineId: string, project: string, sessionName?: string) => void;
}

export function MachineCard({ machine, onConnect }: MachineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevSessionsRef = useRef<SessionInfo[]>([]);

  const isOnline = machine.status === 'online';
  const agentUrl = machine.config?.agentUrl || 'localhost:4678';
  const projects = machine.config?.projects || [];

  // Fetch sessions when expanded
  useEffect(() => {
    if (!expanded || !isOnline) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const protocol = agentUrl.includes('localhost') ? 'http' : 'https';
        const response = await fetch(`${protocol}://${agentUrl}/api/sessions`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch sessions');

        const data = await response.json();
        setSessions(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setError('Agent not responding');
        } else {
          setError('Could not connect to agent');
        }
        setSessions([]);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchSessions();

    // Refresh every 10 seconds while expanded
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [expanded, isOnline, agentUrl]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Detect status changes and send browser notifications
  useEffect(() => {
    const prev = prevSessionsRef.current;

    for (const session of sessions) {
      const prevSession = prev.find((s) => s.name === session.name);
      const wasNotActionable = !prevSession || !['permission', 'stopped', 'waiting'].includes(prevSession.status);
      const isActionable = ['permission', 'stopped', 'waiting'].includes(session.status);

      if (wasNotActionable && isActionable) {
        showNotification(session);
      }
    }

    prevSessionsRef.current = [...sessions];
  }, [sessions]);

  function showNotification(session: SessionInfo) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const body =
      session.status === 'permission'
        ? 'Autorisation requise'
        : session.status === 'waiting'
          ? 'Question posée'
          : 'Tâche terminée';

    new Notification(`${machine.name} - ${session.project}`, {
      body,
      icon: '/favicon.ico',
      tag: `${session.name}-${session.status}`,
    });
  }

  const handleKillSession = async (sessionName: string) => {
    const protocol = agentUrl.includes('localhost') ? 'http' : 'https';

    try {
      const response = await fetch(
        `${protocol}://${agentUrl}/api/sessions/${encodeURIComponent(sessionName)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.name !== sessionName));
      }
    } catch (err) {
      console.error('Failed to kill session:', err);
    }
  };

  // Count sessions by status
  const runningCount = sessions.filter((s) => s.status === 'running').length;
  const waitingCount = sessions.filter((s) => s.status === 'waiting').length;
  const permissionCount = sessions.filter((s) => s.status === 'permission').length;
  const doneCount = sessions.filter((s) => s.status === 'stopped').length;
  const hooksActive = sessions.some((s) => s.statusSource === 'hook');

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      {/* Card Header - Clickable to expand */}
      <button
        onClick={() => isOnline && setExpanded(!expanded)}
        disabled={!isOnline}
        className={`w-full p-4 flex items-center gap-3 text-left transition
          ${isOnline ? 'hover:bg-gray-700/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
      >
        {/* Expand/Collapse Icon */}
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>

        {/* Machine Icon */}
        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <line x1="8" x2="16" y1="21" y2="21" />
            <line x1="12" x2="12" y1="17" y2="21" />
          </svg>
        </div>

        {/* Machine Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{machine.name}</span>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <p className="text-sm text-gray-500 truncate">{agentUrl}</p>
        </div>

        {/* Session Badges */}
        {isOnline && sessions.length > 0 && (
          <div className="flex items-center gap-2">
            {runningCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                {runningCount} running
              </span>
            )}
            {waitingCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                {waitingCount} waiting
              </span>
            )}
            {permissionCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                {permissionCount} permission
              </span>
            )}
            {doneCount > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                {doneCount} done
              </span>
            )}
            {hooksActive ? (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                ⚡ hooks
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                ⚠ no hooks
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded Session List */}
      {expanded && isOnline && (
        <div className="border-t border-gray-700">
          <SessionList
            sessions={sessions}
            projects={projects}
            loading={loading}
            error={error}
            onConnect={(project, sessionName) => onConnect(machine.id, project, sessionName)}
            onKill={handleKillSession}
          />
        </div>
      )}
    </div>
  );
}

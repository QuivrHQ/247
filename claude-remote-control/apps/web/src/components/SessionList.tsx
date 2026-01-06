'use client';

import { useState } from 'react';
import { SessionRow } from './SessionRow';

interface SessionInfo {
  name: string;
  project: string;
  createdAt: number;
  status: 'running' | 'waiting' | 'stopped' | 'ended' | 'idle' | 'permission';
  statusSource?: 'hook' | 'tmux';
  lastActivity?: string;
  lastEvent?: string;
}

interface SessionListProps {
  sessions: SessionInfo[];
  projects: string[];
  loading: boolean;
  error: string | null;
  onConnect: (project: string, sessionName?: string) => void;
  onKill: (sessionName: string) => void;
}

export function SessionList({
  sessions,
  projects,
  loading,
  error,
  onConnect,
  onKill,
}: SessionListProps) {
  const [newSessionProject, setNewSessionProject] = useState(projects[0] || '');

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
        Loading sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <span className="mr-2">⚠</span>
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* New Session Row */}
      <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg border border-dashed border-gray-700">
        <span className="text-green-500 text-lg">+</span>
        <select
          value={newSessionProject}
          onChange={(e) => setNewSessionProject(e.target.value)}
          className="flex-1 bg-gray-800 text-white px-3 py-1.5 rounded border border-gray-700 text-sm"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          onClick={() => onConnect(newSessionProject)}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
        >
          New Session
        </button>
      </div>

      {/* Existing Sessions */}
      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No active sessions. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions
            .sort((a, b) => b.createdAt - a.createdAt) // Most recent first
            .map((session) => (
              <SessionRow
                key={session.name}
                session={session}
                onConnect={() => onConnect(session.project, session.name)}
                onKill={() => onKill(session.name)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

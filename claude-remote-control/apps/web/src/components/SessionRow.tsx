'use client';

interface SessionInfo {
  name: string;
  project: string;
  createdAt: number;
  status: 'running' | 'waiting' | 'stopped' | 'ended' | 'idle' | 'permission';
  statusSource?: 'hook' | 'tmux';
  lastActivity?: string;
  lastEvent?: string;
}

interface SessionRowProps {
  session: SessionInfo;
  onConnect: () => void;
  onKill: () => void;
}

const statusConfig = {
  running: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Running',
    dot: 'bg-blue-400 animate-pulse',
  },
  waiting: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Waiting',
    dot: 'bg-orange-400',
  },
  permission: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Permission',
    dot: 'bg-purple-400 animate-pulse',
  },
  stopped: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Done',
    dot: 'bg-green-400',
  },
  ended: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-600/20',
    label: 'Ended',
    dot: 'bg-gray-500',
  },
  idle: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Idle',
    dot: 'bg-gray-400',
  },
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SessionRow({ session, onConnect, onKill }: SessionRowProps) {
  const status = statusConfig[session.status];
  const timeAgo = getTimeAgo(new Date(session.createdAt));

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition group">
      {/* Status Indicator */}
      <div className={`flex items-center gap-2 px-2 py-1 rounded ${status.bgColor}`}>
        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>

      {/* Hook Status Indicator */}
      <span
        title={session.statusSource === 'hook' ? 'Hooks actifs' : 'Fallback tmux'}
        className={session.statusSource === 'hook' ? 'text-green-400' : 'text-gray-500'}
      >
        {session.statusSource === 'hook' ? '⚡' : '○'}
      </span>

      {/* Project Name & Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{session.project}</p>
        <p className="text-xs text-gray-500 truncate">
          {timeAgo}
          {session.lastActivity && ` · ${session.lastActivity.slice(0, 30)}...`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onConnect}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
        >
          Connect
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Kill session "${session.name}"?`)) {
              onKill();
            }
          }}
          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition opacity-0 group-hover:opacity-100"
          title="Kill session"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}

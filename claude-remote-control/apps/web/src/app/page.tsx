'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MachineCard } from '@/components/MachineCard';

interface Machine {
  id: string;
  name: string;
  status: string;
  tunnelUrl: string | null;
  config?: {
    projects: string[];
    agentUrl?: string;
  };
  lastSeen: string | null;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch('/api/machines');
        const data = await response.json();
        setMachines(data);
      } catch (err) {
        console.error('Failed to fetch machines:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();

    // Refresh machine list every 30 seconds
    const interval = setInterval(fetchMachines, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = (machineId: string, project: string, sessionName?: string) => {
    // For new sessions, don't pass session param - agent will generate a readable name
    // For reconnections, pass the existing session name
    const sessionParam = sessionName ? `&session=${encodeURIComponent(sessionName)}` : '';
    router.push(
      `/terminal/${machineId}?project=${encodeURIComponent(project)}${sessionParam}`
    );
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Claude Remote Control</h1>
          <span className="text-sm text-gray-500">
            {machines.filter((m) => m.status === 'online').length} / {machines.length} online
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-gray-400">Loading machines...</span>
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            </div>
            <p className="text-gray-400 mb-2">No machines registered yet</p>
            <p className="text-sm text-gray-500">Start an agent to register a machine</p>
          </div>
        ) : (
          <div className="space-y-4">
            {machines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} onConnect={handleConnect} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import { Suspense } from 'react';
import { OrchestratorView } from '@/components/orchestrator/OrchestratorView';
import { Loader2 } from 'lucide-react';

function OrchestratorLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#08080c] text-zinc-100">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        <span className="text-zinc-400">Loading orchestrator...</span>
      </div>
    </div>
  );
}

export default function OrchestratorPage() {
  return (
    <Suspense fallback={<OrchestratorLoading />}>
      <OrchestratorView />
    </Suspense>
  );
}

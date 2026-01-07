'use client';

import { Suspense } from 'react';
import { HomeContent } from './home';
import { LoadingView } from './home/LoadingView';

export default function Home() {
  return (
    <Suspense fallback={<LoadingView />}>
      <HomeContent />
    </Suspense>
  );
}

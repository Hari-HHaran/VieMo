import type { Metadata } from 'next';
import { Suspense } from 'react';
import WallOfFame from '@/components/wall/WallOfFame';

export const metadata: Metadata = { title: 'Wall of Fame' };

/* Every film you've watched, framed. Your diary lives on this device until accounts arrive. */
export default function WallPage() {
  return (
    <div className="page wall-page">
      <Suspense fallback={<div className="wall-room is-loading" aria-busy="true" />}><WallOfFame /></Suspense>
    </div>
  );
}

'use client';
import { ErrorState } from '@/ds/client';

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <ErrorState title="This screen didn’t load" body="Something went wrong on our side. Nothing you saved is affected." onRetry={reset} />
    </div>
  );
}

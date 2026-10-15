import { Skeleton } from '@/ds/client';

export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <div className="page-head"><Skeleton variant="text" lines={2} width="220px" label="Loading" /></div>
      <div className="rail-list skeleton-rail">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="film-card" />)}
      </div>
      <div className="rail-list skeleton-rail">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="film-card" />)}
      </div>
    </div>
  );
}

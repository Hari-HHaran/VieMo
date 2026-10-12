import { Skeleton } from '@/ds/client';

export default function Loading() {
  return (
    <div className="page" aria-busy="true">
      <div className="film-hero">
        <Skeleton variant="poster" label="Loading film" />
        <Skeleton variant="text" lines={4} width="100%" />
      </div>
      <Skeleton variant="text" lines={5} />
    </div>
  );
}

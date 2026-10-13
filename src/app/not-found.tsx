import { EmptyState } from '@/ds/client';
import { dataSource } from '@/lib/tmdb';

export default function NotFound() {
  const snapshot = dataSource().mode === 'snapshot';
  return (
    <div className="page">
      <EmptyState icon="film" title="This page isn’t here"
        body={snapshot ? 'This film isn’t in the saved TMDB snapshot, or the link is old.' : 'The link may be old, or the film may have been removed from TMDB.'}
        action={{ label: 'Go to Discover', href: '/discover' }} />
    </div>
  );
}

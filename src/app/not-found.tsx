import { EmptyState } from '@/ds/client';

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState icon="film" title="This page isn’t here" body="The link may be old, or the film may have been removed from TMDB." action={{ label: 'Go to Discover', href: '/discover' }} />
    </div>
  );
}

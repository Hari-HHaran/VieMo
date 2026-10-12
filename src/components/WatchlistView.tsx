'use client';
import { EmptyState } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import WatchlistFilmCard from './WatchlistFilmCard';

const IMG = 'https://image.tmdb.org/t/p';

export default function WatchlistView() {
  const { list } = useWatchlist();
  if (!list.length) {
    return <EmptyState compact icon="bookmark" title="Your watchlist is empty" body="Tap the bookmark on any film to save it here." action={{ label: 'Browse films', icon: 'compass', href: '/discover' }} />;
  }
  return (
    <ul className="film-grid" role="list" aria-label="Watchlist">
      {list.map((f) => (
        <li key={f.id}>
          <WatchlistFilmCard film={{
            id: f.id, title: f.title, year: f.year, posterPath: f.posterPath,
            posterSrc: f.posterPath ? `${IMG}/w185${f.posterPath}` : null,
            posterSrcSet: f.posterPath ? `${IMG}/w185${f.posterPath} 1x, ${IMG}/w342${f.posterPath} 2x` : undefined,
          }} />
        </li>
      ))}
    </ul>
  );
}

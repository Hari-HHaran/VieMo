'use client';
import { FilmCard } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import { useToast } from './AppShell';

export interface FilmCardData {
  id: number;
  title: string;
  year?: number;
  posterPath: string | null;
  posterSrc: string | null;
  posterSrcSet?: string;
  tmdbRating?: number;
  tmdbVotes?: number;
  note?: string;
}

/* A film card whose bookmark saves to the watchlist on this device, with Undo. */
export default function WatchlistFilmCard({ film, size = 'md' }: { film: FilmCardData; size?: 'md' | 'lg' }) {
  const { has, add, remove } = useWatchlist();
  const toast = useToast();
  const saved = has(film.id);
  function toggle() {
    const entry = { id: film.id, title: film.title, year: film.year, posterPath: film.posterPath };
    if (saved) {
      const at = remove(film.id);
      toast({ message: `Removed ${film.title} from your watchlist`, action: { label: 'Undo', onClick: () => add(entry, at) } });
    } else {
      add(entry);
      toast({ tone: 'positive', message: `Saved ${film.title} to your watchlist`, action: { label: 'Undo', onClick: () => remove(film.id) } });
    }
  }
  return (
    <FilmCard
      size={size}
      title={film.title}
      year={film.year}
      posterSrc={film.posterSrc}
      posterSrcSet={film.posterSrcSet}
      posterSizes={size === 'lg' ? '168px' : '120px'}
      href={`/film/${film.id}`}
      saved={saved}
      onToggleSave={toggle}
      note={film.note}
      rating={film.tmdbRating && film.tmdbVotes ? { value: film.tmdbRating, source: 'tmdb' } : undefined}
    />
  );
}

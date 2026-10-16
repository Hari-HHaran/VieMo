'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ds/client';
import { useDiary } from '@/lib/diary';
import { useWatchlist } from '@/lib/device-store';
import { useToast } from './AppShell';
import LogDialog from './wall/LogDialog';

export default function FilmActions({ film }: { film: { id: number; title: string; year?: number; posterPath: string | null; genres?: string[] } }) {
  const { has, add, remove } = useWatchlist();
  const { items } = useDiary();
  const router = useRouter();
  const toast = useToast();
  const [logging, setLogging] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const saved = has(film.id);
  const onWall = items.find((i) => i.film.id === film.id);
  async function share() {
    const url = location.href;
    try {
      if (navigator.share) { await navigator.share({ title: film.title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast({ icon: 'link', message: 'Link copied' });
    } catch { /* the share sheet was closed */ }
  }
  return (
    <div className="film-actions">
      <Button variant={saved ? 'secondary' : 'primary'} size="lg" icon={saved ? 'bookmark-check' : 'bookmark-plus'} aria-pressed={saved}
        onClick={() => {
          if (saved) { const at = remove(film.id); toast({ message: 'Removed from your watchlist', action: { label: 'Undo', onClick: () => add(film, at) } }); }
          else { add(film); toast({ tone: 'positive', message: 'Saved to your watchlist', action: { label: 'Undo', onClick: () => remove(film.id) } }); }
        }}>
        {saved ? 'On your watchlist' : 'Add to watchlist'}
      </Button>
      <Button variant="secondary" size="lg" icon={onWall ? 'rotate-cw' : 'check'} onClick={(e) => { setOrigin(e.currentTarget.getBoundingClientRect()); setLogging(true); }}>
        {onWall ? 'Log a rewatch' : 'Mark as watched'}
      </Button>
      <Button iconOnly icon="share-2" label={`Share ${film.title}`} onClick={share} />
      {onWall ? <a className="film-onwall type-caption" href="/wall">{onWall.stage === 'waiting' ? 'Watched · waiting to be framed' : `On your Wall of Fame${onWall.rating != null ? ` · ${onWall.rating}★` : ''}`}</a> : null}
      <LogDialog open={logging} onClose={() => setLogging(false)} origin={origin}
        film={{ id: film.id, title: film.title, year: film.year, posterPath: film.posterPath, genres: film.genres ?? [] }}
        favourite={onWall?.favourite ?? false}
        onSaved={({ film: f, rating }) => {
          toast(rating != null
            ? { tone: 'positive', message: `${f.title} is framed on your Wall of Fame`, action: { label: 'See it', onClick: () => router.push('/wall') } }
            : { message: `Logged ${f.title}. Rate it to frame it on your wall.`, action: { label: 'Open wall', onClick: () => router.push('/wall') } });
        }} />
    </div>
  );
}

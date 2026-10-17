'use client';
import { useState, useTransition } from 'react';
import { Button, Poster } from '@/ds/client';
import { removeFromWatchlist } from '@/app/(account)/library/actions';
import { useToast } from '../AppShell';

const IMG = 'https://image.tmdb.org/t/p';
export interface WatchRow { tmdb_id: number; title: string; year: number | null; poster_path: string | null }

export default function AccountWatchlist({ rows: initial }: { rows: WatchRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (!rows.length) return <p className="type-body vm-muted">Nothing in your account watchlist yet.</p>;
  return (
    <ul role="list" className="member-posters">
      {rows.map((w) => (
        <li key={w.tmdb_id} className="lib-watch">
          <a href={`/film/${w.tmdb_id}`} className="member-poster" data-film-card>
            <span data-poster><Poster src={w.poster_path ? `${IMG}/w185${w.poster_path}` : null} title={w.title} year={w.year ?? undefined} size="fill" /></span>
            <span className="type-caption">{w.title}</span>
          </a>
          <Button size="sm" variant="ghost" busy={pending} onClick={() => start(async () => {
            const r = await removeFromWatchlist(w.tmdb_id);
            if (r.ok) { setRows(rows.filter((x) => x.tmdb_id !== w.tmdb_id)); toast({ message: `Removed ${w.title}` }); }
            else toast({ tone: 'negative', message: r.message ?? 'That didn’t remove.' });
          })}>Remove<span className="vm-sr"> {w.title}</span></Button>
        </li>
      ))}
    </ul>
  );
}

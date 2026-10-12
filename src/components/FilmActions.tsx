'use client';
import { Button } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import { useToast } from './AppShell';

export default function FilmActions({ film }: { film: { id: number; title: string; year?: number; posterPath: string | null } }) {
  const { has, add, remove } = useWatchlist();
  const toast = useToast();
  const saved = has(film.id);
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
      <Button iconOnly icon="share-2" label={`Share ${film.title}`} onClick={share} />
    </div>
  );
}

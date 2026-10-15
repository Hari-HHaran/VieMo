'use client';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ds/client';
import { useWatchlist } from '@/lib/device-store';
import { SPRING } from '@/lib/motion';
import { useToast } from './AppShell';

/* Watchlist toggle for any film. The icon swaps with a spring so the change is visible; Undo in the toast. */
export default function SaveToggle({ film, label = 'icon' }: { film: { id: number; title: string; year?: number; posterPath: string | null }; label?: 'icon' | 'text' }) {
  const { has, add, remove } = useWatchlist();
  const toast = useToast();
  const saved = has(film.id);
  const toggle = () => {
    if (saved) { const at = remove(film.id); toast({ message: `Removed ${film.title} from your watchlist`, action: { label: 'Undo', onClick: () => add(film, at) } }); }
    else { add(film); toast({ tone: 'positive', message: `Saved ${film.title} to your watchlist`, action: { label: 'Undo', onClick: () => remove(film.id) } }); }
  };
  return (
    <motion.button type="button" className={`save-toggle${saved ? ' is-on' : ''}${label === 'text' ? ' save-toggle-text' : ''}`} aria-pressed={saved}
      onClick={toggle} whileTap={{ scale: 0.88 }} transition={SPRING.tap}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={saved ? 'on' : 'off'} className="save-toggle-icon" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={SPRING.tap}>
          <Icon name={saved ? 'bookmark-check' : 'bookmark-plus'} size={20} />
        </motion.span>
      </AnimatePresence>
      {label === 'text' ? <span className="type-label">{saved ? 'On your watchlist' : 'Watchlist'}</span> : <span className="vm-sr">{saved ? `Saved: ${film.title}` : `Save to watchlist: ${film.title}`}</span>}
    </motion.button>
  );
}

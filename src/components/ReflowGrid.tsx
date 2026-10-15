'use client';
import { AnimatePresence, motion } from 'motion/react';
import { SPRING } from '@/lib/motion';
import WatchlistFilmCard, { type FilmCardData } from './WatchlistFilmCard';

/* A grid that re-sorts in place: films that stay glide to their new spot, new ones fade in, gone ones fade out. */
export default function ReflowGrid({ films, label }: { films: FilmCardData[]; label: string }) {
  return (
    <ul className="film-grid reflow" role="list" aria-label={label}>
      <AnimatePresence mode="popLayout" initial={false}>
        {films.map((f) => (
          <motion.li key={f.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={SPRING.reveal}>
            <WatchlistFilmCard film={f} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

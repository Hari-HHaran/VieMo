'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Avatar } from '@/ds/client';
import { SPRING } from '@/lib/motion';
import type { CollectionCard } from '@/lib/community';
import DemoBadge from './DemoBadge';

const IMG = 'https://image.tmdb.org/t/p';
/* Where each sleeve sits at rest (stacked, slightly offset) and when the card is opened up (fanned). */
const REST = [{ x: 0, r: 0, y: 0 }, { x: 10, r: 4, y: -4 }, { x: 20, r: 8, y: -8 }, { x: 30, r: 12, y: -12 }];
const FAN = [{ x: -54, r: -14, y: 6 }, { x: -18, r: -5, y: -6 }, { x: 18, r: 5, y: -6 }, { x: 54, r: 14, y: 6 }];

/* A community collection as a record sleeve: its first posters stacked in a square cover. Hover or keyboard focus
   fans them out; the whole card is one link to the collection. */
export default function PlaylistCard({ c, priority = false }: { c: CollectionCard; priority?: boolean }) {
  const [open, setOpen] = useState(false);
  const covers = c.covers.slice(0, 4);
  const name = c.display_name || `@${c.username}`;
  return (
    <article className={`pl${open ? ' is-open' : ''}`} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }} onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      <a href={`/c/${c.share_id}`} className="pl-link" data-collection-card>
        <span className="pl-cover" data-collection-cover aria-hidden="true">
          <span className="pl-vinyl" />
          {covers.length ? [...covers].reverse().map((f, ri) => {
            const i = covers.length - 1 - ri;
            const at = open ? FAN[i + (4 - covers.length) / 2 | 0] ?? FAN[i] : REST[i];
            return (
              <motion.span key={f.tmdb_id} className="pl-sleeve" initial={false} animate={{ x: at.x, y: at.y, rotate: at.r, scale: open ? 0.86 : 0.8 }}
                transition={{ ...SPRING.reveal, delay: open ? i * 0.025 : 0 }} style={{ zIndex: 10 - i }}>
                {f.poster_path ? <img src={`${IMG}/w185${f.poster_path}`} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" /> : <span className="pl-blank">{f.title}</span>}
              </motion.span>
            );
          }) : <span className="pl-empty">No films yet</span>}
        </span>
        <span className="pl-text">
          <span className="pl-title type-heading-md">{c.title}</span>
          <span className="pl-meta type-caption">
            {c.film_count} {c.film_count === 1 ? 'film' : 'films'}{c.saves ? ` · ${c.saves} ${c.saves === 1 ? 'save' : 'saves'}` : ''}{c.saved_by_me ? ' · Saved' : ''}
          </span>
        </span>
      </a>
      <a href={`/u/${c.username}`} className="pl-by type-caption">
        <Avatar name={name} src={c.avatar_url ?? undefined} size="sm" />
        <span>{name}</span>
        {c.is_demo ? <DemoBadge compact /> : null}
      </a>
    </article>
  );
}

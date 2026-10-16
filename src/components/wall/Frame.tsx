'use client';
import { useId } from 'react';
import { motion } from 'motion/react';
import { Poster } from '@/ds/client';
import { stagger } from '@/lib/motion';
import { dateLabelOf, STAGE_NAMES, type WallItem } from '@/lib/wall';
import TiltCard from '../fx/TiltCard';

const IMG = 'https://image.tmdb.org/t/p';
const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

/* Five stars drawn once empty and once filled, the filled row clipped to the rating. */
export function Stars({ value, size = 14, className = '' }: { value: number; size?: number; className?: string }) {
  const id = useId();
  const w = size * 5 + 8;
  return (
    <svg className={`stars ${className}`} width={w} height={size} viewBox={`0 0 ${w} ${size}`} role="img" aria-label={`${value} out of 5 stars`}>
      <defs><clipPath id={id}><rect width={(value / 5) * w} height={size} /></clipPath></defs>
      {[0, 1].map((layer) => (
        <g key={layer} clipPath={layer ? `url(#${id})` : undefined} className={layer ? 'stars-on' : 'stars-off'}>
          {Array.from({ length: 5 }, (_, i) => <path key={i} d={STAR} transform={`translate(${i * (size + 2)} 0) scale(${size / 24})`} />)}
        </g>
      ))}
    </svg>
  );
}

const ratingWords = (r: number | null) => (r == null ? 'not rated' : `rated ${r} out of 5`);

/* A framed poster. The frame itself is the button that opens the details; everything the hover panel shows is
   also on the placard underneath, so nothing depends on hovering. */
export default function Frame({ item, index, hung, compact = false, onOpen }: {
  item: WallItem; index: number; hung: boolean; compact?: boolean; onOpen: (item: WallItem, from: DOMRect) => void;
}) {
  const { film, stage } = item;
  const tilt = ((film.id % 7) - 3) * 0.35;
  const badges = [item.favourite ? 'Favourite' : null, item.watches > 1 ? `Seen ×${item.watches}` : null].filter(Boolean) as string[];
  return (
    <motion.div className={`frame-hang is-${stage}${compact ? ' is-compact' : ''}`} style={{ ['--hang' as string]: `${tilt}deg` }}
      initial={hung ? { y: -90, rotate: -9, opacity: 0 } : { y: 14, opacity: 0 }}
      animate={{ y: 0, rotate: 0, opacity: 1 }}
      transition={hung ? { type: 'spring', stiffness: 140, damping: 7, mass: 0.9 } : { type: 'spring', stiffness: 260, damping: 26, delay: stagger(index) * 1.5 }}>
      {stage === 'hall' ? <span className="frame-spot" aria-hidden="true" /> : null}
      <span className="frame-nail" aria-hidden="true" />
      <TiltCard className="frame-tilt">
        <button type="button" className="wf" aria-haspopup="dialog"
          aria-label={`${film.title}${film.year ? ` (${film.year})` : ''}, ${STAGE_NAMES[stage]}, ${ratingWords(item.rating)}, watched ${dateLabelOf(item.lastWatched)}. Open details`}
          onClick={(e) => onOpen(item, e.currentTarget.getBoundingClientRect())}>
          <span className="frame-moulding">
            <span className="frame-mat">
              <span className="frame-art"><Poster src={film.posterPath ? `${IMG}/${compact ? 'w185' : 'w342'}${film.posterPath}` : null} title={film.title} year={film.year} size="fill" /></span>
            </span>
          </span>
          {stage === 'hall' ? <span className="frame-ribbon" aria-hidden="true">Hall of Fame</span> : null}
          <span className="frame-peek" aria-hidden="true">
            <span className="frame-peek-title">{film.title}</span>
            <span className="frame-peek-meta">Watched {dateLabelOf(item.lastWatched)}</span>
            {item.rating != null ? <Stars value={item.rating} size={15} /> : null}
            {item.review ? <span className="frame-peek-review">{item.spoiler ? 'Review hidden: contains spoilers' : `“${item.review}”`}</span> : null}
            {badges.length ? <span className="frame-badges">{badges.map((b) => <span key={b} className="frame-badge">{b}</span>)}</span> : null}
          </span>
        </button>
      </TiltCard>
      <div className="placard">
        <p className="placard-title">{film.title}{film.year ? <span> {film.year}</span> : null}</p>
        <p className="placard-meta">
          {item.rating != null ? <Stars value={item.rating} size={12} /> : null}
          {badges.length ? <span className="placard-badges">{badges.join(' · ')}</span> : null}
        </p>
        {!compact && item.review && stage !== 'framed' ? <p className="placard-quote">{item.spoiler ? 'Review contains spoilers' : `“${item.review}”`}</p> : null}
      </div>
    </motion.div>
  );
}

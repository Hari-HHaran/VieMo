'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { Button, Icon, Poster, Rating } from '@/ds/client';
import { SPRING } from '@/lib/motion';
import type { Candidate, Vote } from '@/lib/scoring';

const IMG = 'https://image.tmdb.org/t/p';
const WORDS: Record<Vote, string> = { yes: 'Interested', no: 'Not interested', skip: 'Unsure' };
const THRESHOLD = 110, FLING = 650, DEPTH = 3;

/* Where a card goes when it leaves, by vote: right, left, or down. */
/* AnimatePresence hands the latest vote to a card as it leaves, so the exit always matches the vote. */
const leave = {
  exit: (v: Vote) => ({ x: v === 'yes' ? 560 : v === 'no' ? -560 : 0, y: v === 'skip' ? 360 : 0, rotate: v === 'yes' ? 14 : v === 'no' ? -14 : 0, opacity: 0, zIndex: DEPTH + 1, transition: SPRING.deck }),
};
const rest = (depth: number) => ({ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth < DEPTH - 1 ? 1 : 0 });

/* A stack of real film cards. The top card follows a drag with physics, flies off on a vote and the next card
   rises into place. The three buttons and the arrow keys do exactly what a swipe does. */
export default function MotionDeck({ deck, index, onVote, onDetails }: { deck: Candidate[]; index: number; onVote: (v: Vote) => void; onDetails: (id: number) => void }) {
  const [exitVote, setExitVote] = useState<Vote>('skip');
  const [said, setSaid] = useState('');
  const keyed = useRef(false);
  const topRef = useRef<HTMLElement>(null);
  const stack = deck.slice(index, index + DEPTH);

  const vote = (v: Vote, fromKeys = false) => {
    const f = deck[index];
    if (!f) return;
    keyed.current = fromKeys;
    setExitVote(v);
    setSaid(`${WORDS[v]}: ${f.title}.${deck[index + 1] ? ` Next, ${deck[index + 1].title}.` : ''}`);
    onVote(v);
  };
  /* Keyboard voting removes the focused card, so focus moves on to the card that replaced it. */
  useEffect(() => { if (keyed.current) { topRef.current?.focus(); keyed.current = false; } }, [index]);

  return (
    <div className="vm-swipe deck">
      <p className="vm-swipe-progress type-data">
        <span>Film {Math.min(index + 1, deck.length)} of {deck.length}</span>
        <span className="vm-swipe-bar" role="progressbar" aria-label="Films rated" aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={index}>
          <motion.span initial={false} animate={{ width: `${(index / deck.length) * 100}%` }} transition={SPRING.standard} />
        </span>
      </p>
      <div className="deck-stack">
        <AnimatePresence custom={exitVote} initial={false}>
          {stack.map((f, depth) => (
            <DeckCard key={f.id} film={f} depth={depth} exitVote={exitVote} cardRef={depth === 0 ? topRef : undefined}
              onVote={vote} onDetails={() => onDetails(f.id)} />
          )).reverse()}
        </AnimatePresence>
      </div>
      <div className="vm-swipe-actions">
        <Button variant="secondary" size="lg" icon="x" className="vm-vote-no" onClick={() => vote('no')}>Not interested</Button>
        <Button variant="ghost" size="md" icon="circle-help" className="vm-vote-skip" onClick={() => vote('skip')}>Unsure</Button>
        <Button variant="primary" size="lg" icon="heart" className="vm-vote-yes" onClick={() => vote('yes')}>Interested</Button>
      </div>
      <p className="vm-sr" aria-live="polite">{said}</p>
    </div>
  );
}

function DeckCard({ film: f, depth, exitVote, cardRef, onVote, onDetails }: {
  film: Candidate; depth: number; exitVote: Vote; cardRef?: React.Ref<HTMLElement>;
  onVote: (v: Vote, fromKeys?: boolean) => void; onDetails: () => void;
}) {
  /* A card on its way out is no longer the top card: it can't be focused, voted on or read out. */
  const present = useIsPresent();
  const top = depth === 0 && present;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);
  const yes = useTransform(x, [24, THRESHOLD], [0, 1]);
  const no = useTransform(x, [-THRESHOLD, -24], [1, 0]);
  const titleId = `deck-${f.id}`;
  const meta = [f.year, f.runtime ? `${Math.floor(f.runtime / 60)}h ${f.runtime % 60}m` : null, f.genres.slice(0, 2).map((g) => g.name).join(', ')].filter(Boolean).join(' · ');

  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x > THRESHOLD || info.velocity.x > FLING) onVote('yes');
    else if (info.offset.x < -THRESHOLD || info.velocity.x < -FLING) onVote('no');
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const v: Vote | null = e.key === 'ArrowRight' ? 'yes' : e.key === 'ArrowLeft' ? 'no' : e.key === 'ArrowDown' ? 'skip' : null;
    if (v) { e.preventDefault(); onVote(v, true); }
  };

  return (
    <motion.article ref={top ? cardRef : undefined} className="vm-swipe-card deck-card" custom={exitVote} variants={leave} initial={rest(DEPTH)}
      animate={rest(depth)} exit="exit" transition={SPRING.deck}
      style={{ x, rotate, zIndex: DEPTH - depth }}
      drag={top ? 'x' : false} dragSnapToOrigin dragElastic={0.9} onDragEnd={end} whileDrag={{ cursor: 'grabbing' }}
      tabIndex={top ? 0 : -1} aria-hidden={top ? undefined : true} inert={!top}
      aria-labelledby={titleId} aria-describedby={top ? 'deck-hint' : undefined} aria-roledescription="film card" onKeyDown={top ? key : undefined}>
      <div className="vm-swipe-poster">
        <Poster src={f.posterPath ? `${IMG}/w500${f.posterPath}` : null} title={f.title} year={f.year ?? undefined} size="fill" eager={depth < 2} />
        <motion.span className="vm-swipe-stamp vm-stamp-yes" style={{ opacity: yes }} aria-hidden="true"><Icon name="heart" size={18} strokeWidth={2.25} />Interested</motion.span>
        <motion.span className="vm-swipe-stamp vm-stamp-no" style={{ opacity: no }} aria-hidden="true"><Icon name="x" size={18} strokeWidth={2.25} />Not interested</motion.span>
      </div>
      <div className="vm-swipe-info">
        <h3 id={titleId} className="type-display-md">{f.title}</h3>
        <p className="type-caption vm-muted">{meta}</p>
        {f.voteCount ? <Rating value={f.voteAverage} source="tmdb" /> : null}
        {f.overview ? <p className="type-body vm-swipe-synopsis">{f.overview}</p> : null}
        <p className={`type-caption vm-swipe-where${f.providers.length ? '' : ' vm-muted'}`}><Icon name="tv" size={14} />{f.providers.length ? `On ${f.providers.join(', ')}` : 'Not streaming here right now'}</p>
        <div className="deck-more"><Button variant="ghost" size="sm" icon="info" onClick={onDetails}>Details</Button></div>
      </div>
      {top ? <span id="deck-hint" className="vm-sr">Right arrow: interested. Left arrow: not interested. Down arrow: unsure.</span> : null}
    </motion.article>
  );
}

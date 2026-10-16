'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button, FilterChip, Icon, Poster } from '@/ds/client';
import { takeJustFramed, useDiary } from '@/lib/diary';
import { LAYOUT } from '@/lib/motion';
import { arrange, decadeOf, monthOf, SHOWS, SORTS, STAGE_NAMES, STAGE_RULES, tasteOf, type ShowKey, type SortKey, type WallItem } from '@/lib/wall';
import { useToast } from '../AppShell';
import Frame from './Frame';
import FrameDialog from './FrameDialog';
import LogDialog from './LogDialog';

const IMG = 'https://image.tmdb.org/t/p';
type View = 'gallery' | 'timeline' | 'shelf';
const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: 'gallery', label: 'Gallery', icon: 'star' }, { id: 'timeline', label: 'Timeline', icon: 'calendar' }, { id: 'shelf', label: 'Shelf', icon: 'list-plus' },
];

/* The Wall of Fame. `editable` is false when someone else's wall is shown (that arrives with accounts). */
export default function WallOfFame({ editable = true, ownerName }: { editable?: boolean; ownerName?: string }) {
  const { items, toggleFavourite, remove } = useDiary();
  const toast = useToast();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'gallery') as View;
  const sort = (SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'recent') as SortKey;
  const show = (SHOWS.find((s) => s.id === params.get('show'))?.id ?? 'all') as ShowKey;
  const genre = params.get('genre');
  const decade = params.get('decade');
  const setParam = (k: string, v: string | null, fallback?: string) => {
    const next = new URLSearchParams(params.toString());
    if (!v || v === fallback) next.delete(k); else next.set(k, v);
    /* Native history keeps useSearchParams in sync without a server round trip or a page transition. */
    window.history.replaceState(null, '', `${pathname}${next.size ? `?${next}` : ''}`);
  };

  const [ready, setReady] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hung, setHung] = useState<number | null>(null);
  useEffect(() => { setHung(takeJustFramed()); setReady(true); }, []);

  const framed = useMemo(() => items.filter((i) => i.stage !== 'waiting'), [items]);
  const waiting = useMemo(() => items.filter((i) => i.stage === 'waiting').sort((a, b) => b.lastWatched.localeCompare(a.lastWatched)), [items]);
  const shown = useMemo(() => arrange(framed, { sort, show, genre, decade }), [framed, sort, show, genre, decade]);
  const taste = useMemo(() => tasteOf(items), [items]);
  const genres = useMemo(() => [...new Set(framed.flatMap((i) => i.film.genres))].sort(), [framed]);
  const decades = useMemo(() => [...new Set(framed.map((i) => decadeOf(i.film.year)).filter(Boolean) as string[])].sort().reverse(), [framed]);

  /* Dialogs: details, and log/edit. Items stay set while a dialog animates closed. */
  const [detail, setDetail] = useState<{ id: number; from: DOMRect | null } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [logState, setLogState] = useState<{ item: WallItem | null; mode: 'new' | 'edit' | 'rewatch'; from: DOMRect | null } | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const detailItem = detail ? items.find((i) => i.film.id === detail.id) ?? null : null;
  const openDetail = (i: WallItem, from: DOMRect) => { setDetail({ id: i.film.id, from }); setDetailOpen(true); };
  const openLog = (item: WallItem | null, mode: 'new' | 'edit' | 'rewatch', from: DOMRect | null = null) => { setDetailOpen(false); setLogState({ item, mode, from }); setLogOpen(true); };

  if (!ready) return <div className="wall-room is-loading" aria-busy="true"><p className="vm-sr">Loading your wall</p></div>;

  const title = ownerName ? `${ownerName}’s Wall of Fame` : 'Wall of Fame';
  return (
    <div className="wall">
      <header className="wall-head">
        <div className="wall-head-text">
          <p className="wall-eyebrow">{editable ? 'Your gallery · saved on this device' : 'A gallery of films'}</p>
          <h1 className="wall-title">{title}</h1>
          {framed.length ? (
            <p className="wall-taste">
              {taste.topGenres.length ? <>Mostly <b>{listOf(taste.topGenres)}</b>{taste.decade ? <>, with a soft spot for the <b>{taste.decade}</b></> : null}. </> : null}
              Average rating <b>{taste.average!.toFixed(1)}★</b>.
            </p>
          ) : null}
          <ul className="wall-counts" role="list">
            <li><b>{taste.framed}</b> framed</li><li><b>{taste.reviewed}</b> reviewed</li><li><b>{taste.hall}</b> in the Hall of Fame</li>{editable ? <li><b>{taste.waiting}</b> waiting</li> : null}
          </ul>
        </div>
        {editable ? <Button variant="primary" size="lg" icon="plus" onClick={(e) => openLog(null, 'new', e.currentTarget.getBoundingClientRect())}>Log a film</Button> : null}
      </header>

      {framed.length ? (
        <div className="wall-controls" role="group" aria-label="Arrange the wall">
          <div className="wall-views" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className={`wall-view${view === v.id ? ' is-on' : ''}`} aria-pressed={view === v.id} onClick={() => setParam('view', v.id, 'gallery')}>
                {view === v.id ? <motion.span layoutId="wall-view-light" className="wall-view-light" transition={LAYOUT} aria-hidden="true" /> : null}
                <Icon name={v.icon as never} size={16} /><span>{v.label}</span>
              </button>
            ))}
          </div>
          <div className="chip-row" role="group" aria-label="Show">
            {SHOWS.map((s) => <FilterChip key={s.id} label={s.label} state={show === s.id ? 'on' : 'off'} onChange={() => setParam('show', s.id, 'all')} />)}
          </div>
          <button type="button" className="wall-more" aria-expanded={moreOpen} aria-controls="wall-selects" onClick={() => setMoreOpen((o) => !o)}>
            <Icon name="sliders-horizontal" size={16} />Sort and filter{genre || decade || sort !== 'recent' ? ' (on)' : ''}
          </button>
          <div id="wall-selects" className={`wall-selects${moreOpen ? ' is-open' : ''}`}>
            <label className="wall-select"><span>Sort</span>
              <select value={sort} onChange={(e) => setParam('sort', e.target.value, 'recent')}>{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </label>
            <label className="wall-select"><span>Genre</span>
              <select value={genre ?? ''} onChange={(e) => setParam('genre', e.target.value || null)}><option value="">Any</option>{genres.map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label className="wall-select"><span>Decade</span>
              <select value={decade ?? ''} onChange={(e) => setParam('decade', e.target.value || null)}><option value="">Any</option>{decades.map((d) => <option key={d}>{d}</option>)}</select>
            </label>
          </div>
        </div>
      ) : null}

      <section className={`wall-room is-${view}`} aria-label={framed.length ? `${title}: ${shown.length} of ${framed.length} framed films` : title}>
        <span className="wall-rail" aria-hidden="true" />
        {!framed.length ? <BareWall editable={editable} hasWaiting={waiting.length > 0} onLog={(r) => openLog(null, 'new', r)} />
          : !shown.length ? <p className="wall-none">Nothing on the wall matches that. <button type="button" className="fd-link" onClick={() => window.history.replaceState(null, '', pathname + (view !== 'gallery' ? `?view=${view}` : ''))}>Clear filters</button></p>
          : view === 'gallery' ? <Gallery items={shown} hung={hung} onOpen={openDetail} />
          : view === 'timeline' ? <Timeline items={shown} hung={hung} onOpen={openDetail} />
          : <Shelves items={shown} hung={hung} onOpen={openDetail} />}
        <p className="vm-sr" aria-live="polite">{framed.length ? `Showing ${shown.length} of ${framed.length} framed films` : ''}</p>
      </section>

      {editable && waiting.length && show === 'all' ? (
        <section className="tray" aria-labelledby="tray-h">
          <div className="tray-head">
            <h2 id="tray-h" className="type-heading-lg">{STAGE_NAMES.waiting}</h2>
            <p className="type-caption vm-muted">{STAGE_RULES.waiting}</p>
          </div>
          <ul className="tray-list" role="list">
            {waiting.map((i) => (
              <li key={i.film.id} className="tray-print">
                <span className="tray-tape" aria-hidden="true" />
                <div className="tray-art"><Poster src={i.film.posterPath ? `${IMG}/w185${i.film.posterPath}` : null} title={i.film.title} size="fill" /></div>
                <p className="type-label tray-title">{i.film.title}</p>
                <Button size="sm" variant="secondary" icon="star" onClick={(e) => openLog(i, 'edit', e.currentTarget.getBoundingClientRect())} aria-label={`Rate ${i.film.title} to frame it`}>Rate to frame</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="wall-legend">
        <summary className="type-label">How frames are earned</summary>
        <ul role="list">
          {(['framed', 'collected', 'hall'] as const).map((s) => <li key={s} className={`is-${s}`}><span className="legend-swatch" aria-hidden="true" /><b>{STAGE_NAMES[s]}</b> {STAGE_RULES[s]}</li>)}
          <li className="is-waiting"><span className="legend-swatch" aria-hidden="true" /><b>{STAGE_NAMES.waiting}</b> {STAGE_RULES.waiting}</li>
        </ul>
      </details>

      <FrameDialog item={detailItem} origin={detail?.from ?? null} open={detailOpen && !!detailItem} editable={editable} onClose={() => setDetailOpen(false)}
        onEdit={(i) => openLog(i, 'edit')} onRewatch={(i) => openLog(i, 'rewatch')}
        onFavourite={(i) => { const on = toggleFavourite(i.film.id); toast({ message: on ? `${i.film.title} is a favourite` : `${i.film.title} is no longer a favourite` }); }}
        onRemove={(i) => { setDetailOpen(false); const undo = remove(i.film.id); toast({ message: `Took ${i.film.title} off your wall`, action: { label: 'Undo', onClick: undo } }); }} />

      {logState ? (
        <LogDialog open={logOpen} onClose={() => setLogOpen(false)} origin={logState.from}
          film={logState.item?.film ?? null} entry={logState.mode === 'edit' ? logState.item?.latest ?? null : null}
          favourite={logState.item?.favourite ?? false}
          onSaved={({ film, rating }) => {
            if (rating != null) { takeJustFramed(); setHung(film.id); }
            toast(rating != null ? { tone: 'positive', message: `${film.title} is on your wall` } : { message: `Logged ${film.title}. Rate it to frame it.` });
          }} />
      ) : null}
    </div>
  );
}

const listOf = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/* Salon hang: a masonry of frames in reading order. Each frame spans as many 4px rows as it is tall. */
function Gallery({ items, hung, onOpen }: { items: WallItem[]; hung: number | null; onOpen: (i: WallItem, r: DOMRect) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    const fit = (li: HTMLElement) => { const inner = li.firstElementChild as HTMLElement | null; if (inner) li.style.gridRowEnd = `span ${Math.ceil((inner.getBoundingClientRect().height + 28) / 4)}`; };
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target.parentElement as HTMLElement)));
    Array.from(ul.children).forEach((li) => { fit(li as HTMLElement); if (li.firstElementChild) ro.observe(li.firstElementChild); });
    return () => ro.disconnect();
  }, [items]);
  return (
    <ul ref={ref} className="salon" role="list">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((i, n) => (
          <motion.li key={i.film.id} layout="position" transition={LAYOUT} exit={{ opacity: 0, scale: 0.9 }} className="salon-item">
            <div><Frame item={i} index={n} hung={hung === i.film.id} onOpen={onOpen} /></div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/* Timeline: a corridor of months, newest first. */
function Timeline({ items, hung, onOpen }: { items: WallItem[]; hung: number | null; onOpen: (i: WallItem, r: DOMRect) => void }) {
  const months = new Map<string, WallItem[]>();
  for (const i of [...items].sort((a, b) => b.lastWatched.localeCompare(a.lastWatched))) {
    const m = monthOf(i.lastWatched); if (!months.has(m)) months.set(m, []); months.get(m)!.push(i);
  }
  let n = 0;
  return (
    <ol className="timeline" role="list">
      {[...months].map(([m, list]) => (
        <li key={m} className="timeline-month">
          <h2 className="timeline-label">{m}</h2>
          <ul className="timeline-row" role="list">{list.map((i) => <li key={i.film.id}><Frame item={i} index={n++} hung={hung === i.film.id} compact onOpen={onOpen} /></li>)}</ul>
        </li>
      ))}
    </ol>
  );
}

/* Shelf: frames leaning on shelves, one shelf per decade of release. */
function Shelves({ items, hung, onOpen }: { items: WallItem[]; hung: number | null; onOpen: (i: WallItem, r: DOMRect) => void }) {
  const shelves = new Map<string, WallItem[]>();
  for (const i of items) { const d = decadeOf(i.film.year) ?? 'Undated'; if (!shelves.has(d)) shelves.set(d, []); shelves.get(d)!.push(i); }
  let n = 0;
  return (
    <div className="shelves">
      {[...shelves].sort((a, b) => b[0].localeCompare(a[0])).map(([d, list]) => (
        <section key={d} className="shelf" aria-label={`${d}, ${list.length} ${list.length === 1 ? 'film' : 'films'}`}>
          <h2 className="shelf-label">{d}</h2>
          <ul className="shelf-row" role="list">{list.map((i) => <li key={i.film.id}><Frame item={i} index={n++} hung={hung === i.film.id} compact onOpen={onOpen} /></li>)}</ul>
          <span className="shelf-ledge" aria-hidden="true" />
        </section>
      ))}
    </div>
  );
}

/* An empty wall: hooks waiting for frames. */
function BareWall({ editable, hasWaiting, onLog }: { editable: boolean; hasWaiting: boolean; onLog: (r: DOMRect) => void }) {
  return (
    <div className="bare">
      <div className="bare-hooks" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span key={i} className="bare-hook" style={{ ['--i' as string]: i }} />)}</div>
      <h2 className="bare-title">{editable ? 'Your wall is bare' : 'Nothing framed yet'}</h2>
      <p className="bare-body">{editable
        ? hasWaiting ? 'You’ve logged films but haven’t rated any yet. Rate one below and it’s framed here.' : 'Log a film you’ve seen and rate it, and its poster is framed and hung here. Review it for a walnut frame; love it for the Hall of Fame.'
        : 'Films appear here once they’re rated.'}</p>
      {editable ? (
        <div className="bare-actions">
          <Button variant="primary" icon="plus" onClick={(e) => onLog(e.currentTarget.getBoundingClientRect())}>Log a film</Button>
          <Button variant="secondary" icon="compass" href="/discover">Find films</Button>
        </div>
      ) : null}
    </div>
  );
}

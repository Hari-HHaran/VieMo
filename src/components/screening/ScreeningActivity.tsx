'use client';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@/ds/client';
import { EASE } from '@/lib/motion';
import {
  FILTERS, LEVEL_NAMES, LEVEL_RULES, addDays, describeDay, levelOf, longDate, monthKeyOf, monthLabel, monthRows, monthStats,
  shiftMonth, shortDate, type ActivityFilter, type DayFilm, type MonthData,
} from '@/lib/screening';
import DayPanel from './DayPanel';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROWS = 'ABCDEF';

interface Props {
  /** "Your" or "Ana's": whose seats these are, for headings and labels. */
  owner: string;
  month: string;
  onMonth: (key: string) => void;
  today: string;
  data: MonthData | null;
  /** Shown above the chart, e.g. where the data comes from. */
  note?: React.ReactNode;
  loadDay: (day: string) => Promise<DayFilm[] | null>;
  isOwn: boolean;
}

/* A theatre seating chart for one month: each day is a seat, lit by how much was watched, rated and
   reviewed. Keyboard: arrows move between seats (and across months), Enter opens the day. */
export default function ScreeningActivity({ owner, month, onMonth, today, data, note, loadDay, isOwn }: Props) {
  const uid = useId();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [focusDay, setFocusDay] = useState<string>(() => (monthKeyOf(today) === month ? today : `${month}-01`));
  const [tip, setTip] = useState<{ day: string; x: number; y: number; below: boolean } | null>(null);
  const [open, setOpen] = useState<{ day: string; origin: DOMRect | null } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const hideTimer = useRef<number | null>(null);
  /* After Escape, hover stays quiet until the pointer really moves (browsers re-send hover when the page changes). */
  const hushed = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  const rows = useMemo(() => monthRows(month), [month]);
  const stats = useMemo(() => (data ? monthStats(data.days, month) : null), [data, month]);
  const thisMonth = monthKeyOf(today);
  const firstMonth = data?.firstDay ? monthKeyOf(data.firstDay) : thisMonth;
  /* Back to the first logged day, and at least a year back so the months can be explored. */
  const earliest = firstMonth < shiftMonth(thisMonth, -11) ? firstMonth : shiftMonth(thisMonth, -11);
  const canPrev = month > earliest;
  const canNext = month < thisMonth;

  /* Keep the roving focus inside this month. */
  useEffect(() => {
    if (monthKeyOf(focusDay) !== month) setFocusDay(monthKeyOf(today) === month ? today : `${month}-01`);
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, month, data]);

  const cancelHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const hideSoon = () => { cancelHide(); hideTimer.current = window.setTimeout(() => setTip(null), 140); };
  useEffect(() => cancelHide, []);
  /* Escape dismisses the tooltip without moving focus (WCAG 1.4.13). */
  useEffect(() => {
    if (!tip) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !open) { hushed.current = { ...lastPointer.current }; setTip(null); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [tip, open]);

  const showTip = useCallback((day: string, el: HTMLElement) => {
    cancelHide();
    const w = wrap.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!w) return;
    const below = r.top - w.top < 120;
    const half = Math.min(130, w.width / 2); // keep the tooltip inside the chart on narrow screens
    const x = Math.max(half, Math.min(w.width - half, r.left - w.left + r.width / 2));
    setTip({ day, x, y: below ? r.bottom - w.top + 8 : r.top - w.top - 8, below });
  }, []);

  function onKey(e: React.KeyboardEvent, day: string) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string | null = null;
    if (e.key in step) next = addDays(day, step[e.key]);
    else if (e.key === 'Home' || e.key === 'End') {
      const row = rows.find((r) => r.includes(day))!.filter(Boolean) as string[];
      next = e.key === 'Home' ? row[0] : row[row.length - 1];
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const target = shiftMonth(month, e.key === 'PageUp' ? -1 : 1);
      if ((e.key === 'PageUp' && !canPrev) || (e.key === 'PageDown' && !canNext)) return;
      next = `${target}-01`;
    }
    if (!next) return;
    e.preventDefault();
    const key = monthKeyOf(next);
    if (key !== month) {
      if ((key < month && !canPrev) || (key > month && !canNext)) return;
      onMonth(key);
    }
    moveFocus.current = true;
    setTip(null);
    setFocusDay(next);
  }

  const tipDay = tip?.day;
  const tipCounts = tipDay ? data?.days[tipDay] : undefined;
  const tipTitles = tipDay ? data?.titles[tipDay] ?? [] : [];
  const rules = LEVEL_RULES[filter === 'all' ? 'all' : 'single'];
  const filterName = FILTERS.find((f) => f.id === filter)!.label.toLowerCase();

  return (
    <section className="sa" aria-labelledby={`${uid}-h`}>
      <header className="sa-head">
        <div>
          <p className="sa-eyebrow type-eyebrow">Screening Activity</p>
          <h2 id={`${uid}-h`} className="sa-title">
            <span className="vm-sr">{owner} screenings, </span>
            <span aria-live="polite">{monthLabel(month)}</span>
          </h2>
        </div>
        <div className="sa-months">
          <button type="button" className="sa-nav" onClick={() => onMonth(shiftMonth(month, -1))} disabled={!canPrev}
            aria-label={`Previous month, ${monthLabel(shiftMonth(month, -1))}`}><Icon name="chevron-left" size={20} /></button>
          <button type="button" className="sa-nav" onClick={() => onMonth(shiftMonth(month, 1))} disabled={!canNext}
            aria-label={`Next month, ${monthLabel(shiftMonth(month, 1))}`}><Icon name="chevron-right" size={20} /></button>
          {month !== thisMonth ? <button type="button" className="sa-today type-label" onClick={() => onMonth(thisMonth)}>This month</button> : null}
        </div>
      </header>

      {note ? <p className="sa-note type-caption">{note}</p> : null}

      <fieldset className="sa-filters">
        <legend className="vm-sr">Show</legend>
        {FILTERS.map((f) => (
          <label key={f.id} className={`sa-filter type-label${filter === f.id ? ' is-on' : ''}`}>
            <input type="radio" name={`${uid}-filter`} value={f.id} checked={filter === f.id} onChange={() => setFilter(f.id)} />
            {f.label}
          </label>
        ))}
      </fieldset>

      <div className="sa-house" ref={wrap} onPointerLeave={() => { hushed.current = null; hideSoon(); }}
        onPointerMove={(e) => {
          lastPointer.current = { x: e.clientX, y: e.clientY };
          const h = hushed.current;
          if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 6) hushed.current = null;
        }}>
        <div className="sa-screen" aria-hidden="true"><span>Screen</span></div>
        <div ref={grid} role="grid" className="sa-grid" aria-label={`${monthLabel(month)}: one seat per day, coloured by ${filterName}`}
          aria-busy={!data || undefined} aria-rowcount={rows.length + 1} aria-colcount={7}>
          <div role="row" className="sa-row sa-days-row" aria-rowindex={1}>
            <span className="sa-rowlabel" aria-hidden="true" />
            {WEEKDAYS.map((d, i) => <span key={d} role="columnheader" aria-colindex={i + 1} className="sa-weekday type-caption">{d}</span>)}
            <span className="sa-rowlabel" aria-hidden="true" />
          </div>
          {rows.map((row, ri) => (
            <motion.div role="row" key={`${month}-${ri}`} className="sa-row" aria-rowindex={ri + 2}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: EASE.out, delay: ri * 0.05 }}>
              <span className="sa-rowlabel type-caption" aria-hidden="true">{ROWS[ri]}</span>
              {row.map((day, ci) => {
                if (!day) return <span key={ci} role="gridcell" aria-colindex={ci + 1} className="sa-cell is-empty" />;
                const future = day > today;
                const counts = data?.days[day];
                const level = future ? 0 : levelOf(counts, filter);
                const label = `${longDate(day)}${day === today ? ', today' : ''}: ${future ? 'upcoming' : !data ? 'loading' : describeDay(counts)}`;
                return (
                  <span key={day} role="gridcell" aria-colindex={ci + 1} className="sa-cell">
                    <button type="button" data-day={day} data-level={level} tabIndex={day === focusDay ? 0 : -1}
                      className={`sa-seat${future ? ' is-future' : ''}${day === today ? ' is-today' : ''}`}
                      aria-label={label} aria-disabled={future || !data || undefined} aria-haspopup={future ? undefined : 'dialog'}
                      onKeyDown={(e) => onKey(e, day)}
                      onFocus={(e) => { setFocusDay(day); if (e.currentTarget.matches(':focus-visible')) showTip(day, e.currentTarget); }}
                      onBlur={hideSoon}
                      onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !hushed.current) showTip(day, e.currentTarget); }}
                      onClick={(e) => { if (future || !data) return; setTip(null); setOpen({ day, origin: e.currentTarget.getBoundingClientRect() }); }}>
                      <Seat />
                      <span className="sa-num" aria-hidden="true">{Number(day.slice(8))}</span>
                    </button>
                  </span>
                );
              })}
              <span className="sa-rowlabel type-caption" aria-hidden="true">{ROWS[ri]}</span>
            </motion.div>
          ))}
        </div>

        {tip && tipDay ? (
          <motion.div key={tipDay} className={`sa-tip${tip.below ? ' is-below' : ''}`} aria-hidden="true"
            style={{ left: tip.x, top: tip.y }} onPointerEnter={cancelHide} onPointerLeave={hideSoon}
            initial={{ opacity: 0, y: tip.below ? -4 : 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14, ease: EASE.out }}>
            <p className="sa-tip-date type-label">{longDate(tipDay)}</p>
            {tipDay > today ? <p className="type-caption">Upcoming</p> : (
              <>
                <dl className="sa-tip-counts type-caption">
                  <div><dt>Watched</dt><dd>{tipCounts?.watched ?? 0}</dd></div>
                  <div><dt>Ratings</dt><dd>{tipCounts?.rated ?? 0}</dd></div>
                  <div><dt>Reviews</dt><dd>{tipCounts?.reviewed ?? 0}</dd></div>
                </dl>
                {tipTitles.length ? (
                  <p className="sa-tip-films type-caption">{tipTitles.slice(0, 3).join(' · ')}{tipTitles.length > 3 ? ` and ${tipTitles.length - 3} more` : ''}</p>
                ) : null}
                {tipCounts ? <p className="sa-tip-hint type-caption">Select the seat for the details</p> : null}
              </>
            )}
          </motion.div>
        ) : null}
      </div>

      <div className="sa-legend" aria-label={`Key: ${filter === 'all' ? 'points' : filterName} per day`} role="group">
        <span className="type-caption">Less</span>
        <ol className="sa-legend-seats" role="list">
          {LEVEL_NAMES.map((name, i) => (
            <li key={name} className="sa-legend-item" data-level={i}>
              <span className="sa-legend-seat" aria-hidden="true"><Seat /></span>
              <span className="type-caption"><span className="vm-sr">{name}: </span>{rules[i]}<span className="vm-sr"> {filter === 'all' ? 'points' : filterName}</span></span>
            </li>
          ))}
        </ol>
        <span className="type-caption">More</span>
      </div>
      <p className="sa-rule type-caption">{filter === 'all' ? 'Points per day: a logged watch is 1, a rating 1, a review 2.' : `Seats count ${filterName} per day.`}</p>

      <dl className="sa-stats">
        <Stat label="Watched this month" value={stats ? stats.watched : null} unit={(n) => (n === 1 ? 'film' : 'films')} />
        <Stat label="Reviews this month" value={stats ? stats.reviewed : null} unit={(n) => (n === 1 ? 'review' : 'reviews')} />
        <Stat label="Current streak" value={data ? data.current : null} unit={(n) => (n === 1 ? 'day' : 'days')} />
        <Stat label="Longest streak" value={data ? data.longest : null} unit={(n) => (n === 1 ? 'day' : 'days')} />
        <div className="sa-stat">
          <dt className="type-caption">Most active day</dt>
          <dd>{stats?.mostActive ? <><span className="sa-stat-value">{shortDate(stats.mostActive.day)}</span><span className="type-caption"> {stats.mostActive.points} points</span></> : <span className="sa-stat-none type-body">{data ? 'None yet' : '…'}</span>}</dd>
        </div>
        <div className="sa-stat">
          <dt className="type-caption">Top genre this month</dt>
          <dd>{data?.topGenre ? <span className="sa-stat-value sa-stat-word">{data.topGenre}</span> : <span className="sa-stat-none type-body">{data ? 'Not enough to say' : '…'}</span>}</dd>
        </div>
      </dl>
      {data && stats && stats.activeDays === 0 ? (
        <p className="sa-empty type-body">{isOwn ? <>No screenings logged in {monthLabel(month)}. Log one from any film page with <strong>Mark as watched</strong>.</> : `No screenings logged in ${monthLabel(month)}.`}</p>
      ) : null}

      <DayPanel day={open?.day ?? null} origin={open?.origin ?? null} counts={open ? data?.days[open.day] : undefined}
        owner={owner} isOwn={isOwn} loadDay={loadDay} onClose={() => setOpen(null)} />
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | null; unit: (n: number) => string }) {
  return (
    <div className="sa-stat">
      <dt className="type-caption">{label}</dt>
      <dd>{value == null ? <span className="sa-stat-none type-body">…</span> : <><span className="sa-stat-value">{value}</span><span className="type-caption"> {unit(value)}</span></>}</dd>
    </div>
  );
}

/* A cinema seat: back, cushion and two armrests. Coloured by CSS through the button's data-level. */
export function Seat() {
  return (
    <svg className="sa-seat-svg" viewBox="0 0 44 40" aria-hidden="true" focusable="false">
      <path className="sa-seat-back" d="M10 6a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v18H10z" />
      <rect className="sa-seat-cushion" x="7" y="23" width="30" height="10" rx="3.5" />
      <rect className="sa-seat-arm" x="2" y="16" width="6" height="20" rx="2.5" />
      <rect className="sa-seat-arm" x="36" y="16" width="6" height="20" rx="2.5" />
      <rect className="sa-seat-leg" x="12" y="33" width="20" height="5" rx="1.5" />
    </svg>
  );
}

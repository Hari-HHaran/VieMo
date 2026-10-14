'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Icon, Rating } from '@/ds/client';
import { usePrefs, useWatchlist } from '@/lib/device-store';
import { useToast } from './AppShell';

export interface SphereFilm {
  id: number; title: string; year?: number; posterPath: string; overview: string;
  voteAverage: number; voteCount: number; genres: string[];
}
const IMG = 'https://image.tmdb.org/t/p';
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const DEG = 180 / Math.PI;

/* Even spread of N points on a sphere (Fibonacci lattice), as longitude/latitude in degrees. */
function lattice(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const t = GOLDEN * i;
    return { lon: Math.atan2(Math.cos(t) * r, Math.sin(t) * r) * DEG, lat: Math.asin(y) * DEG };
  });
}
const wrap = (a: number) => ((a + 540) % 360) - 180;

/* ViewMo: drag a sphere of real posters; select one to bring it forward with its details. */
export default function ViewMoSphere({ films }: { films: SphereFilm[] }) {
  const [prefs] = usePrefs();
  const stageRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const points = useRef(lattice(films.length)).current;
  const view = useRef({ yaw: -20, pitch: -12, vy: 0, vp: 0, target: null as null | { yaw: number; pitch: number }, idleAt: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean; id: number; t: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [radius, setRadius] = useState(260);
  const reduce = useRef(false);
  const { has, add, remove } = useWatchlist();
  const toast = useToast();

  useEffect(() => {
    reduce.current = prefs.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [prefs.reduceMotion]);

  /* Radius follows the stage size. */
  useLayoutEffect(() => {
    const el = stageRef.current!;
    const fit = () => setRadius(Math.max(140, Math.min(el.clientWidth * 0.46, el.clientHeight * 0.42, 440)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Posters seen side-on (near the sphere's edge) or from behind ignore pointers, so slivers can't be
     tapped by mistake; turning the sphere or Tab brings them to the front. */
  const edgeState = useRef<boolean[]>([]);
  const markEdges = (yaw: number, pitch: number) => {
    const sy = Math.sin(yaw / DEG), cy = Math.cos(yaw / DEG), sp = Math.sin(pitch / DEG), cp = Math.cos(pitch / DEG);
    points.forEach((pt, i) => {
      const lon = pt.lon / DEG, lat = pt.lat / DEG;
      const x = Math.cos(lat) * Math.sin(lon), y = -Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
      const z1 = -x * sy + z * cy;          // after rotateY(yaw)
      const facing = y * sp + z1 * cp;     // z after rotateX(pitch): how directly the card faces the viewer
      const side = facing < 0.45;
      if (edgeState.current[i] !== side) {
        edgeState.current[i] = side;
        cardRefs.current[i]?.classList.toggle('is-side', side);
      }
    });
  };

  /* One animation loop writes a single transform: inertia, easing to a focused card, slow idle drift. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = view.current;
      if (!drag.current && open === null) {
        if (v.target) {
          const k = reduce.current ? 1 : 0.12;
          const dy = wrap(v.target.yaw - v.yaw), dp = v.target.pitch - v.pitch;
          v.yaw += dy * k; v.pitch += dp * k;
          if (Math.abs(dy) < 0.05 && Math.abs(dp) < 0.05) v.target = null;
        } else if (!reduce.current) {
          v.yaw += v.vy; v.pitch += v.vp;
          v.vy *= 0.94; v.vp *= 0.94;
          if (Math.abs(v.vy) < 0.01 && Math.abs(v.vp) < 0.01 && performance.now() - v.idleAt > 2500) v.yaw += 0.05;
        }
        v.pitch = Math.max(-70, Math.min(70, v.pitch));
      }
      if (sphereRef.current) sphereRef.current.style.transform = `rotateX(${v.pitch}deg) rotateY(${v.yaw}deg)`;
      markEdges(v.yaw, v.pitch);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || open !== null) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId, t: performance.now() };
    view.current.vy = view.current.vp = 0;
    view.current.target = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) { d.moved = true; stageRef.current?.setPointerCapture(e.pointerId); }
    const k = 70 / radius; // degrees per pixel: a drag across the sphere turns it about half way
    const now = performance.now(), dt = Math.max(16, now - d.t);
    view.current.yaw += dx * k; view.current.pitch -= dy * k;
    view.current.vy = (dx * k * 16) / dt; view.current.vp = (-dy * k * 16) / dt;
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    view.current.idleAt = performance.now();
    if (d.moved) setTimeout(() => { drag.current = null; }, 0); else drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 12;
    const v = view.current;
    const base = v.target ?? { yaw: v.yaw, pitch: v.pitch };
    const t = { ArrowLeft: { yaw: base.yaw - step, pitch: base.pitch }, ArrowRight: { yaw: base.yaw + step, pitch: base.pitch },
      ArrowUp: { yaw: base.yaw, pitch: Math.min(70, base.pitch + step) }, ArrowDown: { yaw: base.yaw, pitch: Math.max(-70, base.pitch - step) } }[e.key];
    if (t && (e.target === stageRef.current)) { v.target = t; v.idleAt = performance.now(); e.preventDefault(); }
  };

  /* Keyboard focus on a poster turns the sphere so that poster faces you. */
  const faceCard = (i: number) => {
    const el = cardRefs.current[i];
    if (!el?.matches(':focus-visible')) return;
    const p = points[i];
    view.current.target = { yaw: -p.lon, pitch: -p.lat };
    view.current.vy = view.current.vp = 0;
  };

  const openCard = useCallback((i: number) => {
    if (drag.current?.moved) return;
    setOpen(i);
  }, []);

  /* Fly the poster from its place on the sphere to the centre (and back on close). */
  useEffect(() => {
    if (open === null) return;
    const dialog = dialogRef.current!, poster = posterRef.current!, card = cardRefs.current[open]!;
    if (!dialog.open) dialog.showModal();
    if (reduce.current) return;
    const from = card.getBoundingClientRect(), to = poster.getBoundingClientRect();
    poster.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: 0.6 },
      { transform: 'none', opacity: 1 },
    ], { duration: 460, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    dialog.querySelector('.vmx-details')?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 200, fill: 'backwards', easing: 'ease-out' });
  }, [open]);

  const close = useCallback(() => {
    const dialog = dialogRef.current, poster = posterRef.current;
    if (open === null || !dialog || !poster) return;
    const card = cardRefs.current[open];
    const done = () => { dialog.close(); setOpen(null); view.current.idleAt = performance.now(); card?.focus({ preventScroll: true }); };
    if (reduce.current || !card) return done();
    const from = poster.getBoundingClientRect(), to = card.getBoundingClientRect();
    dialog.querySelector('.vmx-details')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    poster.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`, opacity: 0.7 },
    ], { duration: 380, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' }).finished.then(done, done);
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    const onCancel = (e: Event) => { e.preventDefault(); close(); };
    d?.addEventListener('cancel', onCancel);
    return () => d?.removeEventListener('cancel', onCancel);
  }, [close]);

  const film = open !== null ? films[open] : null;
  /* Posters cover about the whole of the sphere's surface, so neighbours overlap as they turn. */
  const cardW = Math.round(radius * Math.min(0.5, Math.max(0.3, Math.sqrt((1.0 * 4 * Math.PI) / (1.5 * Math.max(films.length, 1))))));
  const saved = film ? has(film.id) : false;

  return (
    <>
      <div
        ref={stageRef}
        className={`vmx-stage${open !== null ? ' is-open' : ''}`}
        style={{ ['--r' as string]: `${radius}px`, ['--card-w' as string]: `${cardW}px` }}
        tabIndex={0}
        role="group"
        aria-roledescription="poster sphere"
        aria-label={`Sphere of ${films.length} film posters. Drag or use the arrow keys to turn it; Tab moves through the posters.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div className="vmx-sphere" ref={sphereRef}>
          {films.map((f, i) => (
            <button
              key={f.id}
              type="button"
              ref={(el) => { cardRefs.current[i] = el; }}
              className="vmx-card"
              style={{ transform: `rotateY(${points[i].lon}deg) rotateX(${points[i].lat}deg) translateZ(var(--r))` }}
              onClick={() => openCard(i)}
              onFocus={() => faceCard(i)}
              aria-label={`${f.title}${f.year ? `, ${f.year}` : ''}`}
            >
              <img src={`${IMG}/w185${f.posterPath}`} srcSet={`${IMG}/w185${f.posterPath} 1x, ${IMG}/w342${f.posterPath} 2x`} alt="" draggable={false} decoding="async" />
            </button>
          ))}
        </div>
      </div>

      <dialog ref={dialogRef} className="vmx-dialog" aria-labelledby="vmx-title" onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
        {film ? (
          <div className="vmx-light">
            <img ref={posterRef} className="vmx-poster" src={`${IMG}/w500${film.posterPath}`} srcSet={`${IMG}/w342${film.posterPath} 342w, ${IMG}/w500${film.posterPath} 500w, ${IMG}/w780${film.posterPath} 780w`} sizes="(min-width: 768px) 340px, 62vw" alt={`${film.title} poster`} />
            <div className="vmx-details">
              <h2 id="vmx-title" className="type-display-md">{film.title}{film.year ? <span className="type-heading-md vm-muted"> {film.year}</span> : null}</h2>
              <p className="type-caption vm-muted">{film.genres.join(', ')}</p>
              {film.voteCount ? <Rating value={film.voteAverage} source="tmdb" count={film.voteCount} /> : null}
              {film.overview ? <p className="type-body vmx-overview">{film.overview}</p> : null}
              <div className="vmx-actions">
                <Button variant="primary" icon="film" href={`/film/${film.id}`}>Full details</Button>
                <Button icon={saved ? 'bookmark-check' : 'bookmark-plus'} aria-pressed={saved} onClick={() => {
                  if (saved) { remove(film.id); toast({ message: `Removed ${film.title} from your watchlist` }); }
                  else { add({ id: film.id, title: film.title, year: film.year, posterPath: film.posterPath }); toast({ tone: 'positive', message: `Saved ${film.title} to your watchlist` }); }
                }}>{saved ? 'Saved' : 'Watchlist'}</Button>
                <Button variant="ghost" icon="x" onClick={close} autoFocus>Close</Button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
      <p className="vmx-hint type-caption vm-muted"><Icon name="info" size={14} />Drag to spin · select a poster · arrow keys and Tab work too</p>
    </>
  );
}

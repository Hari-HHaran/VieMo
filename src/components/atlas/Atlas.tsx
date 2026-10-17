'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon, Poster } from '@/ds/client';
import { usePrefs } from '@/lib/device-store';
import { LAYOUT, prefersLessMotion } from '@/lib/motion';
import { SAMPLE_LOCATIONS, type AtlasFilm, type AtlasLocation } from '@/lib/atlas/types';
import Mo from '../mo/Mo';
import AtlasSearch from './AtlasSearch';
import BehindTheFrame from './BehindTheFrame';
import FlatMap from './FlatMap';
import type { GlobeHandle } from './GlobeView';
import LocationList from './LocationList';

const IMG = 'https://image.tmdb.org/t/p';
type GlobeComponent = typeof import('./GlobeView').default;

function AtlasLoading() {
  return <div className="atlas-loading" role="status"><span className="atlas-orbit" aria-hidden="true"><i /><i /><i /></span>Lighting the planetarium…</div>;
}

/* SceneAtlas: search a film, see where it was made. The globe is the show; the list beside it is the
   dependable way to every marker. Without WebGL, a flat dotted map stands in. */
export default function Atlas() {
  const [prefs] = usePrefs();
  const [reduce, setReduce] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [view, setView] = useState<'globe' | 'map'>('globe');
  const [film, setFilm] = useState<AtlasFilm | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [ask, setAsk] = useState<{ text: string; n: number } | null>(null);
  const globe = useRef<GlobeHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  /* The globe code (three.js) loads only on this page. It is loaded by hand rather than through a Suspense
     boundary, because a Suspense reveal would start a page-wide view transition that briefly blocks input. */
  const [GlobeView, setGlobeView] = useState<GlobeComponent | null>(null);

  /* The atlas fills the screen below whatever sits above it (the nav, or the saved-data notice). */
  useEffect(() => {
    const fit = () => { const el = root.current; if (el) el.style.setProperty('--atlas-offset', `${Math.max(0, el.getBoundingClientRect().top + scrollY)}px`); };
    fit(); addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    let gl = false;
    try { const c = document.createElement('canvas'); gl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch {}
    setWebgl(gl);
    if (gl) import('./GlobeView').then((m) => setGlobeView(() => m.default)).catch(() => setWebgl(false));
    if (innerWidth < 768) setListOpen(false);
  }, []);
  useEffect(() => { setReduce(prefersLessMotion()); }, [prefs.reduceMotion]);

  /* Phase 1: a chosen film has no researched locations yet, so it shows none. Samples only appear with no film. */
  const locations = useMemo<AtlasLocation[]>(() => (film ? [] : SAMPLE_LOCATIONS), [film]);
  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const showGlobe = view === 'globe' && webgl === true;

  const select = (l: AtlasLocation) => { setSelectedId(l.id); if (showGlobe) globe.current?.flyTo(l); };
  const pickFilm = (f: AtlasFilm) => { setFilm(f); setSelectedId(null); globe.current?.reset(); };

  return (
    <div ref={root} className={`atlas${selected ? ' has-detail' : ''}`}>
      <div className="atlas-stage">
        {webgl === null || (showGlobe && !GlobeView) ? <AtlasLoading /> : showGlobe && GlobeView
          ? <GlobeView ref={globe} locations={locations} selectedId={selectedId} hoveredId={hoveredId} reduceMotion={reduce}
              onSelect={select} onHover={(l) => { setHoveredId(l?.id ?? null); document.body.style.cursor = l ? 'pointer' : ''; }} />
          : <FlatMap locations={locations} selectedId={selectedId} onSelect={select} />}
      </div>

      <header className="atlas-top">
        <div className="atlas-brand">
          <p className="atlas-eyebrow">SceneAtlas</p>
          <h1 className="atlas-title">Every movie has a world. <em>Explore it.</em></h1>
        </div>
        <AtlasSearch onPick={pickFilm} />
        {film ? (
          <div className="atlas-film">
            <span className="atlas-film-poster"><Poster src={film.posterPath ? `${IMG}/w92${film.posterPath}` : null} title={film.title} size="fill" /></span>
            <span className="atlas-film-text"><b>{film.title}</b>{film.year ? ` ${film.year}` : ''}</span>
            <button type="button" className="atlas-icon-btn" onClick={() => { setFilm(null); setSelectedId(null); }} aria-label={`Clear ${film.title}`}><Icon name="x" size={16} /></button>
          </div>
        ) : null}
        {!film ? <p className="atlas-preview"><Icon name="info" size={14} />Preview: these lights are sample markers at city centres, not filming locations. Sourced locations arrive in the next update.</p> : null}
        {webgl === false ? <p className="atlas-preview"><Icon name="info" size={14} />Your browser can’t show the 3D globe, so here’s the flat map.</p> : null}
      </header>

      <aside className={`atlas-panel${listOpen ? ' is-open' : ''}`} aria-labelledby="atlas-list-h">
        <button type="button" className="atlas-panel-toggle" aria-expanded={listOpen} aria-controls="atlas-list" onClick={() => setListOpen((o) => !o)}>
          <span id="atlas-list-h">{film ? 'Filming locations' : 'Sample markers'} <span className="atlas-count">{locations.length}</span></span>
          <Icon name={listOpen ? 'chevron-left' : 'chevron-right'} size={16} />
        </button>
        <div id="atlas-list" className="atlas-panel-body" hidden={!listOpen}>
          {locations.length ? <LocationList locations={locations} selectedId={selectedId} onSelect={select} onHover={(l) => setHoveredId(l?.id ?? null)} />
            : film ? (
              <div className="atlas-empty">
                <span className="atlas-empty-orbit" aria-hidden="true" />
                <p className="atlas-empty-title">No sourced locations for {film.title} yet</p>
                <p>SceneAtlas only pins places a checked source confirms. Research for this film arrives with the next update, and nothing is guessed in the meantime.</p>
                <a className="atlas-btn" href={`/film/${film.id}`}><Icon name="film" size={16} />Open the film page</a>
              </div>
            ) : null}
        </div>
      </aside>

      <div className="atlas-controls" role="group" aria-label="Map controls">
        <div className="atlas-seg" role="group" aria-label="View">
          {(['globe', 'map'] as const).map((v) => (
            <button key={v} type="button" className={`atlas-seg-btn${view === v ? ' is-on' : ''}`} aria-pressed={view === v} disabled={v === 'globe' && webgl === false}
              onClick={() => setView(v)}>
              {view === v ? <motion.span layoutId="atlas-view-light" className="atlas-seg-light" transition={LAYOUT} aria-hidden="true" /> : null}
              <span>{v === 'globe' ? '3D globe' : '2D map'}</span>
            </button>
          ))}
        </div>
        {showGlobe ? (
          <div className="atlas-zoom">
            <button type="button" className="atlas-icon-btn" onClick={() => globe.current?.zoom(0.72)} aria-label="Zoom in"><Icon name="plus" size={18} /></button>
            <button type="button" className="atlas-icon-btn" onClick={() => globe.current?.zoom(1.38)} aria-label="Zoom out"><Icon name="minus" size={18} /></button>
            <button type="button" className="atlas-icon-btn" onClick={() => globe.current?.reset()} aria-label="Reset view"><Icon name="rotate-cw" size={18} /></button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {selected ? (
          <div className="atlas-detail" key={selected.id}>
            <BehindTheFrame location={selected} film={film} onClose={() => setSelectedId(null)} onShowOnMap={() => setView('map')}
              onAskMo={(l) => setAsk({ text: l.sample ? 'How do you check filming locations?' : `What was filmed at ${l.name}?`, n: Date.now() })} />
          </div>
        ) : null}
      </AnimatePresence>

      <Mo context={{ film, location: selected }} ask={ask} />
    </div>
  );
}

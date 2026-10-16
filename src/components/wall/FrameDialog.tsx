'use client';
import { useEffect, useId, useState } from 'react';
import { Button, Icon, Poster } from '@/ds/client';
import { dateLabelOf, STAGE_NAMES, STAGE_RULES, type WallItem } from '@/lib/wall';
import Modal from '../fx/Modal';
import { Stars } from './Frame';

const IMG = 'https://image.tmdb.org/t/p';

/* The close look at one framed film: the full review, every watch, notes and tags, and what you can do with it. */
export default function FrameDialog({ item, origin, open, editable, onClose, onEdit, onRewatch, onFavourite, onRemove }: {
  item: WallItem | null; origin: DOMRect | null; open: boolean; editable: boolean; onClose: () => void;
  onEdit: (i: WallItem) => void; onRewatch: (i: WallItem) => void; onFavourite: (i: WallItem) => void; onRemove: (i: WallItem) => void;
}) {
  const titleId = useId();
  const [spoilers, setSpoilers] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (open) { setSpoilers(false); setConfirming(false); } }, [open, item?.film.id]);
  if (!item) return null;
  const { film, stage } = item;
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} origin={origin} className="frame-modal">
      <div className={`fd is-${stage}`}>
        <div className="fd-art">
          <div className="frame-moulding">
            <div className="frame-mat"><div className="frame-art"><Poster src={film.posterPath ? `${IMG}/w500${film.posterPath}` : null} title={film.title} year={film.year} size="fill" eager /></div></div>
          </div>
          <p className="fd-stage"><span>{STAGE_NAMES[stage]}</span>{STAGE_RULES[stage]}</p>
        </div>
        <div className="fd-body">
          <header className="fd-head">
            <div>
              <h2 id={titleId} className="fd-title"><a href={`/film/${film.id}`}>{film.title}</a></h2>
              <p className="type-caption vm-muted">{[film.year, film.genres.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</p>
            </div>
            <button type="button" className="log-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
          </header>

          <div className="fd-rating">
            {item.rating != null ? <><Stars value={item.rating} size={22} /><span className="type-heading-md">{item.rating} / 5</span></> : <span className="type-body vm-muted">Not rated yet. Rate it to frame it.</span>}
            {editable ? (
              <button type="button" className={`log-fav${item.favourite ? ' is-on' : ''}`} aria-pressed={item.favourite} onClick={() => onFavourite(item)}>
                <Icon name="heart" size={18} />{item.favourite ? 'A favourite' : 'Mark as a favourite'}
              </button>
            ) : item.favourite ? <span className="frame-badge">Favourite</span> : null}
          </div>

          <section className="fd-section" aria-labelledby={`${titleId}-rv`}>
            <h3 id={`${titleId}-rv`} className="type-label">Review</h3>
            {item.review ? (item.spoiler && !spoilers
              ? <p className="type-body vm-muted">This review has spoilers. <button type="button" className="fd-link" onClick={() => setSpoilers(true)}>Show it</button></p>
              : <blockquote className="fd-review">{item.review}</blockquote>)
              : <p className="type-body vm-muted">No review yet.{editable ? ' Write one to earn a walnut frame and a placard.' : ''}</p>}
          </section>

          <section className="fd-section" aria-labelledby={`${titleId}-w`}>
            <h3 id={`${titleId}-w`} className="type-label">{item.watches > 1 ? `Watched ${item.watches} times` : 'Watched'}</h3>
            <ul className="fd-dates" role="list">
              {item.entries.map((e) => <li key={e.id}>{dateLabelOf(e.watchedOn)}{e.rating != null ? <span className="vm-muted"> · {e.rating}★</span> : null}</li>)}
            </ul>
          </section>

          {item.tags.length ? (
            <section className="fd-section" aria-labelledby={`${titleId}-t`}>
              <h3 id={`${titleId}-t`} className="type-label">Tags</h3>
              <ul className="fd-tags" role="list">{item.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          ) : null}
          {editable && item.notes ? (
            <section className="fd-section" aria-labelledby={`${titleId}-n`}>
              <h3 id={`${titleId}-n`} className="type-label">Private notes</h3>
              <p className="type-body">{item.notes}</p>
            </section>
          ) : null}

          <div className="fd-actions">
            {editable ? <Button variant="primary" icon="pencil" onClick={() => onEdit(item)}>{item.rating == null ? 'Rate and review' : 'Edit'}</Button> : null}
            {editable ? <Button variant="secondary" icon="rotate-cw" onClick={() => onRewatch(item)}>Log a rewatch</Button> : null}
            <Button variant="ghost" icon="film" href={`/film/${film.id}`}>Film page</Button>
          </div>
          {editable ? (confirming ? (
            <div className="fd-confirm" role="group" aria-label="Confirm taking it down">
              <p className="type-body">Take {film.title} off your wall? Its ratings, review and watch dates are removed from this device.</p>
              <div className="fd-actions">
                <Button variant="danger" icon="trash-2" onClick={() => onRemove(item)}>Take it down</Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
              </div>
            </div>
          ) : <button type="button" className="fd-link fd-remove" onClick={() => setConfirming(true)}>Take it off the wall</button>) : null}
        </div>
      </div>
    </Modal>
  );
}

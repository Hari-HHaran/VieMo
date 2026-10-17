'use client';
import { useId } from 'react';
import { motion } from 'motion/react';
import { Icon, Poster } from '@/ds/client';
import { SPRING } from '@/lib/motion';
import { isApproximate, KIND_LABEL, PRECISION_LABEL, STATUS_LABEL, STATUS_NOTE, type AtlasFilm, type AtlasLocation } from '@/lib/atlas/types';

const IMG = 'https://image.tmdb.org/t/p';

/* "Behind the Frame": everything known about one filming location, every claim with its source. Sections that
   have no documented content say so rather than filling the gap. */
export default function BehindTheFrame({ location: l, film, onClose, onShowOnMap, onAskMo }: {
  location: AtlasLocation; film: AtlasFilm | null; onClose: () => void; onShowOnMap: () => void; onAskMo: (l: AtlasLocation) => void;
}) {
  const h = useId();
  return (
    <motion.section className="btf" aria-labelledby={h} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={SPRING.reveal}>
      <header className="btf-head">
        <div>
          <p className="btf-eyebrow">Behind the Frame</p>
          <h2 id={h} className="btf-title">{l.name}</h2>
          <p className="btf-region">{[l.region, l.country].filter(Boolean).join(', ') || 'Region not recorded'}</p>
        </div>
        <button type="button" className="atlas-icon-btn" onClick={onClose} aria-label="Close location details"><Icon name="x" size={18} /></button>
      </header>

      {l.sample ? (
        <p className="btf-sample"><Icon name="info" size={16} />This is a sample marker for the SceneAtlas preview. It is a city centre, not a filming location, and makes no claim about any film.</p>
      ) : null}

      <ul className="btf-badges" role="list">
        <li className={`btf-badge${isApproximate(l) ? ' is-approx' : ''}`}>{PRECISION_LABEL[l.precision]}</li>
        {!l.sample ? <li className={`btf-badge is-${l.status}`} title={STATUS_NOTE[l.status]}>{STATUS_LABEL[l.status]}</li> : null}
        {!l.sample ? <li className="btf-badge">{KIND_LABEL[l.kind]}</li> : null}
      </ul>

      {film ? (
        <a className="btf-film" href={`/film/${film.id}`}>
          <span className="btf-film-poster"><Poster src={film.posterPath ? `${IMG}/w92${film.posterPath}` : null} title={film.title} size="fill" /></span>
          <span><span className="btf-film-title">{film.title}</span>{film.year ? <span className="btf-film-year"> {film.year}</span> : null}</span>
        </a>
      ) : null}

      <div className="btf-section">
        <h3>Connection to the production</h3>
        <p>{l.sample ? 'None: sample marker.' : STATUS_NOTE[l.status]}</p>
      </div>
      <div className="btf-section">
        <h3>Scenes filmed here</h3>
        <p className={l.scene ? '' : 'btf-none'}>{l.scene ?? 'No specific scene is documented by our sources.'}</p>
      </div>
      <div className="btf-section">
        <h3>Behind the scenes</h3>
        <p className={l.behindTheScenes ? '' : 'btf-none'}>{l.behindTheScenes ?? 'Nothing documented yet.'}</p>
      </div>
      <div className="btf-section">
        <h3>Image</h3>
        {l.image ? (
          <figure className="btf-image">
            <img src={l.image.url} alt={l.image.caption ?? `Present-day view of ${l.name}`} loading="lazy" />
            <figcaption>Present-day view of the place, not a still from the film. {l.image.author}, {l.image.license}. <a href={l.image.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></figcaption>
          </figure>
        ) : <p className="btf-none btf-noimage"><Icon name="eye-off" size={16} />No freely licensed photo of this place yet.</p>}
      </div>
      <div className="btf-section">
        <h3>Sources</h3>
        {l.sources.length ? (
          <ol className="btf-sources">
            {l.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<Icon name="external-link" size={14} /></a>
                {s.quote ? <q className="btf-quote">{s.quote}</q> : null}
                <span className="btf-source-meta">{s.publisher ? `${s.publisher} · ` : ''}checked {new Date(s.retrievedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </li>
            ))}
          </ol>
        ) : <p className="btf-none">{l.sample ? 'None: sample marker.' : 'No sources recorded.'}</p>}
      </div>

      <div className="btf-actions">
        <button type="button" className="atlas-btn" onClick={() => onAskMo(l)}><Icon name="message-circle" size={16} />Ask Mo about this place</button>
        <button type="button" className="atlas-btn" onClick={onShowOnMap}><Icon name="compass" size={16} />View on the 2D map</button>
      </div>
    </motion.section>
  );
}

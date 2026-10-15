'use client';
import { Poster } from '@/ds/client';
import { useAccentPref, useWatchlist } from '@/lib/device-store';

const IMG = 'https://image.tmdb.org/t/p';

/* The Cinema Passport's data page. Everything on it is real and from this device: the signature film is the one
   chosen under "Your colour", the count is the watchlist. Stamps need a diary, which arrives with accounts. */
export default function PassportCard({ region, regionLabel }: { region: string; regionLabel: string }) {
  const { list } = useWatchlist();
  const { film } = useAccentPref();
  const mrz = `P<VIEMO<<${region}<<${String(list.length).padStart(3, '0')}`.padEnd(36, '<');
  return (
    <section className="passport" aria-labelledby="pp-h">
      <div className="passport-top">
        <p className="type-eyebrow">VieMo · Cinema Passport</p>
        <span className="passport-seal" aria-hidden="true">✦</span>
      </div>
      <div className="passport-body">
        <div className="passport-photo">
          {film ? <Poster src={film.posterPath ? `${IMG}/w185${film.posterPath}` : null} title={film.title} size="sm" alt={`${film.title} poster`} />
            : <span className="passport-blank type-caption">No signature film</span>}
        </div>
        <dl className="passport-fields">
          <div><dt className="type-eyebrow">Holder</dt><dd id="pp-h" className="type-heading-md">This device</dd></div>
          <div><dt className="type-eyebrow">Signature film</dt><dd className="type-body">{film ? film.title : <span className="vm-muted">Choose one under Your colour</span>}</dd></div>
          <div><dt className="type-eyebrow">Issued in</dt><dd className="type-body">{regionLabel}</dd></div>
          <div><dt className="type-eyebrow">On the watchlist</dt><dd className="type-body">{list.length === 1 ? '1 film' : `${list.length} films`}</dd></div>
        </dl>
      </div>
      <div className="passport-stamps">
        <div className="passport-slots" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i} />)}</div>
        <p className="type-caption vm-muted">No stamps yet. Stamps come from films you log in your diary, which arrives with accounts.</p>
      </div>
      <p className="passport-mrz" aria-hidden="true">{mrz}</p>
    </section>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar, Poster, ProviderBadge, Rating } from '@/ds/client';
import BackButton from '@/components/BackButton';
import FilmActions from '@/components/FilmActions';
import FilmRail from '@/components/FilmRail';
import Problem from '@/components/Problem';
import Trailer from '@/components/Trailer';
import { dateLabel, plural, runtimeLabel } from '@/lib/format';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { certification, img, movie, pickTrailer, posterSet, theatricalRelease, yearOf, type ProviderOffer, type RegionProviders } from '@/lib/tmdb';

type Props = { params: Promise<{ id: string }> };
const parseId = (s: string) => (/^\d{1,9}$/.test(s) ? Number(s) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: 'Film' };
  const r = await settle(movie(id), 'film');
  return { title: r.ok ? `${r.value.title}${yearOf(r.value) ? ` (${yearOf(r.value)})` : ''}` : 'Film' };
}

const KINDS: { key: keyof Omit<RegionProviders, 'link'>; kind: 'stream' | 'free' | 'ads' | 'rent' | 'buy' }[] = [
  { key: 'flatrate', kind: 'stream' }, { key: 'free', kind: 'free' }, { key: 'ads', kind: 'ads' }, { key: 'rent', kind: 'rent' }, { key: 'buy', kind: 'buy' },
];

export default async function FilmPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const region = await viewerRegion();
  const res = await settle(movie(id), 'film');
  if (!res.ok) {
    if (res.problem.kind === 'not_found') notFound();
    return <div className="page"><div className="screen-bar"><BackButton /></div><Problem info={res.problem} /></div>;
  }
  const f = res.value;
  const year = yearOf(f);
  const cert = certification(f, region);
  const released = theatricalRelease(f, region);
  const directors = f.credits?.crew.filter((c) => c.job === 'Director').map((c) => c.name) ?? [];
  const cast = (f.credits?.cast ?? []).slice(0, 10);
  const trailer = pickTrailer(f.videos?.results);
  const where = f['watch/providers']?.results?.[region];
  const offers = KINDS.flatMap(({ key, kind }) => ((where?.[key] as ProviderOffer[] | undefined) ?? []).map((o) => ({ ...o, kind })));
  const poster = posterSet(f.poster_path, 'w342');
  const backdrop = img(f.backdrop_path, 'w1280');
  const place = regionName(region);
  const recs = f.recommendations?.results.filter((m) => m.poster_path).slice(0, 16) ?? [];

  return (
    <article className="film" aria-labelledby="film-title">
      <div className="screen-bar"><BackButton /></div>
      {backdrop ? (
        <div className="film-backdrop"><img src={backdrop} srcSet={`${img(f.backdrop_path, 'w780')} 780w, ${backdrop} 1280w`} sizes="(min-width: 1024px) 960px, 100vw" alt="" /></div>
      ) : null}
      <div className="page film-body">
        <div className="film-hero">
          <Poster src={poster.src} srcSet={poster.srcSet} sizes="168px" title={f.title} year={year} size="lg" alt={`${f.title} poster`} eager />
          <div className="film-id">
            <h1 id="film-title" className="type-display-lg">{f.title}{year ? <span className="film-year type-heading-lg"> {year}</span> : null}</h1>
            <p className="type-caption vm-muted">{[runtimeLabel(f.runtime), cert ? `Rated ${cert} in ${place}` : null, f.genres.map((g) => g.name).join(', ')].filter(Boolean).join(' · ')}</p>
            {directors.length ? <p className="type-body">Directed by <strong>{directors.join(', ')}</strong></p> : null}
            <div className="film-ratings">
              <Rating source="community" count={0} />
              {f.vote_count > 0 ? <Rating value={f.vote_average} source="tmdb" count={f.vote_count} /> : <span className="type-caption vm-muted">No TMDB votes yet</span>}
            </div>
            <FilmActions film={{ id: f.id, title: f.title, year, posterPath: f.poster_path }} />
          </div>
        </div>

        {f.tagline ? <p className="film-tagline type-heading-md">{f.tagline}</p> : null}
        {f.overview ? <p className="film-overview type-body-lg">{f.overview}</p> : <p className="type-body vm-muted">TMDB has no synopsis for this film yet.</p>}
        {released ? <p className="type-caption vm-muted">Released in {place} on {dateLabel(released)}</p> : null}

        {trailer ? (
          <section aria-labelledby="trailer-h" className="section">
            <h2 id="trailer-h" className="type-heading-lg">Trailer</h2>
            <Trailer youtubeKey={trailer.key} title={f.title} still={img(f.backdrop_path, 'w780')} />
          </section>
        ) : null}

        <section aria-labelledby="where-h" className="section">
          <h2 id="where-h" className="type-heading-lg">Where to watch in {place}</h2>
          <p className="type-caption vm-faint">Availability from JustWatch via TMDB. Links open TMDB’s watch page, which lists each service.</p>
          {offers.length ? (
            <ul className="provider-list" role="list">
              {offers.map((o) => (
                <li key={`${o.kind}-${o.provider_id}`}>
                  <ProviderBadge name={o.provider_name} kind={o.kind} logoSrc={img(o.logo_path, 'w92') ?? undefined} href={where?.link} linkType="source" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body vm-muted">TMDB lists no streaming, rental or purchase options in {place} for this film.</p>
          )}
        </section>

        {cast.length ? (
          <section aria-labelledby="cast-h" className="section">
            <h2 id="cast-h" className="type-heading-lg">Cast</h2>
            <ul className="cast-list" role="list">
              {cast.map((c) => (
                <li key={c.id + c.character} className="cast-item">
                  <Avatar name={c.name} src={img(c.profile_path, 'w185') ?? undefined} size="md" />
                  <span><span className="type-label">{c.name}</span><span className="type-caption vm-muted">{c.character}</span></span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recs.length ? <FilmRail id="recs" title="More like this" caption="TMDB recommendations" films={recs} /> : null}
        <p className="type-caption vm-faint film-source">{`${plural(f.vote_count, 'TMDB vote', 'TMDB votes')}. VieMo ratings and reviews arrive with accounts.`}</p>
      </div>
    </article>
  );
}

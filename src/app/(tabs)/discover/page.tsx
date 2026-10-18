import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon } from '@/ds/client';
import FilmRail, { toCard } from '@/components/FilmRail';
import MoodMixer from '@/components/MoodMixer';
import ReflowGrid from '@/components/ReflowGrid';
import Problem from '@/components/Problem';
import QueryChips from '@/components/QueryChips';
import SearchField from '@/components/SearchField';
import { dateLabel } from '@/lib/format';
import { genreCombos, MAX_MOODS, MOODS, parseMoods, sortByFit, type Mood } from '@/lib/moods';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, discover, HIDDEN_GEMS_RULE, hiddenGems, nowPlaying, regionProviders, trending, upcoming, type MovieSummary } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Discover' };

/* Films for one or more moods. One mood: TMDB's popular films in any of its genres. Several: a TMDB search for each
   genre combination that covers every mood, plus the popular films in any of their genres for close matches; each
   film is then sorted by how many of the moods its TMDB genres fit. */
async function moodFilms(moods: Mood[], region: string) {
  const union = [...new Set(moods.flatMap((m) => m.genres))];
  if (moods.length === 1) return { all: (await discover({ genresAny: union, region })).results, some: [] as { film: MovieSummary; fits: Mood[] }[] };
  const pages = await Promise.allSettled([
    ...genreCombos(moods).map((g) => discover({ genresAll: g, region }).then((r) => r.results)),
    discover({ genresAny: union, region }).then((r) => r.results),
    discover({ genresAny: union, region, page: 2 }).then((r) => r.results),
  ]);
  if (pages.every((p) => p.status === 'rejected')) throw (pages[0] as PromiseRejectedResult).reason;
  const sorted = sortByFit(pages.flatMap((p) => (p.status === 'fulfilled' ? p.value : [])), moods);
  return { all: sorted.all.map((x) => x.film), some: sorted.some };
}
const joinMoods = (moods: Mood[]) => moods.map((m) => m.label).join(' + ');

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const region = await viewerRegion();
  const place = regionName(region);
  const moods = parseMoods(sp.moods, sp.mood);
  const providerId = typeof sp.provider === 'string' && /^\d{1,6}$/.test(sp.provider) ? Number(sp.provider) : null;

  const [mood, trend, cinemas, soon, providers, gems] = await Promise.all([
    moods.length ? settle(moodFilms(moods, region), `${joinMoods(moods).toLowerCase()} films`) : null,
    settle(trending(), 'trending films'),
    settle(nowPlaying(region), 'cinema listings'),
    settle(upcoming(region), 'upcoming releases'),
    settle(regionProviders(region), 'streaming services'),
    settle(hiddenGems(), 'hidden gems'),
  ]);
  const topProviders = providers.ok ? providers.value.slice(0, 8) : [];
  const provider = providerId ? topProviders.find((p) => p.provider_id === providerId) ?? (providers.ok ? providers.value.find((p) => p.provider_id === providerId) : undefined) : undefined;
  const streaming = provider ? await settle(discover({ providers: [provider.provider_id], region }).then((r) => r.results), `films on ${provider.provider_name}`) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page observatory">
      <header className="page-head">
        <h1 className="type-display-lg">Discover</h1>
        <SearchField />
        <a className="viewmo-promo" href="/viewmo">
          <span className="viewmo-promo-icon" aria-hidden="true"><Icon name="globe" size={22} /></span>
          <span><span className="type-heading-md">ViewMo</span><span className="type-caption vm-muted">Spin a sphere of this week’s posters and pick one.</span></span>
          <Icon name="chevron-right" size={20} />
        </a>
        <a className="viewmo-promo" href="/explore">
          <span className="viewmo-promo-icon" aria-hidden="true"><Icon name="list-plus" size={22} /></span>
          <span><span className="type-heading-md">Explore collections</span><span className="type-caption vm-muted">Shelves of films put together by the community.</span></span>
          <Icon name="chevron-right" size={20} />
        </a>
      </header>

      <section aria-labelledby="mood-h" className="section mood-section">
        <div className="rail-head">
          <h2 id="mood-h" className="type-heading-lg">What are you in the mood for?</h2>
          <p className="type-caption vm-muted">Mix moods. Each one draws on the TMDB genres shown under it.</p>
        </div>
        <Suspense><MoodMixer moods={MOODS.map((m) => ({ id: m.id, label: m.label, genreNames: m.genreNames }))} max={MAX_MOODS} /></Suspense>
        <div className="mood-results">
          <h3 className="type-heading-md" aria-live="polite">{moods.length ? `${joinMoods(moods)} picks` : 'Trending this week'}</h3>
          <p className="type-caption vm-faint">{moods.length === 0 ? asOf('Trending on TMDB this week')
            : moods.length === 1 ? asOf(`Popular on TMDB in ${moods[0].genreNames.join(', ')}`)
            : asOf(`Popular on TMDB and tagged with a genre from each mood: ${moods.map((m) => `${m.label} (${m.genreNames.join(' or ')})`).join(', ')}`)}</p>
          {moods.length && mood && !mood.ok ? <Problem info={mood.problem} compact />
            : moods.length && mood?.ok && mood.value.all.length === 0 ? (
              <p className="type-body vm-muted">No popular film on TMDB is tagged for {moods.length === 2 ? 'both moods' : `all ${moods.length} moods`} right now.{mood.value.some.length ? ' Here are the closest matches.' : ''}</p>
            ) : (
              <ReflowGrid label={moods.length ? `${joinMoods(moods)} films` : 'Trending films'}
                films={((moods.length && mood?.ok ? mood.value.all : trend.ok ? trend.value : []).filter((m) => m.poster_path).slice(0, 8)).map((m) => toCard(m))} />
            )}
        </div>
        {moods.length > 1 && mood?.ok && mood.value.some.length ? (
          <FilmRail id="close" title="Close matches" caption={moods.length === 2 ? 'Fit one of your two moods' : `Fit some of your moods, not all ${moods.length}`}
            films={mood.value.some.map((x) => x.film).filter((m) => m.poster_path).slice(0, 20)}
            noteFor={(m) => { const fit = mood.value.some.find((x) => x.film.id === m.id)?.fits; return fit ? `Fits ${fit.map((f) => f.label).join(' + ')}` : undefined; }} />
        ) : null}
      </section>

      {/* With no mood chosen the grid above already is this week's trending list. */}
      {!trend.ok ? <Problem info={trend.problem} compact /> : moods.length ? <FilmRail id="trending" title="Trending now" caption={asOf('Trending on TMDB this week')} films={trend.value} /> : null}

      {cinemas.ok
        ? (cinemas.value.length ? <FilmRail id="cinemas" title="New in cinemas" caption={asOf(`Now playing in ${place}, from TMDB`)} films={cinemas.value} /> : null)
        : <Problem info={cinemas.problem} compact />}

      <section aria-labelledby="stream-h" className="section">
        <div className="rail-head">
          <h2 id="stream-h" className="type-heading-lg">Explore streaming</h2>
          <p className="type-caption vm-faint">{asOf(`Services in ${place}, from JustWatch via TMDB`)}</p>
        </div>
        {providers.ok ? (
          <Suspense><QueryChips param="provider" label="Streaming service" options={topProviders.map((p) => ({ id: String(p.provider_id), label: p.provider_name }))} /></Suspense>
        ) : <Problem info={providers.problem} compact />}
        {provider && streaming ? (
          streaming.ok
            ? (streaming.value.length
                ? <FilmRail id="stream" title={`On ${provider.provider_name}`} caption={asOf(`Subscription, free or with ads in ${place}, from JustWatch via TMDB`)} films={streaming.value} />
                : <p className="type-body vm-muted">TMDB lists no popular films on {provider.provider_name} in {place} right now.</p>)
            : <Problem info={streaming.problem} compact />
        ) : null}
      </section>

      {gems.ok ? <FilmRail id="gems" title="Hidden gems" caption={HIDDEN_GEMS_RULE} films={gems.value} /> : <Problem info={gems.problem} compact />}

      {soon.ok
        ? (soon.value.length
            ? <FilmRail id="soon" title="Coming soon" caption={asOf(`Upcoming in ${place}, from TMDB`)}
                films={soon.value.filter((m) => !m.release_date || m.release_date >= today)}
                noteFor={(m) => (m.release_date ? `Out ${dateLabel(m.release_date)}` : undefined)} />
            : null)
        : <Problem info={soon.problem} compact />}
    </div>
  );
}

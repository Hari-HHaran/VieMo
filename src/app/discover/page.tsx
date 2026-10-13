import type { Metadata } from 'next';
import { Suspense } from 'react';
import FilmRail from '@/components/FilmRail';
import Problem from '@/components/Problem';
import QueryChips from '@/components/QueryChips';
import SearchField from '@/components/SearchField';
import { dateLabel } from '@/lib/format';
import { MOODS, moodById } from '@/lib/moods';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, discover, HIDDEN_GEMS_RULE, hiddenGems, nowPlaying, regionProviders, trending, upcoming } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Discover' };

export default async function Discover({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const region = await viewerRegion();
  const place = regionName(region);
  const mood = moodById(typeof sp.mood === 'string' ? sp.mood : null);
  const providerId = typeof sp.provider === 'string' && /^\d{1,6}$/.test(sp.provider) ? Number(sp.provider) : null;

  const [moodFilms, trend, cinemas, soon, providers, gems] = await Promise.all([
    mood ? settle(discover({ genresAny: mood.genres, region }).then((r) => r.results), `${mood.label.toLowerCase()} films`) : null,
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
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Discover</h1>
        <SearchField />
      </header>

      <section aria-labelledby="mood-h" className="section">
        <h2 id="mood-h" className="type-heading-lg">What are you in the mood for?</h2>
        <Suspense><QueryChips param="mood" label="Mood" options={MOODS.map((m) => ({ id: m.id, label: m.label }))} /></Suspense>
        {mood && moodFilms ? (
          moodFilms.ok
            ? <FilmRail id="mood" title={`${mood.label} picks`} caption={asOf(`Popular on TMDB in ${mood.genreNames.join(', ')}`)} films={moodFilms.value} />
            : <Problem info={moodFilms.problem} compact />
        ) : null}
      </section>

      {trend.ok ? <FilmRail id="trending" title="Trending now" caption={asOf('Trending on TMDB this week')} films={trend.value} /> : <Problem info={trend.problem} compact />}

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

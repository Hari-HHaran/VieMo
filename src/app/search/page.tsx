import type { Metadata } from 'next';
import { EmptyState } from '@/ds/client';
import { FilmGrid } from '@/components/FilmRail';
import Problem from '@/components/Problem';
import SearchField from '@/components/SearchField';
import { plural } from '@/lib/format';
import { settle } from '@/lib/settle';
import { dataSource, searchMovies } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Search' };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (typeof sp.q === 'string' ? sp.q : '').trim().slice(0, 100);
  const res = q ? await settle(searchMovies(q), 'search results') : null;
  const source = dataSource();
  const scope = source.mode === 'snapshot' ? `Searching the ${source.filmCount.toLocaleString('en')} films in the saved TMDB snapshot.` : null;
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Search</h1>
        <SearchField defaultValue={q} />
        {scope ? <p className="type-caption vm-faint">{scope}</p> : null}
      </header>
      {!q ? (
        <EmptyState compact icon="search" title="Search for a film" body="Type a title, then press Search." />
      ) : !res!.ok ? (
        <Problem info={res!.problem} />
      ) : res!.value.results.length === 0 ? (
        <EmptyState compact icon="search" title={`No films match “${q}”`} body={scope ? 'The saved snapshot may not include it. Check the spelling, or try the original title.' : 'Check the spelling, or try the original title.'} />
      ) : (
        <section aria-labelledby="results-h" className="section">
          <h2 id="results-h" className="type-heading-lg" aria-live="polite">{plural(res!.value.total_results, 'film', 'films')} for “{q}”</h2>
          <FilmGrid films={res!.value.results} label={`Results for ${q}`} />
        </section>
      )}
    </div>
  );
}

import { EmptyState, Icon, Poster } from '@/ds/client';
import FilmRail from '@/components/FilmRail';
import Problem from '@/components/Problem';
import SaveToggle from '@/components/SaveToggle';
import Ticker from '@/components/Ticker';
import { settle } from '@/lib/settle';
import { asOf, genres, posterSet, trending, yearOf, type MovieSummary } from '@/lib/tmdb';

/* Rendered per request; TMDB responses themselves are cached (see lib/tmdb.ts). */
export const dynamic = 'force-dynamic';

const today = () => new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Singapore' });

/* Home is the Festival Lobby: a masthead, a ticker of what's trending, and this week's programme set like an
   editorial page, with the social circle beside it. */
export default async function Home() {
  const [trend, genreList] = await Promise.all([settle(trending(), 'trending films'), settle(genres(), 'genres')]);
  const names = new Map((genreList.ok ? genreList.value : []).map((g) => [g.id, g.name]));
  const genreLine = (m: MovieSummary) => (m.genre_ids ?? []).map((g) => names.get(g)).filter(Boolean).slice(0, 2).join(', ');
  const films = trend.ok ? trend.value.filter((m) => m.poster_path) : [];
  const [lead, ...rest] = films;
  const programme = rest.slice(0, 6);

  return (
    <div className="page lobby">
      <header className="lobby-mast">
        <div>
          <p className="type-caption vm-muted">{today()}</p>
          <h1 className="lobby-title">Tonight at VieMo</h1>
        </div>
        <a className="vm-btn vm-btn-primary vm-btn-md type-label lobby-night" href="/match"><Icon name="users" size={18} />Plan a movie night</a>
      </header>

      {films.length ? <Ticker label={asOf('Trending on TMDB this week')} items={films.slice(0, 20).map((m) => ({ id: m.id, title: m.title, year: yearOf(m) }))} /> : null}

      {!trend.ok ? <Problem info={trend.problem} /> : lead ? (
        <section className="programme" aria-labelledby="prog-h">
          <div className="programme-head">
            <h2 id="prog-h" className="type-heading-lg">This week’s programme</h2>
            <p className="type-caption vm-faint">{asOf('The most-watched films on TMDB this week')}</p>
          </div>
          <article className="lobby-card lobby-lead" style={{ ['--i' as string]: 0 }}>
            <Poster {...posterSet(lead.poster_path, 'w342')} sizes="(min-width: 768px) 240px, 46vw" title={lead.title} year={yearOf(lead)} size="lg" eager />
            <div className="lobby-lead-text">
              <p className="type-caption vm-muted">{[yearOf(lead), genreLine(lead)].filter(Boolean).join(' / ')}</p>
              <h3 className="lobby-lead-title"><a href={`/film/${lead.id}`}>{lead.title}</a></h3>
              {lead.overview ? <p className="type-body lobby-lead-overview">{lead.overview}</p> : null}
              <div className="lobby-actions">
                <a className="vm-btn vm-btn-primary vm-btn-md type-label" href={`/film/${lead.id}`}>See the film</a>
                <SaveToggle film={{ id: lead.id, title: lead.title, year: yearOf(lead), posterPath: lead.poster_path }} label="text" />
              </div>
            </div>
          </article>
          <ol className="programme-grid" role="list">
            {programme.map((m, i) => (
              <li key={m.id} className={`lobby-card lobby-item${i % 3 === 0 ? ' is-tall' : ''}`} style={{ ['--i' as string]: i + 1 }}>
                <Poster {...posterSet(m.poster_path)} sizes="(min-width: 768px) 160px, 30vw" title={m.title} year={yearOf(m)} size="md" />
                <div className="lobby-item-text">
                  <h3 className="type-heading-md"><a href={`/film/${m.id}`}>{m.title}</a></h3>
                  <p className="type-caption vm-muted">{[yearOf(m), genreLine(m)].filter(Boolean).join(' / ')}</p>
                  {i % 3 === 0 && m.overview ? <p className="type-caption lobby-item-overview">{m.overview}</p> : null}
                </div>
                <SaveToggle film={{ id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path }} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="lobby-side">
        <section aria-labelledby="circle-h" className="section circle">
          <h2 id="circle-h" className="type-heading-lg">Now showing in your circle</h2>
          <EmptyState compact icon="users" title="Your circle starts with accounts"
            body="When sign-in arrives, ratings, reviews and collections from people you follow appear here. Nothing here is invented in the meantime."
            action={{ label: 'Browse films', icon: 'compass', href: '/discover' }} />
        </section>
        <a className="viewmo-promo" href="/viewmo">
          <span className="viewmo-promo-icon" aria-hidden="true"><Icon name="globe" size={22} /></span>
          <span><span className="type-heading-md">ViewMo</span><span className="type-caption vm-muted">Spin a sphere of this week’s posters and pick one.</span></span>
          <Icon name="chevron-right" size={20} />
        </a>
      </div>

      {rest.length > 6 ? <FilmRail id="more" title="More this week" caption={asOf('Trending on TMDB this week')} films={rest.slice(6, 26)} /> : null}
    </div>
  );
}

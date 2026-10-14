import { EmptyState, Icon } from '@/ds/client';
import FilmRail from '@/components/FilmRail';
import Problem from '@/components/Problem';
import { settle } from '@/lib/settle';
import { asOf, trending } from '@/lib/tmdb';

/* Rendered per request; TMDB responses themselves are cached (see lib/tmdb.ts). */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const trend = await settle(trending(), 'trending films');
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Home</h1>
        <p className="type-body vm-muted">What the people you follow are watching.</p>
        <a className="viewmo-promo" href="/viewmo">
          <span className="viewmo-promo-icon" aria-hidden="true"><Icon name="globe" size={22} /></span>
          <span><span className="type-heading-md">ViewMo</span><span className="type-caption vm-muted">Spin a sphere of this week’s posters and pick one.</span></span>
          <Icon name="chevron-right" size={20} />
        </a>
      </header>

      <section aria-labelledby="friends-h" className="section">
        <h2 id="friends-h" className="type-heading-lg">Friends’ activity</h2>
        <EmptyState
          compact
          icon="users"
          title="No friends’ activity yet"
          body="Ratings, reviews and collections from people you follow will appear here once accounts and following are switched on. Until then, your watchlist and settings are saved on this device."
          action={{ label: 'Browse films', icon: 'compass', href: '/discover' }}
        />
      </section>

      {trend.ok ? (
        <FilmRail id="trending" title="Trending this week" caption={asOf('Trending on TMDB this week')} films={trend.value.slice(0, 20)} />
      ) : (
        <Problem info={trend.problem} compact />
      )}
    </div>
  );
}

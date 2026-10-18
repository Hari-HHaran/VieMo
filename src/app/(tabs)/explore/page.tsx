import type { Metadata } from 'next';
import { EmptyState, Icon } from '@/ds/client';
import MemberCard from '@/components/community/MemberCard';
import PlaylistCard from '@/components/community/PlaylistCard';
import { AccountsOff } from '@/components/account/AuthPage';
import { communityMembers, exploreCollections } from '@/lib/community';
import { accountsConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Explore collections' };

/* The Record Store: public collections made by VieMo members, shelved like records. Only public collections ever
   appear here (the database won't return unlisted or private ones). */
export default async function Explore({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const query = typeof q.q === 'string' ? q.q.trim().slice(0, 80) : '';
  const sort = q.sort === 'popular' ? 'popular' : 'recent';
  if (!accountsConfigured()) return <div className="page"><AccountsOff /></div>;
  const [cols, members] = await Promise.all([exploreCollections({ q: query, sort, limit: 36 }), query ? null : communityMembers(16)]);
  const list = cols.ok ? cols.value : [];
  const people = members?.ok ? members.value : [];
  const demo = list.some((c) => c.is_demo) || people.some((m) => m.is_demo);
  return (
    <div className="page explore">
      <header className="explore-head">
        <p className="type-eyebrow explore-eyebrow">The Record Store</p>
        <h1 className="explore-title">Collections from the community</h1>
        <p className="type-body-lg vm-muted">Shelves of films people have put together. Open one to see every film, save it, or spin it on WheelMo.</p>
        <form className="explore-search" role="search" action="/explore">
          <label htmlFor="ex-q" className="vm-sr">Search collections</label>
          <Icon name="search" size={18} />
          <input id="ex-q" name="q" type="search" defaultValue={query} placeholder="Search by title, tag or description" maxLength={80} className="search-input type-body" />
          {sort === 'popular' ? <input type="hidden" name="sort" value="popular" /> : null}
        </form>
        <nav aria-label="Sort collections" className="explore-sort">
          <a href={`/explore${query ? `?q=${encodeURIComponent(query)}` : ''}`} aria-current={sort === 'recent' ? 'true' : undefined} className="explore-chip type-label">Newest</a>
          <a href={`/explore?sort=popular${query ? `&q=${encodeURIComponent(query)}` : ''}`} aria-current={sort === 'popular' ? 'true' : undefined} className="explore-chip type-label">Most saved</a>
        </nav>
      </header>

      {demo ? (
        <p className="explore-demo type-body" role="note">
          <strong>Demo community.</strong> Profiles marked <span className="demo-badge is-compact">Demo</span> are fictional accounts for testing. Their collections, ratings and reviews are not real people’s activity.
        </p>
      ) : null}

      {!cols.ok ? <EmptyState icon="triangle-alert" title="Collections didn’t load" body="The account service didn’t answer. Try again in a moment." /> : null}

      {people.length ? (
        <section aria-labelledby="ex-people" className="explore-section">
          <h2 id="ex-people" className="type-heading-lg">People to follow</h2>
          <ul role="list" className="member-rail">{people.map((m) => <li key={m.id}><MemberCard m={m} /></li>)}</ul>
        </section>
      ) : null}

      <section aria-labelledby="ex-cols" className="explore-section">
        <h2 id="ex-cols" className="type-heading-lg">{query ? `Collections matching “${query}”` : sort === 'popular' ? 'Most saved' : 'Newest collections'}</h2>
        {cols.ok && !list.length ? (
          <EmptyState icon="list-plus" title={query ? 'No public collections match' : 'No public collections yet'}
            body={query ? 'Try another word, or clear the search.' : 'When members make a collection public, it shows here. Yours start private; you choose what to share.'}
            action={{ label: 'Make a collection', icon: 'plus', href: '/profile?tab=library' }} />
        ) : (
          <ul role="list" className="pl-grid">{list.map((c, i) => <li key={c.id}><PlaylistCard c={c} priority={i < 6} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}

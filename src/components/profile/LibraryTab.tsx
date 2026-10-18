import { AccountsOff } from '@/components/account/AuthPage';
import AccountWatchlist, { type WatchRow } from '@/components/community/AccountWatchlist';
import ImportWatchlist from '@/components/community/ImportWatchlist';
import LibraryCollections, { type OwnCollection } from '@/components/community/LibraryCollections';
import PlaylistCard from '@/components/community/PlaylistCard';
import { Button } from '@/ds/client';
import { collectionsByIds, type CollectionCard } from '@/lib/community';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

/* My Cinema Library, as Profile's Library tab: everything kept in your account. Collections you made (and who can
   see each), collections you saved, and your account watchlist. */
export default async function LibraryTab() {
  if (!accountsConfigured()) return <AccountsOff />;
  const { sb, user } = await currentUser();
  if (!sb || !user) {
    return (
      <div className="lib-signin">
        <p className="type-body">Your library keeps collections, saved collections and your watchlist in your account, on every device.</p>
        <div className="nr-row">
          <Button href="/sign-in?next=/profile%3Ftab%3Dlibrary" variant="primary">Sign in</Button>
          <Button href="/sign-up?next=/profile%3Ftab%3Dlibrary" variant="secondary">Create an account</Button>
        </div>
      </div>
    );
  }
  const [own, saves, watch, profile] = await Promise.all([
    sb.from('movie_collections').select('id, share_id, title, visibility, collection_items(count), collection_saves(count)').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    sb.from('collection_saves').select('collection_id, saved_at').eq('user_id', user.id).order('saved_at', { ascending: false }),
    sb.from('watchlist_items').select('tmdb_id, added_at, films(title, year, poster_path)').eq('user_id', user.id).order('added_at', { ascending: false }),
    sb.from('profiles').select('username, watchlist_visibility').eq('id', user.id).maybeSingle(),
  ]);
  const collections: OwnCollection[] = ((own.data ?? []) as unknown as { id: string; share_id: string; title: string; visibility: OwnCollection['visibility']; collection_items: { count: number }[]; collection_saves: { count: number }[] }[])
    .map((c) => ({ id: c.id, share_id: c.share_id, title: c.title, visibility: c.visibility, film_count: c.collection_items?.[0]?.count ?? 0, saves: c.collection_saves?.[0]?.count ?? 0 }));
  const savedCards: CollectionCard[] = await collectionsByIds((saves.data ?? []).map((s) => s.collection_id as string));
  const watchRows: WatchRow[] = ((watch.data ?? []) as unknown as { tmdb_id: number; films: { title: string; year: number | null; poster_path: string | null } | null }[])
    .map((w) => ({ tmdb_id: w.tmdb_id, title: w.films?.title ?? 'Film', year: w.films?.year ?? null, poster_path: w.films?.poster_path ?? null }));

  return (
    <div className="library">
      <p className="type-body vm-muted">Kept in your account, on every device. {profile.data ? <a href={`/u/${profile.data.username}`}>See your profile as others do</a> : null}</p>
      <section aria-labelledby="lib-cols" className="section">
        <h2 id="lib-cols" className="type-heading-lg">Your collections</h2>
        <p className="type-caption vm-muted">Each collection is private until you choose otherwise. Change who can see one at any time.</p>
        <LibraryCollections collections={collections} />
      </section>
      <section aria-labelledby="lib-saved" className="section">
        <h2 id="lib-saved" className="type-heading-lg">Saved collections</h2>
        {savedCards.length ? <ul role="list" className="pl-grid">{savedCards.map((c) => <li key={c.id}><PlaylistCard c={c} /></li>)}</ul>
          : <p className="type-body vm-muted">Collections you save from <a href="/explore">Explore</a> appear here. Saving never lets you edit someone else’s collection; copy it to make your own.</p>}
      </section>
      <section aria-labelledby="lib-watch" className="section">
        <h2 id="lib-watch" className="type-heading-lg">Watchlist in your account</h2>
        <p className="type-caption vm-muted">{profile.data?.watchlist_visibility === 'public' ? 'Anyone can see it on your profile.' : 'Only you can see it.'} <a href="/account">Change this</a></p>
        <ImportWatchlist inAccount={watchRows.map((w) => w.tmdb_id)} />
        <AccountWatchlist key={watchRows.map((w) => w.tmdb_id).join(",")} rows={watchRows} />
      </section>
    </div>
  );
}

import { EmptyState, Poster, Rating } from '@/ds/client';
import { exploreCollections, profileReviews } from '@/lib/community';
import { supabaseServer } from '@/lib/supabase/server';
import PlaylistCard from './PlaylistCard';
import ReviewText from './ReviewText';

const IMG = 'https://image.tmdb.org/t/p';

/* Public collections only: private and unlisted ones never show on a profile, even to friends. */
export async function MemberCollections({ owner, name, isOwn }: { owner: string; name: string; isOwn: boolean }) {
  const r = await exploreCollections({ owner, limit: 60 });
  if (!r.ok) return <EmptyState icon="triangle-alert" title="Collections didn’t load" body="Try again in a moment." />;
  if (!r.value.length) return <EmptyState icon="list-plus" title={isOwn ? 'You have no public collections' : `${name} has no public collections`}
    body={isOwn ? 'Your collections start private. Make one public in your library to show it here.' : 'Only public collections appear on profiles.'}
    action={isOwn ? { label: 'Open your library', icon: 'bookmark', href: '/library' } : undefined} />;
  return <ul role="list" className="pl-grid">{r.value.map((c) => <li key={c.id}><PlaylistCard c={c} /></li>)}</ul>;
}

export async function MemberWatchlist({ owner, name, isOwn, visibility }: { owner: string; name: string; isOwn: boolean; visibility: string }) {
  if (!isOwn && visibility !== 'public') return <EmptyState icon="lock" title={`${name} keeps their watchlist private`} body="Only they can see it." />;
  const sb = await supabaseServer();
  const { data, error } = sb ? await sb.from('watchlist_items').select('tmdb_id, added_at, films(title, year, poster_path)').eq('user_id', owner).order('added_at', { ascending: false }).limit(100) : { data: null, error: true };
  if (error || !data) return <EmptyState icon="triangle-alert" title="The watchlist didn’t load" body="Try again in a moment." />;
  const rows = data as unknown as { tmdb_id: number; films: { title: string; year: number | null; poster_path: string | null } | null }[];
  if (!rows.length) return <EmptyState icon="bookmark" title={isOwn ? 'Your account watchlist is empty' : `${name}’s watchlist is empty`} body={isOwn ? 'Films you save on this device can be moved into your account from your library.' : ''} action={isOwn ? { label: 'Open your library', icon: 'bookmark', href: '/library' } : undefined} />;
  return (
    <>
      {isOwn ? <p className="type-caption vm-muted">{visibility === 'public' ? 'Anyone can see your watchlist.' : 'Only you can see your watchlist.'} Change it on your account page.</p> : null}
      <ul role="list" className="member-posters">
        {rows.map((w) => (
          <li key={w.tmdb_id}><a href={`/film/${w.tmdb_id}`} className="member-poster" data-film-card>
            <span data-poster><Poster src={w.films?.poster_path ? `${IMG}/w185${w.films.poster_path}` : null} title={w.films?.title ?? 'Film'} year={w.films?.year ?? undefined} size="fill" /></span>
            <span className="type-caption">{w.films?.title}</span>
          </a></li>
        ))}
      </ul>
    </>
  );
}

export async function MemberReviews({ owner, name, isOwn }: { owner: string; name: string; isOwn: boolean }) {
  const r = await profileReviews(owner);
  if (!r.ok) return <EmptyState icon="triangle-alert" title="Reviews didn’t load" body="Try again in a moment." />;
  if (!r.value.length) return <EmptyState icon="message-circle" title={isOwn ? 'No reviews in your account yet' : `No reviews from ${name} you can see`} body={isOwn ? '' : 'People choose whether each review is private, for friends, or public.'} />;
  return (
    <ul role="list" className="member-reviews">
      {r.value.map((v) => (
        <li key={v.entry_id} className="member-review">
          <a href={`/film/${v.tmdb_id}`} className="member-review-poster" tabIndex={-1} aria-hidden="true"><Poster src={v.poster_path ? `${IMG}/w92${v.poster_path}` : null} title={v.title} year={v.year ?? undefined} size="fill" /></a>
          <div className="member-review-body">
            <h3 className="type-label"><a href={`/film/${v.tmdb_id}`}>{v.title}</a>{v.year ? <span className="vm-muted"> ({v.year})</span> : null}</h3>
            {v.rating != null ? <Rating value={Number(v.rating)} source={isOwn ? 'yours' : 'friend'} /> : null}
            <ReviewText text={v.review} spoiler={v.spoiler} />
            <p className="type-caption vm-muted">Watched {new Date(`${v.watched_on}T12:00:00Z`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{isOwn && v.review_visibility !== 'public' ? ` · ${v.review_visibility === 'friends' ? 'Friends only' : 'Only you'}` : ''}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

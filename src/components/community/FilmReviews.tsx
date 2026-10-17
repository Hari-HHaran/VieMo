import { Avatar, Rating } from '@/ds/client';
import { filmReviews } from '@/lib/community';
import { accountsConfigured } from '@/lib/supabase/env';
import DemoBadge from './DemoBadge';
import ReviewText from './ReviewText';

/* Reviews from VieMo members that the viewer may read (public ones, and friends-only ones from friends). */
export default async function FilmReviews({ tmdbId, title }: { tmdbId: number; title: string }) {
  if (!accountsConfigured()) return null;
  const r = await filmReviews(tmdbId);
  if (!r.ok) return null;
  const demo = r.value.some((v) => v.is_demo);
  return (
    <section aria-labelledby="rev-h" className="section film-reviews">
      <h2 id="rev-h" className="type-heading-lg">Reviews from VieMo members</h2>
      {demo ? <p className="type-caption vm-muted">Reviews marked Demo come from fictional test accounts, not real people.</p> : null}
      {r.value.length ? (
        <ul role="list" className="member-reviews">
          {r.value.map((v) => {
            const name = v.display_name || `@${v.username}`;
            return (
              <li key={v.entry_id} className="member-review is-person">
                <a href={`/u/${v.username}?tab=reviews`} className="member-review-avatar" aria-hidden="true" tabIndex={-1}><Avatar name={name} src={v.avatar_url ?? undefined} size="md" /></a>
                <div className="member-review-body">
                  <p className="type-label"><a href={`/u/${v.username}?tab=reviews`}>{name}</a> {v.is_demo ? <DemoBadge compact /> : null}</p>
                  {v.rating != null ? <Rating value={Number(v.rating)} source="friend" /> : null}
                  <ReviewText text={v.review} spoiler={v.spoiler} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="type-body vm-muted">No member reviews of {title} you can see yet.</p>}
    </section>
  );
}

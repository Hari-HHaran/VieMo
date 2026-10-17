import 'server-only';
import { supabaseServer } from './supabase/server';

/* Demo accounts show, labelled, unless the site owner hides them with DEMO_COMMUNITY=hide. */
export const includeDemo = () => (process.env.DEMO_COMMUNITY ?? '').trim().toLowerCase() !== 'hide';

export interface Cover { tmdb_id: number; title: string; poster_path: string | null }
export interface CollectionCard {
  id: string; share_id: string; title: string; description: string | null; tags: string[]; owner_id: string; username: string;
  display_name: string | null; avatar_url: string | null; is_demo: boolean; film_count: number; covers: Cover[]; saves: number;
  saved_by_me: boolean; published_at: string | null;
}
export interface Member { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null; is_demo: boolean; public_collections: number; followers: number; i_follow: boolean; follows_me: boolean }
export interface Review { entry_id: string; author_id: string; username: string; display_name: string | null; avatar_url: string | null; is_demo: boolean; rating: number | null; review: string; spoiler: boolean; watched_on: string; created_at: string }
export interface ProfileReview { entry_id: string; tmdb_id: number; title: string; year: number | null; poster_path: string | null; rating: number | null; review: string; spoiler: boolean; review_visibility: string; watched_on: string }
export interface CollectionPage {
  id: string; share_id: string; title: string; description: string | null; tags: string[]; visibility: 'private' | 'unlisted' | 'public'; updated_at: string;
  role: 'owner' | 'editor' | 'viewer' | null; saves: number | null; saved_by_me: boolean;
  owner: { id: string; username: string; display_name: string | null; avatar_url: string | null; is_demo: boolean };
  films: { tmdb_id: number; title: string; year: number | null; poster_path: string | null; genres: string[]; runtime: number | null; note: string | null }[];
}

type Result<T> = { ok: true; value: T } | { ok: false; why: 'offline' | 'error' };
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Result<T>> {
  const sb = await supabaseServer();
  if (!sb) return { ok: false, why: 'offline' };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false, why: 'error' };
  return { ok: true, value: data as T };
}

export const exploreCollections = (o: { q?: string; sort?: 'recent' | 'popular'; offset?: number; owner?: string; limit?: number } = {}) =>
  rpc<CollectionCard[]>('explore_collections', { p_q: o.q || null, p_sort: o.sort ?? 'recent', p_limit: o.limit ?? 24, p_offset: o.offset ?? 0, p_include_demo: includeDemo(), p_owner: o.owner ?? null });
export const communityMembers = (limit = 24) => rpc<Member[]>('community_members', { p_limit: limit, p_offset: 0, p_include_demo: includeDemo() });
export const filmReviews = (tmdbId: number) => rpc<Review[]>('film_reviews', { p_tmdb: tmdbId, p_limit: 20, p_include_demo: includeDemo() });
export const profileReviews = (owner: string) => rpc<ProfileReview[]>('profile_reviews', { p_owner: owner, p_limit: 30 });
export const collectionPage = (share: string) => rpc<CollectionPage | null>('collection_page', { p_share: share });

/* Collections the viewer saved, as cards. Row level security only returns ones they can still see. */
export async function collectionsByIds(ids: string[]): Promise<CollectionCard[]> {
  const sb = await supabaseServer();
  if (!sb || !ids.length) return [];
  const { data } = await sb.from('movie_collections')
    .select('id, share_id, title, description, tags, published_at, owner_id, profiles!movie_collections_owner_id_fkey(username, display_name, avatar_url, is_demo), collection_items(tmdb_id, position, films(title, poster_path)), collection_saves(count)')
    .in('id', ids.slice(0, 100));
  type Row = { id: string; share_id: string; title: string; description: string | null; tags: string[]; published_at: string | null; owner_id: string;
    profiles: { username: string; display_name: string | null; avatar_url: string | null; is_demo: boolean } | null;
    collection_items: { tmdb_id: number; position: number; films: { title: string; poster_path: string | null } | null }[]; collection_saves: { count: number }[] };
  return ((data ?? []) as unknown as Row[]).map((c) => {
    const items = [...(c.collection_items ?? [])].sort((a, b) => a.position - b.position);
    return {
      id: c.id, share_id: c.share_id, title: c.title, description: c.description, tags: c.tags, owner_id: c.owner_id,
      username: c.profiles?.username ?? '', display_name: c.profiles?.display_name ?? null, avatar_url: c.profiles?.avatar_url ?? null, is_demo: !!c.profiles?.is_demo,
      film_count: items.length, covers: items.slice(0, 4).map((i) => ({ tmdb_id: i.tmdb_id, title: i.films?.title ?? '', poster_path: i.films?.poster_path ?? null })),
      saves: c.collection_saves?.[0]?.count ?? 0, saved_by_me: true, published_at: c.published_at,
    };
  }).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

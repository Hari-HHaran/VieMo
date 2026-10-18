import { NextResponse, type NextRequest } from 'next/server';
import { collectionPage } from '@/lib/community';
import { currentUser } from '@/lib/supabase/server';
import type { WheelFilm } from '@/lib/wheel';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/* What a person can put on the wheel: their account watchlist and the collections they made or saved. With
   ?share=…, one collection's films (any collection the viewer can open). */
export async function GET(req: NextRequest) {
  const share = req.nextUrl.searchParams.get('share');
  if (share) {
    if (!/^[a-z0-9]{16}$/.test(share)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
    const r = await collectionPage(share);
    if (!r.ok || !r.value) return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
    const c = r.value;
    return NextResponse.json({ collection: { share_id: c.share_id, title: c.title, owner: c.owner.display_name || `@${c.owner.username}`, is_demo: c.owner.is_demo,
      films: c.films.map((f): WheelFilm => ({ tmdb_id: f.tmdb_id, title: f.title, year: f.year, poster_path: f.poster_path })) } }, { headers });
  }
  const { sb, user } = await currentUser();
  if (!sb || !user) return NextResponse.json({ signedIn: false, watchlist: [], collections: [] }, { headers });
  const [w, own, saved] = await Promise.all([
    sb.from('watchlist_items').select('tmdb_id, films(title, year, poster_path)').eq('user_id', user.id).order('added_at', { ascending: false }).limit(200),
    sb.from('movie_collections').select('share_id, title, collection_items(count)').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(50),
    sb.from('collection_saves').select('movie_collections(share_id, title, collection_items(count))').eq('user_id', user.id).limit(50),
  ]);
  type C = { share_id: string; title: string; collection_items: { count: number }[] };
  const watchlist = ((w.data ?? []) as unknown as { tmdb_id: number; films: { title: string; year: number | null; poster_path: string | null } | null }[])
    .filter((x) => x.films).map((x): WheelFilm => ({ tmdb_id: x.tmdb_id, title: x.films!.title, year: x.films!.year, poster_path: x.films!.poster_path }));
  const collections = [
    ...((own.data ?? []) as unknown as C[]).map((c) => ({ share_id: c.share_id, title: c.title, count: c.collection_items?.[0]?.count ?? 0, mine: true })),
    ...((saved.data ?? []) as unknown as { movie_collections: C | null }[]).filter((s) => s.movie_collections)
      .map((s) => ({ share_id: s.movie_collections!.share_id, title: s.movie_collections!.title, count: s.movie_collections!.collection_items?.[0]?.count ?? 0, mine: false })),
  ];
  return NextResponse.json({ signedIn: true, watchlist, collections }, { headers });
}

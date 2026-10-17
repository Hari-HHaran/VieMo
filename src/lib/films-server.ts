import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { movieBasics, yearOf } from './tmdb';

/* The films table only ever holds real TMDB films, written by the server. Before someone adds a film to a
   collection or watchlist, its row is fetched from TMDB and stored. Returns the ids that are now present. */
export async function ensureFilms(ids: number[]): Promise<number[]> {
  const want = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!want.length) return [];
  const admin = supabaseAdmin();
  if (!admin) return [];
  const { data: have } = await admin.from('films').select('tmdb_id').in('tmdb_id', want);
  const present = new Set((have ?? []).map((r) => r.tmdb_id as number));
  const missing = want.filter((id) => !present.has(id));
  for (let i = 0; i < missing.length; i += 5) {
    const rows = (await Promise.all(missing.slice(i, i + 5).map(async (id) => {
      const m = await movieBasics(id).catch(() => null);
      if (!m || !m.title) return null;
      return {
        tmdb_id: m.id, title: m.title.slice(0, 300), year: yearOf(m) ?? null,
        poster_path: m.poster_path && /^\/[A-Za-z0-9._-]+$/.test(m.poster_path) ? m.poster_path : null,
        genres: (m.genres ?? []).map((g) => g.name).slice(0, 12), runtime: m.runtime && m.runtime > 0 ? m.runtime : null,
      };
    }))).filter((r): r is NonNullable<typeof r> => !!r);
    if (rows.length) {
      const { error } = await admin.from('films').upsert(rows, { onConflict: 'tmdb_id' });
      if (!error) rows.forEach((r) => present.add(r.tmdb_id));
    }
  }
  return want.filter((id) => present.has(id));
}

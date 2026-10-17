/* The demo community fixture and the fixes applied to it before import. Every change is listed in the importer's
   report; nothing is changed silently. All people, ratings and reviews here are fictional demo data. */
import raw from '../../../data/demo/viemo_demo_community_seed.json';

export interface FilmRef { title: string; release_year: number }
export interface Watched extends FilmRef { watched_on: string; rating: number | null; review: string | null; review_visibility: 'public' | 'private' | 'friends' }
export interface Collection { seed_key: string; title: string; description: string; visibility: 'public' | 'private' | 'unlisted'; movies: FilmRef[] }
export interface Account {
  seed_key: string; demo_email: string; username: string; display_name: string; bio: string;
  watched: Watched[]; watchlist: FilmRef[]; collections: Collection[]; watchlist_visibility: 'public' | 'private';
}
export interface Fixture { accounts: Account[]; follows: { follower: string; following: string }[] }

export const filmKey = (f: FilmRef) => `${f.title} (${f.release_year})`;

/* 1. No film was watched by two people, so nobody could see ratings differ. Twelve cross-watches, each rated
      differently from the original viewer, using films already in the fixture. */
const CROSS_WATCHES: [string, FilmRef, string, number, string | null][] = [
  ['cosmicframes', { title: 'Parasite', release_year: 2019 }, '2026-10-05', 3.5, 'Gripping, though the final act was harder to watch than I expected.'],
  ['cosmicframes', { title: 'Spirited Away', release_year: 2001 }, '2026-09-27', 5, 'Pure wonder. I want to step inside every frame.'],
  ['plotdetective', { title: 'Get Out', release_year: 2017 }, '2026-10-09', 3.5, 'Smart and tense; I spotted a couple of the turns early.'],
  ['plotdetective', { title: 'Inception', release_year: 2010 }, '2026-09-20', 4, null],
  ['comfortcinema', { title: 'Amélie', release_year: 2001 }, '2026-10-11', 5, 'Warm, playful and kind. My new comfort film.'],
  ['comfortcinema', { title: 'Coco', release_year: 2017 }, '2026-09-30', 3.5, null],
  ['framebyframe', { title: 'Parasite', release_year: 2019 }, '2026-10-07', 5, 'Every shot is doing something. I could watch it again tomorrow.'],
  ['framebyframe', { title: 'Casablanca', release_year: 1942 }, '2026-09-24', 3, 'I respect it more than I love it.'],
  ['adrenalinecut', { title: 'Knives Out', release_year: 2019 }, '2026-10-03', 3, null],
  ['adrenalinecut', { title: 'The Hangover', release_year: 2009 }, '2026-09-18', 2.5, 'A few big laughs, but it wore thin for me.'],
  ['midnighthorror', { title: 'Se7en', release_year: 1995 }, '2026-10-12', 4.5, 'Bleak in the best way. The atmosphere never lets up.'],
  ['midnighthorror', { title: 'Psycho', release_year: 1960 }, '2026-09-29', 5, null],
];

/* 3. Reviews whose words contradicted their own rating, rewritten to agree with it. */
const REWRITES: Record<string, string> = {
  'cosmicframes|Inception': 'Every rewatch shows me another layer. One of my all-time favourites.',
  'comfortcinema|Little Women': 'Lovely to look at, but it didn’t hold my attention the way I hoped.',
  'framebyframe|Lady Bird': 'I admired the performances more than I connected with the story.',
  'animationclub|Spider-Man: Into the Spider-Verse': 'Striking to look at, though the pace was a bit much for me.',
  'animationclub|Toy Story': 'I can see why people love it; it just didn’t land for me this time.',
  'classicreels|Singin\' in the Rain': 'Pure joy from start to finish. I was smiling the whole way through.',
};

/* 4. No follow went both ways, so "friends only" couldn't be shown. Six of them now do. */
const MUTUALS: [string, string][] = [
  ['plotdetective', 'cosmicframes'], ['comfortcinema', 'plotdetective'], ['framebyframe', 'comfortcinema'],
  ['adrenalinecut', 'framebyframe'], ['midnighthorror', 'adrenalinecut'], ['animationclub', 'midnighthorror'],
];

export function fixedFixture(): { fixture: Fixture; changes: string[] } {
  const fixture = structuredClone(raw) as unknown as Fixture;
  const changes: string[] = [];
  const by = new Map(fixture.accounts.map((a) => [a.username, a]));
  const known = new Map<string, FilmRef>();
  for (const a of fixture.accounts) for (const f of [...a.watched, ...a.watchlist, ...a.collections.flatMap((c) => c.movies)]) known.set(filmKey(f), f);

  for (const [u, film, on, rating, review] of CROSS_WATCHES) {
    const a = by.get(u);
    if (!a || !known.has(filmKey(film)) || a.watched.some((w) => filmKey(w) === filmKey(film))) continue;
    a.watched.push({ ...film, watched_on: on, rating, review, review_visibility: 'public' });
    changes.push(`Added a watch of ${filmKey(film)} by ${u} (${rating}★)${review ? ' with a review' : ''}, so ratings differ between people.`);
  }
  for (const a of fixture.accounts) {
    const seen = new Set(a.watched.map(filmKey));
    const before = a.watchlist.length;
    const dropped = a.watchlist.filter((f) => seen.has(filmKey(f))).map(filmKey);
    a.watchlist = a.watchlist.filter((f) => !seen.has(filmKey(f)));
    if (a.watchlist.length !== before) changes.push(`Removed ${dropped.join(', ')} from ${a.username}'s watchlist: already watched.`);
    for (const w of a.watched) {
      const text = REWRITES[`${a.username}|${w.title}`];
      if (text && w.review !== text) { changes.push(`Rewrote ${a.username}'s review of ${filmKey(w)} to match its ${w.rating}★ rating.`); w.review = text; }
    }
  }
  for (const [follower, following] of MUTUALS) {
    if (!fixture.follows.some((f) => f.follower === follower && f.following === following)) {
      fixture.follows.push({ follower, following });
      changes.push(`${follower} now follows ${following} back, so they are friends.`);
    }
  }
  return { fixture, changes };
}

/* Shape checks before anything is written. */
export function validateFixture(f: Fixture): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  for (const a of f.accounts) {
    if (!/^viemo\.demo\.[a-z0-9_]+@example\.com$/.test(a.demo_email)) problems.push(`${a.seed_key}: email must be a reserved viemo.demo.*@example.com address`);
    if (!/^[a-z0-9_]{3,24}$/.test(a.username)) problems.push(`${a.seed_key}: username "${a.username}" doesn't fit the profile rule`);
    if (names.has(a.username)) problems.push(`duplicate username ${a.username}`);
    names.add(a.username);
    for (const w of a.watched) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(w.watched_on)) problems.push(`${a.username}: bad date ${w.watched_on}`);
      if (w.rating != null && (w.rating < 0.5 || w.rating > 5 || w.rating * 2 !== Math.floor(w.rating * 2))) problems.push(`${a.username}: rating ${w.rating} isn't in half stars`);
    }
  }
  for (const x of f.follows) if (!names.has(x.follower) || !names.has(x.following)) problems.push(`follow ${x.follower} → ${x.following} names an unknown account`);
  return problems;
}

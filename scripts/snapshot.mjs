// Saves a snapshot of real TMDB data so VieMo can run without an API key at runtime.
//
//   TMDB_READ_TOKEN=... node scripts/snapshot.mjs
//
// Optional: SNAPSHOT_REGIONS=SG,MY (default SG), SNAPSHOT_MAX_FILMS=1500, SNAPSHOT_OUT=data/tmdb-snapshot.json.
// It collects this week's trending, popular, top rated, now playing, upcoming, popular per genre,
// hidden gems and popular per streaming service, then saves each film's details, trimmed to
// what the app shows. Posters and other images stay on TMDB's image CDN, which needs no key.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const API = process.env.TMDB_API_BASE || 'https://api.themoviedb.org/3';
const TOKEN = process.env.TMDB_READ_TOKEN?.trim();
const KEY = process.env.TMDB_API_KEY?.trim();
const REGIONS = (process.env.SNAPSHOT_REGIONS || 'SG').split(',').map((r) => r.trim().toUpperCase()).filter((r) => /^[A-Z]{2}$/.test(r));
const MAX_FILMS = Number(process.env.SNAPSHOT_MAX_FILMS || 1500);
const OUT = process.env.SNAPSHOT_OUT || 'data/tmdb-snapshot.json';
const CONCURRENCY = 8;

process.on('uncaughtException', (e) => { console.error(`Snapshot failed: ${e.message}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error(`Snapshot failed: ${e?.message ?? e}`); process.exit(1); });

if (!TOKEN && !KEY) {
  console.error('Set TMDB_READ_TOKEN (TMDB → Settings → API → API Read Access Token).');
  process.exit(1);
}
if (!REGIONS.length) { console.error('SNAPSHOT_REGIONS has no valid two-letter region codes.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function get(path, params = {}, attempt = 1) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  if (!TOKEN) url.searchParams.set('api_key', KEY);
  requests++;
  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) } });
  } catch (e) {
    if (attempt < 4) { await sleep(500 * attempt); return get(path, params, attempt + 1); }
    throw new Error(`Could not reach TMDB for ${path}: ${e.message}`);
  }
  if (res.status === 401) throw new Error('TMDB rejected the token (401). Use the API Read Access Token from TMDB → Settings → API.');
  if (res.status === 404) return null;
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 5) { await sleep(Number(res.headers.get('retry-after')) * 1000 || 1000 * attempt); return get(path, params, attempt + 1); }
    throw new Error(`TMDB answered ${res.status} for ${path}`);
  }
  if (!res.ok) throw new Error(`TMDB answered ${res.status} for ${path}`);
  return res.json();
}

async function pages(path, params, count) {
  const ids = [];
  for (let page = 1; page <= count; page++) {
    const r = await get(path, { ...params, page });
    if (!r) break;
    ids.push(...r.results.filter((m) => !m.adult).map((m) => m.id));
    if (page >= r.total_pages) break;
  }
  return ids;
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (i % 100 === 99) console.log(`  ${i + 1} of ${items.length} films`);
    }
  }));
  return out;
}

const uniq = (a) => [...new Set(a)];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

console.log(`Snapshot for ${REGIONS.join(', ')}, up to ${MAX_FILMS} films`);

const genres = (await get('/genre/movie/list')).genres;
const regionNames = (await get('/watch/providers/regions')).results.filter((r) => REGIONS.includes(r.iso_3166_1));
const providers = {};
for (const region of REGIONS) {
  const r = await get('/watch/providers/movie', { watch_region: region });
  providers[region] = r.results
    .map((p) => ({ provider_id: p.provider_id, provider_name: p.provider_name, logo_path: p.logo_path, display_priorities: { [region]: p.display_priorities?.[region] ?? 999 } }))
    .sort((a, b) => a.display_priorities[region] - b.display_priorities[region]);
}

console.log('Collecting lists');
const lists = {
  trendingWeek: await pages('/trending/movie/week', {}, 5),
  popular: await pages('/movie/popular', {}, 10),
  topRated: await pages('/movie/top_rated', {}, 15),
  hiddenGems: await pages('/discover/movie', { sort_by: 'vote_average.desc', 'vote_average.gte': 7.3, 'vote_count.gte': 300, 'vote_count.lte': 3000, 'with_runtime.gte': 40, include_adult: false }, 3),
  nowPlaying: {},
  upcoming: {},
};
for (const region of REGIONS) {
  lists.nowPlaying[region] = await pages('/movie/now_playing', { region }, 3);
  lists.upcoming[region] = await pages('/movie/upcoming', { region }, 3);
}
const extra = [];
for (const g of genres) extra.push(...await pages('/discover/movie', { with_genres: g.id, sort_by: 'popularity.desc', 'vote_count.gte': 150, include_adult: false }, 2));
for (const region of REGIONS) {
  for (const p of providers[region].slice(0, 8)) {
    extra.push(...await pages('/discover/movie', { with_watch_providers: p.provider_id, watch_region: region, with_watch_monetization_types: 'flatrate|free|ads', sort_by: 'popularity.desc', 'vote_count.gte': 150, include_adult: false }, 2));
  }
}

const listed = uniq([
  ...lists.trendingWeek, ...Object.values(lists.nowPlaying).flat(), ...Object.values(lists.upcoming).flat(),
  ...lists.popular, ...lists.hiddenGems, ...lists.topRated, ...extra,
]).slice(0, MAX_FILMS);
console.log(`Fetching details for ${listed.length} films`);

const trimFilm = (d) => {
  const trailers = (d.videos?.results || []).filter((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
  trailers.sort((a, b) => Number(b.type === 'Trailer') - Number(a.type === 'Trailer') || Number(b.official) - Number(a.official) || Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en'));
  return {
    ...pick(d, ['id', 'title', 'original_title', 'original_language', 'release_date', 'poster_path', 'backdrop_path', 'overview', 'tagline', 'runtime', 'status', 'vote_average', 'vote_count', 'popularity']),
    genres: d.genres || [],
    credits: {
      cast: (d.credits?.cast || []).slice(0, 12).map((c) => pick(c, ['id', 'name', 'character', 'profile_path', 'order'])),
      crew: (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => pick(c, ['id', 'name', 'job', 'department'])),
    },
    videos: { results: trailers.slice(0, 4).map((v) => pick(v, ['key', 'site', 'type', 'official', 'name', 'iso_639_1', 'published_at'])) },
    release_dates: { results: (d.release_dates?.results || []).filter((r) => REGIONS.includes(r.iso_3166_1)) },
    'watch/providers': { results: Object.fromEntries(Object.entries(d['watch/providers']?.results || {}).filter(([k]) => REGIONS.includes(k))) },
    recommendations: { ids: (d.recommendations?.results || []).slice(0, 20).map((m) => m.id) },
    images: {
      logos: (d.images?.logos || []).slice(0, 3).map((i) => pick(i, ['file_path', 'iso_639_1', 'vote_average', 'width', 'height'])),
      posters: (d.images?.posters || []).slice(0, 1).map((i) => pick(i, ['file_path', 'iso_639_1', 'vote_average', 'width', 'height'])),
    },
  };
};

const details = await pool(listed, (id) =>
  get(`/movie/${id}`, { append_to_response: 'credits,videos,release_dates,watch/providers,recommendations,images', include_image_language: 'en,null' })
    .then((d) => (d && !d.adult ? trimFilm(d) : null)));
const films = details.filter(Boolean);
const known = new Set(films.map((f) => f.id));
const keep = (ids) => ids.filter((id) => known.has(id));

const snapshot = {
  meta: {
    source: 'TMDB API (themoviedb.org); where-to-watch from JustWatch via TMDB',
    takenAt: new Date().toISOString(),
    regions: REGIONS,
    filmCount: films.length,
    note: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  },
  genres,
  regions: regionNames,
  providers,
  lists: {
    trendingWeek: keep(lists.trendingWeek),
    popular: keep(lists.popular),
    topRated: keep(lists.topRated),
    hiddenGems: keep(lists.hiddenGems),
    nowPlaying: Object.fromEntries(Object.entries(lists.nowPlaying).map(([k, v]) => [k, keep(v)])),
    upcoming: Object.fromEntries(Object.entries(lists.upcoming).map(([k, v]) => [k, keep(v)])),
  },
  films,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot));
console.log(`Saved ${films.length} films to ${OUT} (${(JSON.stringify(snapshot).length / 1e6).toFixed(1)} MB, ${requests} requests)`);

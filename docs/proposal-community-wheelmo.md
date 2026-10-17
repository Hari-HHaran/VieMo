# Proposal: demo community and WheelMo

Status: approved and in progress. Written after auditing the code, the migrations and `viemo_demo_community_seed.json`.

Decisions (18 Oct 2026):
- Seed this Supabase project, labelled Demo.
- Run the importer from an admin page.
- Apply the four fixture fixes.
- Build Movie Night rooms as part of this work.

Done so far:
- Phase 1: Supabase variable detection and `/status`.
- Phase 2: migration 0005 and the importer at `/admin/demo`.

## 1. What exists today

| Area | State | Gap for this brief |
| --- | --- | --- |
| Framework | Next.js 16.3 App Router, React 19.3, TypeScript, plain CSS tokens and the VieMo design system, Motion 13.4 | None |
| Accounts | Supabase Auth with email and password, `@supabase/ssr` cookies, `src/proxy.ts` session refresh. A trigger on `auth.users` creates a `profiles` row (username from the email plus a 4-character suffix) | Not confirmed live yet: the site still can't find your Supabase variables. The fix is written (`src/lib/supabase/env.ts`, uncommitted) |
| Profiles | `profiles`: username, display name, avatar, bio, `watchlist_visibility` (private/public), `activity_visibility`, `is_editor`. Readable by everyone; each person updates only their own row | No demo flag. No profile tabs for collections, watchlist or reviews |
| Follows | `follows` table with own-row insert and delete. Follow and Follow back on `/u/<username>` | None |
| Watchlist | `watchlist_items` table: readable by the owner, or by anyone when the owner's watchlist is public. **The app still saves the watchlist in the browser** | The account watchlist (My Cinema Library) isn't built |
| Diary, ratings, reviews | `diary_entries` (rating, review, spoiler, private notes), **owner only**. The app still saves the diary in the browser | No per-review visibility. No way for other people to read a public review |
| Collections | `movie_collections` (private/unlisted/public, share link, copies), `collection_items`, `collection_collaborators` (editor/viewer), `collection_saves`. Row level security tested with 3 accounts | **No collections UI at all**: no create, edit, visibility control, Explore or save |
| Explore | Discover has moods, trending and service rails | No community or collections area |
| Match | Quick pick (a card deck on this device, from `/api/candidates`). The page says Movie Night "needs accounts" | **No Movie Night rooms, participants, votes or Realtime.** Group WheelMo and Match Decider depend on these |
| Film identity | `films` cache (TMDB id, title, year, poster, genres, runtime), written only by the server. `src/lib/tmdb.ts` has search and details | A resolver for title and year to TMDB id |
| Motion | Motion springs and tokens in `src/lib/motion.ts`. Reduced motion is respected everywhere | None |
| Cursor | **No custom cursor system exists.** Only CSS `cursor:` values | Use `grab` and `grabbing`, plus a small hint label. No pointer-follower that could hide the real pointer |

Verified locally: migrations 0001–0004 pass 93 row level security checks. Not verified: anything on your live Supabase project, which this environment can't reach. Supabase, TMDB and Vercel are all blocked from here.

## 2. The fixture

Counts match the brief exactly:
- 10 accounts
- 30 collections (20 public, 10 private)
- 80 watched entries
- 60 reviews (50 public, 10 private)
- 50 watchlist entries
- 30 follows
- 100 distinct films

Every username fits the profile rule (`^[a-z0-9_]{3,24}$`). Emails use `example.com`, which is reserved, so no mail can be sent. No passwords are included. The genres cover all ten areas in the brief.

Problems found:

1. **No film is watched by two users.** The brief asks for some users to rate the same film differently. As written, every film has exactly one rating.
2. **30 of the 50 watchlist entries are films the same user already watched.** Each user's last three watched films are also their first three watchlist items. A watchlist reads as "want to see", so this contradicts itself.
3. **The 60 reviews reuse 20 template sentences**, some by up to four different users. Six contradict their own rating, for example:
   - Inception 5★: "a few rough edges"
   - Spider-Verse 2.5★: "we had a great conversation"
   - Singin' in the Rain 4.5★: "a few moments did not work"
4. **There are no mutual follows.** None of the 30 follows goes both ways, so "friends only" can't be demonstrated.
5. **Release years.** 50 of the 100 films are in the saved TMDB snapshot. Of those, 46 match on title and year. Four differ by one year because TMDB dates some films by a later release:
   - It Follows: 2014 in the fixture, 2015 on TMDB
   - The Witch: 2015 / 2016
   - Talk to Me: 2022 / 2023
   - Casablanca: 1942 / 1943

   The other 50 films need live TMDB lookups. The resolver must accept a one-year difference only when the title matches exactly and there is a single candidate, and report every case.
6. `profile_visibility` has no column to map to. Profiles are public by design, so it's ignored.

Proposed fix-ups, applied by the importer and listed in its report, never silently:
- For (1): add 12 cross-watches, each with a different rating, using only films already in the fixture.
- For (2): drop already-watched films from watchlists. The 20 genuine watchlist items stay.
- For (3): rewrite the 6 mismatched reviews so they agree with their rating. Every review stays labelled Demo.
- For (4): make 6 of the follows mutual.

## 3. Database changes (three migrations)

### 0005 `demo_community.sql`

**Demo flags**
- `profiles.is_demo boolean not null default false` and `profiles.demo_seed_key text unique`. Neither is in the user update grant, so nobody can mark themselves or anyone else as demo.
- `movie_collections.demo_seed_key text`, unique per owner, so reruns update collections instead of duplicating them.
- Demo content is identified by its owner (`profiles.is_demo`). Cleanup deletes the demo Auth users, and their profiles, diary, watchlist, collections, follows and saves are removed by cascade. Nothing belonging to a real user is touched.

**Review visibility**
- `diary_entries.review_visibility text not null default 'private'`, with values private, friends or public. Grants are added for insert and update of that column.

**Reading functions** (security definer; each checks the viewer and returns only safe columns, never notes or tags)
- `film_reviews(tmdb_id, limit, before)` and `profile_reviews(owner, limit, before)`: public reviews, plus friends-only reviews when the two people follow each other. Each returns author, rating, review, spoiler flag, watch date and the author's `is_demo` flag.
- `explore_collections(q, sort, limit, offset, include_demo)`: public collections only, never unlisted or private. Each returns owner, film count and the first four posters.
- `community_members(limit, offset, include_demo)`: profiles with their public collection count and follower count.

**Existing function change:** `screening_day` hides a review's text from anyone that review's own visibility doesn't allow.

**Tests:** about 25 new local checks covering private reviews, friends-only reviews, unlisted collections never listed, and an ordinary user being unable to set `is_demo`.

### 0006 `movie_nights.sql` (the multiplayer foundation that's still missing)

**Tables**
- `movie_nights`: id, a 6-character join code, host, status (lobby, voting, results or closed), expiry.
- `night_participants`: role and last-seen time.
- `night_candidates`: the film pool, recording which source each film came from (watchlist, collection, surprise or host) and who contributed it.
- `night_votes`: yes or no. Each person reads only their own until the night reaches results. After that, only per-film totals are visible, through `night_tally(night)`.

**Functions:** `join_night(code)` and `start_voting`, `finish_voting` and `close_night`, all host-checked.

**Realtime and privacy**
- Realtime uses a private broadcast channel per night, `night:<id>`, with a policy on `realtime.messages` that limits it to participants. Presence shows who's in the room.
- A watchlist contributed to a night is copied in as candidate rows. Those rows are readable only by that night's participants, and the source watchlist itself is never exposed.

### 0007 `wheelmo.sql`

**Table `wheel_spins`**
- `id`, `request_id uuid unique` (so a double click or a reconnect returns the same spin), `night_id` (null for solo spins), `user_id`.
- `mode`: watchlist, playlist, group, decider or surprise. `source_ref` records the collection or night it came from.
- `pool jsonb`: 2 to 12 films, each with its TMDB id, title, year and poster. `winner_index` and `winner_tmdb_id`, with a check that the winner is in the pool.
- `status`: spinning, revealed, confirmed or superseded, plus timestamps.
- One active spin per night is enforced with `unique (night_id) where status = 'spinning'`, and one per person for solo spins.

**Spin functions**
- `spin_wheel(request_id, mode, source_ref, night_id, tmdb_ids int[])`, security definer. It checks permission:
  - watchlist: your own list;
  - playlist: a collection you can see;
  - group and decider: host only.

  It also checks the pool: no duplicates, 2 to 12 films, and every film comes from the stated source. For decider, every film must have only yes votes. Then it picks the winner **inside the database** using `pgcrypto.gen_random_bytes`, with rejection sampling so each film has exactly the same chance. It saves the spin and broadcasts it to the night's channel.
- `spin_wheel_trusted(...)`, callable by the service role only. Surprise Me and device watchlists use it, after the server has checked every film against TMDB.

**Night history:** `night_picks` records confirmed choices (night, film, spin, who confirmed, when).

**How clients use a spin:** they never choose the winner. They animate towards `winner_index`. Anyone who joins late or reloads reads the saved spin. If the animation would already be over, they see the result straight away instead of a new roll.

## 4. The seed importer

**Run with:** `scripts/seed-demo.mjs`, or an admin page if you prefer; see the questions below. It runs only where the server keys live.

**Guards**
- It refuses to run unless `VIEMO_ENV` is `development` or `staging`. Running against production needs both `--production` and `DEMO_SEED_APPROVED=yes`.
- It uses `SUPABASE_SERVICE_ROLE_KEY` and `TMDB_READ_TOKEN` from the environment and never prints them.

**Steps**
1. Check the fixture's shape, then apply the fix-ups in section 2.
2. **Resolve films** with TMDB `search/movie` by title and `primary_release_year`. Titles are compared after normalising accents, "&" and punctuation. A one-year difference is accepted only for a single exact-title match. Anything ambiguous or unmatched is **rejected and reported, never invented**. Matched films are written to `films` with TMDB's poster, genres and runtime.
3. **Create accounts.** Each account is looked up by `demo_seed_key`, then by email.
   - If neither exists: create it with `auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name, demo: true } })`. No password is set, so these accounts can't be signed into. The profile trigger runs as normal, and the importer then sets the username, bio, visibility, `is_demo` and seed key.
   - If the email or username belongs to a **non-demo** profile: skip that account and report it. Real users are never overwritten.
4. **Add content.** Each demo owner's watchlist, diary and collection items are replaced. Collections are upserted by seed key, and follows are inserted only if new. Rerunning gives the same result with no duplicates.
5. **Cleanup** (`--cleanup`) deletes only Auth users whose profile has `is_demo = true` and a seed key from this fixture.
6. **Report:** films resolved or rejected, accounts created, updated or skipped, and row counts. It's written to `seed-report.json` and printed.

**Labelling:** a `DEMO_COMMUNITY=show|hide` setting. When shown, demo profiles, collections and reviews carry a visible "Demo" badge and a note that the accounts are fictional. When hidden, they're left out of Explore, the member directory and film reviews. It defaults to hidden on the production site unless you approve showing it.

## 5. Screens and files

**Explore** (`src/app/(tabs)/explore/page.tsx`, linked from Discover and the Menu)
- A playlist-style grid of public collections: a four-poster collage, creator avatar, title, film count and a Demo badge.
- On hover or focus the covers fan out. Without hover they're laid out as a stack.
- Selecting a collection expands it into a cinematic view (`/c/[id]`) with a shared-element morph.
- A members strip with clickable avatars.

**Collection view** (`/c/[id]`): films, creator, Save, Copy to my collections, Start a Movie Night, and Spin this playlist on WheelMo.

**Profiles** (`/u/[username]`): tabs for Collections, Watchlist (if public), Reviews and Screening Activity, plus a Demo badge. Each review links to its film page.

**Film page:** a "Reviews from VieMo members" section reading `film_reviews`, with spoilers hidden until revealed.

**My Cinema Library** (`/library`): your watchlist and diary in your account (with an offer to move this browser's items in), your collections, and a clear visibility control on each collection and review. This is the minimum the brief needs for "allow users to change visibility".

**Movie Night** (`/match/night/[code]`): create a room, join by code, see who's present, add films to the pool from watchlists or collections, vote by swiping, see results, then WheelMo in group or decider mode.

**WheelMo** (`src/components/wheelmo/`)
- The Match page gets a choice between Swipe Match and WheelMo.
- `Wheel.tsx`: an SVG wheel. Each segment is a real poster clipped to a wedge, with brass rivets, a lit rim of bulbs and a pointer.
- `Lever.tsx`: drag down on mouse and pen, with a visible activation threshold and a spring return. On touch it's a press-and-pull handle that doesn't block page scrolling (`touch-action: none` on the handle only). A "Spin WheelMo" button and Enter or Space do the same thing.
- `Reveal.tsx`: the poster expands into the winner card.
- Ticks are generated with Web Audio and are **muted by default**.
- With reduced motion, the result shows immediately.

**Winner card:** poster, title, year, genres, runtime and synopsis from TMDB, and streaming options only where TMDB/JustWatch lists them. Actions: Add to watchlist, Open film, Confirm for Movie Night (host only), and Spin again (allowed or not depending on the mode).

**API routes:** `/api/wheel/pool` (builds and checks a pool, including Surprise Me from TMDB discover with your filters) and `/api/wheel/spin` (calls the database function and returns the saved spin).

## 6. Order and approvals

1. **Phase 1:** finish and commit the Supabase variable fix, and add a `/status` page showing which variables were found (names only), whether the key is accepted, and which migrations have run. You confirm accounts work on the live site.
2. **Phase 2:** migration 0005 and its tests, then the importer. It's dry-run tested here against local Postgres and a TMDB stand-in. **You run it** (with approval for production) and send me the report.
3. **Phase 3:** Explore, collection view, profile tabs, film reviews and My Cinema Library.
4. **Phase 4:** WheelMo's interface for solo modes, using real pools.
5. **Phase 5:** migration 0007 and server-side selection for the solo modes.
6. **Phase 6:** migration 0006 Movie Night rooms, then group and decider WheelMo with Realtime.
7. **Phase 7:** tests. Local row level security tests with three accounts. Browser tests for the lever, the button, double clicks, late joiners, reconnects, reduced motion, phone sizes and accessibility in both themes. Two-browser Realtime tests against local Postgres. Then a checklist for you on the live site.

Each phase is committed and pushed separately. Nothing touches your live data until you've approved and run the importer yourself.

# VieMo: product foundation and build plan

Name: VieMo (the brief's working title, ReelCircle, is retired). Status of everything below is labelled **Complete**, **Partial**, **Planned** or **Blocked**.

## Core user problem

Choosing and talking about films is social, but the tools are solitary. Groups lose time negotiating a film because tastes, moods and subscriptions differ. Enthusiasts scatter their opinions across chats and platforms. Solo viewers stall in oversized catalogues.

## Three user groups (provisional hypotheses, not research findings)

| Persona | Need | Design response |
| --- | --- | --- |
| A. Indecisive friend group (Maya, 21) | A fast, fair, transparent group decision that no one strongly dislikes | Movie Night: lobby, shared constraints, private swipe votes, ranked results with an explained agreement score |
| B. Passionate enthusiast (Arjun, 23) | One home for diary, reviews and curated lists that others can discover | Diary, ratings and reviews with spoiler and privacy controls, collections as playlists, friend feed |
| C. Casual solo viewer (Mei, 25) | Low-effort discovery that fits tonight's mood and her services | Mood chips, trailer feed (Clips), one-tap save, verified where-to-watch |

These are founder observations. Validation plan: 5–8 semi-structured interviews, a task-based test with at least three groups choosing a film, observation of Clips browsing, and a light competitor review (Letterboxd, Netflix, Spotify playlists, swipe matchers). Findings will be recorded separately from hypotheses.

## Differentiating proposition

Social discovery plus structured group decision in one place: friends' taste is the main signal, collections let people express it, and Movie Night turns "what should we watch?" into a five-minute, fair, explained choice.

## Navigation

Home (friends' activity) · Discover (search, trends, moods, collections) · Match (Movie Night) · Clips (trailer feed) · Profile (diary, collections, settings). Full map: `design-system/navigation.md`.

## Essential data structures (Supabase / Postgres)

- `profiles`, `user_preferences` (genres, services, region default `SG`, language, theme, consent flags, `accent_hex`, `accent_film_id`, `accent_source` logo/poster/classic/noir), `follows`, `blocks`
- `films` (TMDB id as primary key, cached metadata with `fetched_at`), `film_palettes` (film, source logo/poster, swatches, `fetched_at`), `watch_providers_cache` (film, region, provider, kind, `fetched_at`)
- `diary_entries` (watched_on, rating 0.5–5 in 0.5 steps, review, spoiler, visibility), `review_likes`, `review_comments`
- `watchlist_items`, `collections` (visibility, cover), `collection_items` (position, note), `collection_members` (role: editor/viewer), `collection_saves`
- `match_sessions` (code, host, status), `match_participants` (ready, last_seen), `match_preferences` (hard constraints vs soft preferences), `match_candidates`, `match_votes` (unique per participant + candidate), `match_results` (scores, weights version), `match_selections`
- `notifications` (+ per-category settings), `reports`, `moderation_actions`

Row-level security on every table; votes readable only by their author until the session reaches its reveal stage.

## Technology stack

Next.js (App Router) + TypeScript, Tailwind mapped to the design tokens, Supabase (Postgres, Auth, Realtime, RLS), TMDB API through a server-side route with caching, an optional server-side AI explanation service that only receives structured session data, Vercel, PWA manifest.

## Implementation sequence

1. **Design system**: **Complete.** Tokens, type, 20 components with live previews, brand book, navigation and accessibility rules (`design-system/`), including personal accent colours (AccentPicker, `deriveAccent`, `applyAccent`, `extractSwatches`).
2. **Phase 1 foundation**: **Partial.** See the status table below.
3. **Phase 2 Movie Night** (group, real time): sessions, realtime lobby, preferences, voting, deterministic scoring with documented weights, results, history, cross-account tests. **Planned.**
4. **Phase 3 discovery**: Clips trailer feed, mood discovery, trending and regional availability are **built early** (they only need TMDB); refinements **Planned**.
5. **Phase 4**: AI explanations, ranking improvements, collaborative collections, moderation, performance and accessibility audits. **Planned.**

## Status of the app (Next.js, `src/`)

| Feature | Status | Notes |
| --- | --- | --- |
| App shell: five tabs, bottom bar on phones, rail from 1024px, skip link, client-side navigation | Complete | |
| TMDB server client (token server-side, cached responses, plain-language errors and retry) | Complete | Needs `TMDB_READ_TOKEN` to show films |
| Discover: search, a mood mixer (push up one to four moods; films that fit every mood come first, then close matches, all from TMDB genre tags), Trending, New in cinemas, Explore streaming by service, Hidden gems (stated rule), Coming soon | Complete | Region from Profile, default Singapore. Popular with friends waits for accounts |
| Search results | Complete | |
| Film page: backdrop, poster, facts, certification, director, cast, TMDB rating (labelled), VieMo rating ("No VieMo ratings yet"), trailer, where to watch (JustWatch via TMDB), recommendations | Complete | Log, rate and review wait for accounts |
| Match, the one place to decide: "Just me" (Swipe Match, WheelMo, Reel Director) and "With friends" (Movie Night). Swipe Match is Quick pick: mood, length and services, a swipe deck of real films, a ranked shortlist with reasons and documented weights | Complete | The Menu is grouped the same way: Discover, Decide, You |
| Clips: full-screen trailer feed (YouTube player), one at a time, Previous/Next buttons, optional muted autoplay, captions setting | Complete | |
| Profile: an Overview tab (Wall of Fame preview, Screening Activity, watchlist) and a Library tab (My Cinema Library: collections, saved collections, account watchlist; `/library` redirects there) | Complete | |
| Settings (`/settings`, from Profile and the Menu): accent from a favourite film's logo, background poster, theme, reduce motion, cinema cursor, autoplay, captions, region | Complete, device only | Stored in this browser; account details stay on `/account` |
| Cinema cursor: a dot plus a trailing ring in each page's accent; a turning reel over links and buttons, a viewfinder over posters, a dashed ring over things you drag; the normal text cursor in text fields | Complete | Mouse and trackpad only; off for touch and forced colours; no trailing or turning with reduced motion; can be switched off |
| Background poster: any film's poster (or the favourite film from Your colour) faintly behind every page or Home only, at 4–14%, optionally blurred | Complete | Faint text switches to the muted ink while a poster shows, so all text stays at 4.5:1 or better even over pure black or white |
| ViewMo (`/viewmo`): up to 72 trending, in-cinema, popular and hidden-gem posters on a sphere; drag with inertia, arrow keys, Tab turns each poster to the front; select to fly the poster forward with details, Full details, Watchlist and Close; list view alternative; reduced motion respected | Complete | Opened from Discover and Home; the five tabs are unchanged |
| TMDB snapshot mode: a GitHub Action saves up to 1,500 real films; the app runs from it with no token and dates every list | Complete | Needs the token once, as a GitHub secret |
| Cinematic worlds: each destination has its own grounds and accent (Lobby amber, Observatory navy and cyan, Casting Table wine and rose, Screening Room black and violet, Green Room (Profile) midnight and silver, Premiere from the poster), all checked to WCAG AA by `scripts/worlds.mjs`; a one-time curtain names each world on first entry | Complete | Studio, Record Store and Afterparty palettes are defined for the screens that come with Phase 2 |
| Motion: shared motion tokens (`src/lib/motion.ts`), route cross-fades, the tapped poster morphs into the film page, navigation progress bar, springy buttons; the in-app Reduce motion setting and the system setting both turn it off | Complete | Uses the free `motion` library; no Motion+ components |
| Home as the Festival Lobby: dated masthead, trending ticker (pauses on hover, focus or off-screen), this week's programme as an editorial grid with save toggles | Complete | "Now showing in your circle" waits for accounts and says so |
| Discover mood constellation: moods as stars, the chosen star lights its lines and the results grid re-sorts in place | Complete | |
| Match deck: drag with physics, fling or pass the threshold to vote, short drags snap back, next card rises; buttons and arrow keys do the same | Complete | |
| Film page Premiere: accent tuned from the poster on the server (no flash), falls back to amber when the poster is grey or slow | Complete | |
| Reel Director (`/director`, the Director's Studio): describe the night in your own words and get a storyboard of three films (safe choice, wildcard, hidden gem) with short reasons; reached from Home and Match | Complete | Uses OpenAI on the server (`OPENAI_API_KEY`, model `OPENAI_MODEL`, default gpt-5-mini). The model only picks ids from a list of real TMDB films; every pick is checked against that list and the hidden-gem rule, and runtime against the chosen length. Card facts come from TMDB, not the AI. Rate limited to 6 a minute per visitor. Without a key the page says it's off |
| REEL 2.0 navigation (Projection Booth): floating capsule from 768px with scramble labels (real text kept for screen readers and forced colours), magnetic items, a sliding "light pool" for the current tab, spring press, a loading glint on the destination, condensing on scroll, and a Menu disclosure (Search, ViewMo, Reel Director, watchlist); a labelled bottom bar with press feedback on phones | Complete | Hover effects need a mouse or trackpad and never carry an action; all of it is off with reduced motion |
| REEL 2.0 Home (Projection Booth): the week's top trending backdrop lit by a pointer spotlight, film grain, burgundy house light, marquee headline, Movie Night and Reel Director actions, your watchlist and signature film; programme spread with tilting cards and a ranked list; New in cinemas and Hidden gems rails you can fling; scroll-driven section entrances; an empty-auditorium state for the circle | Complete | The friends' feed and expandable friend reviews need accounts; the room says so instead of inventing activity |
| Wall of Fame (`/wall`, the gallery world): every watched film as a framed poster. Watched but unrated waits in a tray; rated is framed in black; rated and reviewed gets a walnut frame and a brass placard; a favourite or 4.5+ joins the Hall of Fame (gilded frame, spotlight, ribbon). Gallery (salon masonry in reading order), Timeline (by month) and Shelf (by decade) views; sort, show, genre and decade filters kept in the URL; hover or focus panel; detail dialog with full review (spoilers hidden), watch dates, tags, private notes, edit, rewatch, favourite and take-down with undo. Logging from any film page ("Mark as watched") or from the wall by search; preview on Profile | Complete, device only | Data is shaped like `diary_entries` (src/lib/wall.ts, src/lib/diary.ts) so it moves to Supabase with accounts. Visiting a friend's wall needs accounts; the component already has a read-only mode for it |
| SceneAtlas (`/atlas`) phase 1 of 6, prototype: dotted graphite globe (react-globe.gl 2.38 and three.js 0.186, loaded only on this page), blue and violet markers with a gentle pulse, camera flights, zoom and reset buttons, a list that reaches every marker, Behind the Frame panel (desktop side panel, phone bottom sheet), film search as an accessible combobox on real TMDB results, a flat dotted map as the 2D view and the fallback without WebGL | Prototype | Markers are seven labelled city-centre samples with no film claims; choosing a film shows that no locations have been researched yet. Next: Supabase tables, the Wikidata baseline and quote-checked Wikipedia research (phase 2) |
| Mo, the movie companion, phase 1: film-reel character with idle, hover, listening, thinking, responding, error and docked states; drag on desktop with edge snap and a remembered side; Dock left, Dock right and Reset position as a menu; a docked button on phones; chat panel or sheet with suggestions, spoiler-free switch, stop, clear and Escape | Prototype | Not connected to AI yet and says so. Phase 4 adds the server tools and the AI adapter |
| Database: migrations 0001 to 0007 (films, profiles, follows, watchlist, diary, favourites, collections with private, unlisted and public visibility, collaborators, saves, copies, share links; SceneAtlas places, claims, sources, research jobs, AI budget, Location Passport; Screening Activity; demo labels and review visibility; WheelMo spins; Movie Night rooms), row level security on every table, Supabase's default API grants revoked | Complete, tested locally | 220 checks pass on local Postgres 16 as three accounts and signed out (`supabase/tests/local/run.sh`). Needs running on the Supabase project (`docs/supabase-setup.md`) |
| Accounts: email and password sign-up with email confirmation, sign-in, sign-out, forgot and reset password, the email-link callback (code or token hash), session refresh in `src/proxy.ts`, profile setup (username, name, bio, watchlist visibility, private by default), account entry in the nav and on Profile, return to where you were after signing in | Complete | Tested end to end against a local Supabase Auth stand-in: 66 checks including open-redirect attempts, no account enumeration on sign-up or reset, focus and error handling, axe in both themes, phone width. Not yet seen against a live Supabase project from here |
| Screening Activity: a month as a cinema seating chart, one seat per day, lit by points (a watch 1, a rating 1, a review 2; levels 0, 1, 2–3, 4–5, 6+). Filters for all activity, watched, ratings and reviews; month navigation (arrows, buttons, PageUp and PageDown); a hoverable, dismissible tooltip; a day panel with film links, ratings and reviews (spoilers hidden); stats for the month, streaks, most active day and top genre. On the Profile tab from this device's diary, and on member profiles (`/u/<username>`) from Supabase with a private, friends or public setting (private by default) | Complete | Migration 0004 keeps daily totals with a trigger, so a month is at most 31 indexed rows; streaks and genre are worked out in the same call. Privacy is enforced in the database (93 local checks). 67 browser checks pass, including keyboard, touch, reduced motion, phone width and axe in both themes. Member profiles fill once diaries sync to accounts (My Cinema Library) |
| Member profiles and follows: `/u/<username>` with name, bio, follower counts, Follow, Follow back and Friends (people who follow each other) | Complete | Tested against the local Supabase stand-in |
| Friends' feed, reviews, notifications, moderation | Planned | |
| My Cinema Library (`/library`): your collections with who can see each, saved collections, your account watchlist and the offer to bring this device's watchlist in. Explore (`/explore`): public collections as record sleeves, members, search and sort. Collection pages (`/c/<share>`) with save, copy and add to collection; profile tabs; film reviews with private, friends or public visibility | Complete | 54 browser checks against a local Supabase (real GoTrue, PostgREST and Postgres), including privacy across three accounts and phone width |
| Demo community: ten fictional accounts, labelled Demo everywhere, imported from `viemo_demo_community_seed.json` at `/admin/demo` (editors only) with a dry run, TMDB-checked films (no guesses), safe re-runs and one-button removal | Complete | 26 browser checks plus 4 production-guard checks. You run it on your project (`docs/supabase-setup.md`, section 6) |
| WheelMo (Match → WheelMo): a cinema-machine film roulette for your watchlist, a collection or a surprise deal. Pull the lever or press Spin. The database picks the winner with a cryptographic random number before the wheel turns, from exactly the films shown, and saves it; a retry or reload shows the same result. Winner card with TMDB facts and where to watch from JustWatch. Sound off by default; reduced motion shows the result at once | Complete | 42 browser checks; 15,400 simulated landings all stop on the saved winner; a 6,000-spin fairness test in the database. No betting, prizes or payments |
| Movie Night (`/match/night`): rooms with a six-character code; everyone adds films; private yes or no votes; results with totals and the films everyone accepted; Match Decider spins only those; a group wheel says plainly it isn't a vote; the host confirms tonight's film; history of your rooms | Complete, Realtime not yet seen live | 51 browser checks with three accounts in separate browsers (same winner on every screen, votes private, late joiner, reload). Supabase Realtime can't run here, so these used the polling fallback; check **Live** on your project (`docs/supabase-setup.md`, section 7) |

Verified in this environment against a local TMDB stand-in (TMDB is blocked here): production build, typecheck, every route, axe-core with no violations on all seven screens in both themes, no hydration errors, and journeys for save and undo, film page, Quick pick (buttons, arrow keys and drag), reload persistence, the logo accent, the poster accent, the mood constellation, the world curtain and reduced motion. Not yet seen against live TMDB data from here.

## External dependencies and licensing

- **TMDB API**: needs an API key (server-side only) and attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB" with their logo). Commercial use needs a separate TMDB agreement. **Integrated**; set `TMDB_READ_TOKEN` wherever the app runs.
- **Watch providers**: TMDB's provider data comes from JustWatch and must be attributed to JustWatch. It gives provider, kind and a TMDB/JustWatch page link, not verified deep links to each film, so badges link to the source page.
- **Trailers**: TMDB lists official videos, mostly YouTube. They play only through the YouTube embedded player, under its terms, branding and controls. There are no licensed vertical clips, so Clips is an honest full-screen trailer feed.
- **Supabase project**: URL and keys are needed for auth, data and realtime. **Integrated**; connect it with `docs/supabase-setup.md`.
- **AI explanations**: optional; needs an API key. Without one, results show the deterministic explanation template.
- **Fonts and icons**: Instrument Serif, Schibsted Grotesk, IBM Plex Mono (SIL OFL 1.1, licences in `design-system/fonts/`); Lucide icons (ISC).

## Decisions for the founder

- Product name: **VieMo** (decided).
- Personal accent from the favourite film's logo: **in** (decided). It changes only the accent tokens; ratings, statuses and text colours stay fixed.
- Keep the Light theme alongside the default Dark?
- A logo or wordmark (none exists; the name is set in Instrument Serif for now).

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
| Discover: search, moods, Trending, New in cinemas, Explore streaming by service, Hidden gems (stated rule), Coming soon | Complete | Region from Profile, default Singapore. Popular with friends waits for accounts |
| Search results | Complete | |
| Film page: backdrop, poster, facts, certification, director, cast, TMDB rating (labelled), VieMo rating ("No VieMo ratings yet"), trailer, where to watch (JustWatch via TMDB), recommendations | Complete | Log, rate and review wait for accounts |
| Match: Quick pick (solo): mood, length and services, swipe deck of real films, ranked shortlist with reasons and documented weights | Complete | Group Movie Night: Planned (Phase 2) |
| Clips: full-screen trailer feed (YouTube player), one at a time, Previous/Next buttons, optional muted autoplay, captions setting | Complete | |
| Profile: watchlist, theme, reduce motion, autoplay, captions, region, accent from favourite film's logo | Complete, device only | Stored in this browser until accounts exist; the UI says so |
| TMDB snapshot mode: a GitHub Action saves up to 1,500 real films; the app runs from it with no token and dates every list | Complete | Needs the token once, as a GitHub secret |
| Accounts, profiles, follows, friends' feed, diary, reviews, collections, notifications, moderation | Planned | Blocked on a Supabase project |
| Movie Night (multi-device, realtime) | Planned | Blocked on Supabase |

Verified in this environment against a local TMDB stand-in (TMDB is blocked here): production build, typecheck, every route, axe-core with no violations on all seven screens in both themes, no hydration errors, and journeys for save and undo, film page, Quick pick, reload persistence and the logo accent. Not yet seen against live TMDB data from here.

## External dependencies and licensing

- **TMDB API**: needs an API key (server-side only) and attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB" with their logo). Commercial use needs a separate TMDB agreement. **Integrated**; set `TMDB_READ_TOKEN` wherever the app runs.
- **Watch providers**: TMDB's provider data comes from JustWatch and must be attributed to JustWatch. It gives provider, kind and a TMDB/JustWatch page link, not verified deep links to each film, so badges link to the source page.
- **Trailers**: TMDB lists official videos, mostly YouTube. They play only through the YouTube embedded player, under its terms, branding and controls. There are no licensed vertical clips, so Clips is an honest full-screen trailer feed.
- **Supabase project**: URL and keys are needed for auth, data and realtime. **Blocked until provided.**
- **AI explanations**: optional; needs an API key. Without one, results show the deterministic explanation template.
- **Fonts and icons**: Instrument Serif, Schibsted Grotesk, IBM Plex Mono (SIL OFL 1.1, licences in `design-system/fonts/`); Lucide icons (ISC).

## Decisions for the founder

- Product name: **VieMo** (decided).
- Personal accent from the favourite film's logo: **in** (decided). It changes only the accent tokens; ratings, statuses and text colours stay fixed.
- Keep the Light theme alongside the default Dark?
- A logo or wordmark (none exists; the name is set in Instrument Serif for now).

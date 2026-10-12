# VieMo: product foundation and build plan

Working title in the brief: ReelCircle. Status of everything below is labelled **Complete**, **Partial**, **Planned** or **Blocked**.

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

- `profiles`, `user_preferences` (genres, services, region default `SG`, language, consent flags), `follows`, `blocks`
- `films` (TMDB id as primary key, cached metadata with `fetched_at`), `watch_providers_cache` (film, region, provider, kind, `fetched_at`)
- `diary_entries` (watched_on, rating 0.5–5 in 0.5 steps, review, spoiler, visibility), `review_likes`, `review_comments`
- `watchlist_items`, `collections` (visibility, cover), `collection_items` (position, note), `collection_members` (role: editor/viewer), `collection_saves`
- `match_sessions` (code, host, status), `match_participants` (ready, last_seen), `match_preferences` (hard constraints vs soft preferences), `match_candidates`, `match_votes` (unique per participant + candidate), `match_results` (scores, weights version), `match_selections`
- `notifications` (+ per-category settings), `reports`, `moderation_actions`

Row-level security on every table; votes readable only by their author until the session reaches its reveal stage.

## Technology stack

Next.js (App Router) + TypeScript, Tailwind mapped to the design tokens, Supabase (Postgres, Auth, Realtime, RLS), TMDB API through a server-side route with caching, an optional server-side AI explanation service that only receives structured session data, Vercel, PWA manifest.

## Implementation sequence

1. **Design system**: **Complete.** Tokens, type, 19 components with live previews, brand book, navigation and accessibility rules (`design-system/`).
2. **Phase 1 foundation**: app shell and navigation, auth, TMDB search and film pages, diary/ratings/reviews, watchlist, profiles, follows, activity feed, basic collections. **Planned.**
3. **Phase 2 Movie Night**: sessions, realtime lobby, preferences, voting, deterministic scoring with documented weights, results, history, cross-account tests. **Planned.**
4. **Phase 3 discovery**: Clips trailer feed, mood discovery, trending, regional availability. **Planned.**
5. **Phase 4**: AI explanations, ranking improvements, collaborative collections, moderation, performance and accessibility audits. **Planned.**

## External dependencies and licensing

- **TMDB API**: needs an API key (server-side only) and attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB" with their logo). Commercial use needs a separate TMDB agreement. **Blocked until a key is provided.**
- **Watch providers**: TMDB's provider data comes from JustWatch and must be attributed to JustWatch. It gives provider, kind and a TMDB/JustWatch page link, not verified deep links to each film, so badges link to the source page.
- **Trailers**: TMDB lists official videos, mostly YouTube. They play only through the YouTube embedded player, under its terms, branding and controls. There are no licensed vertical clips, so Clips is an honest full-screen trailer feed.
- **Supabase project**: URL and keys are needed for auth, data and realtime. **Blocked until provided.**
- **AI explanations**: optional; needs an API key. Without one, results show the deterministic explanation template.
- **Fonts and icons**: Instrument Serif, Schibsted Grotesk, IBM Plex Mono (SIL OFL 1.1, licences in `design-system/fonts/`); Lucide icons (ISC).

## Decisions for the founder

- Product name: VieMo (repo) or ReelCircle (brief)?
- Keep the Light theme alongside the default Dark?
- A logo or wordmark (none exists; the name is set in Instrument Serif for now).

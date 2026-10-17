# VieMo

A social film club: discover films through friends, curate collections, and decide together on Movie Night.

## Run it

1. Install Node 20.9 or newer, then `npm install`.
2. Copy `.env.example` to `.env.local` and set `TMDB_READ_TOKEN` to your TMDB **API Read Access Token** (themoviedb.org → Settings → API). It is only used on the server.
3. `npm run dev` and open http://localhost:3000.

Posters, trailers and listings load from TMDB once the token is set; without it, every screen says film data isn't connected instead of showing invented films.

## Run without a key: the TMDB snapshot

The app can also run from a saved snapshot of real TMDB data (`data/tmdb-snapshot.json`): up to 1,500 of this week's trending, popular, top-rated, in-cinema, upcoming and per-genre films, with cast, trailers and where-to-watch for your region. Posters still load from TMDB's image server, which needs no key.

1. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**, name `TMDB_READ_TOKEN`, value your TMDB API Read Access Token.
2. **Actions → TMDB snapshot → Run workflow** (regions default to `SG`; add more like `SG,MY`).
3. The job commits the snapshot; Vercel redeploys on its own. Every screen then says which date the data is from.

Run it again whenever you want fresher lists. Locally: `TMDB_READ_TOKEN=… npm run snapshot`. If a token is set on the server, live data is used instead of the snapshot. Before a public launch, check TMDB's API terms on caching and refresh the snapshot regularly.

## Deploy (Vercel)

Import the GitHub repository in Vercel, add the environment variable `TMDB_READ_TOKEN` (and optionally `TMDB_DEFAULT_REGION`, default `SG`), and deploy. No other services are needed for the current screens.

## What's here

- `src/app`: the five tabs (Home, Discover, Match, Clips, Profile), ViewMo (`/viewmo`, a sphere of posters), search and film pages, and API routes for Quick pick, search and logo colours.
- `src/lib/tmdb.ts`: the server-side TMDB client. Responses are cached (1 to 24 hours depending on the list).
- `design-system/`: tokens, fonts, components and the brand book. Edit `design-system/src/` and run `npm run ds:build` to regenerate `components/bundle.js`, `components/viemo.mjs` and `tokens.css`.
- `src/lib/worlds.json` and `scripts/worlds.mjs`: the colour world for each destination. Edit the JSON, then run `node scripts/worlds.mjs`; it regenerates `src/app/worlds.css` and refuses to write a world that falls below WCAG AA.
- `src/lib/ai.ts` and `src/app/api/director`: Reel Director. Set `OPENAI_API_KEY` in Vercel (Sensitive, no `NEXT_PUBLIC_` prefix) and redeploy; `OPENAI_MODEL` optionally changes the model.
- `src/lib/wall.ts` (rules: stages, sorting, taste) and `src/lib/diary.ts` (your watches, ratings and reviews on this device): the Wall of Fame's data. `src/components/wall/` is the page, frames, views and dialogs.
- `src/components/atlas/` and `src/lib/atlas/`: SceneAtlas (globe, flat map, search, panels; record types). `src/components/mo/`: Mo. `scripts/world-dots.mjs` regenerates the flat map's dots.
- `public/fonts/`: copies of the three first-paint fonts so they can be preloaded (keep in step with `design-system/fonts/`).
- `src/lib/motion.ts`: the shared durations, easings, springs, hover, press, magnet, scramble and page-transition tokens.
- `src/components/fx/`: reusable effects (scramble labels, magnetic pull, tilt cards, drag rails). `src/components/nav/SiteNav.tsx` is the navigation; `src/styles/` holds the nav and Home styles.
- `docs/plan.md`: product plan, data model and a feature-by-feature status table.

Watchlist and settings are stored in the browser until accounts (Supabase) are added. Film data and images come from TMDB; this product uses the TMDB API but is not endorsed or certified by TMDB.

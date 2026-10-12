# VieMo

A social film club: discover films through friends, curate collections, and decide together on Movie Night.

## Run it

1. Install Node 20.9 or newer, then `npm install`.
2. Copy `.env.example` to `.env.local` and set `TMDB_READ_TOKEN` to your TMDB **API Read Access Token** (themoviedb.org → Settings → API). It is only used on the server.
3. `npm run dev` and open http://localhost:3000.

Posters, trailers and listings load from TMDB once the token is set; without it, every screen says film data isn't connected instead of showing invented films.

## Deploy (Vercel)

Import the GitHub repository in Vercel, add the environment variable `TMDB_READ_TOKEN` (and optionally `TMDB_DEFAULT_REGION`, default `SG`), and deploy. No other services are needed for the current screens.

## What's here

- `src/app`: the five tabs (Home, Discover, Match, Clips, Profile), search and film pages, and API routes for Quick pick, search and logo colours.
- `src/lib/tmdb.ts`: the server-side TMDB client. Responses are cached (1 to 24 hours depending on the list).
- `design-system/`: tokens, fonts, components and the brand book. Edit `design-system/src/` and run `npm run ds:build` to regenerate `components/bundle.js`, `components/viemo.mjs` and `tokens.css`.
- `docs/plan.md`: product plan, data model and a feature-by-feature status table.

Watchlist and settings are stored in the browser until accounts (Supabase) are added. Film data and images come from TMDB; this product uses the TMDB API but is not endorsed or certified by TMDB.

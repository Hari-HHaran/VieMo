# VieMo 🎬

**A social film app for finding something good to watch, deciding on it (alone or with friends), and keeping a record of everything you've seen.**

- **Live demo:** [vie-mo.vercel.app](https://vie-mo.vercel.app)
- **Hackathon track:** **5. Open Category.** Built out of a passion for films, and for finding better, more enjoyable ways to enjoy watching them.
- **Built with:** Next.js 16, React 19, Supabase, TMDB, and an OpenAI-compatible AI model.

**Contents**

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [AI Integration](#4-ai-integration)
5. [External Tools & Datasets](#5-external-tools--datasets)
6. [Installation & Setup](#6-installation--setup)
7. [AI Safety & Limitations](#7-ai-safety--limitations)

Also: [How it works](#how-it-works) · [Project map](#project-map) · [Credits](#credits) · [Full feature guide](docs/features.md)

---

## 1. Problem Statement

**What problem are we solving?** Choosing a film should be the easy part of a night in. In practice, it often takes longer than the film itself.

- **Endless scrolling.** Every streaming service has its own catalogue and its own recommendations. People flick between apps, can't tell where a film is actually available, and give up or rewatch something old.
- **Group decisions stall.** Couples, families and friends negotiate in circles. The loudest person often wins, and quieter people don't say what they'd really like to watch.
- **Mood is hard to search for.** People think in feelings ("something funny but a bit scary", "comforting and short") rather than genres or titles, and most apps only search by title.
- **Film lovers have nowhere that's theirs.** Ratings, reviews, watchlists and favourite lists end up scattered across notes, chats and different apps, with no single place to see your own film life or share it with friends.

**Who experiences it?**

- **Casual viewers:** want something that fits tonight's mood and the services they pay for, quickly.
- **Groups:** friends, couples, housemates and families who need to agree on one film.
- **Film enthusiasts:** keep diaries, rate and review, make lists, and want to share them.

**Why is it worth solving?** Watching films is one of the most common ways people relax and spend time together. Removing the friction around choosing makes that time better spent: less arguing and scrolling, more watching. It also makes group decisions fairer, so everyone gets a say, not just the most persistent person.

---

## 2. Solution Overview

VieMo brings the whole film night into one app, built around three jobs:

1. **Find:**
   - a **mood mixer** (combine moods like *Funny + Scary* and get films that fit every one);
   - trending lists, new releases, hidden gems and search;
   - **where to watch** each film in your region.
2. **Decide:**
   - **Just me:**
     - **Swipe Match:** quick votes on a deck of real films, then a ranked shortlist.
     - **WheelMo:** a cinema-style poster reel that stops on a fairly chosen film.
     - **Reel Director:** describe your night in words and the AI picks three films.
   - **With friends:** **Movie Night** rooms.
     - Everyone adds films and votes in private.
     - **Match Decider** picks only between the films everyone said yes to, so the result is fair.
3. **Keep and share:**
   - a **Wall of Fame** of every film you've watched;
   - a month-by-month **Screening Activity** chart;
   - collections, public profiles, follows and reviews, each with its own privacy setting.

**Mo**, a small film-reel companion, sits on every page. You can ask it questions about films or ask it to do things, and it always asks you to confirm before acting.

**One rule runs through the whole app: no invented data.** Film facts, posters and availability come from TMDB and JustWatch. When something isn't connected or hasn't been researched yet, the screen says so instead of making it up.

---

## 3. Key Features

| Feature | What it does |
| --- | --- |
| 🏠 **Home** | This week's top trending film, a scrolling ticker, the week's programme, new in cinemas and hidden gems |
| 🎛️ **Mood mixer** (Discover) | Turn on 1–4 moods. Films tagged with a genre from **every** chosen mood come first, then "close matches" labelled with the moods they fit |
| 🔍 **Discover & search** | Search any film; browse trending, new in cinemas, coming soon, hidden gems (a stated rule) and films on a chosen streaming service |
| 🎞️ **Film pages** | Cast, director, trailer, TMDB rating (labelled), **where to watch** in your region, recommendations and reviews; save, rate, review or add to a collection |
| 👆 **Swipe Match** | Pick a mood, length and services, vote on up to 20 real films, get a ranked shortlist with reasons |
| 🎰 **WheelMo** | A poster reel runs past a lit window and stops on tonight's film. The **server** picks the winner with a cryptographic random number before the reel stops, from exactly the films shown, each with an equal chance. No betting, no prizes |
| 🎬 **Reel Director** | Describe your night in your own words and get three picks (a safe choice, a wildcard and a hidden gem), each with a short reason |
| 🍿 **Movie Night** | Rooms with a 6-character code. Friends add films and vote yes or no **in private**; results show totals; **Match Decider** spins only the films everyone accepted. Live updates through Supabase Realtime |
| 🤖 **Mo** | A chat companion on every page that knows what you're looking at. It answers from real data with sources, and can do things for you (add to watchlist, spin WheelMo, open a Movie Night…), each only after you press **Confirm** |
| 🖼️ **Wall of Fame** | Every film you've watched as a framed poster. The frame upgrades as you rate and review, and favourites join a Hall of Fame. Gallery, Timeline and Shelf views |
| 💺 **Screening Activity** | Your month as a cinema seating chart: each day's seat glows brighter the more you watched, rated and reviewed. Streaks, top genre, and privacy (only me, friends or anyone) |
| 📚 **Explore & collections** | Public collections from the community; save, copy or spin them on WheelMo. Collections can be private, unlisted or public, with editors |
| 👥 **Profiles & follows** | Public profiles; people who follow each other are friends. Every section respects its owner's privacy setting |
| 🌍 **ViewMo & SceneAtlas** | A spinning sphere of this week's posters, and a filming-location globe (a preview, with no invented locations) |
| 🎨 **Personalisation** | The app's accent colour from a favourite film's logo, a faint poster background, a film-themed cursor, light and dark themes, reduced motion and region |
| 🔐 **Accounts** | Email and password sign-up (enter the password twice) that goes straight into the app. Watchlists, collections and activity are private by default |
| ♿ **Accessibility** | WCAG 2.2 AA checked with axe in both themes; full keyboard use; dragging is never required; reduced motion respected; works on phones |

Every page, explained in detail: **[docs/features.md](docs/features.md)**.

---

## 4. AI Integration

AI is used in **two features**, both running **only on the server**. The model is reached through any OpenAI-compatible API; the default is `gpt-5-mini`, and it can be changed with `OPENAI_MODEL`. The key never reaches the browser.

### Reel Director: picks from a fixed list (`src/app/api/director/route.ts`)

1. **The pool:** the server builds up to 180 real films from TMDB's current lists (popular films across moods, trending, hidden gems), filtered by the runtime you chose.
2. **The request:** the model receives your brief, inside quotation marks and marked as "the viewer's own words", plus that list. It must answer in a strict JSON format: three film **IDs** with a short reason each.
3. **The checks:** the server checks every pick:
   - it must be in the list;
   - all three must be different;
   - the "hidden gem" must meet the gem rule.

   Anything else is dropped.
4. **The cards:** the facts shown (title, year, runtime, genres, poster, rating) come from TMDB, not the model. Only the one-line reason is the model's own text, capped at 280 characters.

### Mo: a page-aware assistant with tools (`src/lib/mo/server.ts`, `src/app/api/mo/route.ts`)

- **What the server sends:** your recent conversation (the last 14 messages), the page you're on (and the film, place, room or collection on it), your device watchlist and logged watches, and whether Spoiler-free is on.
- **Tools for facts:** the model calls the server's **tools** to look things up:
  - `search_films`, `film_details`, `where_to_watch`, `films_for_moods` and `trending_films`, all from TMDB;
  - `my_watchlist` and `my_watched`, the person's own data;
  - `filming_locations`, checked SceneAtlas records only.

  The server runs each tool and returns the result, for up to 5 rounds. The reply then **streams** to the chat, with film cards and source links.
- **Actions:** the model can call `propose_action` with one of 9 allowed action types. The server **rebuilds** each proposal from checked data (titles and posters from TMDB, moods and pages from fixed lists) and sends it to the browser as a card. **Nothing happens until the person presses Confirm.** The browser then runs it through the same code and database checks as the app's own buttons.

### Where AI is not used

Some features look smart but use no AI:

- **WheelMo** and **Match Decider:** the winner is a cryptographic random draw in the database.
- **The mood mixer:** TMDB genre tags.
- **Swipe Match ranking:** documented weights.
- **The accent colour:** colour extraction from the film's logo or poster image.

---

## 5. External Tools & Datasets

| Tool / dataset | Used for |
| --- | --- |
| **[TMDB API](https://www.themoviedb.org/documentation/api)** | All film data: search, details, cast and crew, trending and discovery lists, genres, trailers metadata, posters and backdrops |
| **JustWatch** (via TMDB's watch-provider data) | Where each film streams, rents or sells, per region |
| **YouTube embedded player** | Playing official trailers (Clips, film pages) |
| **[Supabase](https://supabase.com)** | Postgres database with row level security, Auth (email and password), PostgREST API, and Realtime for Movie Night |
| **OpenAI-compatible LLM API** (default model `gpt-5-mini`) | Reel Director and Mo. Any compatible provider or gateway works via `OPENAI_BASE_URL` |
| **[Vercel](https://vercel.com)** | Hosting and deployment |
| **GitHub Actions** | An optional workflow that saves a TMDB snapshot (`.github/workflows/tmdb-snapshot.yml`) |
| **Next.js 16, React 19, TypeScript** | The web app |
| **motion** | Animation (page transitions, the WheelMo reel, Swipe Match cards) |
| **react-globe.gl, three.js, topojson-client, world-atlas** | The ViewMo sphere and the SceneAtlas globe and flat map |
| **sharp** | Reading colours from posters and logos for accent colours |
| **Lucide icons; Instrument Serif, Schibsted Grotesk, IBM Plex Mono** | Icons (ISC) and fonts (SIL Open Font License) |
| **Dataset: `data/tmdb-snapshot.json`** | A saved snapshot of up to 1,500 real TMDB films, so the app runs with no TMDB key |
| **Dataset: `data/demo/viemo_demo_community_seed.json`** | A fictional demo community (10 accounts with collections, reviews and follows) to try the social features. Always labelled **Demo** in the app |

---

## 6. Installation & Setup

### Quick start (no keys needed)

The repository includes a saved TMDB snapshot, so the app runs straight away.

```bash
# Requires Node.js 20.9 or newer
git clone https://github.com/Hari-HHaran/VieMo.git
cd VieMo
npm install
npm run dev
```

Open http://localhost:3000. Film pages, Discover, the mood mixer, Swipe Match, WheelMo (with your device watchlist), Clips, the Wall of Fame and Settings all work.

Accounts, Movie Night, Explore, Reel Director and Mo need the services below. Until you add them, each of those screens says it's switched off.

### Full setup

1. **Copy the settings file.** Copy `.env.example` to `.env.local`, then fill in what you need. Never commit `.env.local`; it's already in `.gitignore`.
2. **Live film data** (optional): set `TMDB_READ_TOKEN` to your TMDB API Read Access Token (themoviedb.org → Settings → API).
3. **Accounts and social features:**
   1. Create a free project at [supabase.com](https://supabase.com).
   2. In **SQL Editor → New query**, paste the whole of **`supabase/setup-all-migrations.sql`** and press **Run**. It creates every table, privacy rule and function in one transaction. Supabase's "destructive operations" warning is expected.
   3. In **Project Settings → API Keys**, copy:
      - the project URL into `NEXT_PUBLIC_SUPABASE_URL`;
      - the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
      - a secret key into `SUPABASE_SERVICE_ROLE_KEY`. This one is server only.
   4. The full guide, including Realtime and the auth settings, is in [`docs/supabase-setup.md`](docs/supabase-setup.md).
4. **AI features** (Reel Director and Mo): set `OPENAI_API_KEY`. For other OpenAI-compatible providers, also set `OPENAI_BASE_URL`, and `OPENAI_MODEL` to one of their models.
5. **Run:** `npm run dev`, then open `/status`. It lists what's connected, using names only and never values, and which database migrations are in place.

### Deploy to Vercel

1. Import the repository in Vercel.
2. Add the same variables under **Settings → Environment Variables**. Mark keys as **Sensitive**, and never prefix a secret with `NEXT_PUBLIC_`.
3. Deploy, then check `/status` on the live site.

### Environment variables

| Name | Needed for | Notes |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | live film data | Without it, the saved snapshot is used. `TMDB_API_KEY` (v3) also works |
| `TMDB_DEFAULT_REGION` | optional | default viewing region, e.g. `SG` |
| `NEXT_PUBLIC_SUPABASE_URL` | accounts | Supabase project address (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | accounts | the publishable or anon key (public by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | instant sign-up, demo import, signed-out WheelMo spins, film caching, Mo's daily cap | **secret, server only** |
| `NEXT_PUBLIC_SITE_URL` | password-reset emails | your site's address |
| `OPENAI_API_KEY` | Reel Director, Mo | **secret, server only** |
| `OPENAI_BASE_URL`, `OPENAI_MODEL` | optional | other providers or models (default `gpt-5-mini`) |
| `MO_MESSAGES_PER_MINUTE`, `MO_DAILY_MESSAGES_PER_VISITOR`, `MO_DAILY_TOKENS` | optional | Mo's limits (defaults: 10 a minute and 150 a day per visitor; 2,000,000 tokens a day site-wide) |
| `DEMO_SEED_ENABLED`, `DEMO_COMMUNITY` | optional | `true` allows the demo import at `/admin/demo`; `hide` hides demo content |
| `NIGHT_REALTIME` | optional | `off` makes Movie Night check every few seconds instead of using Realtime |

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build`, then `npm start` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:bundle` | Rebuild `supabase/setup-all-migrations.sql` from `supabase/migrations/` |
| `npm run snapshot` | Save a fresh TMDB snapshot (needs `TMDB_READ_TOKEN`) |
| `npm run ds:build` | Rebuild the design system |
| `PGHOST=… PGPORT=… sh supabase/tests/local/run.sh` | Run the database privacy and logic tests on a local Postgres |

---

## 7. AI Safety & Limitations

### Risks and the guardrails for each

| Risk | Guardrails |
| --- | --- |
| **Hallucinated facts:** invented films, wrong streaming availability, made-up filming locations | **Reel Director:**<ul><li>it can only pick IDs from a server-built list of real TMDB films;</li><li>every pick is validated, and invalid ones are dropped;</li><li>card facts come from TMDB.</li></ul>**Mo:**<ul><li>facts come from tools that call TMDB, JustWatch-via-TMDB and VieMo's own records;</li><li>its instructions forbid stating availability or filming locations unless a tool returned them;</li><li>film cards are built from TMDB data and source links are shown;</li><li>`filming_locations` only returns checked records, and today it truthfully says none have been researched.</li></ul> |
| **The AI acting without permission** | Mo has **no write access**: its only "action" tool returns a proposal. The server checks it against a fixed list of 9 action types and rebuilds it from verified data, so the model can't invent what a card says or does. It allows at most 2 cards per reply. Nothing runs until the person presses **Confirm**, and it then runs with the same database rules as the app's own buttons |
| **Prompt injection:** via your messages, film synopses or collection names | Both system prompts treat user text and tool results as information, never instructions. Actions are validated by the server no matter what the model says, and tool results are size-capped. Mo's tools run as the signed-in person under row level security, so it can't reach anyone else's private data |
| **Spoilers** | Mo's **Spoiler-free** switch is on by default and keeps answers within the official synopsis. Reviews marked as spoilers are hidden until you choose to reveal them |
| **Leaking secrets** | Every key is server-side only and never sent to the browser. `/status` shows variable names, never values, and warns if a secret is placed under a `NEXT_PUBLIC_` name. Tests check that no key appears in any page. No secrets are committed: `.env*` files are git-ignored, and only `.env.example` with blank placeholders is in the repo |
| **Cost and abuse** | Rate limits:<ul><li>Reel Director: 6 a minute;</li><li>Mo: 10 a minute and 150 a day per visitor, plus a shared daily token budget enforced in the database;</li><li>sign-up and sign-in attempts are limited too.</li></ul>Message length and history are capped |
| **Privacy:** what the AI provider sees | Only what's needed for the answer: messages, the current page, and your watchlist and logged watches. **Never** your email, password or keys. Private data stays behind Supabase row level security; the database is the one enforcing privacy, not hidden buttons |
| **Fairness:** WheelMo and Match Decider | Winners are drawn in the database with cryptographic randomness (rejection sampling, so every film has exactly the same chance). The draw is saved before the animation, so a retry or reload can't re-roll it. Match Decider only spins films **every** voter accepted, and a plain group spin says it isn't a vote. No betting, prizes or payments |
| **Fake social proof** | The demo community is clearly labelled **Demo** everywhere. Its accounts can't be signed into, and they can be hidden or removed with one button |

### Testing done

- **Database (223 automated checks, in the repo):**
  - `supabase/tests/local/` runs every migration on a fresh Postgres and tests as three different users and signed out;
  - it covers privacy, editing rights, private votes, results, fair and repeatable spins (including a 6,000-spin fairness test), and the demo importer's safety limits;
  - the one-file setup script is tested the same way.
- **Browser tests** (Playwright, against local stand-ins for TMDB, Supabase and the AI service):

  | Area | Checks |
  | --- | --- |
  | Accounts and sign-up | 67 + 13 |
  | Mo | 43 |
  | WheelMo | 45 |
  | Movie Night (three users in separate browsers) | 50 |
  | Explore and collections | 54 |
  | Demo import | 26 + 4 production-guard |
  | Screening Activity | 67 |
  | Mood mixer | 24 |
  | Navigation and settings | 47 |
  | Wall of Fame | 43 |
  | SceneAtlas | 43 |

  These scripts were run throughout development but aren't in this repository yet.
- **AI-specific tests:**
  - Mo's actions never run before Confirm, and Cancel changes nothing.
  - Actions outside the list, and films TMDB doesn't know, never become cards.
  - The AI key never reaches the browser.
  - Page context and the Spoiler-free setting reach the model.
  - Reel Director rejects a film ID that isn't in its list.
- **Other checks:**
  - 30,800 simulated WheelMo landings all frame the server's winner;
  - accessibility (axe, WCAG 2.2 AA) in light and dark themes;
  - keyboard-only use, reduced motion and phone widths.

### Known limitations

- **The AI can still be wrong in its own words.** Facts are grounded in tools, but Mo's sentences and Reel Director's one-line reasons are generated text. A model can still misread a tool result. Instructions guide the model; they can't guarantee its behaviour.
- **Results depend on the provider and model.** Some OpenAI-compatible gateways don't support structured output or streaming. VieMo falls back to simpler request formats, but quality varies by model.
- **Some rate limits are per server instance.** The per-minute and per-visitor limits are kept in memory. The shared daily token budget is the hard limit, and it needs the service-role key.
- **Sign-up has no email verification**, by design, for a quicker start. Someone could register an email they don't own, but password resets still go to the real inbox.
- **SceneAtlas is a preview.** It has no researched filming locations yet; researching them from Wikidata and Wikipedia is the next step.
- **Your diary is stored in your browser.** The diary and Wall of Fame live on the device for now; moving them into accounts is planned.
- **Availability data is only as current as TMDB.** It comes from JustWatch via TMDB, so it can lag behind the streaming services themselves.
- **Not every check ran against live services.** The automated tests ran against local stand-ins. Live TMDB, Supabase Realtime and the AI provider are best checked on the deployed site via `/status`.

---

## How it works

```
 Browser ──── pages, buttons, Mo ────▶ Next.js server (Vercel)
                                         │  server pages, API routes, form actions
                                         ├──▶ TMDB ........ film data, posters, trailers, where to watch
                                         ├──▶ Supabase .... accounts, collections, rooms, spins (row level security)
                                         └──▶ AI model .... Reel Director picks and Mo's replies (server only)
```

- **Next.js 16 (App Router).** Pages are rendered on the server; interactive parts run in the browser. `src/proxy.ts` keeps the Supabase session fresh, and forms use server actions.
- **Supabase.**
  - Every table has row level security, and Supabase's default open permissions are removed.
  - Sensitive writes, such as joining a room, voting, spinning or confirming a winner, go through database functions that check who's asking.
- **Where your data lives:**

  | | Signed out | Signed in |
  | --- | --- | --- |
  | Watchlist | this browser | this browser, plus your account watchlist |
  | Diary, Wall of Fame | this browser | this browser (moving it to your account is planned) |
  | Collections, follows, reviews, Movie Nights | — | your account |
  | Settings (colour, background, theme, cursor, region) | this browser | this browser |

---

## Project map

| Path | What's there |
| --- | --- |
| `src/app/(tabs)/` | Main pages: Home, Discover, Match (and Movie Night), Clips, Profile, Settings, Wall, Explore, Search, ViewMo, Reel Director, SceneAtlas |
| `src/app/film`, `src/app/c`, `src/app/u` | Film pages, collection pages, member profiles |
| `src/app/(account)/`, `src/app/auth/` | Sign-in, sign-up, password reset, account page |
| `src/app/api/` | Server routes: Mo, Reel Director, WheelMo, Movie Night, search, Screening Activity and more |
| `src/components/` | UI by feature: `mo/`, `wheelmo/`, `night/`, `wall/`, `screening/`, `community/`, `atlas/`, `account/`, `profile/`, `nav/`, `fx/` |
| `src/lib/ai.ts`, `src/lib/mo/` | The AI connection; Mo's tools, prompt and action checks |
| `src/lib/tmdb.ts`, `src/lib/snapshot.ts` | TMDB client and snapshot mode |
| `src/lib/supabase/` | Supabase clients and settings detection |
| `supabase/migrations/`, `supabase/setup-all-migrations.sql` | The database: tables, privacy rules and functions |
| `supabase/tests/local/` | Database tests |
| `design-system/` | Tokens, fonts, components and brand book |
| `docs/` | [`features.md`](docs/features.md) (every feature in detail), [`supabase-setup.md`](docs/supabase-setup.md), `plan.md` |

---

## Credits

- **Film data and images:** [TMDB](https://www.themoviedb.org/). *This product uses the TMDB API but is not endorsed or certified by TMDB.*
- **Where to watch:** JustWatch, via TMDB.
- **Trailers:** YouTube's embedded player.
- **Fonts and icons:** Instrument Serif, Schibsted Grotesk and IBM Plex Mono (SIL Open Font License); Lucide icons (ISC).

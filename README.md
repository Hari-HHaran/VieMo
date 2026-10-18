# VieMo

VieMo is a social film app. You find films to watch, keep track of what you've seen, put together collections, and decide what to watch tonight, alone or with friends.

It's built with Next.js, gets its film data from TMDB, stores accounts in Supabase, and uses an AI model for two features (Reel Director and Mo). It never makes up data. If something isn't connected or hasn't been researched yet, the screen says so instead of showing invented films, ratings, locations or activity.

**Contents**

- [The app at a glance](#the-app-at-a-glance)
- [What each feature does](#what-each-feature-does)
- [How it works](#how-it-works)
- [Setting it up](#setting-it-up)
- [Project map](#project-map)
- [Testing](#testing)
- [Data sources and credits](#data-sources-and-credits)

---

## The app at a glance

### Getting around

- **Five tabs:** Home, Discover, Match, Clips and Profile. On phones they're a bar along the bottom. From 768px wide they're a floating bar at the top.
- **Menu** (desktop), grouped into three:
  - **Discover:** Search, Explore collections, ViewMo, SceneAtlas.
  - **Decide:** Movie Night, Reel Director.
  - **You:** Wall of Fame, your library, Settings.
- **Reel Director button:** the film-strip button in the top bar rolls out its name when you hover over it.
- **Mo:** the round film-reel character in the corner of every page. It's a chat companion (see [Mo](#mo-the-movie-companion)).

### Every page

| Page | Address | What it's for |
| --- | --- | --- |
| Home | `/` | This week in film: the top trending film, the week's programme, new in cinemas, hidden gems |
| Discover | `/discover` | Search, the mood mixer, and browsing by list or streaming service |
| Search | `/search?q=…` | Any film on TMDB |
| Film page | `/film/<id>` | Everything about one film, where to watch it, and saving or logging it |
| ViewMo | `/viewmo` | A sphere of this week's posters you can spin and pick from |
| Match | `/match` | The place to decide: Swipe Match, WheelMo, Reel Director, Movie Night |
| WheelMo | `/match?mode=wheel` | A film roulette that picks from your watchlist, a collection or a surprise deal |
| Movie Night | `/match/night` | Rooms where friends pool films, vote in private and decide together |
| Reel Director | `/director` | Describe your night in words and get three picks |
| Clips | `/clips` | A full-screen trailer feed |
| Profile | `/profile` | Overview (your wall, Screening Activity, watchlist) and Library (your collections) |
| Wall of Fame | `/wall` | Every film you've watched, as a framed poster |
| Explore | `/explore` | Public collections from the community, and its members |
| Collection | `/c/<share id>` | One collection: its films, who made it, save or copy it |
| Member profile | `/u/<username>` | Someone's collections, watchlist, reviews and activity (as much as they allow) |
| SceneAtlas | `/atlas` | Preview: a globe of filming locations |
| Settings | `/settings` | Colour, background poster, theme, motion, cursor, region |
| Account | `/account` | Name, username, bio and privacy (signed in) |
| Sign in and sign up | `/sign-in`, `/sign-up`, `/forgot-password` | Accounts |
| Status | `/status` | For the site owner: what's connected and what isn't |
| Demo admin | `/admin/demo` | For editors: import or remove the demo community |

---

## What each feature does

### Home: the Festival Lobby

The front page, built around this week's films:

- **Top film:** the week's number one trending film fills the screen behind a spotlight that follows your pointer. It has buttons to plan a Movie Night, ask Reel Director, or save it to your watchlist.
- **Trending ticker:** a scrolling line of trending titles. It pauses when you hover, focus or scroll away.
- **This week's programme:** an editorial grid of films with save buttons.
- **New in cinemas and Hidden gems:** two rows you can fling sideways.
- **Your circle:** an "empty auditorium" until friends' activity exists. It says so rather than inventing a feed.

### Discover

- **Search** at the top finds any film on TMDB.
- **The mood mixer:** a desk of eight mood channels (Funny, Comforting, Thrilling, Emotional, Thought-provoking, Romantic, Adventurous, Scary).
  - Push up one to four moods. Each channel lists the TMDB genres it stands for; Thrilling, for example, means Thriller, Action or Crime.
  - With one mood, you get popular films in its genres.
  - With several, films tagged with a genre from every chosen mood come first. A "Close matches" row follows, each labelled with the moods it fits ("Fits Funny").
  - If nothing fits every mood, the page says so.
  - Your choice is kept in the address (`?moods=funny,scary`), so you can share it.
- **Rows of films:** Trending now, New in cinemas, Hidden gems and Coming soon.
  - Hidden gems follow a stated rule: rated 7.3 or more by 300 to 3,000 TMDB voters.
  - Dates and cinema listings follow your region.
- **Explore streaming:** pick a streaming service and see popular films on it in your region (JustWatch data via TMDB).
- **ViewMo** (`/viewmo`): up to 72 posters arranged on a sphere.
  - Drag it (it carries on spinning), use the arrow keys, or Tab through the posters.
  - Choosing a poster brings it forward with details and a watchlist button.
  - There's also a plain list view.

### Film page

Everything about one film:

- **The film:** backdrop and poster, year, runtime, age rating for your region, genres, director, cast, synopsis and trailer.
- **Ratings:** the TMDB rating, clearly labelled as TMDB's.
- **Where to watch** in your region: streaming, renting and buying, from JustWatch via TMDB.
- **Recommendations** from TMDB.
- **Buttons:**
  - **Watchlist:** save or unsave the film.
  - **Mark as watched:** log a watch, with optional rating, review, spoiler flag, tags and private notes. It goes on your Wall of Fame.
  - **Add to collection** (signed in).
  - **Share.**
- **Reviews** from people whose review visibility lets you see them.
- **Colour:** the page's accent colour is taken from the poster.

### Match: deciding what to watch

Match brings every way of deciding into one place, grouped into **Just me** and **With friends**.

#### Swipe Match (Quick pick)

1. Choose a mood, a length (under 90 minutes, 90 to 120, over 2 hours) and, if you like, your streaming services.
2. VieMo deals up to 20 real films that fit.
3. Vote on each film: Interested, Unsure or Not interested. Drag or fling the card, or use the buttons or the arrow keys.
4. You get a ranked shortlist, each film with a short reason drawn from your votes.

The ranking weights are documented in `docs/plan.md`.

#### WheelMo

A film roulette in the style of an old cinema machine. There's no betting, no prizes and no payment.

- **What goes on the wheel:** your watchlist, a collection, or a surprise deal of eight films filtered by length, mood and service.
- **Bigger lists:** the wheel holds 2 to 12 films. A larger list gets a random shortlist first, or you choose the twelve yourself. The wheel only ever holds the films you can see.
- **Spinning:** pull the lever (drag it past the mark) or just press **Spin**.
- **How the winner is picked:**
  - The server picks the winner with a cryptographic random number and saves it before the wheel turns. The animation only lands on that saved result.
  - A double-click, a retry or a reload shows the same winner rather than spinning again.
  - Every film has the same chance, and the wheel says so ("each has a 1 in 5 chance").
- **The winner:** a card with its poster, facts from TMDB and where to watch it, plus buttons to add it to your watchlist or open the film.
- **Sound** is off until you turn it on. With reduced motion, the result shows straight away.

#### Reel Director

Describe your evening in your own words, for example "something cosy and short for a rainy night with my mum". You get a storyboard of three picks, each with a short reason: a safe choice, a wildcard and a hidden gem.

The AI may only choose from a list of real TMDB films the server sends it. The server checks every pick against that list, the hidden-gem rule and your chosen length. The facts on each card come from TMDB, not the AI. Without an AI key, the page says Reel Director is switched off.

#### Movie Night

Group decisions for signed-in friends:

1. **Open a room.** The host gets a six-character code and an invite link. Rooms stay open for 24 hours.
2. **Join.** Friends join with their own accounts. Someone with the link who hasn't joined sees an invitation and nothing inside the room.
3. **Add films.** Everyone can add films from their watchlist, a collection, a search or a surprise deal of four films. A room holds up to 40.
4. **Vote.** Everyone says yes or no to each film. Votes are private: nobody, not even the host, sees how anyone voted. During voting, the room only shows how many films each person has voted on.
5. **Results.** The host shows the results. The room sees totals and the films that every voter said yes to.
   - **One film everyone said yes to:** it's a match.
   - **Several:** **Match Decider** spins WheelMo using exactly those films. That way a random pick only happens between films the whole group accepted.
6. **Group wheel.** The host can also spin a wheel from any of the room's films. It says plainly that it's a random pick, not a vote.
7. **Confirm.** The host confirms tonight's film and the room closes. Your recent rooms are listed on `/match/night`.

Everyone sees the same spin and the same winner at the same moment, including someone who joins late or reloads. Updates arrive instantly through Supabase Realtime. Without Realtime, the room says "Updating every few seconds" and checks every 4 seconds.

### Clips

A full-screen feed of official trailers, one at a time, with Previous and Next buttons. Trailers play in YouTube's own player. In Settings you can turn on muted autoplay and captions.

### Profile

- **Overview:**
  - a preview of your Wall of Fame;
  - Screening Activity, built from your own diary;
  - your watchlist.
- **Library** (signed in), also called My Cinema Library:
  - **your collections:** make, rename and delete them, and choose who can see each one;
  - **saved collections:** ones you've bookmarked from others;
  - **your account watchlist:** with an offer to bring over the watchlist saved on this device.

  The old `/library` address opens this tab.
- A **Settings** button in the header. The account note links to your public profile and account page.

### Wall of Fame

Every film you've watched, framed.

- **Frames show how much you've said about a film:**
  - **watched but not rated:** waits in a tray;
  - **rated:** a black frame;
  - **rated and reviewed:** a walnut frame with a brass placard;
  - **a favourite, or rated 4.5 or more:** joins the **Hall of Fame**, with a gilded frame, spotlight and ribbon.
- **Views:** Gallery (a salon-style wall), Timeline (by month) or Shelf (by decade).
- **Filters:** sort, filter by genre or decade, and choose what to show. Your choices are kept in the address.
- **Opening a frame** shows the full review (spoilers hidden until you ask), watch dates, tags and private notes. From there you can edit, log a rewatch, mark it a favourite, or take it down (with undo).
- **Logging:** use "Mark as watched" on any film page, or search from the wall itself.

### Screening Activity

Your month as a cinema seating chart: one seat per day, lit up by how much you did that day.

- **Points:** a watch is 1, a rating 1 and a review 2. The seat glows brighter in five steps (0, 1, 2–3, 4–5, 6 or more).
- **Filters:** all activity, watched, ratings or reviews.
- **Moving between months:** arrows, buttons, or PageUp and PageDown.
- **A day:** hover or tap a seat for a summary. Open it for that day's films, ratings and reviews (spoilers hidden).
- **Month stats:** totals, your current and longest streaks, your most active day and your top genre.
- **Who sees it:** on your Profile it's drawn from this device's diary. On your public profile (`/u/<username>`) it follows your setting: only me, friends (people who follow each other), or anyone. It starts on only me, and the database enforces the setting.

### Explore, collections and members

- **Explore** (`/explore`): public collections shown as record sleeves that fan out on hover, plus members to discover. You can search, and sort by newest or most saved.
- **Collections** (`/c/<share id>`):
  - **Visibility:** private (the default), unlisted (anyone with the link) or public (also listed in Explore).
  - **Others can** save (bookmark), copy (make their own private copy) or spin it on WheelMo.
  - **Owners can** invite editors. Editors can add and reorder films, but can't rename the collection, change who sees it or delete it.
- **Member profiles** (`/u/<username>`): name, bio, follower counts, and Follow or Follow back. People who follow each other are friends. Tabs show collections, watchlist, reviews and activity, each only as far as that person allows.
- **Reviews** can be private, friends only or public. Private watchlists, reviews and collections stay unreachable to everyone else, enforced by the database rather than just hidden on screen.

### Accounts

- **Signing up:** email and password with an email confirmation, sign-in and sign-out, forgotten password and reset.
- **Profile setup:** username, name and bio, and whether your watchlist is public (private by default).
- **Returning:** after signing in you come back to the page you were on.
- **Signed-out visitors** can still use most of the app. Their watchlist, diary and settings are kept in their browser, and the app says so.
- **Not yet built:** moving your diary into your account.

### Mo, the movie companion

Mo is a chat companion on every page. It knows which page you're on, and what's on it: the film on a film page, the place on the SceneAtlas globe, the Movie Night room you're in, or the collection you're viewing.

**What you can ask**

- "Where can I watch this?"
- "Who directed it?"
- "Something funny and under two hours"
- "What's trending this week?"
- "What have I rated highest?"

**How it answers**

- Replies stream in as they're written; **Stop** cuts one off.
- **Facts come from real data,** fetched by the server:
  - TMDB: search, film details, trending, and films for your moods;
  - JustWatch via TMDB: where to watch, in your region;
  - your own watchlist and watches;
  - checked filming locations from SceneAtlas.
- **It shows its work:** films Mo mentions appear as cards you can tap, with source links underneath.
- **No made-up filming locations:** none have been researched yet, so Mo says so rather than naming places.
- **Spoiler-free** is on by default (a switch at the top of the chat). While it's on, Mo stays within the official synopsis.

**What it can do for you**

- Mo can offer to:
  - add or remove a film from your watchlist, or open a film's page;
  - show films for chosen moods on Discover;
  - spin WheelMo (with your watchlist, or a surprise deal);
  - open a Movie Night room (signed in);
  - set a film's poster as your background, or change the theme;
  - take you to a page.
- **Every action is a card** that says exactly what will happen, with **Confirm** and **Cancel**. Nothing changes until you press Confirm, and Mo is told what you chose.
- **The AI can't invent an action:** the server rebuilds each card from checked data (titles and posters from TMDB, moods and pages from fixed lists). It also can't propose anything outside that list.

**Moving Mo:** on desktop, drag Mo anywhere and it snaps to the nearest edge, or move it from the chat's menu. On phones it sits above the tab bar and opens as a sheet. The conversation stays as you move between pages.

### SceneAtlas (preview)

A dotted globe for filming locations:

- spin it, zoom, or switch to a flat map (also used when your device can't show 3D);
- a list reaches every marker;
- a film search;
- a "Behind the Frame" panel for each place.

It's a preview. The markers are seven labelled sample cities with no film records, and choosing a film shows that no locations have been researched yet. The database tables for checked, sourced locations exist, but researching them from Wikidata and Wikipedia is the next step.

### Settings

Everything here is saved on this device.

- **Your colour:** pick a favourite film. VieMo reads the colours of its logo (or poster) and offers them as the app's accent colour, adjusted for each theme so text stays readable.
- **Background:**
  - Put a film's poster faintly behind every page, or behind Home only. Pick any film, or use your favourite from Your colour.
  - Strength runs from 4% to 14%, with an option to blur it.
  - The faintest grey text turns a little darker while a poster shows, so all text keeps at least 4.5:1 contrast.
- **Appearance:**
  - theme (match my device, dark or light);
  - reduce motion;
  - the **cinema cursor**;
  - muted trailer autoplay;
  - captions.
- **Region:** where-to-watch, cinema listings and release dates follow it. The default is Singapore.

Your name, username and privacy live on the account page instead.

### Look and feel

- **Worlds:** each part of the app has its own palette:
  - Home: amber;
  - Discover: navy and cyan;
  - Match: wine and rose;
  - Clips: black and violet;
  - Profile: midnight and silver;
  - Wall of Fame: a gallery;
  - film pages: colours taken from the poster.

  Every palette is checked against WCAG AA contrast before it's saved. The first time you enter a world, a curtain briefly names it.
- **Motion:**
  - pages cross-fade;
  - a tapped poster grows into the film page;
  - buttons spring when pressed;
  - a progress bar shows while a page loads.

  The Reduce motion setting, or your device's own setting, turns all of it off.
- **The cinema cursor** (mouse and trackpad only):
  - a dot with a trailing ring in the current page's accent;
  - over links and buttons the ring becomes a turning film reel;
  - over posters it becomes a camera viewfinder;
  - in text boxes you get the normal text cursor.

  It's off for touch screens and high-contrast mode, and you can switch it off in Settings.
- **Accessibility:**
  - every screen is checked with axe (WCAG 2.2 AA) in both themes;
  - everything works by keyboard;
  - dragging is never required (there's always a button);
  - touch targets are at least 24px;
  - nothing scrolls sideways on phones.

### For the site owner

- **`/status`** shows:
  - which settings the server found (names only, never values);
  - whether Supabase accepts the key;
  - which database migrations have run;
  - whether TMDB and the AI key are set.
- **The demo community** (`/admin/demo`, editors only): ten fictional accounts with collections, watch history, reviews and follows, for trying out the social features.
  - Everything they make is labelled **Demo**, and they can't be signed into.
  - Do a dry run first: every film is checked against TMDB, and anything without a confident match is reported, never guessed.
  - Importing again doesn't create duplicates.
  - One button removes them all without touching real accounts.
  - See `docs/supabase-setup.md`, section 6.

---

## How it works

```
 Browser ──── pages, buttons, Mo ────▶ Next.js server (Vercel)
                                         │  server pages, API routes, form actions
                                         ├──▶ TMDB ........ film data, posters, trailers, where to watch
                                         ├──▶ Supabase .... accounts, collections, rooms, spins (row level security)
                                         └──▶ AI model .... Reel Director picks and Mo's replies
```

- **Next.js 16 (App Router, React 19).**
  - Most pages are rendered on the server.
  - Interactive pieces are client components.
  - `src/proxy.ts` (Next 16's replacement for middleware) keeps the Supabase session fresh.
  - Form submissions go through server actions.
- **Secrets stay on the server.**
  - The TMDB token, the Supabase service-role key and the AI key never reach the browser.
  - The browser only ever gets Supabase's public (publishable) key.
- **TMDB:** called only from the server (`src/lib/tmdb.ts`), with responses cached for 1 to 24 hours. Without a token, the app can run from a saved snapshot of real TMDB data (see below), and every list shows the date it's from.
- **Supabase:**
  - It holds accounts, profiles, follows, watchlists, collections, reviews, Screening Activity totals, WheelMo spins and Movie Night rooms.
  - Every table has row level security, and Supabase's default API permissions are removed.
  - Writes that need care go through database functions that check who's asking. Examples: joining a room, voting, spinning, and confirming a winner.
- **Randomness you can trust:** WheelMo and Match Decider pick winners inside the database (`wheel_pick`, using cryptographic random bytes with rejection sampling so every film has exactly the same chance). Each spin has a request id, so asking twice returns the same spin.
- **The AI:**
  - It's used by Reel Director (structured picks from a fixed list) and Mo (a conversation with server-side tools).
  - It only sees data the server gives it, and its choices are checked before anything is shown or done.
  - Any OpenAI-compatible provider works (see `OPENAI_BASE_URL`).
- **Where your data lives:**

  | | Signed out | Signed in |
  | --- | --- | --- |
  | Watchlist | this browser | this browser, plus your account watchlist (bring the device list over from Library) |
  | Diary, Wall of Fame | this browser | this browser (moving it to your account is planned) |
  | Collections, follows, reviews, Movie Nights | — | your account |
  | Settings (colour, background, theme, cursor, region) | this browser | this browser |

---

## Setting it up

### Run it locally

1. Install Node 20.9 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in at least `TMDB_READ_TOKEN`.
3. Run `npm run dev` and open http://localhost:3000.

Other commands:

- `npm run build`, then `npm start`: a production build.
- `npm run typecheck`
- `npm run ds:build`: rebuild the design system.
- `npm run snapshot`: save a TMDB snapshot.

### Settings (environment variables)

Set these in Vercel under **Project → Settings → Environment Variables**, then redeploy. Tick **Sensitive** for keys. Never add `NEXT_PUBLIC_` to a secret.

| Name | Needed for | Notes |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | all film data | TMDB's API Read Access Token. `TMDB_API_KEY` (v3 key) also works |
| `TMDB_DEFAULT_REGION` | optional | default viewing region, e.g. `SG` |
| `NEXT_PUBLIC_SUPABASE_URL` | accounts | your Supabase project address |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | accounts | the publishable (or anon) key: public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | demo import, signed-out WheelMo spins, film caching, Mo's daily cap | secret; server only |
| `NEXT_PUBLIC_SITE_URL` | accounts | your site's address, used in email links |
| `OPENAI_API_KEY` | Reel Director and Mo | secret; server only |
| `OPENAI_BASE_URL` | optional | only for OpenAI-compatible providers |
| `OPENAI_MODEL` | optional | default `gpt-5-mini` |
| `MO_MESSAGES_PER_MINUTE` | optional | per visitor, default 10 |
| `MO_DAILY_MESSAGES_PER_VISITOR` | optional | default 150 |
| `MO_DAILY_TOKENS` | optional | the whole site's daily AI cap for Mo, default 2,000,000 (needs the service-role key) |
| `DEMO_SEED_ENABLED` | optional | `true` to allow the demo import at `/admin/demo` |
| `DEMO_COMMUNITY` | optional | `hide` hides demo content from Explore and elsewhere |
| `NIGHT_REALTIME` | optional | `off` makes Movie Night rooms check every few seconds instead of using Realtime |
| `VIEMO_ENV` | optional | `production`, `staging` or `local`. Overrides Vercel's own setting for the demo importer's safety checks |
| `VIEMO_SNAPSHOT_PATH` | optional | use a TMDB snapshot file from another path |

The app is forgiving about slightly different spellings of the Supabase and OpenAI variable names, and `/status` tells you what it found.

### Connect Supabase

Follow `docs/supabase-setup.md`. In short:

1. Run the seven files in `supabase/migrations/`, in order, in Supabase's SQL Editor.
2. Add the keys above in Vercel.
3. Set your site address and redirect links in Supabase Auth.
4. Check `/status` and the three-account checklist in that guide.

Section 7 of the guide covers Realtime for Movie Night.

### Run without a TMDB key: the snapshot

The app can run from a saved snapshot of real TMDB data (`data/tmdb-snapshot.json`): up to 1,500 trending, popular, top-rated, in-cinema, upcoming and per-genre films, with cast, trailers and where-to-watch.

1. On GitHub, add the repository secret `TMDB_READ_TOKEN` (**Settings → Secrets and variables → Actions**).
2. Run **Actions → TMDB snapshot → Run workflow**. The default region is `SG`; add more, like `SG,MY`.
3. The job commits the snapshot and Vercel redeploys.

If a token is set on the server, live data is used instead. Check TMDB's terms on caching before a public launch.

### Deploy

Import the repository in Vercel, add the variables above, and deploy. Accounts, the AI features and Realtime switch on as their variables and migrations are added. Until then, those screens say they're off.

---

## Project map

| Path | What's there |
| --- | --- |
| `src/app/(tabs)/` | The main pages: Home, Discover, Match (and Movie Night), Clips, Profile, Settings, Wall, Explore, Search, ViewMo, Reel Director, SceneAtlas |
| `src/app/film`, `src/app/c`, `src/app/u` | Film pages, collection pages and member profiles |
| `src/app/(account)/`, `src/app/auth/` | Sign-in, sign-up, password reset, account page and the email-link callback |
| `src/app/api/` | Server routes: Quick pick candidates, search, film card and palette, Reel Director, Mo, Screening Activity, WheelMo, Movie Night state, the current user |
| `src/app/admin/demo`, `src/app/status` | The demo importer and the status page |
| `src/components/` | UI by feature: `wheelmo/`, `night/`, `mo/`, `wall/`, `screening/`, `community/`, `atlas/`, `account/`, `profile/`, `nav/`, `fx/` (effects such as the cursor and background) |
| `src/lib/tmdb.ts`, `src/lib/snapshot.ts` | The TMDB client and snapshot mode |
| `src/lib/supabase/` | Supabase clients (as you, as the server, in the browser for Realtime) and settings detection |
| `src/lib/ai.ts`, `src/lib/mo/` | The AI connection; Mo's tools, prompt and shared action types |
| `src/lib/moods.ts`, `src/lib/mood-films.ts` | Moods and the multi-mood film search |
| `src/lib/wheel.ts`, `src/lib/night.ts` | WheelMo geometry and Movie Night types |
| `src/lib/wall.ts`, `src/lib/diary.ts`, `src/lib/screening.ts` | The diary on this device, Wall of Fame rules, Screening Activity scoring |
| `src/lib/device-store.ts` | What's saved in the browser: watchlist, settings, accent, background |
| `src/lib/worlds.json`, `scripts/worlds.mjs` | The colour world for each page. Run the script after editing; it refuses palettes below WCAG AA |
| `src/lib/motion.ts` | Shared motion timings and springs |
| `src/lib/demo/`, `data/demo/` | The demo community importer and its fixture |
| `src/styles/`, `src/app/app.css` | Styles by feature |
| `design-system/` | Tokens, fonts, components and the brand book. Edit `design-system/src/`, then run `npm run ds:build` |
| `supabase/migrations/` | The database: tables, row level security and functions (migrations 0001–0007) |
| `supabase/tests/local/` | Database checks |
| `docs/` | `supabase-setup.md` (connect Supabase), `plan.md` (product plan and feature status), `proposal-community-wheelmo.md` |

---

## Testing

- **Database:** `supabase/tests/local/run.sh` applies every migration to a fresh local Postgres and runs 220 checks. They sign in as three different accounts and signed out, covering privacy, editing rights, private votes, fair and repeatable spins, and the demo importer. Run it with `PGHOST=… PGPORT=… sh supabase/tests/local/run.sh`.
- **Typecheck and build:** `npm run typecheck` and `npm run build`.
- **Browser checks:** every feature above was checked in a real browser during development, including accessibility scans in both themes and phone widths. They ran against local stand-ins for TMDB, Supabase and the AI service, and those scripts aren't in this repository yet.
- **Not yet checked against the live services from here:** live TMDB, your live Supabase project (including Realtime) and a live AI key. `/status` is the quickest way to check them on your site.

---

## Data sources and credits

- **Film data and images:** [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
- **Where to watch:** JustWatch, via TMDB.
- **Trailers:** play in YouTube's embedded player.
- **Fonts and icons:** Instrument Serif, Schibsted Grotesk and IBM Plex Mono (SIL Open Font License; licences in `design-system/fonts/`), and Lucide icons (ISC).

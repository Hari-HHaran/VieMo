# VieMo: the feature guide

Every page and feature in detail. For the overview, setup and AI safety notes, see the [README](../README.md).

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

A film roulette in the style of an old cinema machine: a reel of real posters runs past a lit window and stops on tonight's film. There's no betting, no prizes and no payment.

- **What goes on the reel:** your watchlist, a collection, or a surprise deal of eight films filtered by length, mood and service.
- **Bigger lists:** the reel holds 2 to 12 films. A larger list gets a random shortlist first, or you choose the twelve yourself. The reel only ever holds the films you can see.
- **Spinning:**
  - Pulling the lever nudges the reel. Let go past the mark and the reel runs, or just press **Spin**.
  - While the server picks, the reel keeps rolling. Then it slows down, overshoots slightly and clicks back, framing the winning poster in the gold window.
  - The other posters dim and the winner glows. At speed the reel blurs with motion.
- **How the winner is picked:**
  - The server picks the winner with a cryptographic random number and saves it before the reel stops. The animation only lands on that saved result: at least 28 posters pass the window, and it always stops with exactly one poster framed.
  - A double-click, a retry or a reload shows the same winner rather than spinning again.
  - Every film has the same chance, and the page says so ("each has a 1 in 5 chance").
- **The winner:** a card with its poster, facts from TMDB and where to watch it, plus buttons to add it to your watchlist or open the film.
- **Sound** is off until you turn it on; with it on, each poster clicks as it passes the window. With reduced motion, the result shows straight away, with no rolling or blur.

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

- **Signing up:** email, password and the same password again, then straight into VieMo: no email link to click. After that, sign in with your email and password. Forgotten passwords are reset by email.
- **Profile setup** (optional, in Account): username, name and bio, and whether your watchlist is public (private by default). A new account's starting username comes from the name you gave, or `member`, plus a random ending; never from your email.
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

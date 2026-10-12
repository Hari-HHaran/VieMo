# Navigation

Five primary destinations, always in this order, always icon plus label, in the BottomNav bar on phones and the rail from 1024px.

| Tab | Icon | Answers | Top of the page |
| --- | --- | --- | --- |
| Home | `house` | What are my people watching? | Friends' activity (ActivityItem), then Popular with friends, then Community picks, clearly headed as people you don't follow |
| Discover | `compass` | What's out there? | Search field, mood FilterChips, then rails: Trending on TMDB, Popular with friends, New in cinemas, Explore streaming, Hidden gems, Coming soon, Collections |
| Match | `users` | What do we watch tonight? | Start Movie Night (`primary`, `tap-lg`), Join with a code, Previous sessions |
| Clips | `clapperboard` | Show me something. | Full-screen vertical trailer feed on `bg` |
| Profile | `user` | Who am I as a viewer? | Profile header, Diary, Reviews, Collections, Watchlist, Settings |

## Secondary screens

Film, review, collection, person and Movie Night screens open on top of the tab they came from. They keep the BottomNav visible, put a `chevron-left` back button and the screen title in a header, and return to the exact scroll position when closed.

- **Film**: backdrop, Poster `lg`, title in `type-display-lg`, facts line, Rating pair (VieMo and TMDB, labelled), primary action Add to watchlist, then Log or rate, Where to watch (ProviderBadge group), friends who watched, reviews, collections it appears in.
- **Movie Night**: lobby (participants, readiness, code in `type-code-lg`, invite) → viewing context (mood, genres with exclusions, runtime, services; three steps at most) → voting (SwipeCard stack with progress) → results (top pick with agreement score, why, alternatives, Confirm) → saved to history.
- **Appearance** (Profile → Settings, and the last, skippable onboarding step after favourite films): theme (System, Dark, Light), Reduce motion, Autoplay previews, and AccentPicker for the favourite film's colour.
- **Collection**: cover mosaic, title in `type-display-md`, creator, visibility, Save / Copy / Follow creator, ordered FilmCards with notes, Reorder mode with drag handles and move-up/move-down buttons.

## Rules

- A tab press on the current tab scrolls it to the top; it never resets filters the person set.
- Deep links (shared collections, invites) open the secondary screen with its parent tab selected.
- Destructive or session-ending exits (leave Movie Night as host, discard an unsaved review) ask first with a ConfirmModal; everything else exits immediately.
- The Match tab shows a status dot (`badge`) while the person is in a live session, so they can always get back to it.

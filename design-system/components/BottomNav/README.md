# BottomNav

The five primary destinations (Home, Discover, Match, Clips, Profile) as a bottom bar on phones and a labelled rail on desktop.

**Provide:** `current` (the active id) and `onNavigate` or real `href`s. Add `badge` text to an item to show a status dot, e.g. while a Movie Night is running.

- Always five items, always icon + label, always this order. Do not hide labels to save space.
- The current tab gets `aria-current="page"`, the `reel-ink` colour, a heavier stroke and a `reel` bar, so it reads without colour.
- `fixed` pins the bar above the safe-area inset; give the page `padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom))`.
- From 1024px wide use `layout="rail"` with `brand` on the left instead of the bar.
- Secondary screens (film, review, collection, session) keep the bar visible and add a back button in their header.

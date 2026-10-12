VieMo is a social film club: people discover films through friends, keep a diary, curate collections the way they would build playlists, and decide together on Movie Night. The interface should feel like the lobby of a good independent cinema: dark, warm, quiet, with the posters doing the talking. It is a social app first, and it never pretends to be a streaming service.

## Content fundamentals

- **Plain, warm, specific.** Short sentences. Say what happened and what the person can do next: "Saved to your watchlist", "Maya joined. Waiting for 2 more."
- **Sentence case everywhere**, including buttons and headings ("Start Movie Night", "Popular with friends"). Film titles keep their official casing.
- **Second person for the viewer, names for everyone else.** "You rated it 4", "Arjun reviewed The Lantern Keeper". Never "User 123".
- **Verbs on buttons.** "Add to watchlist", not "Watchlist". Destructive actions name the thing: "Delete review", never "OK".
- **No emoji, no exclamation marks, no hype.** No "Amazing pick!", no "🔥 Trending".
- **Never invent anything.** Ratings, counts, friends, reviews, availability and "trending" all come from real data with a named source. If there is no data, show an EmptyState that says so. Interface copy may illustrate with the personas Maya, Arjun and Mei only in design files, never in the product.
- **Name every outside source.** "TMDB 7.2/10", "Availability from JustWatch via TMDB · checked 3 h ago", "Trending on TMDB this week". VieMo's own ratings are labelled "VieMo".
- **Spoilers are opt-in.** A review marked as a spoiler shows "Contains spoilers" until the reader asks to see it, including in feeds and notifications.

## Visual foundations

### Colour

- Dark is the default theme and the first in `tokens.json`; Light follows the same rules. Set `data-theme` on `<html>`, and follow `prefers-color-scheme` until the person picks one.
- Grounds step up in lightness as they come forward: `bg` (app shell, Clips) → `surface` (sections) → `surface-raised` (cards) → `surface-overlay` (modals, sheets, toasts). Separate cards from their ground with a `line` border, not a heavier shadow.
- Text is `ink` for primary copy and `ink-muted` for metadata. `ink-faint` is only for source lines and placeholders, and never on `surface-overlay`.
- `reel` is the cinema-red accent and appears as a **fill** only: one primary button per view, the Interested vote, the active-tab bar, progress. Text on it is `on-reel`. When the accent is text or an icon (active nav label, links, selected chip), use `reel-ink`. Selected backgrounds are `reel-soft`.
- `amber` is for meaningful emphasis only: rating stars, the group's top pick, the agreement score. If amber is not marking something a person should notice, remove it.
- `positive` and `negative` are status colours, teal and vermilion, and always arrive with an icon and a word. `negative` is deliberately warmer than `reel` so an error never reads as the brand.
- Fallback posters use `poster-wine`, `poster-slate`, `poster-sepia` or `poster-smoke` with `poster-ink` text, the same in both themes.
- No gradients except the skeleton sheen and none of: glass blur, neon glow, coloured shadows.

### Type

- Three families. `display` (Instrument Serif) is the title-card voice: `type-display-xl` once per screen at most, `type-display-lg` for tab titles and the film title on its page, `type-display-md` for collection titles, swipe-card titles and empty-state headlines. Never below 24px, never bold.
- `sans` (Schibsted Grotesk) does all the work: `type-heading-lg` for section headings, `type-heading-md` for card titles and names, `type-body` by default, `type-body-lg` for long reading, `type-label` for controls, `type-caption` for metadata, `type-eyebrow` (uppercase) for two-word tags such as CONTAINS SPOILERS.
- `mono` (IBM Plex Mono) is the ticket stub: `type-code-lg` for join codes ("K7Q 4ZP"), `type-data` for numbers people compare (scores, counts, progress).
- The font files carry the Latin subset. Names and titles in other scripts (Chinese, Tamil, Japanese, Korean) fall back to the system faces in each stack; never fake them with the display face.
- Text must survive 200% zoom: no fixed heights on anything that holds text, and long titles clamp with a full accessible name rather than overflow.

### Space and layout

- 4px base. Phone pages use a `space-4` side gutter; sections are `space-8` apart; cards pad `space-4` (`space-3` when compact).
- Design at 360–430px first. On tablets, center a `content-max` (640px) reading column. From 1024px, swap the bottom bar for the BottomNav rail on the left and let film grids widen.
- Every tappable thing is at least `tap-min` (44px). The primary page action and the Match votes are `tap-lg` (56px) and sit in the bottom third of the screen where thumbs reach.
- Pages reserve `nav-height` plus the safe-area inset at the bottom so the BottomNav never covers content.

### Posters and imagery

- Posters are the hero of every surface. Always pair a title with its poster (Recognition rather than recall) and keep them 2:3 with `radius-md` at every size, `radius-sm` under 56px.
- Use TMDB artwork as supplied: no crops, filters, overlays or text on top. When the frame is not 2:3, letterbox on `surface`.
- No stock photography and no illustrations of people.

### Shape, depth and borders

- `radius-md` for posters and buttons, `radius-lg` for cards, the swipe card and toasts, `radius-xl` for modals and sheets, `radius-full` for chips, avatars and icon buttons.
- `shadow-card` at rest, `shadow-float` for anything over content. In dark, depth comes mostly from the surface steps.
- Control boundaries use `line-strong` (3:1); decorative dividers use `line`.

### Motion

- Motion explains a change of state and nothing else: a card leaves the stack, a sheet rises, a toast arrives. `duration-fast` for presses and toggles, `duration-base` for entrances, `duration-slow` for the swipe exit and the results reveal; `ease-out` for arrivals, `ease-in-out` for moves.
- Under `prefers-reduced-motion`, drop travel and scaling, keep fades at `duration-fast`, stop the skeleton sheen and never autoplay video.

### States

- Every interactive element shows the `focus-ring`: a 2px `bg` gap, then 2px of solid `focus`. Never remove it.
- Selected and active states change at least two things (icon, weight, border, fill), never colour alone.
- Loading: Skeleton on first load, a busy Button while saving, never a full-screen spinner. Empty: EmptyState with one action. Failed: ErrorState with Try again and, if cached data is showing, its age.
- Reversible actions get a Toast with Undo; irreversible ones get a ConfirmModal first.

## Iconography

- Lucide 0.460.0 outline icons (ISC licence), 24px grid, 1.75 stroke, `round` caps and joins, coloured with `currentColor`. In React use `lucide-react` at that version; the bundle's `Icon` covers the names listed in its card.
- Icons sit beside words. The only icon-only controls are Share, Edit, Delete, Close and the poster save toggle, and each has an accessible label.
- Filled glyphs mean a state: a liked heart, filled rating stars. Everything else is outline.
- No emoji, no brand logos drawn by hand. Streaming-service logos come only from TMDB's provider data; the monogram is the fallback.
- There is no VieMo logo yet: set the name in `type-display-lg` (Instrument Serif) in `ink`.

## Using this system

- Load `tokens.css`, then `components/bundle.css`, then React 18, then `components/bundle.js`; the components are on `window.VieMo` (`VieMo.FilmCard`, `VieMo.SwipeCard`, …). Types are in `components/index.d.ts`.
- Use token custom properties (`var(--reel)`, `var(--space-4)`) and the `type-*` classes; never paste raw values. In Tailwind, map theme colours, spacing and radii to these variables.
- Read each component's guidelines before use: they say what data it needs and which honesty rules it relies on you to enforce (privacy filtering, verified providers, real counts).

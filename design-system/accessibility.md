# Accessibility

VieMo targets WCAG 2.2 AA. These rules are built into the tokens and components; keep them when composing screens.

## Contrast

- Every text token holds 4.5:1 or better on the grounds its usage note names, in both themes; `line-strong`, `reel` fills, icons and the focus ring hold 3:1 or better against `bg`, `surface` and `surface-raised`.
- Do not put `ink-faint` on `surface-overlay`, or any text on a poster image.
- Never let colour carry meaning alone: votes have icons and words, chips change icon and border, the active tab has a bar and heavier stroke, ratings print their number, provider kinds are words.

## Input

- Touch targets are at least 44 × 44px (`tap-min`); the small Button and FilterChip extend their hit area invisibly to reach it.
- Every gesture has a button: swipe votes (Not interested, Unsure, Interested), Clips paging (Next and Previous buttons), collection reordering (Move up and Move down beside each drag handle).
- Everything works by keyboard in reading order. SwipeCard takes arrow keys; the rating input is a slider; ConfirmModal traps focus and returns it.
- The focus ring is never removed or recoloured.

## Screen readers

- Landmarks: one `<nav aria-label="Primary">`, one `<main>` per screen, a heading per section.
- Status changes are announced: Toast (`status` or `alert`), Skeleton `label`, busy Buttons (`aria-busy`), Movie Night joins and readiness ("Mei is ready, 3 of 4 ready").
- Images: posters beside their title are decorative; standalone posters get "<title> poster"; avatars are decorative beside names.
- Icon-only buttons always have a label naming the object: "Save to watchlist: The Lantern Keeper".

## Motion and media

- Respect `prefers-reduced-motion` (see Motion in the brand book) and offer an in-app "Reduce motion" and "Autoplay previews" setting that wins over the OS default.
- Clips never autoplay with sound. Play, pause, mute and captions are visible buttons; captions turn on whenever the source provides them. Important facts (title, runtime, where to watch) are printed outside the video.

## Text

- Support 200% text zoom and 320px width without horizontal scrolling; content reflows, titles clamp with a full accessible name.
- Plain language, short steps: Movie Night setup is three screens at most, and progress is always visible.

## Checking

- Run axe-core on every screen in both themes, and test with VoiceOver (iOS) and TalkBack (Android), a keyboard, 200% zoom and reduced motion. Record what passes, what fails and the fix.

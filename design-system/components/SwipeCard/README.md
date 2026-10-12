# SwipeCard

The Movie Night voting card: one film with the facts a group needs to decide, voted on by swipe, arrow keys or the three buttons below it.

**Provide:** `film` (title, year, runtime, genres, a spoiler-free synopsis, `rating` with its source, and the group's `providers`), `onVote('yes' | 'no' | 'skip')`, `progress`, and `onDetails` / `onTrailer`.

- Every gesture has a button: Not interested, Unsure and Interested are always visible at `tap-lg`. Arrow keys work when the card has focus.
- A vote is final for that card. Disable the card (`disabled`) while the vote is being saved and show the next one only after the server accepts it.
- Never show other people's votes, counts or "Maya liked this" on the card. Progress shows only the viewer's own position.
- Posters are letterboxed, not cropped. When no group service carries the film, say "Not on your group's services".
- With reduced motion the card does not fly away; the next one simply replaces it.

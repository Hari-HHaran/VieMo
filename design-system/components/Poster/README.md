# Poster

A film poster at 2:3 with `radius-md`, with a typographic fallback that sets the title in the display face on one of four `poster-*` grounds when TMDB has no artwork.

**Provide:** `title`, `year` and `src` built from TMDB's `poster_path` at the smallest size that covers the slot: `w185` for `sm` and `md`, `w342` for `lg`, `w500` for `fill`. Missing or broken images fall back on their own.

- Sizes come from tokens: `sm` = `poster-sm` (56px, initial only), `md` = `poster-md` (120px), `lg` = `poster-lg` (168px), `fill` = the height of its container.
- The fallback ground is picked from the title, so a film keeps the same colour everywhere.
- Never crop, recolour or overlay text on real poster art. The swipe card letterboxes posters instead of cropping them.
- `alt` is empty by default because a title is printed nearby. Give `alt="<title> poster"` when it is not.

# FilmCard

A poster with its title and one line of facts, used in rails, grids and search results; the whole card opens the film.

**Provide:** `title`, `year`, `runtime` (minutes), the first genre, `posterSrc`, and `href` (or `onOpen`). Add `onToggleSave` plus `saved` to show the watchlist toggle; add `rating` only when you have a real one.

- `md` (120px) in horizontal rails, `lg` (168px) in two-column grids at 360–430px.
- Titles clamp at two lines; the full title is still the link's accessible name.
- The save toggle is a real `aria-pressed` button on top of the stretched link, so it never opens the film by accident. It shows `bookmark-check` on a `reel` fill when saved.
- Show a TMDB rating as `{ value: 7.4, source: 'tmdb' }`, never as stars.

# AccentPicker

Lets a person swap VieMo red for a colour taken from their favourite film's logo, previewed live and tuned per theme so contrast never drops.

**Provide:** `film` (title, `posterSrc`), `swatches` from `VieMo.extractSwatches` with their `source` (`logo` or `poster`), `neutral` when nothing colourful was found, `value` (the chosen source hex, or `null` for VieMo red), `onChange`, and `onApply` + `saving` to store the choice.

- **Getting swatches.** On the server, take the film's logo from TMDB (`/movie/{id}/images`, `logos`, the person's language first, then untagged), read its pixels (for example with sharp's raw RGBA output) and call `extractSwatches(pixels, { max: 4 })`. Most title logos are white or black, so when the result is `neutral`, run it again on the poster and mark those swatches `source: 'poster'`. Cache the result per film.
- **Applying.** Store the chosen source hex on the person's preferences, then call `VieMo.applyAccent(hex)` at start-up (or render `accentCss(hex, 'html[data-vm-accent]')` on the server to avoid a flash). `applyAccent(null)` returns to VieMo red. Wrap a single element in `AccentScope` to show an accent in one place only, e.g. a profile header.
- **What changes.** Only `reel`, `on-reel`, `reel-ink` and `reel-soft`. `deriveAccent` keeps the source hue, lowers chroma to avoid neon, and moves lightness separately for dark and light until the fill holds 3:1 on `bg`, `surface` and `surface-raised`, its label 4.5:1, and `reel-ink` 4.5:1 on every surface and `reel-soft`. Amber, positive, negative, the surfaces and ink never change.
- **Black-and-white films** offer "Black and white", a warm-grey accent, and VieMo red is always an option.
- Say where a colour came from ("Colours from its logo: …"). Never show the logo itself as decoration, and never claim a studio or film endorses the theme.
- It is a radio group: arrow keys move and select, and the preview below the options updates as you go.

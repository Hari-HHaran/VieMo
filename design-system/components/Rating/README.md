# Rating

Shows a rating with its source, or takes one: people rate in stars from 0.5 to 5, and outside scores show as a number out of 10 with a source tag, so the two never look alike.

**Provide:** `value` and `source`: `friend` (stars), `yours` (stars + "You"), `community` (stars + "VieMo" + `count`), or `tmdb` (outline star, "7.2/10", "TMDB"). Pass `onChange` to turn it into the input.

- `community` with `count: 0` prints "No VieMo ratings yet". Never average zero ratings into a number.
- Stars fill in `amber` over `line-strong` outlines; the numeric value is always printed beside them, so the meaning never depends on colour.
- The input is one `role="slider"`: arrows move 0.5, Home/End jump to 0.5 and 5, number keys set whole stars, Delete clears (with `onClear`). Each star is a 40px target.

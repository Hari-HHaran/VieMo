# FilterChip

A toggle for one filter value: mood, genre, runtime or service. Selected chips gain a check and a `reel-soft` fill; tri-state chips can also exclude.

**Provide:** `label`, `state` and `onChange`. Set `triState` where exclusion is meaningful (genres in Match): off → included → excluded → off.

- Excluded chips use a minus icon, a dashed border and struck-through text, so the three states differ without colour.
- Keep rows to the choices that matter (six moods, not twenty). Put the rest behind "More genres".
- Two-state chips expose `aria-pressed`; tri-state chips put their state in the accessible name.

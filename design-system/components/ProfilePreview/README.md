# ProfilePreview

A person at a glance: avatar, name, handle, and a Follow button, as a card in discovery or a compact row in lists.

**Provide:** `name`, `handle`, `href`, `following` and `onToggleFollow`. In the card layout add `bio`, real `stats` and `tasteTags` when the person chose to show them. Set `followsYou` when true.

- Follow is `primary` with `user-plus`; Following is `secondary` with `user-check` and `aria-pressed`. Pressing Following unfollows; confirm only if you also remove something.
- Omit a stat rather than print a zero you have not counted.
- `layout="row"` for search results and follower lists; `card` for "People with similar taste".

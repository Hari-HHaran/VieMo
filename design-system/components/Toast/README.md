# Toast

A short status message after an action, with an optional Undo or Retry, that never covers the bottom navigation.

**Provide:** `message`, `tone` (`positive` for success, `negative` for failure, `neutral` for information), `action` when the step can be undone or retried, `onDismiss`, and `duration`. Set `floating` to pin it above the nav.

- Prefer Undo over confirmation for reversible actions: removing from watchlist, unfollowing, removing a film from a collection.
- With an action, it stays at least 6 seconds and pauses while hovered or focused. Failures (`negative`) use `role="alert"`; the rest `role="status"`.
- One toast at a time. A newer one replaces the older.

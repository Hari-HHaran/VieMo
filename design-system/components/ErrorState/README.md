# ErrorState

Explains in plain words what failed, what is still safe, and how to recover, with Try again as the main action.

**Provide:** `title`, `body`, `onRetry` and `retrying`. Add `cachedNote` when older data stays on screen, `detail` for the technical cause in small print, and `secondaryAction` for a way around the problem.

- Name the part that failed ("Film details didn't load"), not the whole app.
- Never replace missing data with invented data. If cached details are shown, say how old they are.
- It uses `role="alert"`, so render it only when the failure happens, not on page load for a stale error.

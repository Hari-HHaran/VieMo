# ReviewCard

A person's rating and written review of one film, with progressive disclosure for long text and a shield for spoilers.

**Provide:** `author`, `film`, `rating`, `text`, `watchedOn` (+ `watchedOnISO`), `spoiler`, like and comment counts with their handlers, and `href` for the full review page. For the viewer's own review add `isOwn`, `visibility`, `onEdit` and `onDelete`.

- Text over 220 characters clamps to four lines with a "Read more" button (`aria-expanded`).
- `spoiler` hides the text behind "Contains spoilers" until the reader presses Show review. Never show any part of a spoiler review in a preview or notification.
- Show `visibility` only to the author. Other people only ever receive reviews they are allowed to see; the card does not filter.
- Delete goes through a ConfirmModal; Edit opens the diary entry.

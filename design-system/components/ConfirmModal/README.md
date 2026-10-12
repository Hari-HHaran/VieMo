# ConfirmModal

A native modal dialog that asks before anything destructive or hard to undo, naming exactly what will be lost.

**Provide:** `open`, a question as `title` ("Delete your review?"), a `body` that lists what goes, a specific `confirmLabel` ("Delete review"), a gentle `cancelLabel` ("Keep it"), `onConfirm`, `onCancel`, and `destructive` for deletes. Set `busy` while the request runs.

- It is a `<dialog>` opened with `showModal()`: focus is trapped, the page behind is inert, Escape and the scrim cancel, and focus returns to the trigger.
- Focus starts on the cancel button, the safe choice.
- Use it for: deleting a review, diary entry or collection; removing a collaborator; leaving a Movie Night as host. Do not use it for reversible actions; use a Toast with Undo instead.

# Button

The one control for every action that is not a toggle: one `primary` per view, `secondary` beside it, `ghost` for low-stakes exits, `danger` only inside a confirmation.

**Provide:** a verb-first label in sentence case ("Add to watchlist", "Start Movie Night"), `onClick` or `href`, and `icon` when an icon makes the action recognisable at a glance.

- `size="lg"` (56px, `tap-lg`) for the primary action on a mobile page and the Match votes; `md` (44px) everywhere else; `sm` (36px visual, 44px hit area) only inside dense rows.
- `busy` while a request runs ("Publishing", "Joining"): it shows a spinner, sets `aria-busy` and blocks double submits. Change the label to the present participle.
- `iconOnly` needs `label`, which becomes the accessible name. Use it for Share, Edit, Delete and Close only.
- Do not disable a button to explain a rule. If "Confirm pick" is unavailable, say why in text next to it.
- `danger` (fill `negative`, text `on-negative`) appears only in a ConfirmModal or on a settings page, never in a feed.

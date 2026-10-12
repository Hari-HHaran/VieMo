# ActivityItem

One entry in the Home feed: who did what to which film or collection, and when, with the object one tap away.

**Provide:** `actor`, `verb` (`watched`, `rated`, `reviewed`, `watchlisted`, `collection`), the `film` or `collection`, `timestamp` + `datetime`, and `rating` and `excerpt` when the activity has them.

- Render only activity the viewer is allowed to see under the actor's privacy settings; the component trusts what it is given.
- The sentence is the heading: "Arjun Rao reviewed The Lantern Keeper · 2 h". Names and titles are links in weight 600, so they read as links without colour.
- Spoiler excerpts use the same shield as ReviewCard.
- Separate rows with `line`; the object sits in a `surface-raised` panel.
- Group repeated actions by the same person on the same film into one item before rendering.

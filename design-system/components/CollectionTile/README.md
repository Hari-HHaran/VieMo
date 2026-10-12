# CollectionTile

A themed list of films shown as a four-poster mosaic (or a chosen cover) with its title, creator and size; the tile opens the collection.

**Provide:** `title`, `href`, `creator`, `filmCount`, and the first four films' `posters` in collection order (or `coverSrc`). Add `visibility`, `collaborative` and up to three `moodTags`. Add `onToggleSave` + `saved` for collections the viewer does not own.

- Save puts a collection in the viewer's library; it is not Follow (a person) or Copy (an editable duplicate). Keep those words exact.
- Show the visibility tag only when it is not Public.
- Lay tiles out two to a row on phones (`space-3` gap).

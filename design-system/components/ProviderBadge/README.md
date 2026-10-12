# ProviderBadge

One verified way to watch a film: the service, how you get it (Subscription, Free, Free with ads, Rent, Buy, In cinemas), and a link when one exists.

**Provide:** `name`, `kind`, `logoSrc` from TMDB's watch-provider `logo_path`, and `href` + `linkType`. Use `direct` only for a verified deep link to that film; otherwise `source` and link to the TMDB/JustWatch page.

- Render badges only from provider data for the viewer's region. A badge is a claim that the film is there; never show one for a provider you merely support.
- Always put the group under a heading that names the region ("Where to watch in Singapore") and a `ink-faint` source line with freshness ("Availability from JustWatch via TMDB · checked 3 h ago").
- The kind is printed in words, never signalled by colour.
- Links open in a new tab and say so to screen readers. Never build a provider URL by hand.

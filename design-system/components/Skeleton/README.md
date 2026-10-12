# Skeleton

Placeholder shapes that match the layout about to load, so the page does not jump when data arrives.

**Provide:** a `variant` that mirrors the real component (`activity`, `film-card`, `poster`, `avatar`, `text`) and, on one skeleton per region, a `label` such as "Loading friends' activity".

- Show skeletons only for the first load of a region. For a refresh, keep the old content and show progress elsewhere.
- After 10 seconds without data, replace the skeleton with an ErrorState.
- The sheen runs once per `duration-sheen` and stops under reduced motion.

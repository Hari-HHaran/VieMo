'use client';
/* Client boundary for the design-system components (they use hooks). Pure helpers such as
   extractSwatches can be imported straight from '@ds/components/viemo.mjs' on the server. */
export {
  Button, Icon, Avatar, Poster, FilmCard, Rating, ProviderBadge, CollectionTile, SwipeCard, FilterChip, BottomNav,
  Skeleton, EmptyState, ErrorState, ConfirmModal, Toast, AccentPicker, AccentScope, applyAccent, accentCss, deriveAccent,
} from '@ds/components/viemo.mjs';

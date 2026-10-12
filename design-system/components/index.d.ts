import type * as React from 'react';

/** A Lucide 0.460.0 icon name included in the bundle (see VieMo.iconNames). */
export type IconName =
  | 'house' | 'compass' | 'users' | 'clapperboard' | 'user' | 'search' | 'star' | 'heart' | 'bookmark' | 'bookmark-plus'
  | 'bookmark-check' | 'plus' | 'minus' | 'check' | 'x' | 'share-2' | 'play' | 'pause' | 'volume-2' | 'volume-x' | 'captions'
  | 'message-circle' | 'eye' | 'eye-off' | 'lock' | 'globe' | 'link' | 'grip-vertical' | 'arrow-up' | 'arrow-down'
  | 'chevron-left' | 'chevron-right' | 'ellipsis' | 'triangle-alert' | 'rotate-cw' | 'wifi-off' | 'film' | 'tv' | 'ticket'
  | 'clock' | 'calendar' | 'undo-2' | 'info' | 'circle-help' | 'external-link' | 'list-plus' | 'copy' | 'bell' | 'popcorn'
  | 'trash-2' | 'pencil' | 'sliders-horizontal' | 'user-plus' | 'user-check' | 'loader-circle' | 'settings';

export type Visibility = 'public' | 'followers' | 'unlisted' | 'private';

export interface IconProps { name: IconName; size?: number; strokeWidth?: number; filled?: boolean; /** Gives the icon role="img"; omit when a visible label sits beside it. */ label?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement | null;

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName; iconAfter?: IconName;
  /** Hide the text; `label` becomes the accessible name. */
  iconOnly?: boolean; label?: string;
  /** Shows a spinner, sets aria-busy and disables the button. */
  busy?: boolean;
  /** Renders an <a> instead of a <button>. */
  href?: string;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface AvatarProps { name: string; src?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; /** Default true: hidden from screen readers because the name is printed beside it. */ decorative?: boolean; className?: string }
export declare function Avatar(props: AvatarProps): React.ReactElement;

export interface PosterProps {
  title: string; year?: number | string;
  /** TMDB image URL, e.g. https://image.tmdb.org/t/p/w342{poster_path}. Missing or broken shows the typographic fallback. */
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'fill' | number;
  /** Empty by default (the title is printed nearby). Pass "<title> poster" when it stands alone. */
  alt?: string; eager?: boolean; className?: string;
}
export declare function Poster(props: PosterProps): React.ReactElement;

export interface RatingProps {
  /** 0.5–5 for people; 0–10 for TMDB. Null shows "Not rated". */
  value?: number | null;
  source?: 'friend' | 'yours' | 'community' | 'tmdb';
  max?: 5 | 10;
  /** Number of VieMo ratings behind a community value. 0 renders "No VieMo ratings yet". */
  count?: number;
  compact?: boolean; size?: number; className?: string;
  /** Supplying onChange turns the component into the 0.5-step input (role="slider"). */
  onChange?: (value: number) => void;
  onClear?: () => void; label?: string; disabled?: boolean;
}
export declare function Rating(props: RatingProps): React.ReactElement;

export interface FilmCardProps {
  title: string; year?: number; runtime?: number; genres?: string[]; posterSrc?: string | null;
  href?: string; onOpen?: () => void;
  size?: 'md' | 'lg';
  saved?: boolean; onToggleSave?: () => void;
  rating?: RatingProps; note?: string; className?: string;
}
export declare function FilmCard(props: FilmCardProps): React.ReactElement;

export interface PersonRef { name: string; handle?: string; avatarSrc?: string; href?: string }
export interface FilmRef { title: string; year?: number; runtime?: number; posterSrc?: string | null; href?: string }

interface SocialProps { liked?: boolean; likeCount?: number; onToggleLike?: () => void; commentCount?: number; onComment?: () => void }

export interface ReviewCardProps extends SocialProps {
  author: PersonRef; film: FilmRef;
  rating?: number | null; text?: string; spoiler?: boolean; large?: boolean;
  watchedOn?: string; watchedOnISO?: string;
  /** Link to the full review page. */
  href?: string;
  isOwn?: boolean; visibility?: Visibility; onEdit?: () => void; onDelete?: () => void; className?: string;
}
export declare function ReviewCard(props: ReviewCardProps): React.ReactElement;

export interface ActivityItemProps extends SocialProps {
  actor: PersonRef;
  verb: 'watched' | 'rated' | 'reviewed' | 'watchlisted' | 'collection';
  film?: FilmRef;
  collection?: { title: string; count?: number; href?: string; posters?: { title: string; posterSrc?: string | null }[] };
  rating?: number | null; excerpt?: string; spoiler?: boolean;
  /** Short relative time to print ("2 h"), plus the ISO datetime for <time>. */
  timestamp: string; datetime: string; className?: string;
}
export declare function ActivityItem(props: ActivityItemProps): React.ReactElement;

export interface ProfilePreviewProps {
  name: string; handle: string; avatarSrc?: string; href?: string; bio?: string;
  /** Only real counts. Omit a key to hide it. */
  stats?: { watched?: number; followers?: number; following?: number };
  tasteTags?: string[];
  followsYou?: boolean; following?: boolean; onToggleFollow?: () => void; isSelf?: boolean;
  layout?: 'card' | 'row'; className?: string;
}
export declare function ProfilePreview(props: ProfilePreviewProps): React.ReactElement;

export interface ProviderBadgeProps {
  name: string;
  kind: 'stream' | 'free' | 'ads' | 'rent' | 'buy' | 'cinema';
  logoSrc?: string; price?: string;
  href?: string;
  /** 'direct' only for a verified deep link to the film on the provider; otherwise 'source' (the TMDB/JustWatch page). */
  linkType?: 'direct' | 'source';
  className?: string;
}
export declare function ProviderBadge(props: ProviderBadgeProps): React.ReactElement;

export interface CollectionTileProps {
  title: string; href?: string; onOpen?: () => void;
  creator: { name?: string; handle?: string };
  filmCount: number;
  /** First four films in the collection's order. Ignored when coverSrc is set. */
  posters?: { title: string; posterSrc?: string | null }[];
  coverSrc?: string;
  visibility?: Visibility; collaborative?: boolean; moodTags?: string[];
  saved?: boolean; onToggleSave?: () => void; className?: string;
}
export declare function CollectionTile(props: CollectionTileProps): React.ReactElement;

export type Vote = 'yes' | 'no' | 'skip';
export interface SwipeCardProps {
  film: FilmRef & { genres?: string[]; synopsis?: string; rating?: RatingProps; providers?: { name: string }[] };
  onVote: (vote: Vote) => void;
  onDetails?: () => void; onTrailer?: () => void;
  /** current is 1-based: "Film 4 of 20". */
  progress?: { current: number; total: number };
  disabled?: boolean; className?: string;
}
export declare function SwipeCard(props: SwipeCardProps): React.ReactElement;

export interface FilterChipProps {
  label: string;
  state?: 'off' | 'on' | 'excluded'; selected?: boolean;
  /** Third tap excludes (genres in Match). */
  triState?: boolean;
  onChange?: (state: 'off' | 'on' | 'excluded') => void;
  icon?: IconName; count?: number; disabled?: boolean; className?: string;
}
export declare function FilterChip(props: FilterChipProps): React.ReactElement;

export interface NavItem { id: string; label: string; icon: IconName; href: string; /** Short screen-reader text for a status dot, e.g. "Movie Night in progress". */ badge?: string }
export interface BottomNavProps {
  current: string; items?: NavItem[];
  layout?: 'bar' | 'rail'; fixed?: boolean; brand?: React.ReactNode; label?: string;
  onNavigate?: (id: string) => void; className?: string;
}
export declare function BottomNav(props: BottomNavProps): React.ReactElement;

export interface SkeletonProps { variant?: 'text' | 'poster' | 'avatar' | 'film-card' | 'activity'; lines?: number; width?: string; /** Announced once via role="status". Give it to one skeleton per region. */ label?: string; className?: string }
export declare function Skeleton(props: SkeletonProps): React.ReactElement;

export interface StateAction { label: string; onClick?: () => void; href?: string; icon?: IconName }
export interface EmptyStateProps { title: string; body?: string; icon?: IconName; action?: StateAction; secondaryAction?: StateAction; compact?: boolean; className?: string }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

export interface ErrorStateProps {
  title?: string; body?: string; icon?: IconName;
  onRetry?: () => void; retrying?: boolean;
  /** When cached data is on screen, say how old it is. */
  cachedNote?: string;
  /** Technical detail in small print, e.g. the failing service. */
  detail?: string;
  secondaryAction?: StateAction; compact?: boolean; className?: string;
}
export declare function ErrorState(props: ErrorStateProps): React.ReactElement;

export interface ConfirmModalProps {
  open: boolean; title: string; body?: string; children?: React.ReactNode;
  confirmLabel?: string; cancelLabel?: string; destructive?: boolean; icon?: IconName; busy?: boolean;
  onConfirm: () => void; onCancel: () => void; className?: string;
}
export declare function ConfirmModal(props: ConfirmModalProps): React.ReactElement;

export interface ToastProps {
  message: string; tone?: 'neutral' | 'positive' | 'negative'; icon?: IconName;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  /** Auto-dismiss after ms; at least 6000 when there is an action; paused while hovered or focused. */
  duration?: number;
  floating?: boolean; className?: string;
}
export declare function Toast(props: ToastProps): React.ReactElement;

declare global {
  interface Window {
    VieMo: {
      Button: typeof Button; Icon: typeof Icon; Avatar: typeof Avatar; Poster: typeof Poster; FilmCard: typeof FilmCard;
      Rating: typeof Rating; ReviewCard: typeof ReviewCard; ActivityItem: typeof ActivityItem; ProfilePreview: typeof ProfilePreview;
      ProviderBadge: typeof ProviderBadge; CollectionTile: typeof CollectionTile; SwipeCard: typeof SwipeCard;
      FilterChip: typeof FilterChip; BottomNav: typeof BottomNav; Skeleton: typeof Skeleton; EmptyState: typeof EmptyState;
      ErrorState: typeof ErrorState; ConfirmModal: typeof ConfirmModal; Toast: typeof Toast;
      iconNames: IconName[]; formatRuntime: (minutes: number) => string | null;
    };
  }
}

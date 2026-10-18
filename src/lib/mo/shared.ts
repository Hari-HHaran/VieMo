/* What Mo and the app say to each other. Shared by the server (which checks every proposal) and the browser
   (which shows it as a card and runs it only when the person presses Confirm). */
export interface FilmRef { id: number; title: string; year: number | null; posterPath: string | null }

export const MO_PAGES = {
  '/': 'Home', '/discover': 'Discover', '/match': 'Match', '/match/night': 'Movie Night', '/clips': 'Clips', '/profile': 'Profile',
  '/profile?tab=library': 'Your library', '/wall': 'Wall of Fame', '/settings': 'Settings', '/explore': 'Explore collections',
  '/director': 'Reel Director', '/viewmo': 'ViewMo', '/atlas': 'SceneAtlas', '/search': 'Search',
} as const;
export type MoPath = keyof typeof MO_PAGES;

export type MoAction =
  | { kind: 'add_to_watchlist'; film: FilmRef }
  | { kind: 'remove_from_watchlist'; film: FilmRef }
  | { kind: 'open_film'; film: FilmRef }
  | { kind: 'browse_moods'; moods: { id: string; label: string }[] }
  | { kind: 'spin_wheelmo'; source: 'watchlist' | 'surprise' }
  | { kind: 'start_movie_night'; title: string }
  | { kind: 'set_background'; film: FilmRef }
  | { kind: 'set_theme'; theme: 'dark' | 'light' | 'system' }
  | { kind: 'open_page'; path: MoPath };
export const ACTION_KINDS = ['add_to_watchlist', 'remove_from_watchlist', 'open_film', 'browse_moods', 'spin_wheelmo', 'start_movie_night', 'set_background', 'set_theme', 'open_page'] as const;

const film = (f: FilmRef) => `${f.title}${f.year ? ` (${f.year})` : ''}`;
const THEME = { dark: 'Dark', light: 'Light', system: 'Match my device' } as const;
/* The words on the card: what will happen, and the button that does it. */
export function describeAction(a: MoAction): { summary: string; confirm: string } {
  switch (a.kind) {
    case 'add_to_watchlist': return { summary: `Add ${film(a.film)} to your watchlist.`, confirm: 'Add to watchlist' };
    case 'remove_from_watchlist': return { summary: `Take ${film(a.film)} off your watchlist.`, confirm: 'Remove' };
    case 'open_film': return { summary: `Open the page for ${film(a.film)}.`, confirm: 'Open film' };
    case 'browse_moods': return { summary: `Show films on Discover for ${a.moods.map((m) => m.label).join(' + ')}.`, confirm: 'Show films' };
    case 'spin_wheelmo': return { summary: a.source === 'watchlist' ? 'Open WheelMo with your watchlist and spin it.' : 'Open WheelMo, deal eight surprise films and spin.', confirm: 'Spin WheelMo' };
    case 'start_movie_night': return { summary: `Open a new Movie Night room called “${a.title}” and take you there. You can share its code after.`, confirm: 'Open the room' };
    case 'set_background': return { summary: `Put the poster of ${film(a.film)} faintly behind the app. You can change it in Settings.`, confirm: 'Use as background' };
    case 'set_theme': return { summary: `Switch the theme to ${THEME[a.theme]}.`, confirm: 'Switch theme' };
    case 'open_page': return { summary: `Go to ${MO_PAGES[a.path]}.`, confirm: 'Go' };
  }
}

/* What the browser tells Mo about the page you're on and what's on this device. All of it is treated as data. */
export interface MoPageContext {
  path: string; page: string;
  film?: { id: number; title: string; year?: number | null } | null;
  location?: { name: string; country?: string | null; sample?: boolean } | null;
  moods?: string[]; room?: { code: string; title: string; status: string } | null; collection?: { share: string; title: string } | null;
  member?: string | null;
}
export interface MoDevice { watchlist: { id: number; title: string; year?: number | null }[]; watched: { id: number; title: string; rating: number | null; on: string }[] }
export interface MoTurn { role: 'user' | 'assistant'; text: string }
export interface MoRequest { messages: MoTurn[]; context: MoPageContext; device: MoDevice; spoilerFree: boolean }

/* The reply arrives as one JSON object per line. */
export type MoEvent =
  | { t: 'status'; text: string }
  | { t: 'text'; d: string }
  | { t: 'films'; items: FilmRef[] }
  | { t: 'sources'; items: { label: string; url: string }[] }
  | { t: 'action'; id: string; action: MoAction }
  | { t: 'error'; kind: 'off' | 'key' | 'quota' | 'rate_limited' | 'budget' | 'upstream' | 'bad_request'; message: string }
  | { t: 'done' };

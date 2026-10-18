/* Movie Night rooms: the shapes night_state returns, and the room code format. */
import type { Spin } from './wheel';

export const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const ROOM_MAX = 40;
export type NightStatus = 'lobby' | 'voting' | 'results' | 'closed';

export interface NightPerson {
  user_id: string; role: 'host' | 'guest'; username: string; display_name: string | null; avatar_url: string | null;
  is_demo: boolean; last_seen: string; votes_cast: number;
}
export interface NightFilm {
  tmdb_id: number; title: string; year: number | null; poster_path: string | null; genres: string[] | null; runtime: number | null;
  source: 'watchlist' | 'collection' | 'search' | 'surprise'; added_by: string | null; mine: boolean;
  my_vote: boolean | null; yes: number | null; no: number | null;
}
export interface NightState {
  id: string; code: string; title: string; status: NightStatus; host_id: string; is_host: boolean; me: string;
  pick_tmdb_id: number | null; expires_at: string;
  participants: NightPerson[]; candidates: NightFilm[]; voters: number;
  shortlist: number[] | null;                 // only after the host shows the results
  spin: (Spin & { night_id: string }) | null;
  picks: { tmdb_id: number; title: string; how: 'match' | 'decider' | 'wheel' | 'host'; at: string }[];
}

export const personName = (p: Pick<NightPerson, 'display_name' | 'username'>) => p.display_name || `@${p.username}`;

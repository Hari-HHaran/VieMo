/* Shapes shared by the Reel Director route and its screen. */
export type Slot = 'safe' | 'wildcard' | 'gem';
export interface DirectorPick {
  slot: Slot; why: string;
  film: { id: number; title: string; year?: number; runtime: number | null; genres: string[]; posterPath: string | null; voteAverage: number; voteCount: number; providers: string[] };
}
export interface DirectorResult { picks: DirectorPick[]; poolSize: number; model: string; provider?: string; caption: string }

/* Quick pick ranking: deterministic, explained, and driven by the viewer's own votes.
   Weights are documented here and shown in the results screen's "How this was ranked". */
export type Vote = 'yes' | 'no' | 'skip';

export interface Candidate {
  id: number;
  title: string;
  year?: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
  posterPath: string | null;
  overview: string;
  voteAverage: number;
  voteCount: number;
  providers: string[]; // subscription/free services in the viewer's region, from TMDB/JustWatch
}

export const WEIGHTS = { yes: 1, skip: 0.35, moodMatch: 0.25, onChosenService: 0.2, tmdbRating: 0.1 } as const;

export interface Ranked { film: Candidate; score: number; reasons: string[] }

export function rank(
  candidates: Candidate[],
  votes: Record<number, Vote>,
  ctx: { moodGenres: number[]; moodLabel?: string; runtimeLabel?: string; chosenServices: string[] },
): Ranked[] {
  const out: Ranked[] = [];
  for (const film of candidates) {
    const v = votes[film.id];
    if (v !== 'yes' && v !== 'skip') continue; // "Not interested" is a veto; unvoted films are not guessed at
    const reasons: string[] = [v === 'yes' ? 'You said Interested' : 'You were unsure'];
    let score = v === 'yes' ? WEIGHTS.yes : WEIGHTS.skip;
    const matched = film.genres.filter((g) => ctx.moodGenres.includes(g.id));
    if (ctx.moodGenres.length && matched.length) {
      score += WEIGHTS.moodMatch;
      reasons.push(`Fits ${ctx.moodLabel ? `“${ctx.moodLabel}”` : 'your mood'} (${matched.map((g) => g.name).join(', ')})`);
    }
    if (ctx.runtimeLabel && film.runtime) reasons.push(`${film.runtime} min, within “${ctx.runtimeLabel}”`);
    const onService = film.providers.filter((p) => ctx.chosenServices.includes(p));
    if (onService.length) {
      score += WEIGHTS.onChosenService;
      reasons.push(`On ${onService.join(', ')}`);
    }
    score += (film.voteAverage / 10) * WEIGHTS.tmdbRating;
    out.push({ film, score: Math.round(score * 1000) / 1000, reasons });
  }
  return out.sort((a, b) => b.score - a.score || b.film.voteCount - a.film.voteCount);
}

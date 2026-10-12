import 'server-only';
import { TmdbError } from './tmdb';
import type { ProblemInfo } from '@/components/Problem';

export type Settled<T> = { ok: true; value: T } | { ok: false; problem: ProblemInfo };

/* Runs one TMDB request and turns failures into a plain description the UI can show. */
export async function settle<T>(p: Promise<T>, what: string): Promise<Settled<T>> {
  try {
    return { ok: true, value: await p };
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    if (!(e instanceof TmdbError)) console.error(e);
    return { ok: false, problem: { kind, what } };
  }
}

import 'server-only';
import sharp from 'sharp';
import { contrast, deriveAccent, extractSwatches, type AccentRoles } from '@ds/components/viemo.mjs';
import { IMAGE_BASE } from './tmdb';
import palette from './worlds.json';

/* The Premiere world takes its accent from the film's own poster. Done on the server so the page arrives in
   its colours with no flash; a slow or failed image just leaves the Premiere's default amber. */
const [bg, surface, raised, overlay] = palette.worlds.premiere.grounds;
const GROUNDS = { dark: { bg, surface, 'surface-raised': raised, 'surface-overlay': overlay, ink: palette.ink.ink }, light: palette.light };
const cache = new Map<string, PosterAccent | null>();
export interface PosterAccent { name: string; hex: string; css: string }

const roles = (r: AccentRoles) => `--reel: ${r.reel}; --on-reel: ${r['on-reel']}; --reel-ink: ${r['reel-ink']}; --reel-soft: ${r['reel-soft']};`;
const legible = (r: AccentRoles, g: Record<string, string>) =>
  [g.bg, g.surface, g['surface-raised']].every((s) => contrast(r.reel, s) >= 3 && contrast(r['reel-ink'], s) >= 4.5) && contrast(r['on-reel'], r.reel) >= 4.5;

async function compute(posterPath: string, selector: string): Promise<PosterAccent | null> {
  const res = await fetch(`${IMAGE_BASE}/w185${posterPath}`, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(1500) });
  if (!res.ok) throw new Error(`poster ${res.status}`);
  const { data } = await sharp(Buffer.from(await res.arrayBuffer())).resize(120, 120, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { swatches, neutral } = extractSwatches(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), { max: 3 });
  if (neutral || !swatches.length) return null;
  const a = deriveAccent(swatches[0].hex, { grounds: GROUNDS });
  if (!a || a.noir || !legible(a.dark, GROUNDS.dark) || !legible(a.light, GROUNDS.light)) return null;
  return {
    name: a.name, hex: swatches[0].hex,
    css: `${selector} { ${roles(a.dark)} } [data-theme="light"] ${selector} { ${roles(a.light)} }`,
  };
}

export async function posterAccent(posterPath: string | null | undefined, selector: string): Promise<PosterAccent | null> {
  if (!posterPath || !/^\/[\w.-]+$/.test(posterPath)) return null;
  const key = `${posterPath}|${selector}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const value = await compute(posterPath, selector);
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
    return value;
  } catch {
    return null; // network trouble is not remembered; the next visit tries again
  }
}

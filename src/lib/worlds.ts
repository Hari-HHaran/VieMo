/* Which colour world each route belongs to, and the name shown on the curtain the first time it opens. */
export type WorldId = 'lobby' | 'observatory' | 'casting' | 'studio' | 'screening' | 'records' | 'passport' | 'premiere' | 'afterparty';
export const WORLD_NAMES: Record<WorldId, string> = {
  lobby: 'The Festival Lobby', observatory: 'The Mood Observatory', casting: 'The Casting Table', studio: 'The Director’s Studio',
  screening: 'The Screening Room', records: 'The Record Store', passport: 'The Cinema Passport', premiere: 'The Premiere', afterparty: 'The Afterparty',
};
export function worldFor(path: string): WorldId {
  if (path.startsWith('/discover') || path.startsWith('/search') || path.startsWith('/viewmo')) return 'observatory';
  if (path.startsWith('/match')) return 'casting';
  if (path.startsWith('/clips')) return 'screening';
  if (path.startsWith('/profile')) return 'passport';
  if (path.startsWith('/film')) return 'premiere';
  return 'lobby';
}

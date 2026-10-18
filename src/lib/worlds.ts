/* Which colour world each route belongs to, and the name shown on the curtain the first time it opens. */
export type WorldId = 'lobby' | 'observatory' | 'casting' | 'studio' | 'screening' | 'records' | 'greenroom' | 'premiere' | 'afterparty' | 'gallery' | 'planetarium';
export const WORLD_NAMES: Record<WorldId, string> = {
  lobby: 'The Festival Lobby', observatory: 'The Mood Observatory', casting: 'The Casting Table', studio: 'The Director’s Studio',
  screening: 'The Screening Room', records: 'The Record Store', greenroom: 'The Green Room', premiere: 'The Premiere', afterparty: 'The Afterparty', gallery: 'The Wall of Fame', planetarium: 'SceneAtlas',
};
export function worldFor(path: string): WorldId {
  if (path.startsWith('/discover') || path.startsWith('/search') || path.startsWith('/viewmo')) return 'observatory';
  if (path.startsWith('/match')) return 'casting';
  if (path.startsWith('/director')) return 'studio';
  if (path.startsWith('/clips')) return 'screening';
  if (path.startsWith('/profile') || path.startsWith('/settings')) return 'greenroom';
  if (path.startsWith('/wall')) return 'gallery';
  if (path.startsWith('/atlas')) return 'planetarium';
  if (path.startsWith('/film')) return 'premiere';
  if (path.startsWith('/explore') || path.startsWith('/c/') || path.startsWith('/library')) return 'records';
  return 'lobby';
}

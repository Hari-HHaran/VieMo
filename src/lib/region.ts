import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_REGION } from './tmdb';

export const REGION_COOKIE = 'viemo-region';

/* The viewer's region for availability and cinema listings: their choice, else the default (Singapore). */
export async function viewerRegion(): Promise<string> {
  const v = (await cookies()).get(REGION_COOKIE)?.value?.toUpperCase();
  return v && /^[A-Z]{2}$/.test(v) ? v : DEFAULT_REGION;
}

const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export const regionName = (code: string) => names?.of(code) || code;

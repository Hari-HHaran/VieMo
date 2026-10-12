import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { extractSwatches } from '@ds/components/viemo.mjs';
import { limited } from '@/lib/rate-limit';
import { IMAGE_BASE, movieImages, TmdbError } from '@/lib/tmdb';

/* Colours for the personal accent: from the film's logo, or its poster when the logo is black and white. */
async function pixels(url: string) {
  const res = await fetch(url, { next: { revalidate: 604800 } });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).resize(240, 240, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (limited(req, 'palette', 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { id } = await ctx.params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const images = await movieImages(Number(id));
    const logo = images.logos.find((l) => l.iso_639_1 === 'en') ?? images.logos.find((l) => !l.iso_639_1) ?? images.logos[0];
    if (logo) {
      const fromLogo = extractSwatches(await pixels(`${IMAGE_BASE}/${logo.file_path.endsWith('.svg') ? 'original' : 'w500'}${logo.file_path}`), { max: 4 });
      if (!fromLogo.neutral && fromLogo.swatches.length) return NextResponse.json({ source: 'logo', swatches: fromLogo.swatches.map((s) => ({ ...s, source: 'logo' })), neutral: false });
    }
    const poster = images.posters.find((p) => p.iso_639_1 === 'en') ?? images.posters[0];
    if (poster) {
      const fromPoster = extractSwatches(await pixels(`${IMAGE_BASE}/w342${poster.file_path}`), { max: 4 });
      if (!fromPoster.neutral && fromPoster.swatches.length) return NextResponse.json({ source: 'poster', swatches: fromPoster.swatches.map((s) => ({ ...s, source: 'poster' })), neutral: false });
    }
    return NextResponse.json({ source: logo ? 'logo' : 'none', swatches: [], neutral: true });
  } catch (e) {
    const kind = e instanceof TmdbError ? e.kind : 'upstream';
    return NextResponse.json({ error: kind }, { status: kind === 'config' ? 503 : kind === 'not_found' ? 404 : 502 });
  }
}

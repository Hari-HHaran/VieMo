// Builds src/components/atlas/world-dots.json: a grid of [lng, lat] points that fall on land, for the flat dotted
// map used when WebGL isn't available. Source: Natural Earth 1:110m land via the world-atlas package (public domain).
//   node scripts/world-dots.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url)));
const land = feature(topo, topo.objects.land);
const polys = land.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const onLand = (x, y) => polys.some(([outer, ...holes]) => inRing(x, y, outer) && !holes.some((h) => inRing(x, y, h)));
const STEP = 2.2, dots = [];
for (let lat = -58; lat <= 82; lat += STEP) {
  /* Fewer dots towards the poles so the flat map isn't crowded at the top. */
  const step = STEP / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
  for (let lng = -180; lng < 180; lng += step) if (onLand(lng, lat)) dots.push([Math.round(lng * 10) / 10, Math.round(lat * 10) / 10]);
}
writeFileSync(new URL('../src/components/atlas/world-dots.json', import.meta.url), JSON.stringify(dots));
console.log(`world-dots.json: ${dots.length} dots`);

'use client';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Color, MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import countries from 'world-atlas/countries-110m.json';
import { isApproximate, type AtlasLocation } from '@/lib/atlas/types';

export interface GlobeHandle { flyTo: (l: AtlasLocation) => void; zoom: (factor: number) => void; reset: () => void }
const HOME = { lat: 22, lng: 12, altitude: 2.45 };
const BLUE = '#5b8cff', VIOLET = '#9a86e8', SELECTED = '#cfdcff';

/* Layer settings live outside the component so their identity never changes; the globe library rebuilds a
   layer whenever a setting is a new function, which would be wasted work on every React update. */
const HEX_COLOR = () => 'rgba(168, 178, 204, 0.62)';
const LABEL_COLOR = () => 'rgba(232, 236, 246, 0.95)';
const POINT_RADIUS = (l: object) => (isApproximate(l as AtlasLocation) ? 0.62 : 0.4);
const RING_COLOR = (l: object) => { const c = isApproximate(l as AtlasLocation) ? '154, 134, 232' : '91, 140, 255'; return (t: number) => `rgba(${c}, ${0.55 * (1 - t)})`; };

type Ring = number[][];
type Geo = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
/* Natural Earth's 1:110m file has a few zero-area slivers (e.g. one part of North Korea is a single repeated
   point) that the hexagon library rejects with an error. Drop polygons whose outline has under three distinct points. */
const solid = (poly: Ring[]) => new Set(poly[0]?.map((p) => p.join(','))).size >= 3;
function cleanLand(features: { geometry: Geo }[]) {
  return features.flatMap((f) => {
    if (f.geometry.type === 'Polygon') return solid(f.geometry.coordinates) ? [f] : [];
    const parts = f.geometry.coordinates.filter(solid);
    return parts.length ? [{ ...f, geometry: { type: 'MultiPolygon' as const, coordinates: parts } }] : [];
  });
}

/* The SceneAtlas globe: graphite and metallic, continents as dots, filming locations as small lights with a slow
   pulse. Everything animated runs inside three.js; React only hands it data when the data changes. */
export default function GlobeView({ locations, selectedId, hoveredId, onSelect, onHover, reduceMotion, ref }: {
  locations: AtlasLocation[]; selectedId: string | null; hoveredId: string | null;
  onSelect: (l: AtlasLocation) => void; onHover: (l: AtlasLocation | null) => void; reduceMotion: boolean;
  ref?: React.Ref<GlobeHandle>;
}) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ms = reduceMotion ? 0 : 1300;
  /* Handlers reach the globe through a ref, so the globe sees the same functions on every render. */
  const handlers = useRef({ onSelect, onHover });
  handlers.current = { onSelect, onHover };
  const click = useCallback((l: object) => handlers.current.onSelect(l as AtlasLocation), []);
  const hover = useCallback((l: object | null) => handlers.current.onHover((l as AtlasLocation) ?? null), []);

  const land = useMemo(() => {
    const topo = countries as unknown as Parameters<typeof feature>[0] & { objects: { countries: Parameters<typeof feature>[1] } };
    return cleanLand((feature(topo, topo.objects.countries) as unknown as { features: { geometry: Geo }[] }).features);
  }, []);
  const material = useMemo(() => new MeshPhongMaterial({ color: new Color('#171a22'), emissive: new Color('#06070b'), emissiveIntensity: 0.7, shininess: 28, specular: new Color('#4d566c') }), []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = useCallback(() => {
    const g = globe.current;
    if (!g) return;
    g.pointOfView(HOME, 0);
    const c = g.controls() as unknown as { enableDamping: boolean; dampingFactor: number; rotateSpeed: number; zoomSpeed: number; minDistance: number; maxDistance: number; autoRotate: boolean };
    Object.assign(c, { enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.8, minDistance: 118, maxDistance: 520, autoRotate: false });
  }, []);

  /* Rendering pauses while the tab is hidden. */
  useEffect(() => {
    const vis = () => { const g = globe.current; if (!g) return; if (document.hidden) g.pauseAnimation(); else g.resumeAnimation(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: (l) => globe.current?.pointOfView({ lat: l.lat, lng: l.lng, altitude: isApproximate(l) ? 1.35 : 1.05 }, ms),
    zoom: (factor) => { const g = globe.current; if (!g) return; const p = g.pointOfView(); g.pointOfView({ ...p, altitude: Math.min(4.2, Math.max(0.22, p.altitude * factor)) }, reduceMotion ? 0 : 450); },
    reset: () => globe.current?.pointOfView(HOME, ms),
  }), [ms, reduceMotion]);

  const colour = useCallback((l: object) => {
    const loc = l as AtlasLocation;
    return loc.id === selectedId ? SELECTED : isApproximate(loc) ? VIOLET : BLUE;
  }, [selectedId]);
  const rings = useMemo(() => (reduceMotion ? [] : locations), [locations, reduceMotion]);
  const labels = useMemo(() => locations.filter((l) => l.id === selectedId || l.id === hoveredId), [locations, selectedId, hoveredId]);

  return (
    <div ref={box} className="globe-box">
      {size.w ? (
        <Globe ref={globe} width={size.w} height={size.h} onGlobeReady={ready}
          backgroundColor="rgba(0,0,0,0)" globeMaterial={material} showAtmosphere atmosphereColor="#6f86ff" atmosphereAltitude={0.17}
          hexPolygonsData={land} hexPolygonResolution={3} hexPolygonMargin={0.58} hexPolygonUseDots hexPolygonAltitude={0.004}
          hexPolygonColor={HEX_COLOR}
          pointsData={locations} pointLat="lat" pointLng="lng" pointColor={colour} pointAltitude={0.012}
          pointRadius={POINT_RADIUS} pointResolution={18} pointsMerge={false} pointsTransitionDuration={reduceMotion ? 0 : 700}
          onPointClick={click} onPointHover={hover}
          ringsData={rings} ringLat="lat" ringLng="lng" ringMaxRadius={2.2} ringPropagationSpeed={1.1} ringRepeatPeriod={2600}
          ringColor={RING_COLOR}
          labelsData={labels} labelLat="lat" labelLng="lng" labelText="name" labelSize={0.85} labelDotRadius={0} labelAltitude={0.02}
          labelColor={LABEL_COLOR} labelResolution={2} labelsTransitionDuration={reduceMotion ? 0 : 300} />
      ) : null}
    </div>
  );
}

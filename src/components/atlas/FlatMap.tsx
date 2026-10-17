'use client';
import { isApproximate, type AtlasLocation } from '@/lib/atlas/types';
import dots from './world-dots.json';

const x = (lng: number) => ((lng + 180) / 360) * 100;
const y = (lat: number) => ((90 - lat) / 180) * 100;

/* A flat, dotted world (equirectangular). It is the 2D view for now and the fallback when WebGL isn't
   available. Markers are real buttons, so it works fully with a keyboard and screen readers. */
export default function FlatMap({ locations, selectedId, onSelect }: { locations: AtlasLocation[]; selectedId: string | null; onSelect: (l: AtlasLocation) => void }) {
  return (
    <div className="flat-map">
      <div className="flat-map-frame">
        <svg className="flat-map-dots" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {(dots as [number, number][]).map(([lng, lat], i) => <circle key={i} cx={lng + 180} cy={90 - lat} r={0.55} />)}
        </svg>
        {locations.map((l) => (
          <button key={l.id} type="button" className={`flat-marker${isApproximate(l) ? ' is-approx' : ''}${l.id === selectedId ? ' is-on' : ''}`}
            style={{ left: `${x(l.lng)}%`, top: `${y(l.lat)}%` }} aria-pressed={l.id === selectedId}
            aria-label={`${l.sample ? 'Sample marker, ' : ''}${l.name}${l.country ? `, ${l.country}` : ''}`} onClick={() => onSelect(l)}>
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

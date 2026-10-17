'use client';
import { PRECISION_LABEL, isApproximate, type AtlasLocation } from '@/lib/atlas/types';

/* The list is the accessible way through every marker: each entry flies the globe there and opens its details. */
export default function LocationList({ locations, selectedId, onSelect, onHover }: {
  locations: AtlasLocation[]; selectedId: string | null; onSelect: (l: AtlasLocation) => void; onHover: (l: AtlasLocation | null) => void;
}) {
  return (
    <ol className="loc-list" role="list">
      {locations.map((l) => (
        <li key={l.id}>
          <button type="button" className={`loc-item${l.id === selectedId ? ' is-on' : ''}`} aria-current={l.id === selectedId ? 'true' : undefined}
            onClick={() => onSelect(l)} onMouseEnter={() => onHover(l)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(l)} onBlur={() => onHover(null)}>
            <span className={`loc-dot${isApproximate(l) ? ' is-approx' : ''}`} aria-hidden="true" />
            <span className="loc-text">
              <span className="loc-name">{l.name}</span>
              <span className="loc-meta">{[l.country, l.sample ? 'Sample marker' : PRECISION_LABEL[l.precision]].filter(Boolean).join(' · ')}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

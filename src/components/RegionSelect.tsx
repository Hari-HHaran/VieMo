'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function RegionSelect({ current, regions }: { current: string; regions: { code: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="region">
      <label htmlFor="region" className="type-label">Region for availability and cinemas</label>
      <select id="region" className="select type-body" value={current} aria-busy={pending}
        onChange={(e) => {
          document.cookie = `viemo-region=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
          start(() => router.refresh());
        }}>
        {regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
      </select>
    </div>
  );
}

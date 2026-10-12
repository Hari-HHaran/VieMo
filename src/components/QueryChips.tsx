'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterChip } from '@/ds/client';

/* A single-choice chip row bound to one URL search parameter, so the choice survives reloads and sharing. */
export default function QueryChips({ param, options, label }: { param: string; options: { id: string; label: string }[]; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = search.get(param);
  function choose(id: string | null) {
    const next = new URLSearchParams(search.toString());
    if (id) next.set(param, id); else next.delete(param);
    router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map((o) => (
        <FilterChip key={o.id} label={o.label} state={current === o.id ? 'on' : 'off'} onChange={(s) => choose(s === 'on' ? o.id : null)} />
      ))}
    </div>
  );
}

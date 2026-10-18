'use client';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/* A mixing desk of moods. Each channel is a real toggle button; push up as many as you like (up to `max`) and the
   films below are the ones TMDB tags for every mood you chose. The fader and lamp are decoration. */
export default function MoodMixer({ moods, max }: { moods: { id: string; label: string; genreNames: string[] }[]; max: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const fromUrl = () => [search.get('moods') ?? '', search.get('mood') ?? ''].join(',').split(',').filter((id) => moods.some((m) => m.id === id))
    .filter((id, i, a) => a.indexOf(id) === i).slice(0, max);
  const [sel, setSel] = useState<string[]>(fromUrl);
  const [pending, start] = useTransition();
  const urlKey = `${search.get('moods') ?? ''}|${search.get('mood') ?? ''}`;
  useEffect(() => { setSel(fromUrl()); }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (next: string[]) => {
    setSel(next);
    const q = new URLSearchParams(search.toString());
    q.delete('mood');
    if (next.length) q.set('moods', next.join(',')); else q.delete('moods');
    start(() => router.replace(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false }));
  };
  const full = sel.length >= max;
  return (
    <div className={`mixer${pending ? ' is-pending' : ''}`}>
      <div className="mixer-desk" role="group" aria-label="Moods" aria-describedby="mixer-help">
        {moods.map((m) => {
          const on = sel.includes(m.id);
          const blocked = !on && full;
          return (
            <button key={m.id} type="button" className={`mixer-ch${on ? ' is-on' : ''}`} aria-pressed={on} aria-disabled={blocked || undefined}
              onClick={() => { if (!blocked) apply(on ? sel.filter((x) => x !== m.id) : [...sel, m.id]); }}>
              <span className="mixer-lamp" aria-hidden="true" />
              <span className="mixer-track" aria-hidden="true">
                <span className="mixer-knob" />
              </span>
              <span className="mixer-label type-label">{m.label}</span>
              <span className="mixer-genres type-caption">{m.genreNames.join(' · ')}</span>
            </button>
          );
        })}
      </div>
      <div className="mixer-bar">
        <p id="mixer-help" className="type-caption vm-muted" aria-live="polite">
          {sel.length === 0 ? `Push up one or more moods, up to ${max}.`
            : full ? `${max} moods is the most at once. Pull one down to swap it.`
            : sel.length === 1 ? 'Add another mood to narrow it down.' : 'Showing films that fit every mood you’ve pushed up.'}
        </p>
        {sel.length ? <button type="button" className="mixer-clear type-label" onClick={() => apply([])}>Clear moods</button> : null}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useAccentPref, useWatchlist } from '@/lib/device-store';

const IMG = 'https://image.tmdb.org/t/p';

/* The personal corner of the lobby, from this device only: a greeting for the time of day, your watchlist
   and your signature film. Rendered after mount so the server and browser never disagree about the clock. */
export default function YourNight() {
  const { list } = useWatchlist();
  const { film } = useAccentPref();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => { setHour(new Date().getHours()); }, []);
  const greeting = hour === null ? 'Your night' : hour < 5 ? 'Late show' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const shown = list.slice(0, 3);
  return (
    <a className="your-night" href="/profile">
      <span className="your-night-kicker">{greeting}</span>
      {list.length ? (
        <span className="your-night-row">
          <span className="your-night-stack" aria-hidden="true">
            {shown.map((f, i) => f.posterPath ? <img key={f.id} src={`${IMG}/w92${f.posterPath}`} alt="" style={{ ['--i' as string]: i }} /> : <span key={f.id} className="your-night-blank" style={{ ['--i' as string]: i }} />)}
          </span>
          <span><b>{list.length === 1 ? '1 film' : `${list.length} films`}</b> waiting on your watchlist</span>
        </span>
      ) : <span className="your-night-row"><span>Save films as you browse; they wait here for tonight.</span></span>}
      {film ? <span className="your-night-sig">Signature film: {film.title}</span> : null}
    </a>
  );
}

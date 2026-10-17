'use client';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/ds/client';
import { todayISO } from '@/lib/wall';
import { monthKeyOf, type DayFilm, type MonthData } from '@/lib/screening';
import ScreeningActivity from './ScreeningActivity';

/* Someone's Screening Activity from their account, fetched a month at a time as you browse. */
export default function RemoteScreening({ ownerId, owner, isOwn, privateNote }: { ownerId: string; owner: string; isOwn: boolean; privateNote: React.ReactNode }) {
  const [today, setToday] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [state, setState] = useState<{ month: string; data: MonthData } | 'private' | 'error' | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => { const t = todayISO(); setToday(t); setMonth(monthKeyOf(t)); }, []);

  useEffect(() => {
    if (!month || !today) return;
    const ctl = new AbortController();
    fetch(`/api/screening?owner=${ownerId}&month=${month}&today=${today}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { allowed: boolean; data?: MonthData }) => setState(j.allowed && j.data ? { month, data: j.data } : 'private'))
      .catch((e) => { if (e?.name !== 'AbortError') setState('error'); });
    return () => ctl.abort();
  }, [ownerId, month, today, tries]);

  const loadDay = useCallback(async (day: string): Promise<DayFilm[] | null> => {
    const r = await fetch(`/api/screening/day?owner=${ownerId}&day=${day}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j.allowed ? j.films : null;
  }, [ownerId]);

  if (state === 'private') return <div className="sa sa-private"><p className="sa-eyebrow type-eyebrow">Screening Activity</p>{privateNote}</div>;
  if (state === 'error') return <ErrorState title="Screening Activity didn’t load" body="We couldn’t reach the account service. Try again in a moment." onRetry={() => { setState(null); setTries(tries + 1); }} />;
  if (!today || !month) return <div className="sa sa-placeholder" aria-hidden="true" />;
  const data = state && state.month === month ? state.data : null;
  return (
    <ScreeningActivity owner={owner} isOwn={isOwn} month={month} onMonth={setMonth} today={today} data={data} loadDay={loadDay}
      note={isOwn ? 'From your account. Who can see it is set on your account page.' : undefined} />
  );
}

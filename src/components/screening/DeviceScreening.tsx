'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDiary } from '@/lib/diary';
import { todayISO } from '@/lib/wall';
import { countsFromEntries, monthKeyOf, streaks, topGenre, type DayFilm, type MonthData } from '@/lib/screening';
import ScreeningActivity from './ScreeningActivity';

/* Your Screening Activity from this device's diary. Worked out in the browser, only when the diary changes. */
export default function DeviceScreening() {
  const { diary } = useDiary();
  const [today, setToday] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  /* The date comes from this device's clock, so it's read after hydration. */
  useEffect(() => { const t = todayISO(); setToday(t); setMonth(monthKeyOf(t)); }, []);

  const all = useMemo(() => {
    const days = countsFromEntries(diary.entries);
    const titles: Record<string, string[]> = {};
    for (const e of [...diary.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const t = diary.films[e.filmId]?.title;
      if (t) (titles[e.watchedOn] ??= []).push(t);
    }
    const first = Object.keys(days).sort()[0] ?? null;
    return { days, titles, first };
  }, [diary]);

  const data = useMemo<MonthData | null>(() => {
    if (!today || !month) return null;
    const s = streaks(Object.keys(all.days), today);
    const genres = diary.entries.filter((e) => monthKeyOf(e.watchedOn) === month).map((e) => diary.films[e.filmId]?.genres ?? []);
    return { days: all.days, titles: all.titles, current: s.current, longest: s.longest, topGenre: topGenre(genres), firstDay: all.first };
  }, [all, diary, month, today]);

  const loadDay = useCallback(async (day: string): Promise<DayFilm[]> => diary.entries
    .filter((e) => e.watchedOn === day)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e) => {
      const f = diary.films[e.filmId];
      return { tmdbId: e.filmId, title: f?.title ?? 'Unknown film', year: f?.year ?? null, posterPath: f?.posterPath ?? null, rating: e.rating, review: e.review, spoiler: e.spoiler };
    }), [diary]);

  if (!today || !month) return <div className="sa sa-placeholder" aria-hidden="true" />;
  return (
    <ScreeningActivity owner="Your" isOwn month={month} onMonth={setMonth} today={today} data={data} loadDay={loadDay}
      note="From the diary on this device. Only you can see it here." />
  );
}

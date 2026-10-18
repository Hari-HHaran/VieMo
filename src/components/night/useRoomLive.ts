'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { heartbeat } from '@/app/(tabs)/match/night/actions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { NightState } from '@/lib/night';

export type LiveMode = 'connecting' | 'live' | 'polling';
const POLL_FALLBACK = 4000, POLL_SAFETY = 25000;

/* Keeps a room's state current on every screen. The database is the only source of truth: Realtime (when it's
   connected) only says "something changed", and each screen then asks for what it may see. Without Realtime the
   screen checks every few seconds instead. Presence shows who has the room open right now. */
export function useRoomLive(initial: NightState, realtime: { url: string; key: string } | null) {
  const [state, setState] = useState(initial);
  const [mode, setMode] = useState<LiveMode>(realtime ? 'connecting' : 'polling');
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const id = initial.id;

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlight.current) { again.current = true; return inFlight.current; }
    inFlight.current = (async () => {
      try {
        const r = await fetch(`/api/night/${id}`, { cache: 'no-store' });
        if (r.status === 404 || r.status === 401) { setGone(true); return; }
        if (r.ok) { const j = await r.json(); if (j.state) setState(j.state); }
      } catch { /* offline: the next tick tries again */ }
    })();
    await inFlight.current;
    inFlight.current = null;
    if (again.current) { again.current = false; await refresh(); }
  }, [id]);

  useEffect(() => {
    if (!realtime) return;
    let sb;
    try { sb = supabaseBrowser(realtime.url, realtime.key); } catch { setMode('polling'); return; }
    const ch = sb.channel(`night:${id}`, { config: { presence: { key: initial.me } } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'movie_nights', filter: `id=eq.${id}` }, () => { void refresh(); })
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setMode('live'); void ch.track({ at: Date.now() }); void refresh(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setMode('polling');
      });
    const t = setTimeout(() => setMode((m) => (m === 'connecting' ? 'polling' : m)), 6000);
    return () => { clearTimeout(t); void sb.removeChannel(ch); };
  }, [id, realtime?.url, realtime?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const every = mode === 'live' ? POLL_SAFETY : POLL_FALLBACK;
    const t = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, every);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); };
  }, [mode, refresh]);

  /* "Here now" without Realtime: a heartbeat each minute, read back as last_seen. */
  useEffect(() => {
    void heartbeat(id);
    const t = setInterval(() => { if (document.visibilityState === 'visible') void heartbeat(id); }, 60_000);
    return () => clearInterval(t);
  }, [id]);

  return { state, setState, refresh, mode, online, gone };
}

'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { MoPageContext } from '@/lib/mo/shared';

type Extra = Partial<Pick<MoPageContext, 'film' | 'location' | 'room' | 'collection' | 'member'>>;
interface MoCtl { extra: Extra; setExtra: (key: string, e: Extra | null) => void; ask: { text: string; n: number } | null; askMo: (text: string) => void }
const Ctx = createContext<MoCtl>({ extra: {}, setExtra: () => {}, ask: null, askMo: () => {} });

/* Lets any page tell Mo what's on screen (a film, a place on the globe, a Movie Night room, a collection), and
   lets a page open Mo with a question ready to send. */
export function MoProvider({ children }: { children: React.ReactNode }) {
  const [parts, setParts] = useState<Record<string, Extra>>({});
  const [ask, setAsk] = useState<{ text: string; n: number } | null>(null);
  const n = useRef(0);
  const setExtra = useCallback((key: string, e: Extra | null) => setParts((p) => {
    const next = { ...p };
    if (e) next[key] = e; else delete next[key];
    return next;
  }), []);
  const askMo = useCallback((text: string) => setAsk({ text, n: ++n.current }), []);
  const extra = useMemo(() => Object.assign({}, ...Object.values(parts)) as Extra, [parts]);
  return <Ctx.Provider value={{ extra, setExtra, ask, askMo }}>{children}</Ctx.Provider>;
}
export const useMoControl = () => useContext(Ctx);

/* A page says what it shows; it's forgotten when the page goes away. */
export function useMoPage(extra: Extra | null) {
  const { setExtra } = useContext(Ctx);
  const key = useRef(Math.random().toString(36).slice(2));
  const json = JSON.stringify(extra);
  useEffect(() => {
    setExtra(key.current, extra);
    return () => setExtra(key.current, null);
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* For server-rendered pages: drop <MoPage film={…} /> in and Mo knows about it. */
export function MoPage(props: Extra) {
  useMoPage(props);
  return null;
}

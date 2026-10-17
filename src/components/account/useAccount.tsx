'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Me } from '@/app/api/me/route';

const AccountContext = createContext<Me | null>(null);
/** Who's signed in: null while loading, then the answer from the server. */
export const useAccount = () => useContext(AccountContext);

/* The session cookie's value changes on sign-in, sign-out and refresh; only then is it worth asking again. */
function sessionMark(): string {
  try { return document.cookie.split('; ').filter((c) => c.startsWith('sb-')).sort().join('|'); } catch { return ''; }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    const mark = sessionMark();
    if (mark === last.current) return;
    last.current = mark;
    /* Not aborted on navigation: the next page has the same cookie and won't ask again. Only the answer for
       the latest cookie is kept. */
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Me | null) => { if (last.current === mark) setMe(m ?? { configured: false, user: null, profile: null }); })
      .catch(() => { if (last.current === mark) last.current = null; });
  }, [pathname]);
  return <AccountContext.Provider value={me}>{children}</AccountContext.Provider>;
}

export function accountLabel(me: Me): string {
  return me.profile?.display_name || (me.profile ? `@${me.profile.username}` : me.user?.email ?? 'Account');
}

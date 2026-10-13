'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav, Toast } from '@/ds/client';
import { applyPrefsToDocument, usePrefs } from '@/lib/device-store';

type ToastInput = { message: string; tone?: 'neutral' | 'positive' | 'negative'; icon?: string; action?: { label: string; onClick: () => void } };
const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const NAV = [
  { id: 'home', label: 'Home', icon: 'house', href: '/' },
  { id: 'discover', label: 'Discover', icon: 'compass', href: '/discover' },
  { id: 'match', label: 'Match', icon: 'users', href: '/match' },
  { id: 'clips', label: 'Clips', icon: 'clapperboard', href: '/clips' },
  { id: 'profile', label: 'Profile', icon: 'user', href: '/profile' },
] as const;

function tabFor(path: string): string | null {
  if (path === '/') return 'home';
  if (path.startsWith('/discover') || path.startsWith('/search')) return 'discover';
  if (path.startsWith('/match')) return 'match';
  if (path.startsWith('/clips')) return 'clips';
  if (path.startsWith('/profile')) return 'profile';
  return null; // secondary screens keep the tab they were opened from
}

export default function AppShell({ children, dataNote }: { children: React.ReactNode; dataNote?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [prefs] = usePrefs();
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const [lastTab, setLastTab] = useState('home');
  const counter = useRef(0);
  const current = tabFor(pathname) ?? lastTab;

  useEffect(() => {
    const t = tabFor(pathname);
    if (t) { setLastTab(t); try { sessionStorage.setItem('viemo:tab', t); } catch {} }
    else { try { const s = sessionStorage.getItem('viemo:tab'); if (s) setLastTab(s); } catch {} }
  }, [pathname]);

  /* Theme follows the saved preference, and the OS when set to System. */
  useEffect(() => {
    applyPrefsToDocument(prefs);
    if (prefs.theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: light)');
    const on = () => applyPrefsToDocument(prefs);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [prefs]);

  /* Plain links inside design-system components navigate client-side, without a full reload. */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('rel')?.includes('external')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      e.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  const show = useCallback((t: ToastInput) => setToast({ ...t, key: ++counter.current }), []);
  const navigate = (id: string) => router.push(NAV.find((n) => n.id === id)!.href);

  return (
    <ToastContext.Provider value={show}>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="shell">
        <div className="shell-rail">
          <BottomNav layout="rail" brand="VieMo" items={NAV as never} current={current} onNavigate={navigate} label="Primary" />
        </div>
        <main id="main" className="shell-main" tabIndex={-1}>
          {dataNote ? <p className="data-note type-caption">{dataNote}</p> : null}
          {children}
          <footer className="shell-credits type-caption">
            Film data and images from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a>.
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </footer>
        </main>
        <div className="shell-bar">
          <BottomNav items={NAV as never} current={current} onNavigate={navigate} label="Primary" fixed />
        </div>
      </div>
      {toast ? (
        <Toast key={toast.key} floating message={toast.message} tone={toast.tone} icon={toast.icon as never}
          action={toast.action ? { label: toast.action.label, onClick: () => { toast.action!.onClick(); setToast(null); } } : undefined}
          onDismiss={() => setToast(null)} duration={toast.action ? 6000 : 3500} />
      ) : null}
    </ToastContext.Provider>
  );
}

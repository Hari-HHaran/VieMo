'use client';
import { addTransitionType, createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, ViewTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { Toast } from '@/ds/client';
import { applyPrefsToDocument, usePrefs } from '@/lib/device-store';
import { DURATION, EASE } from '@/lib/motion';
import { WORLD_NAMES, worldFor, type WorldId } from '@/lib/worlds';
import MotionProvider from './MotionProvider';
import SiteNav from './nav/SiteNav';
import { AccountProvider } from './account/useAccount';

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
  if (path.startsWith('/discover') || path.startsWith('/search') || path.startsWith('/viewmo') || path.startsWith('/atlas')) return 'discover';
  if (path.startsWith('/match')) return 'match';
  if (path.startsWith('/clips')) return 'clips';
  if (path.startsWith('/profile') || path.startsWith('/wall') || path.startsWith('/account')) return 'profile';
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
  const world = worldFor(pathname);
  const [pending, startNav] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const go = useCallback((href: string) => { setTarget(href); startNav(() => { addTransitionType('nav'); router.push(href); }); }, [router]);
  useEffect(() => { if (!pending) setTarget(null); }, [pending]);
  const [curtain, setCurtain] = useState<WorldId | null>(null);
  const firstRender = useRef(true);

  /* A curtain in the world's colours the first time each world opens in a session, never on the first page
     load and never twice; content renders underneath, so nothing waits for it. */
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; try { sessionStorage.setItem(`viemo:seen:${world}`, '1'); } catch {} return; }
    let seen = true;
    try { seen = sessionStorage.getItem(`viemo:seen:${world}`) === '1'; sessionStorage.setItem(`viemo:seen:${world}`, '1'); } catch {}
    if (!seen && !prefs.reduceMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurtain(world);
      const t = setTimeout(() => setCurtain(null), 60);
      return () => clearTimeout(t);
    }
  }, [world]); // eslint-disable-line react-hooks/exhaustive-deps

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
      /* The poster you tapped becomes the film page's poster (shared-element morph). Only one element may
         carry the name at a time, so it moves from the current page's hero to the tapped card. */
      if (/^\/film\/\d+/.test(url.pathname)) {
        document.querySelectorAll<HTMLElement>('[data-vt-poster]').forEach((el) => { el.style.viewTransitionName = 'none'; });
        const card = a.closest('[data-film-card], .vm-film-card, .vmx-light, .qp-top, .qp-alt, .clip, .lobby-card');
        const poster = card?.querySelector<HTMLElement>('[data-poster], .vm-poster, .vmx-poster');
        if (poster) { poster.style.viewTransitionName = 'film-poster'; poster.setAttribute('data-vt-poster', ''); }
      }
      go(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [go]);

  const show = useCallback((t: ToastInput) => setToast({ ...t, key: ++counter.current }), []);

  return (
    <ToastContext.Provider value={show}>
      <AccountProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <MotionProvider>
      <div className={`nav-progress${pending ? ' is-on' : ''}`} role="progressbar" aria-label="Loading page" aria-hidden={!pending} />
      <div className="shell" data-world={world}>
        <SiteNav items={NAV} current={current} loadingHref={pending ? target : null} pathname={pathname} />
        <main id="main" className="shell-main" tabIndex={-1}>
          {dataNote ? <p className="data-note type-caption">{dataNote}</p> : null}
          {/* Only our own navigations animate. Background updates (Next prefetching, data refreshes) stay
              instant, so a page with a live WebGL canvas is never frozen while the browser snapshots it. */}
          <ViewTransition default={{ nav: 'auto', default: 'none' }}>{children}</ViewTransition>
          <footer className="shell-credits type-caption">
            Film data and images from <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a>.
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </footer>
        </main>
      </div>
      <AnimatePresence>
        {curtain ? (
          <motion.div key={curtain} className="curtain" data-world={curtain} aria-hidden="true"
            initial={{ y: 0 }} animate={{ y: 0 }} exit={{ y: '-100%', transition: { duration: DURATION.cinematic, ease: EASE.inOut } }}>
            <motion.span className="curtain-name" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -24, transition: { duration: DURATION.reveal } }}>{WORLD_NAMES[curtain]}</motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </MotionProvider>
      {toast ? (
        <Toast key={toast.key} floating message={toast.message} tone={toast.tone} icon={toast.icon as never}
          action={toast.action ? { label: toast.action.label, onClick: () => { toast.action!.onClick(); setToast(null); } } : undefined}
          onDismiss={() => setToast(null)} duration={toast.action ? 6000 : 3500} />
      ) : null}
      </AccountProvider>
    </ToastContext.Provider>
  );
}

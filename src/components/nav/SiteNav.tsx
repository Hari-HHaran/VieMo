'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/ds/client';
import { DURATION, EASE, LAYOUT, PRESS, SPRING, stagger } from '@/lib/motion';
import ScrambleLabel from '../fx/ScrambleLabel';
import { useMagnetic } from '../fx/useMagnetic';
import { useScramble } from '../fx/useScramble';

export interface NavItem { id: string; label: string; icon: string; href: string }
interface Props { items: readonly NavItem[]; current: string; loadingHref: string | null; pathname: string }

const MORE = [
  { href: '/search', icon: 'search', label: 'Search', note: 'Any film on TMDB' },
  { href: '/viewmo', icon: 'globe', label: 'ViewMo', note: 'Spin a sphere of this week’s posters' },
  { href: '/director', icon: 'clapperboard', label: 'Reel Director', note: 'Describe your night, get three picks' },
  { href: '/profile', icon: 'bookmark', label: 'Your watchlist', note: 'Saved on this device' },
] as const;

/* Links are plain <a href>; AppShell turns same-site clicks into client-side transitions, so these keep working
   with middle-click, open-in-new-tab and no JavaScript. */
export default function SiteNav({ items, current, loadingHref, pathname }: Props) {
  return (
    <>
      <FloatingNav items={items} current={current} loadingHref={loadingHref} pathname={pathname} />
      <MobileBar items={items} current={current} loadingHref={loadingHref} pathname={pathname} />
    </>
  );
}

/* Desktop and tablet: a floating capsule that condenses once you scroll. */
function FloatingNav({ items, current, loadingHref, pathname }: Props) {
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const director = useMagnetic<HTMLAnchorElement>(0.3);

  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setCondensed(window.scrollY > 24)); };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); };
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  /* The menu is a disclosure: Escape or a click outside closes it and focus goes back to the button. */
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus(); } };
    const away = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !menuBtn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', away);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away); };
  }, [open]);

  return (
    <header className={`fnav${condensed ? ' is-condensed' : ''}${open ? ' is-open' : ''}`}>
      <nav className="fnav-bar" aria-label="Primary">
        <a className="fnav-brand" href="/" aria-label="VieMo home">Vie<span>Mo</span></a>
        <ul className="fnav-list" role="list">
          {items.map((it) => <FloatItem key={it.id} item={it} active={current === it.id} loading={loadingHref === it.href} />)}
        </ul>
        <motion.a ref={director.ref} href="/director" className={`fnav-director${pathname.startsWith('/director') ? ' is-active' : ''}`}
          aria-current={pathname.startsWith('/director') ? 'page' : undefined} style={{ x: director.x, y: director.y }}
          whileTap={{ scale: PRESS.navScale }} transition={SPRING.tap}>
          <Icon name="clapperboard" size={16} />Reel Director
        </motion.a>
        <motion.button ref={menuBtn} type="button" className="fnav-menu" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: PRESS.navScale }} transition={SPRING.tap}>
          <span className="fnav-menu-lines" aria-hidden="true"><span /><span /></span>Menu
        </motion.button>
      </nav>
      <AnimatePresence>
        {open ? (
          <motion.div ref={panel} id="site-menu" className="fnav-panel" role="region" aria-label="More places"
            initial={{ clipPath: 'inset(0 0 100% 0 round 20px)', opacity: 0.6 }} animate={{ clipPath: 'inset(0 0 0% 0 round 20px)', opacity: 1 }}
            exit={{ clipPath: 'inset(0 0 100% 0 round 20px)', opacity: 0, transition: { duration: DURATION.standard, ease: EASE.inOut } }}
            transition={{ duration: DURATION.reveal, ease: EASE.out }}>
            <ul role="list">
              {MORE.map((m, i) => (
                <motion.li key={m.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.reveal, delay: 0.06 + stagger(i) }}>
                  <a href={m.href} className="fnav-panel-link">
                    <span className="fnav-panel-icon" aria-hidden="true"><Icon name={m.icon as never} size={20} /></span>
                    <span><span className="fnav-panel-title">{m.label}</span><span className="fnav-panel-note">{m.note}</span></span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function FloatItem({ item, active, loading }: { item: NavItem; active: boolean; loading: boolean }) {
  const scr = useScramble(item.label);
  const mag = useMagnetic<HTMLAnchorElement>();
  return (
    <li>
      <motion.a ref={mag.ref} href={item.href} className={`fnav-item${active ? ' is-active' : ''}${loading ? ' is-loading' : ''}`}
        aria-current={active ? 'page' : undefined} aria-busy={loading || undefined}
        style={{ x: mag.x, y: mag.y }} whileTap={{ scale: PRESS.navScale }} transition={SPRING.tap}
        onPointerEnter={scr.run} onFocus={scr.run} onPointerLeave={scr.stop} onBlur={scr.stop}>
        {active ? <motion.span layoutId="fnav-light" className="fnav-light" transition={LAYOUT} aria-hidden="true" /> : null}
        <ScrambleLabel text={item.label} overlay={scr.ref} />
      </motion.a>
    </li>
  );
}

/* Phones: a labelled bottom bar. No hover effects; pressing gives a spring and the light slides to the new tab. */
function MobileBar({ items, current, loadingHref }: Props) {
  return (
    <nav className="mbar" aria-label="Primary">
      <ul role="list">
        {items.map((it) => {
          const active = current === it.id;
          return (
            <li key={it.id}>
              <motion.a href={it.href} className={`mbar-item${active ? ' is-active' : ''}${loadingHref === it.href ? ' is-loading' : ''}`}
                aria-current={active ? 'page' : undefined} whileTap={{ scale: PRESS.navScale }} transition={SPRING.tap}>
                {active ? <motion.span layoutId="mbar-light" className="mbar-light" transition={LAYOUT} aria-hidden="true" /> : null}
                <Icon name={it.icon as never} size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span className="mbar-label">{it.label}</span>
              </motion.a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

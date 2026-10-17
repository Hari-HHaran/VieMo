import '@ds/tokens.css';
import '@ds/components/bundle.css';
import '../styles/fonts.css';
import './app.css';
import './worlds.css';
import '../styles/nav.css';
import '../styles/lobby.css';
import '../styles/wall.css';
import '../styles/atlas.css';
import '../styles/mo.css';
import '../styles/account.css';
import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/AppShell';
import { dataSource } from '@/lib/tmdb';

export const metadata: Metadata = {
  title: { default: 'VieMo', template: '%s · VieMo' },
  description: 'A social film club: discover films through friends, curate collections, and decide together.',
  applicationName: 'VieMo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d0b0b' },
    { media: '(prefers-color-scheme: light)', color: '#f5efe6' },
  ],
};

/* Runs before first paint: applies the saved theme, motion setting and personal accent so nothing flashes. */
const boot = `(function(){try{var e=document.documentElement;var p=JSON.parse(localStorage.getItem('viemo:prefs')||'{}');var t=p.theme||'system';e.setAttribute('data-theme',t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t);if(p.reduceMotion)e.setAttribute('data-motion','reduce');var a=JSON.parse(localStorage.getItem('viemo:accent')||'null');if(a&&a.css){var s=document.createElement('style');s.id='vm-accent';s.textContent=a.css;document.head.appendChild(s);e.setAttribute('data-vm-accent','')}}catch(x){}})();`;

/* When the server runs on the saved snapshot, every screen says so (and how old it is). */
function dataNote(): string | null {
  const d = dataSource();
  if (d.mode !== 'snapshot') return null;
  const date = new Date(d.takenAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `Showing saved TMDB data from ${date} (${d.filmCount.toLocaleString('en')} films). Trending, cinema and where-to-watch lists won’t change until it’s refreshed.`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        {['SchibstedGrotesk-Variable', 'BigShouldersDisplay-Variable', 'InstrumentSerif-Regular'].map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body>
        <AppShell dataNote={dataNote()}>{children}</AppShell>
      </body>
    </html>
  );
}

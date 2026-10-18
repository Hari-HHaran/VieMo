import type { Metadata } from 'next';
import { Icon } from '@/ds/client';
import QuickPick from '@/components/QuickPick';
import WheelMo from '@/components/wheelmo/WheelMo';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, regionProviders } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Match' };
export const dynamic = 'force-dynamic';

export default async function Match({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const wheel = q.mode === 'wheel';
  const share = typeof q.share === 'string' && /^[a-z0-9]{16}$/.test(q.share) ? q.share : null;
  const region = await viewerRegion();
  const providers = await settle(regionProviders(region), 'streaming services');
  const services = providers.ok ? providers.value.slice(0, 8).map((p) => ({ id: p.provider_id, name: p.provider_name })) : [];
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Match</h1>
        <p className="type-body vm-muted">Decide what to watch without the back-and-forth.</p>
      </header>
      <nav className="match-modes" aria-label="Ways to decide">
        <a href="/match" className="match-mode" aria-current={!wheel ? 'page' : undefined}>
          <Icon name="users" size={20} /><span><span className="type-label">Swipe Match</span><span className="type-caption vm-muted">Swipe through films until one fits</span></span>
        </a>
        <a href="/match?mode=wheel" className="match-mode is-wheel" aria-current={wheel ? 'page' : undefined}>
          <Icon name="rotate-cw" size={20} /><span><span className="type-label">WheelMo</span><span className="type-caption vm-muted">Pull the lever. Let cinema decide.</span></span>
        </a>
      </nav>
      {wheel ? <WheelMo initialShare={share} services={services} /> : (
        <>
          <aside className="notice" aria-labelledby="mn-h">
            <Icon name="users" size={20} />
            <div>
              <h2 id="mn-h" className="type-label">Movie Night with friends</h2>
              <p className="type-caption vm-muted">Vote together in real time from any device. <a href="/match/night">Start or join a Movie Night</a>.</p>
            </div>
          </aside>
          <a className="viewmo-promo director-promo" href="/director">
            <span className="viewmo-promo-icon" aria-hidden="true"><Icon name="clapperboard" size={22} /></span>
            <span><span className="type-heading-md">Ask Reel Director</span><span className="type-caption vm-muted">Rather describe it in words? Get three picks with reasons.</span></span>
            <Icon name="chevron-right" size={20} />
          </a>
          <QuickPick services={services} place={regionName(region)} availabilityNote={asOf(`Availability is from JustWatch via TMDB for ${regionName(region)}`)} />
        </>
      )}
    </div>
  );
}

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
      <nav className="decide" aria-label="Ways to decide">
        <div className="decide-group">
          <h2 className="type-label decide-head">Just me</h2>
          <ul role="list" className="decide-list">
            <li><a href="/match" className="match-mode" aria-current={!wheel ? 'page' : undefined}>
              <Icon name="heart" size={20} /><span><span className="type-label">Swipe Match</span><span className="type-caption vm-muted">Swipe through films until one fits</span></span></a></li>
            <li><a href="/match?mode=wheel" className="match-mode is-wheel" aria-current={wheel ? 'page' : undefined}>
              <Icon name="rotate-cw" size={20} /><span><span className="type-label">WheelMo</span><span className="type-caption vm-muted">Pull the lever. Let cinema decide.</span></span></a></li>
            <li><a href="/director" className="match-mode">
              <Icon name="clapperboard" size={20} /><span><span className="type-label">Reel Director</span><span className="type-caption vm-muted">Describe your night, get three picks</span></span></a></li>
          </ul>
        </div>
        <div className="decide-group">
          <h2 className="type-label decide-head">With friends</h2>
          <ul role="list" className="decide-list">
            <li><a href="/match/night" className="match-mode">
              <Icon name="users" size={20} /><span><span className="type-label">Movie Night</span><span className="type-caption vm-muted">Everyone votes in private; Match Decider settles it</span></span></a></li>
          </ul>
        </div>
      </nav>
      {wheel ? <WheelMo initialShare={share} services={services} auto={q.auto === 'watchlist' || q.auto === 'surprise' ? q.auto : null} /> : (
        <QuickPick services={services} place={regionName(region)} availabilityNote={asOf(`Availability is from JustWatch via TMDB for ${regionName(region)}`)} />
      )}
    </div>
  );
}

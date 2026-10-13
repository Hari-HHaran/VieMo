import type { Metadata } from 'next';
import { Icon } from '@/ds/client';
import QuickPick from '@/components/QuickPick';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, regionProviders } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Match' };

export default async function Match() {
  const region = await viewerRegion();
  const providers = await settle(regionProviders(region), 'streaming services');
  const services = providers.ok ? providers.value.slice(0, 8).map((p) => ({ id: p.provider_id, name: p.provider_name })) : [];
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Match</h1>
        <p className="type-body vm-muted">Decide what to watch without the back-and-forth.</p>
      </header>
      <aside className="notice" aria-labelledby="mn-h">
        <Icon name="users" size={20} />
        <div>
          <h2 id="mn-h" className="type-label">Movie Night with friends</h2>
          <p className="type-caption vm-muted">Voting together in real time needs accounts, which come next. Quick pick below already works on this device.</p>
        </div>
      </aside>
      <QuickPick services={services} place={regionName(region)} availabilityNote={asOf(`Availability is from JustWatch via TMDB for ${regionName(region)}`)} />
    </div>
  );
}

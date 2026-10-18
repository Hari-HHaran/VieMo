import type { Metadata } from 'next';
import { Icon } from '@/ds/client';
import ProfileAccountNote from '@/components/account/ProfileAccountNote';
import LibraryTab from '@/components/profile/LibraryTab';
import WallPreview from '@/components/wall/WallPreview';
import DeviceScreening from '@/components/screening/DeviceScreening';
import WatchlistView from '@/components/WatchlistView';

export const metadata: Metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

const TABS = [['overview', 'Overview'], ['library', 'Library']] as const;

/* Your film life: what you've watched and want to watch (Overview), and what's kept in your account (Library).
   How the app looks and behaves is in Settings. */
export default async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = (await searchParams).tab;
  const tab = TABS.find(([id]) => id === q)?.[0] ?? 'overview';
  return (
    <div className="page">
      <header className="page-head profile-head">
        <div className="profile-head-row">
          <h1 className="type-display-lg">Profile</h1>
          <a href="/settings" className="profile-settings type-label"><Icon name="settings" size={18} />Settings</a>
        </div>
        <ProfileAccountNote />
      </header>
      <nav className="member-tabs" aria-label="Profile">
        {TABS.map(([id, label]) => (
          <a key={id} href={id === 'overview' ? '/profile' : `/profile?tab=${id}`} className="member-tab type-label" aria-current={tab === id ? 'page' : undefined}>{label}</a>
        ))}
      </nav>
      {tab === 'overview' ? (
        <>
          <WallPreview />
          <DeviceScreening />
          <section aria-labelledby="wl-h" className="section">
            <h2 id="wl-h" className="type-heading-lg">Watchlist</h2>
            <WatchlistView />
          </section>
        </>
      ) : <LibraryTab />}
    </div>
  );
}

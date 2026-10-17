import type { Metadata } from 'next';
import AccentSettings from '@/components/AccentSettings';
import ProfileAccountNote from '@/components/account/ProfileAccountNote';
import PassportCard from '@/components/PassportCard';
import WallPreview from '@/components/wall/WallPreview';
import AppearanceSettings from '@/components/AppearanceSettings';
import RegionSelect from '@/components/RegionSelect';
import WatchlistView from '@/components/WatchlistView';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { regions } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Profile' };

export default async function Profile() {
  const region = await viewerRegion();
  const list = await settle(regions(), 'regions');
  const options = list.ok ? list.value.map((r) => ({ code: r.iso_3166_1, name: r.english_name })) : [{ code: region, name: regionName(region) }];
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="type-display-lg">Profile</h1>
        <ProfileAccountNote />
      </header>
      <PassportCard region={region} regionLabel={regionName(region)} />
      <WallPreview />
      <section aria-labelledby="wl-h" className="section">
        <h2 id="wl-h" className="type-heading-lg">Watchlist</h2>
        <WatchlistView />
      </section>
      <section aria-labelledby="ac-h" className="section">
        <h2 id="ac-h" className="type-heading-lg">Your colour</h2>
        <p className="type-body vm-muted">Take VieMo’s accent colour from your favourite film’s logo. It’s adjusted for each theme so text stays readable.</p>
        <AccentSettings />
      </section>
      <section aria-labelledby="ap-h" className="section">
        <h2 id="ap-h" className="type-heading-lg">Appearance</h2>
        <AppearanceSettings />
      </section>
      <section aria-labelledby="rg-h" className="section">
        <h2 id="rg-h" className="type-heading-lg">Region</h2>
        <RegionSelect current={region} regions={options} />
      </section>
      <section aria-labelledby="ab-h" className="section">
        <h2 id="ab-h" className="type-heading-lg">About the data</h2>
        <p className="type-body vm-muted">Film details, posters, trailers and trending lists come from TMDB. Where-to-watch data comes from JustWatch via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Trailers play on YouTube.</p>
      </section>
    </div>
  );
}

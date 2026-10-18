import type { Metadata } from 'next';
import AccentSettings from '@/components/AccentSettings';
import AppearanceSettings from '@/components/AppearanceSettings';
import BackdropSettings from '@/components/BackdropSettings';
import RegionSelect from '@/components/RegionSelect';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { regions } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Settings' };

/* Everything that changes how VieMo looks and behaves on this device, in one place. Account details (name,
   username, privacy) live on the account page. */
export default async function Settings() {
  const region = await viewerRegion();
  const list = await settle(regions(), 'regions');
  const options = list.ok ? list.value.map((r) => ({ code: r.iso_3166_1, name: r.english_name })) : [{ code: region, name: regionName(region) }];
  return (
    <div className="page settings-page">
      <header className="page-head">
        <p className="type-eyebrow settings-crumb"><a href="/profile">Profile</a> · Settings</p>
        <h1 className="type-display-lg">Settings</h1>
        <p className="type-body vm-muted">These are saved on this device. Your name, username and privacy are in <a href="/account">your account</a>.</p>
      </header>
      <nav className="settings-toc" aria-label="Settings sections">
        <a href="#ac-h">Colour</a><a href="#bd-h">Background</a><a href="#ap-h">Appearance</a><a href="#rg-h">Region</a><a href="#ab-h">About the data</a>
      </nav>
      <section aria-labelledby="ac-h" className="section">
        <h2 id="ac-h" className="type-heading-lg">Your colour</h2>
        <p className="type-body vm-muted">Take VieMo’s accent colour from your favourite film’s logo. It’s adjusted for each theme so text stays readable.</p>
        <AccentSettings />
      </section>
      <section aria-labelledby="bd-h" className="section">
        <h2 id="bd-h" className="type-heading-lg">Background</h2>
        <p className="type-body vm-muted">Put a favourite film’s poster faintly behind the app.</p>
        <BackdropSettings />
      </section>
      <section aria-labelledby="ap-h" className="section">
        <h2 id="ap-h" className="type-heading-lg">Appearance</h2>
        <AppearanceSettings />
      </section>
      <section aria-labelledby="rg-h" className="section">
        <h2 id="rg-h" className="type-heading-lg">Region</h2>
        <p className="type-body vm-muted">Where-to-watch, cinema listings and release dates follow this region.</p>
        <RegionSelect current={region} regions={options} />
      </section>
      <section aria-labelledby="ab-h" className="section">
        <h2 id="ab-h" className="type-heading-lg">About the data</h2>
        <p className="type-body vm-muted">Film details, posters, trailers and trending lists come from TMDB. Where-to-watch data comes from JustWatch via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Trailers play on YouTube.</p>
      </section>
    </div>
  );
}

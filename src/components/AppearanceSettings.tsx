'use client';
import { usePrefs, type ThemePref } from '@/lib/device-store';

const THEMES: { id: ThemePref; label: string }[] = [{ id: 'system', label: 'Match my device' }, { id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }];

export default function AppearanceSettings() {
  const [prefs, update] = usePrefs();
  return (
    <div className="settings">
      <fieldset className="settings-group">
        <legend className="type-label">Theme</legend>
        {THEMES.map((t) => (
          <label key={t.id} className="option">
            <input type="radio" name="theme" value={t.id} checked={prefs.theme === t.id} onChange={() => update({ theme: t.id })} />
            <span className="type-body">{t.label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="settings-group">
        <legend className="type-label">Motion and media</legend>
        <label className="option"><input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => update({ reduceMotion: e.target.checked })} /><span className="type-body">Reduce motion</span></label>
        <label className="option"><input type="checkbox" checked={prefs.autoplay} onChange={(e) => update({ autoplay: e.target.checked })} /><span className="type-body">Autoplay trailers in Clips (muted)</span></label>
        <label className="option"><input type="checkbox" checked={prefs.captions} onChange={(e) => update({ captions: e.target.checked })} /><span className="type-body">Turn on captions when a trailer has them</span></label>
      </fieldset>
    </div>
  );
}

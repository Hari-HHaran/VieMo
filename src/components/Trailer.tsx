'use client';
import { useState } from 'react';
import { Button, Icon } from '@/ds/client';
import { usePrefs } from '@/lib/device-store';

/* A YouTube trailer that loads only when asked for (youtube-nocookie, YouTube's own player and controls). */
export default function Trailer({ youtubeKey, title, still, autoPlay, onPlay, playing }: {
  youtubeKey: string; title: string; still: string | null; autoPlay?: boolean; onPlay?: () => void;
  /** Controlled mode: the parent decides which trailer plays, so only one plays at a time. */
  playing?: boolean;
}) {
  const [prefs] = usePrefs();
  const [own, setOn] = useState(false);
  const on = playing ?? own;
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
  if (prefs.captions) params.set('cc_load_policy', '1');
  if (autoPlay) params.set('mute', '1');
  if (on) {
    return (
      <div className="trailer">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?${params}`}
          title={`${title} trailer (YouTube)`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    <div className="trailer trailer-idle">
      {still ? <img src={still} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
      <Button variant="primary" size="lg" icon="play" className="trailer-play" onClick={() => { setOn(true); onPlay?.(); }}>
        Play trailer
      </Button>
      <span className="trailer-src type-caption"><Icon name="info" size={14} />Plays on YouTube</span>
    </div>
  );
}

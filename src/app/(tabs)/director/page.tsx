import type { Metadata } from 'next';
import { EmptyState } from '@/ds/client';
import ReelDirector from '@/components/ReelDirector';
import { aiConfigured } from '@/lib/ai';

export const metadata: Metadata = { title: 'Reel Director' };
export const dynamic = 'force-dynamic';

/* Reel Director lives in the Director's Studio: obsidian and muted gold. Reached from Home and Match. */
export default function Director() {
  return (
    <div className="page studio">
      <header className="page-head studio-head">
        <p className="type-eyebrow studio-eyebrow">Reel Director</p>
        <h1 className="studio-title">What should tonight feel like?</h1>
        <p className="type-body vm-muted">Tell it about the night. It storyboards three real films: a safe choice, a wildcard and a hidden gem.</p>
      </header>
      {aiConfigured() ? <ReelDirector /> : (
        <EmptyState icon="clapperboard" title="Reel Director isn’t switched on here yet"
          body="This VieMo server can’t find an OpenAI key, so nothing is generated. The site owner adds it in Vercel as OPENAI_API_KEY and redeploys. Quick pick in Match works without it."
          action={{ label: 'Open Quick pick', icon: 'users', href: '/match' }} />
      )}
    </div>
  );
}

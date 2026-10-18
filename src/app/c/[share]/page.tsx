import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar, Icon, Poster } from '@/ds/client';
import CollectionActions from '@/components/community/CollectionActions';
import DemoBadge from '@/components/community/DemoBadge';
import { MoPage } from '@/components/mo/MoProvider';
import { collectionPage } from '@/lib/community';
import { runtimeLabel } from '@/lib/format';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const IMG = 'https://image.tmdb.org/t/p';
type Params = { params: Promise<{ share: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await collectionPage((await params).share);
  return { title: r.ok && r.value ? r.value.title : 'Collection', robots: r.ok && r.value?.visibility !== 'public' ? { index: false } : undefined };
}

const VIS = { public: 'Public: anyone can find it', unlisted: 'Unlisted: only people with the link', private: 'Private: only you and people you invite' } as const;

/* One collection, opened up: the sleeve, who made it, and every film as a numbered track list. */
export default async function Collection({ params }: Params) {
  const share = (await params).share;
  if (!/^[a-z0-9]{16}$/.test(share)) notFound();
  const [r, { user }] = await Promise.all([collectionPage(share), currentUser()]);
  if (!r.ok || !r.value) notFound();
  const c = r.value;
  const name = c.owner.display_name || `@${c.owner.username}`;
  const mine = c.role === 'owner';
  const runtime = c.films.reduce((n, f) => n + (f.runtime ?? 0), 0);
  const covers = c.films.slice(0, 4);
  return (
    <div className="page cv">
      <header className="cv-hero">
        {covers[0]?.poster_path ? <span className="cv-glow" aria-hidden="true" style={{ backgroundImage: `url(${IMG}/w342${covers[0].poster_path})` }} /> : null}
        <span className="cv-cover" aria-hidden="true" style={{ viewTransitionName: 'collection-cover' }}>
          {[...covers].reverse().map((f, ri) => (
            <span key={f.tmdb_id} className="cv-sleeve" style={{ ['--i' as string]: covers.length - 1 - ri }}>
              {f.poster_path ? <img src={`${IMG}/w342${f.poster_path}`} alt="" /> : <span className="pl-blank">{f.title}</span>}
            </span>
          ))}
        </span>
        <div className="cv-info">
          <p className="type-eyebrow cv-eyebrow">Collection{c.visibility !== 'public' ? ` · ${c.visibility === 'unlisted' ? 'Unlisted' : 'Private'}` : ''}</p>
          <h1 className="cv-title">{c.title}</h1>
          <MoPage collection={{ share: c.share_id, title: c.title }} />
          {c.description ? <p className="type-body-lg cv-desc">{c.description}</p> : null}
          <p className="cv-by type-body">
            <a href={`/u/${c.owner.username}`} className="cv-owner"><Avatar name={name} src={c.owner.avatar_url ?? undefined} size="sm" /><span>{name}</span></a>
            {c.owner.is_demo ? <DemoBadge /> : null}
            <span className="vm-muted">· {c.films.length} {c.films.length === 1 ? 'film' : 'films'}{runtime ? ` · ${runtimeLabel(runtime)}` : ''}{c.saves ? ` · ${c.saves} ${c.saves === 1 ? 'save' : 'saves'}` : ''}</span>
          </p>
          {mine ? <p className="type-caption vm-muted cv-vis"><Icon name={c.visibility === 'public' ? 'globe' : c.visibility === 'unlisted' ? 'link' : 'lock'} size={14} /> {VIS[c.visibility]}. <a href="/profile?tab=library">Change it in your library</a></p> : null}
          {c.owner.is_demo ? <p className="type-caption vm-muted">A demo collection: made by a fictional account for testing.</p> : null}
          <div className="cv-row">
            <CollectionActions id={c.id} share={c.share_id} title={c.title} canSave={!mine && c.visibility === 'public'} saved={c.saved_by_me} signedIn={!!user} />
            {c.films.length >= 2 ? <a className="vm-btn vm-btn-secondary vm-btn-md type-label" href={`/match?mode=wheel&source=collection&share=${c.share_id}`}><Icon name="rotate-cw" size={18} />Spin on WheelMo</a> : null}
          </div>
        </div>
      </header>

      <section aria-labelledby="cv-films">
        <h2 id="cv-films" className="vm-sr">Films in this collection</h2>
        {c.films.length ? (
          <ol className="cv-tracks" role="list">
            {c.films.map((f, i) => (
              <li key={f.tmdb_id}>
                <a href={`/film/${f.tmdb_id}`} className="cv-track" data-film-card>
                  <span className="cv-n type-data" aria-hidden="true">{i + 1}</span>
                  <span className="cv-thumb" data-poster><Poster src={f.poster_path ? `${IMG}/w92${f.poster_path}` : null} title={f.title} year={f.year ?? undefined} size="fill" /></span>
                  <span className="cv-track-text"><span className="type-label">{f.title}</span><span className="type-caption vm-muted">{[f.year, f.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</span></span>
                  <span className="cv-run type-caption vm-muted">{runtimeLabel(f.runtime) ?? ''}</span>
                </a>
              </li>
            ))}
          </ol>
        ) : <p className="type-body vm-muted">No films in this collection yet.</p>}
      </section>
    </div>
  );
}

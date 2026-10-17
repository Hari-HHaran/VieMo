'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ds/client';
import { copyCollection, setSaved } from '@/app/c/actions';
import { useToast } from '../AppShell';

export default function CollectionActions({ id, share, title, canSave, saved: initial, signedIn }: { id: string; share: string; title: string; canSave: boolean; saved: boolean; signedIn: boolean }) {
  const [saved, setSavedState] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const next = `/sign-in?next=${encodeURIComponent(`/c/${share}`)}`;
  return (
    <div className="cv-actions">
      {canSave ? (
        signedIn ? (
          <Button variant={saved ? 'secondary' : 'primary'} icon={saved ? 'bookmark-check' : 'bookmark'} aria-pressed={saved} busy={pending}
            onClick={() => start(async () => {
              const r = await setSaved(id, share, !saved);
              if (r.ok) { setSavedState(!saved); toast({ icon: 'bookmark-check', message: !saved ? `Saved “${title}” to your library` : 'Removed from your library' }); }
              else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t save.' });
            })}>{saved ? 'Saved' : 'Save'}</Button>
        ) : <Button href={next} variant="primary" icon="bookmark">Sign in to save</Button>
      ) : null}
      {signedIn ? (
        <Button variant="secondary" icon="copy" busy={pending} onClick={() => start(async () => {
          const r = await copyCollection(share);
          if (r.ok && r.share) { toast({ icon: 'copy', message: 'Copied to your collections. Your copy is private.' }); router.push(`/c/${r.share}`); }
          else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t copy.' });
        })}>Copy to my collections</Button>
      ) : null}
    </div>
  );
}

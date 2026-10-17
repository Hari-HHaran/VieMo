'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ds/client';
import { importWatchlist } from '@/app/(account)/library/actions';
import { useWatchlist } from '@/lib/device-store';
import { useToast } from '../AppShell';

/* Offers to copy this device's watchlist into the account, once there's something to move. Nothing is deleted
   from the device. */
export default function ImportWatchlist({ inAccount }: { inAccount: number[] }) {
  const { list } = useWatchlist();
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const have = new Set(inAccount);
  const missing = list.filter((f) => !have.has(f.id));
  if (!missing.length) return null;
  return (
    <div className="lib-import" role="region" aria-label="Move this device's watchlist">
      <p className="type-body"><strong>{missing.length} {missing.length === 1 ? 'film' : 'films'}</strong> saved on this device {missing.length === 1 ? 'isn’t' : 'aren’t'} in your account yet.</p>
      <Button variant="primary" icon="bookmark-plus" busy={pending} onClick={() => start(async () => {
        const r = await importWatchlist(missing.map((f) => f.id));
        if (r.ok) { toast({ icon: 'check', message: `Moved ${r.count} ${r.count === 1 ? 'film' : 'films'} into your account` }); router.refresh(); }
        else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t move.' });
      })}>Move them into my account</Button>
    </div>
  );
}

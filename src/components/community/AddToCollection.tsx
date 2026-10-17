'use client';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button, Icon } from '@/ds/client';
import { createCollection, myCollectionsFor, setInCollection } from '@/app/c/actions';
import { useAccount } from '../account/useAccount';
import { useToast } from '../AppShell';

type Row = { id: string; title: string; visibility: string; has: boolean };

/* Add this film to one of your collections, or start a new one. A disclosure, so it works with keyboard and
   screen readers; it only appears when you're signed in. */
export default function AddToCollection({ tmdbId, title }: { tmdbId: number; title: string }) {
  const me = useAccount();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  const toast = useToast();
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    myCollectionsFor(tmdbId).then(setRows).catch(() => setRows([]));
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const away = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', away);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away); };
  }, [open, tmdbId]);
  if (!me?.user) return null;
  return (
    <div className="atc">
      <button ref={btn} type="button" className="vm-btn vm-btn-secondary vm-btn-lg type-label" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Icon name="list-plus" size={22} /><span className="vm-btn-label">Add to collection</span>
      </button>
      {open ? (
        <div ref={panel} id={id} className="atc-panel" role="group" aria-label={`Add ${title} to a collection`}>
          {rows === null ? <p className="type-caption vm-muted" role="status">Loading your collections…</p> : (
            <ul role="list" className="atc-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <label className="option">
                    <input type="checkbox" checked={r.has} disabled={pending} onChange={() => start(async () => {
                      const res = await setInCollection(r.id, tmdbId, !r.has);
                      if (res.ok) { setRows((x) => x!.map((y) => (y.id === r.id ? { ...y, has: !r.has } : y))); toast({ icon: 'check', message: !r.has ? `Added to “${r.title}”` : `Removed from “${r.title}”` }); }
                      else toast({ tone: 'negative', icon: 'triangle-alert', message: res.message ?? 'That didn’t change.' });
                    })} />
                    <span className="type-body">{r.title} <span className="type-caption vm-muted">{r.visibility === 'public' ? 'Public' : r.visibility === 'unlisted' ? 'Unlisted' : 'Private'}</span></span>
                  </label>
                </li>
              ))}
              {!rows.length ? <li className="type-caption vm-muted">You have no collections yet.</li> : null}
            </ul>
          )}
          <form className="atc-new" onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createCollection(name, 'private', tmdbId);
              if (res.ok) { setName(''); setRows(await myCollectionsFor(tmdbId)); toast({ icon: 'check', message: 'New private collection made, with this film in it' }); }
              else toast({ tone: 'negative', icon: 'triangle-alert', message: res.message ?? 'That didn’t save.' });
            });
          }}>
            <label htmlFor={`${id}-n`} className="type-label">New collection</label>
            <div className="atc-new-row">
              <input id={`${id}-n`} className="acct-input type-body" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Name it" required />
              <Button type="submit" variant="primary" busy={pending}>Create</Button>
            </div>
            <p className="type-caption vm-muted">New collections start private.</p>
          </form>
        </div>
      ) : null}
    </div>
  );
}

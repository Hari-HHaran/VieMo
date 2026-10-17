'use client';
import { useId, useState, useTransition } from 'react';
import { Button, ConfirmModal, Icon } from '@/ds/client';
import { createCollection } from '@/app/c/actions';
import { deleteCollection, updateCollection } from '@/app/(account)/library/actions';
import { useToast } from '../AppShell';

export interface OwnCollection { id: string; share_id: string; title: string; visibility: 'private' | 'unlisted' | 'public'; film_count: number; saves: number }
const VIS: Record<OwnCollection['visibility'], { label: string; note: string; icon: string }> = {
  private: { label: 'Private', note: 'Only you, and people you invite to it.', icon: 'lock' },
  unlisted: { label: 'Unlisted', note: 'Anyone with the link. Never listed in Explore or on your profile.', icon: 'link' },
  public: { label: 'Public', note: 'Anyone. Listed in Explore and on your profile.', icon: 'globe' },
};

export default function LibraryCollections({ collections }: { collections: OwnCollection[] }) {
  const [rows, setRows] = useState(collections);
  const [del, setDel] = useState<OwnCollection | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState('');
  const [vis, setVis] = useState<OwnCollection['visibility']>('private');
  return (
    <div className="lib-cols">
      <form className="lib-new" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createCollection(name, vis);
          if (r.ok && r.id && r.share) { setRows([{ id: r.id, share_id: r.share, title: name.trim(), visibility: vis, film_count: 0, saves: 0 }, ...rows]); setName(''); toast({ icon: 'check', message: `Made “${name.trim()}”. Add films from any film page.` }); }
          else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t save.' });
        });
      }}>
        <label htmlFor={`${id}-t`} className="type-label">New collection</label>
        <div className="atc-new-row">
          <input id={`${id}-t`} className="acct-input type-body" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="For example: Rainy Sunday films" required />
          <label htmlFor={`${id}-v`} className="vm-sr">Who can see it</label>
          <select id={`${id}-v`} className="select type-body" value={vis} onChange={(e) => setVis(e.target.value as OwnCollection['visibility'])}>
            {Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button type="submit" variant="primary" icon="plus" busy={pending}>Create</Button>
        </div>
        <p className="type-caption vm-muted">{VIS[vis].note}</p>
      </form>
      {rows.length ? (
        <ul role="list" className="lib-list">
          {rows.map((c) => (
            <li key={c.id} className="lib-row">
              <div className="lib-row-main">
                <a href={`/c/${c.share_id}`} className="type-label">{c.title}</a>
                <span className="type-caption vm-muted">{c.film_count} {c.film_count === 1 ? 'film' : 'films'}{c.visibility === 'public' && c.saves ? ` · ${c.saves} ${c.saves === 1 ? 'save' : 'saves'}` : ''}</span>
              </div>
              <div className="lib-row-vis">
                <label htmlFor={`${id}-${c.id}`} className="vm-sr">Who can see {c.title}</label>
                <Icon name={VIS[c.visibility].icon as never} size={16} />
                <select id={`${id}-${c.id}`} className="select type-body" value={c.visibility} disabled={pending}
                  aria-describedby={`${id}-${c.id}-note`}
                  onChange={(e) => {
                    const v = e.target.value as OwnCollection['visibility'];
                    start(async () => {
                      const r = await updateCollection(c.id, { visibility: v });
                      if (r.ok) { setRows(rows.map((x) => (x.id === c.id ? { ...x, visibility: v } : x))); toast({ icon: VIS[v].icon, message: `“${c.title}” is now ${VIS[v].label.toLowerCase()}` }); }
                      else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t save.' });
                    });
                  }}>
                  {Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span id={`${id}-${c.id}-note`} className="type-caption vm-muted lib-vis-note">{VIS[c.visibility].note}</span>
              </div>
              <Button variant="ghost" size="sm" iconOnly icon="trash-2" label={`Delete ${c.title}`} onClick={() => setDel(c)} />
            </li>
          ))}
        </ul>
      ) : <p className="type-body vm-muted">No collections yet. Make one above, or use “Add to collection” on any film page.</p>}
      <ConfirmModal open={!!del} title={del ? `Delete “${del.title}”?` : ''} body="Its films stay on VieMo; only this collection goes. People who saved it will lose it too."
        confirmLabel="Delete collection" destructive busy={pending} onCancel={() => setDel(null)}
        onConfirm={() => del && start(async () => {
          const r = await deleteCollection(del.id);
          if (r.ok) { setRows(rows.filter((x) => x.id !== del.id)); toast({ icon: 'trash-2', message: 'Collection deleted' }); }
          else toast({ tone: 'negative', icon: 'triangle-alert', message: r.message ?? 'That didn’t delete.' });
          setDel(null);
        })} />
    </div>
  );
}

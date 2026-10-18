'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ds/client';
import { createNight, joinNight } from '@/app/(tabs)/match/night/actions';
import { Field, FormProblem } from '../account/Field';

/* Host a new room, or join one with the code a friend shared. */
export default function NightStart({ code: initialCode = '', joinOnly = false }: { code?: string; joinOnly?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [problem, setProblem] = useState<string | undefined>();
  const go = async (kind: 'create' | 'join') => {
    setBusy(kind); setProblem(undefined);
    const r = kind === 'create' ? await createNight(title) : await joinNight(code);
    if (!r.ok) { setBusy(null); setProblem(r.message); return; }
    if (joinOnly) { router.refresh(); return; }
    router.push(`/match/night/${r.value!.code}`);
  };
  return (
    <div className="nr-start">
      <FormProblem message={problem} />
      {!joinOnly ? (
        <form className="nr-card" onSubmit={(e) => { e.preventDefault(); void go('create'); }}>
          <h2 className="type-heading-md">Host a Movie Night</h2>
          <p className="type-caption vm-muted">You get a code to share. The room stays open for 24 hours.</p>
          <Field label="Name (optional)" value={title} maxLength={80} placeholder="Movie Night" onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" variant="primary" icon="plus" busy={busy === 'create'} disabled={busy !== null}>Open a room</Button>
        </form>
      ) : null}
      <form className="nr-card" onSubmit={(e) => { e.preventDefault(); void go('join'); }}>
        <h2 className="type-heading-md">{joinOnly ? 'Join this Movie Night' : 'Join with a code'}</h2>
        <p className="type-caption vm-muted">The host and everyone in the room will see your name. Your votes stay private.</p>
        <Field label="Room code" value={code} maxLength={8} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="nr-code-input"
          hint="Six letters and numbers" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Button type="submit" variant={joinOnly ? 'primary' : 'secondary'} icon="user-plus" busy={busy === 'join'} disabled={busy !== null || code.trim().length < 6}>Join</Button>
      </form>
    </div>
  );
}

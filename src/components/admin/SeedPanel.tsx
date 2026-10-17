'use client';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/ds/client';
import { runSeed, type SeedState } from '@/app/admin/demo/actions';

const LABEL = { dry_run: 'Dry run', seed: 'Import', cleanup: 'Removal' } as const;

export default function SeedPanel({ production, environment, accounts, lastRun }: {
  production: boolean; environment: string; accounts: number; lastRun: { at: string; action: keyof typeof LABEL } | null;
}) {
  const [state, action, pending] = useActionState(runSeed, {} as SeedState);
  const out = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.report || state.error) out.current?.focus(); }, [state]);
  const r = state.report;
  return (
    <div className="seed">
      <dl className="seed-facts type-body">
        <div><dt>Environment</dt><dd>{environment}{production ? ' (the live site)' : ''}</dd></div>
        <div><dt>Demo accounts now</dt><dd>{accounts}</dd></div>
        <div><dt>Last run</dt><dd>{lastRun ? `${LABEL[lastRun.action]}, ${new Date(lastRun.at).toLocaleString('en-SG')}` : 'Never'}</dd></div>
      </dl>
      <form action={action} className="seed-form">
        {production ? (
          <label className="option"><input type="checkbox" name="approve" value="yes" />
            <span className="type-body">I approve adding labelled demo data to this live project.</span></label>
        ) : null}
        <label className="option"><input type="checkbox" name="confirm" value="yes" />
          <span className="type-body">For removal: I understand this deletes the ten demo accounts and everything they made.</span></label>
        <div className="acct-row">
          <Button type="submit" name="action" value="dry_run" variant="secondary" busy={pending}>Dry run (writes nothing)</Button>
          <Button type="submit" name="action" value="seed" variant="primary" busy={pending}>{accounts ? 'Update the demo community' : 'Import the demo community'}</Button>
          <Button type="submit" name="action" value="cleanup" variant="ghost" busy={pending}>Remove the demo community</Button>
        </div>
      </form>
      <div ref={out} tabIndex={-1} className="seed-out" aria-live="polite">
        {state.error ? <p className="acct-alert type-body" role="alert">{state.error}</p> : null}
        {r ? (
          <section aria-label={`${LABEL[r.action]} report`} className="seed-report">
            <h2 className="type-heading-md">{LABEL[r.action]} {r.ok ? 'finished' : 'finished with problems'}</h2>
            {r.error ? <p className="acct-alert type-body">{r.error}</p> : null}
            {r.action === 'cleanup' ? <p className="type-body">Removed {r.removed?.length ?? 0} demo accounts.</p> : (
              <>
                <p className="type-body">Films resolved on TMDB: {r.films.resolved}. Rejected: {r.films.rejected.length}. Accounts: {r.accounts.created.length} new, {r.accounts.existing.length} already there, {r.accounts.skipped.length} skipped.</p>
                {r.database ? <p className="type-body">Written: {['watched', 'reviews', 'watchlist', 'collections', 'collection_items', 'follows'].map((k) => `${String(r.database![k] ?? 0)} ${k.replace('_', ' ')}`).join(', ')}.</p> : null}
                <List title="Films not imported (no confident TMDB match)" items={r.films.rejected.map((x) => `${x.key}: ${x.why}`)} />
                <List title="Accepted with a one-year difference" items={r.films.yearOffByOne} />
                <List title="Skipped entries" items={r.skippedEntries} />
                <List title="Skipped accounts" items={r.accounts.skipped.map((s) => `${s.seed_key}: ${s.why}`)} />
                <List title="Fixes applied to the fixture" items={r.fixes} />
              </>
            )}
            <List title="Problems" items={r.problems} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <details className="seed-list">
      <summary className="type-label">{title} ({items.length})</summary>
      <ul role="list">{items.map((i) => <li key={i} className="type-caption">{i}</li>)}</ul>
    </details>
  );
}

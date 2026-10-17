import type { Metadata } from 'next';
import { Icon } from '@/ds/client';
import { siteStatus, type Check } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Site status', robots: { index: false, follow: false } };

/* For the site owner: which settings this server found and whether they work. Names only, never values. */
export default async function Status() {
  const s = await siteStatus();
  return (
    <div className="page status">
      <header className="page-head">
        <h1 className="type-display-lg">Site status</h1>
        <p className="type-body vm-muted">What this VieMo server can see. Variable names only; values are never shown. Changes in Vercel apply after a redeploy.</p>
      </header>
      {s.problems.length ? (
        <section className="status-problems" aria-labelledby="st-p">
          <h2 id="st-p" className="type-heading-md">To fix</h2>
          <ul role="list">{s.problems.map((p) => <li key={p} className="type-body">{p}</li>)}</ul>
        </section>
      ) : null}
      <Group title="Accounts" checks={s.accounts} />
      {s.database.length ? <Group title="Database" checks={s.database} /> : null}
      <Group title="Other services" checks={s.other} />
    </div>
  );
}

function Group({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <section aria-labelledby={`st-${title}`} className="status-group">
      <h2 id={`st-${title}`} className="type-heading-md">{title}</h2>
      <ul role="list" className="status-list">
        {checks.map((c) => (
          <li key={c.label} className={`status-row is-${c.ok === null ? 'optional' : c.ok ? 'ok' : 'bad'}`}>
            <Icon name={c.ok === null ? 'info' : c.ok ? 'check' : 'triangle-alert'} size={18} />
            <span><span className="type-label">{c.label}</span><span className="vm-sr">{c.ok === null ? ': optional' : c.ok ? ': working' : ': needs attention'}</span><br /><span className="type-caption vm-muted">{c.detail}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

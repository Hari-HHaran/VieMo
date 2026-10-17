import { EmptyState } from '@/ds/client';

/* The frame every account screen shares: a heading, one line of context, then the form. */
export default function AuthPage({ eyebrow, title, intro, children, foot }: { eyebrow: string; title: string; intro?: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="page acct">
      <section className="acct-card" aria-labelledby="acct-title">
        <header className="acct-head">
          <p className="type-eyebrow acct-eyebrow">{eyebrow}</p>
          <h1 id="acct-title" className="acct-title">{title}</h1>
          {intro ? <p className="type-body vm-muted">{intro}</p> : null}
        </header>
        {children}
        {foot ? <footer className="acct-foot type-body">{foot}</footer> : null}
      </section>
    </div>
  );
}

export function AccountsOff() {
  return (
    <>
      <EmptyState icon="lock" title="Accounts aren’t switched on here yet"
        body="This VieMo server isn’t connected to Supabase, so there’s nothing to sign in to. Your watchlist, diary and Wall of Fame still work, saved on this device."
        action={{ label: 'Go to your watchlist', icon: 'bookmark', href: '/profile' }} />
      <p className="type-caption vm-muted">Site owner: <a href="/status">the status page</a> shows which settings this server found.</p>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AuthPage from '@/components/account/AuthPage';
import SeedPanel from '@/components/admin/SeedPanel';
import { demoState, seedEnvironment } from '@/lib/demo/seed';
import { supabaseSecretKey } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Demo community', robots: { index: false, follow: false } };

/* The demo community importer. Only editor accounts see this page; everyone else gets "not found". */
export default async function DemoAdmin() {
  const { sb, user } = await currentUser();
  if (!sb || !user) notFound();
  const { data: me } = await sb.from('profiles').select('is_editor').eq('id', user.id).maybeSingle();
  if (!me?.is_editor) notFound();
  const env = seedEnvironment();
  const missing = [!env.enabled && 'DEMO_SEED_ENABLED=true', !supabaseSecretKey() && 'SUPABASE_SERVICE_ROLE_KEY (Sensitive)'].filter(Boolean) as string[];
  const state = missing.length ? null : await demoState();
  return (
    <AuthPage eyebrow="Editor" title="Demo community"
      intro="Ten fictional accounts with collections, watch history, reviews and follows, for testing Explore, profiles and WheelMo. Everything they make is labelled Demo, and removing it never touches real accounts.">
      {missing.length ? (
        <p className="acct-alert type-body" role="alert">To use the importer, add {missing.join(' and ')} in Vercel, then redeploy.</p>
      ) : (
        <SeedPanel production={env.production} environment={env.env} accounts={state?.accounts ?? 0}
          lastRun={state?.last ? { at: state.last.ran_at, action: state.last.action } : null} />
      )}
    </AuthPage>
  );
}

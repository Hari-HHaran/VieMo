'use server';
import { revalidatePath } from 'next/cache';
import { runDemoSeed, seedEnvironment, type SeedAction, type SeedReport } from '@/lib/demo/seed';
import { currentUser } from '@/lib/supabase/server';

export type SeedState = { report?: SeedReport; error?: string };

/* Every call re-checks who is asking: server actions can be called directly, not only from the page. */
export async function runSeed(_: SeedState, form: FormData): Promise<SeedState> {
  const action = String(form.get('action')) as SeedAction;
  if (!['dry_run', 'seed', 'cleanup'].includes(action)) return { error: 'Unknown action.' };
  const env = seedEnvironment();
  if (!env.enabled) return { error: 'The importer is switched off. Set DEMO_SEED_ENABLED=true in Vercel and redeploy.' };
  const { sb, user } = await currentUser();
  if (!sb || !user) return { error: 'Sign in first.' };
  const { data: me } = await sb.from('profiles').select('is_editor').eq('id', user.id).maybeSingle();
  if (!me?.is_editor) return { error: 'Only an editor account can run the importer.' };
  if (action !== 'dry_run' && env.production && form.get('approve') !== 'yes') {
    return { error: 'This is the production site. Tick the approval box to confirm, then try again.' };
  }
  if (action === 'cleanup' && form.get('confirm') !== 'yes') return { error: 'Tick the box to confirm removing the demo community.' };
  try {
    const report = await runDemoSeed(action, user.id);
    revalidatePath('/admin/demo');
    return { report };
  } catch (e) { return { error: `The importer stopped: ${(e as Error).message}` }; }
}

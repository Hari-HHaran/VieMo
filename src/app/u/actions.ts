'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UUID } from '@/lib/screening-server';
import { currentUser } from '@/lib/supabase/server';

/* Follow or unfollow, always as the signed-in person (row level security insists on it too). */
export async function setFollow(form: FormData): Promise<void> {
  const target = String(form.get('target') ?? ''), username = String(form.get('username') ?? '');
  const back = /^[a-z0-9_]{3,24}$/.test(username) ? `/u/${username}` : '/';
  const { sb, user } = await currentUser();
  if (!sb) return;
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  if (!UUID.test(target) || target === user.id) return;
  if (form.get('follow') === '1') await sb.from('follows').insert({ follower_id: user.id, followee_id: target });
  else await sb.from('follows').delete().eq('follower_id', user.id).eq('followee_id', target);
  revalidatePath(back);
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar } from '@/ds/client';
import AuthPage, { AccountsOff } from '@/components/account/AuthPage';
import RemoteScreening from '@/components/screening/RemoteScreening';
import { accountsConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';
import { setFollow } from '../actions';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username).toLowerCase()}` };
}

/* A member's public profile: who they are, follow, and their Screening Activity if they share it with you. */
export default async function Member({ params }: Params) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) notFound();
  if (!accountsConfigured()) return <AuthPage eyebrow="Member" title={`@${username}`}><AccountsOff /></AuthPage>;
  const { sb, user } = await currentUser();
  if (!sb) notFound();
  const { data: p } = await sb.from('profiles').select('*').eq('username', username).maybeSingle();
  if (!p) notFound();

  const isOwn = user?.id === p.id;
  const [followers, following, mine, theirs] = await Promise.all([
    sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', p.id),
    sb.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', p.id),
    user && !isOwn ? sb.from('follows').select('follower_id').eq('follower_id', user.id).eq('followee_id', p.id).maybeSingle() : null,
    user && !isOwn ? sb.from('follows').select('follower_id').eq('follower_id', p.id).eq('followee_id', user.id).maybeSingle() : null,
  ]);
  const iFollow = !!mine?.data, theyFollow = !!theirs?.data;
  const name = p.display_name || `@${p.username}`;
  const possessive = isOwn ? 'Your' : `${name}’s`;

  const privateNote = p.activity_visibility === 'friends'
    ? <p className="type-body sa-muted">{name} shares Screening Activity with friends: people they follow who follow them back.{user ? (iFollow ? (theyFollow ? '' : ` You follow ${name}; they don’t follow you back yet.`) : ` Follow ${name} to start.`) : ' Sign in and follow each other to see it.'}</p>
    : <p className="type-body sa-muted">{name} keeps their Screening Activity private.</p>;

  return (
    <div className="page member">
      <header className="member-head">
        <Avatar name={name} src={p.avatar_url ?? undefined} size="lg" />
        <div className="member-id">
          <h1 className="member-name">{name}</h1>
          <p className="type-body sa-muted">@{p.username}</p>
          {p.bio ? <p className="type-body member-bio">{p.bio}</p> : null}
          <p className="type-caption member-counts">
            <span><strong>{followers.count ?? 0}</strong> {followers.count === 1 ? 'follower' : 'followers'}</span>
            <span><strong>{following.count ?? 0}</strong> following</span>
            {iFollow && theyFollow ? <span className="member-friends">Friends</span> : theyFollow ? <span>Follows you</span> : null}
          </p>
        </div>
        <div className="member-actions">
          {isOwn ? <a href="/account" className="vm-btn vm-btn-secondary vm-btn-md type-label">Edit profile</a> : (
            <form action={setFollow}>
              <input type="hidden" name="target" value={p.id} />
              <input type="hidden" name="username" value={p.username} />
              <input type="hidden" name="follow" value={iFollow ? '0' : '1'} />
              <button type="submit" className={`vm-btn ${iFollow ? 'vm-btn-secondary' : 'vm-btn-primary'} vm-btn-md type-label`}>
                {iFollow ? 'Following' : theyFollow ? 'Follow back' : 'Follow'}{iFollow ? <span className="vm-sr">. Select to unfollow {name}</span> : null}
              </button>
            </form>
          )}
        </div>
      </header>
      <RemoteScreening ownerId={p.id} owner={possessive} isOwn={isOwn} privateNote={privateNote} />
    </div>
  );
}

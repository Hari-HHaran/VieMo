import { Avatar } from '@/ds/client';
import type { Member } from '@/lib/community';
import DemoBadge from './DemoBadge';

export default function MemberCard({ m }: { m: Member }) {
  const name = m.display_name || `@${m.username}`;
  return (
    <a href={`/u/${m.username}`} className="member-card">
      <Avatar name={name} src={m.avatar_url ?? undefined} size="lg" />
      <span className="member-card-name type-label">{name}</span>
      <span className="type-caption vm-muted">@{m.username}</span>
      <span className="type-caption vm-muted">{m.public_collections} {m.public_collections === 1 ? 'collection' : 'collections'} · {m.followers} {m.followers === 1 ? 'follower' : 'followers'}</span>
      <span className="member-card-flags">
        {m.is_demo ? <DemoBadge compact /> : null}
        {m.i_follow && m.follows_me ? <span className="type-caption member-friends">Friends</span> : m.i_follow ? <span className="type-caption vm-muted">Following</span> : m.follows_me ? <span className="type-caption vm-muted">Follows you</span> : null}
      </span>
    </a>
  );
}

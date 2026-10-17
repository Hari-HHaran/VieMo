'use client';
import { accountLabel, useAccount } from './useAccount';

/* The Profile tab says where your things are kept, and offers an account when there is one to offer. */
export default function ProfileAccountNote() {
  const me = useAccount();
  if (!me?.configured) return <p className="type-body vm-muted">Saved on this device.</p>;
  if (!me.user) {
    return (
      <p className="type-body vm-muted acct-profile-note">
        Saved on this device. <a href="/sign-in?next=/profile">Sign in</a> or <a href="/sign-up?next=/profile">create an account</a> to keep it everywhere.
      </p>
    );
  }
  return (
    <p className="type-body vm-muted acct-profile-note">
      Signed in as {accountLabel(me)}. {me.profile ? <><a href={`/u/${me.profile.username}`}>Your public profile</a> · </> : null}<a href="/account">Account settings</a>
    </p>
  );
}

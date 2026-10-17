'use client';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/ds/client';
import { accountLabel, useAccount } from './useAccount';

/* "Sign in" for visitors, your avatar for members. Nothing at all while loading or when accounts are off,
   so the nav never flickers between the two. */
export default function AccountLink({ className = '' }: { className?: string }) {
  const me = useAccount();
  const pathname = usePathname();
  if (!me?.configured) return null;
  if (!me.user) {
    const next = pathname && !/^\/(sign-in|sign-up|forgot-password|reset-password|auth\/)/.test(pathname) && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    return <a href={`/sign-in${next}`} className={`acct-link ${className}`}>Sign in</a>;
  }
  const label = accountLabel(me);
  const here = pathname.startsWith('/account');
  return (
    <a href="/account" className={`acct-link is-member ${className}`} aria-current={here ? 'page' : undefined} aria-label={`Your account (${label})`}>
      <Avatar name={label} src={me.profile?.avatar_url ?? undefined} size="sm" />
    </a>
  );
}

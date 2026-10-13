'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ErrorState } from '@/ds/client';

export interface ProblemInfo { kind: 'config' | 'not_found' | 'upstream' | 'network'; what: string }

/* Plain-language failure with a real retry. Never substitutes invented data. */
export default function Problem({ info, compact }: { info: ProblemInfo; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tries, setTries] = useState(0);
  const copy = {
    config: { title: 'Film data isn’t connected yet', body: 'This VieMo server has no TMDB token and no saved TMDB snapshot. Add TMDB_READ_TOKEN to the server’s environment, or run the “TMDB snapshot” GitHub Action, then reload.', icon: 'settings' },
    not_found: { title: 'We couldn’t find that', body: `TMDB has no record of this ${info.what}.`, icon: 'film' },
    upstream: { title: `${cap(info.what)} didn’t load`, body: 'TMDB isn’t responding properly right now. Nothing you saved is affected.', icon: 'triangle-alert' },
    network: { title: `${cap(info.what)} didn’t load`, body: 'We couldn’t reach TMDB. Check your connection and try again.', icon: 'wifi-off' },
  }[info.kind];
  return (
    <ErrorState
      compact={compact}
      icon={copy.icon as never}
      title={copy.title}
      body={copy.body}
      retrying={pending}
      onRetry={info.kind === 'not_found' ? undefined : () => { setTries(tries + 1); start(() => router.refresh()); }}
      detail={tries > 1 ? 'Still failing. Try again in a few minutes.' : undefined}
    />
  );
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

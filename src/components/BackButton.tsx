'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/ds/client';

/* Returns to the previous screen (keeping its scroll position), or to a parent tab when opened directly. */
export default function BackButton({ fallback = '/discover', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <Button variant="ghost" iconOnly icon="chevron-left" label={label} className="back-btn"
      onClick={() => (history.length > 1 ? router.back() : router.push(fallback))} />
  );
}

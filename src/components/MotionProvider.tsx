'use client';
import { MotionConfig } from 'motion/react';
import { usePrefs } from '@/lib/device-store';
import { SPRING } from '@/lib/motion';

/* Follows the OS reduced-motion setting, and the in-app setting when it is on. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefs] = usePrefs();
  return <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'} transition={SPRING.standard}>{children}</MotionConfig>;
}

'use client';
import { useTransition } from 'react';
import { motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SPRING } from '@/lib/motion';

/* Moods as stars on a small chart. Each star is a real toggle button in reading order, so the sky works
   as a plain list for keyboards and screen readers; the lines are decoration. */
const POS: Record<string, [number, number]> = {
  thrilling: [50, 11], funny: [17, 30], scary: [83, 30], emotional: [50, 48],
  'thought-provoking': [29, 67], romantic: [77, 66], comforting: [23, 89], adventurous: [73, 89],
};
const LINKS: [string, string][] = [['funny', 'thrilling'], ['thrilling', 'scary'], ['thrilling', 'emotional'], ['emotional', 'thought-provoking'], ['emotional', 'romantic'], ['thought-provoking', 'comforting'], ['romantic', 'adventurous'], ['comforting', 'adventurous']];
const STARS = Array.from({ length: 34 }, (_, i) => [((i * 37) % 97) + 1.5, ((i * 53) % 89) + 4, (i % 3) + 1] as const);

export default function MoodConstellation({ moods }: { moods: { id: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const current = search.get('mood');
  const [pending, start] = useTransition();
  const choose = (id: string) => {
    const next = new URLSearchParams(search.toString());
    if (current === id) next.delete('mood'); else next.set('mood', id);
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  };
  const ordered = [...moods].sort((a, b) => (POS[a.id]?.[1] ?? 0) - (POS[b.id]?.[1] ?? 0) || (POS[a.id]?.[0] ?? 0) - (POS[b.id]?.[0] ?? 0));
  return (
    <div className={`sky${pending ? ' is-pending' : ''}`}>
      <svg className="sky-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r * 0.12} className="sky-star" />)}
        {LINKS.map(([a, b]) => (
          <line key={a + b} x1={POS[a][0]} y1={POS[a][1]} x2={POS[b][0]} y2={POS[b][1]} className={current === a || current === b ? 'is-lit' : ''} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="sky-nodes" role="group" aria-label="Mood">
        {ordered.map((m) => {
          const on = current === m.id;
          return (
            <motion.button key={m.id} type="button" className={`sky-node${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => choose(m.id)}
              style={{ left: `${POS[m.id][0]}%`, top: `${POS[m.id][1]}%` }}
              animate={{ scale: on ? 1.08 : 1 }} whileTap={{ scale: 0.92 }} transition={SPRING.tap}>
              <span className="sky-dot" aria-hidden="true" />{m.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

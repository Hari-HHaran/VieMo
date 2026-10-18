'use client';
import { useId } from 'react';
import { motion, type MotionValue } from 'motion/react';
import type { WheelFilm } from '@/lib/wheel';

const C = 200, R = 168, BULBS = 24;
const IMG = 'https://image.tmdb.org/t/p';
const at = (deg: number, r: number) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)] as const;

/* The wheel: one wedge per film with its real poster, a brass rim of bulbs, and a hub. It only ever shows the pool
   it's given, and it turns to wherever `rotation` says (the server's winner); it never chooses anything itself. */
export default function Wheel({ films, rotation, active, winner, spinning }: {
  films: WheelFilm[]; rotation: MotionValue<number>; active: number | null; winner: number | null; spinning: boolean;
}) {
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const n = Math.max(films.length, 1);
  const seg = 360 / n, h = seg / 2;
  const [x1, y1] = at(-h, R), [x2, y2] = at(h, R);
  const wedge = n === 1 ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z` : `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
  const W = Math.min(2 * R * Math.sin((Math.min(h, 90) * Math.PI) / 180) * 0.94, R * 0.92), H = W * 1.5;
  return (
    <div className={`wm-wheel${spinning ? ' is-spinning' : ''}${winner != null ? ' has-winner' : ''}`}>
      <motion.div className="wm-disc" style={{ rotate: rotation }}>
        <svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={`w${uid}`}><path d={wedge} /></clipPath>
            <radialGradient id={`v${uid}`} cx="50%" cy="50%" r="50%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.55" /></radialGradient>
            <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2b0" /><stop offset="0.5" stopColor="#c99a4b" /><stop offset="1" stopColor="#7d5a22" /></linearGradient>
          </defs>
          <circle cx={C} cy={C} r={198} className="wm-bezel" />
          <circle cx={C} cy={C} r={190} fill={`url(#b${uid})`} />
          <circle cx={C} cy={C} r={R + 4} className="wm-rim" />
          {films.map((f, i) => (
            <g key={f.tmdb_id} transform={`rotate(${(i + 0.5) * seg} ${C} ${C})`} className={`wm-wedge${active === i ? ' is-active' : ''}${winner === i ? ' is-winner' : ''}`}>
              <g clipPath={`url(#w${uid})`}>
                <path d={wedge} className="wm-wedge-bg" fill={i % 2 ? '#1c0a0f' : '#3d0f1b'} />
                {f.poster_path
                  ? <image href={`${IMG}/w185${f.poster_path}`} x={C - W / 2} y={C - R + 2} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
                  : <text x={C} y={C - R * 0.55} className="wm-wedge-title" textAnchor="middle">{f.title.slice(0, 18)}</text>}
                <path d={wedge} fill={`url(#v${uid})`} />
                <path d={wedge} className="wm-wedge-light" />
              </g>
              <path d={wedge} className="wm-wedge-edge" />
            </g>
          ))}
          {Array.from({ length: BULBS }, (_, i) => { const [bx, by] = at((i * 360) / BULBS, 182); return <circle key={i} cx={bx} cy={by} r={4.2} className="wm-bulb" style={{ ['--d' as string]: `${(i % 6) * 0.08}s` }} />; })}
          <circle cx={C} cy={C} r={40} fill={`url(#b${uid})`} />
          <circle cx={C} cy={C} r={34} className="wm-hub" />
          {[0, 72, 144, 216, 288].map((a) => { const [hx, hy] = at(a, 20); return <circle key={a} cx={hx} cy={hy} r={5} className="wm-hub-hole" />; })}
          <circle cx={C} cy={C} r={6} fill={`url(#b${uid})`} />
        </svg>
      </motion.div>
      <svg className="wm-pointer" viewBox="0 0 60 70" aria-hidden="true" focusable="false">
        <defs><linearGradient id={`p${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe9bf" /><stop offset="0.6" stopColor="#c99a4b" /><stop offset="1" stopColor="#6e4c18" /></linearGradient></defs>
        <path d="M8 6 H52 Q56 6 54 10 L32 62 Q30 66 28 62 L6 10 Q4 6 8 6 Z" fill={`url(#p${uid})`} stroke="#4a3210" strokeWidth="1.5" />
        <circle cx="30" cy="20" r="7" className="wm-pointer-bulb" />
      </svg>
    </div>
  );
}

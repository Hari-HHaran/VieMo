'use client';

export type MoState = 'idle' | 'hover' | 'listening' | 'thinking' | 'responding' | 'error' | 'docked';

/* Mo: a little film reel with a lens for a face. The reel's spokes turn while it thinks, the lens throws a
   small beam while it answers, and the eyes do most of the acting. Pure SVG and CSS, so it costs almost nothing. */
export default function MoFace({ state, size = 56 }: { state: MoState; size?: number }) {
  return (
    <svg className="mo-face" data-state={state} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="mo-metal" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#4a5164" /><stop offset="0.55" stopColor="#23272f" /><stop offset="1" stopColor="#111318" />
        </radialGradient>
        <radialGradient id="mo-lens" cx="45%" cy="38%" r="70%">
          <stop offset="0" stopColor="#1d2a52" /><stop offset="0.7" stopColor="#0b1022" /><stop offset="1" stopColor="#05070e" />
        </radialGradient>
      </defs>
      <circle className="mo-glow" cx="32" cy="32" r="31" />
      <circle cx="32" cy="32" r="29" fill="url(#mo-metal)" stroke="#6f7891" strokeWidth="1.2" />
      <g className="mo-reel">
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx="32" cy="12.5" r="4.6" fill="#0b0d12" stroke="#3c4252" strokeWidth="0.8" transform={`rotate(${a} 32 32)`} />)}
      </g>
      <circle cx="32" cy="33" r="14.5" fill="url(#mo-lens)" stroke="#8ea6ff" strokeOpacity="0.55" strokeWidth="1.3" />
      <ellipse cx="27" cy="27.5" rx="4" ry="2" fill="#ffffff" opacity="0.12" />
      <g className="mo-eyes">
        <rect className="mo-eye" x="24.6" y="29" width="4.4" height="7.2" rx="2.2" />
        <rect className="mo-eye" x="35" y="29" width="4.4" height="7.2" rx="2.2" />
      </g>
      <g className="mo-x" stroke="#ffb2a0" strokeWidth="1.8" strokeLinecap="round">
        <path d="M24.8 30.2l4 4M28.8 30.2l-4 4M35.2 30.2l4 4M39.2 30.2l-4 4" />
      </g>
      <path className="mo-beam" d="M46 33 L63 26 L63 40 Z" />
    </svg>
  );
}

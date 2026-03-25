'use client'

export function NeuroCommandBrain({
  neglectIndex,
  eyeHandLatencyMs,
  className = '',
}: {
  neglectIndex: number
  eyeHandLatencyMs: number
  className?: string
}) {
  const neglectSeverity = Math.min(1, Math.max(0, (0.85 - neglectIndex) / 0.35))
  const latencySeverity = Math.min(1, Math.max(0, (eyeHandLatencyMs - 250) / 400))

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className="relative h-28 w-28 sm:h-32 sm:w-32 [perspective:420px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg
          viewBox="0 0 100 120"
          className="h-full w-full text-cyan-400/90 neuro-brain-rotate"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nb-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="nb-violet" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.25" />
            </linearGradient>
            <filter id="nb-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="nb-glow-violet" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g stroke="url(#nb-cyan)" strokeWidth={0.65} filter="url(#nb-glow-cyan)" opacity={0.85}>
            <path d="M50 12 C28 14 18 32 20 52 C18 68 24 82 38 92 C44 96 50 98 56 96 C72 88 82 72 80 52 C82 32 72 14 50 12Z" />
            <path d="M50 12 V 98" opacity={0.4} />
            <path d="M22 48 H 78" opacity={0.35} />
            <path d="M26 68 Q 50 58 74 68" opacity={0.35} />
            <path d="M32 36 Q 50 28 68 36" opacity={0.35} />
          </g>
          <ellipse cx={38 - neglectSeverity * 6} cy={48} rx={10 + neglectSeverity * 4} ry={14 + neglectSeverity * 3}
            fill="url(#nb-violet)" opacity={0.25 + neglectSeverity * 0.45} filter="url(#nb-glow-violet)" />
          <ellipse cx={58} cy={72 + latencySeverity * 4} rx={9 + latencySeverity * 3} ry={11}
            fill="url(#nb-cyan)" opacity={0.2 + latencySeverity * 0.4} filter="url(#nb-glow-cyan)" />
        </svg>
      </div>
      <p className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 text-[9px] uppercase tracking-widest text-slate-500">
        Mapa cortical · correlato
      </p>
    </div>
  )
}

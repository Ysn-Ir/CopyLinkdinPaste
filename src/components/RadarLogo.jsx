import React from 'react'

export function RadarLogo({ size = 28, className = '', style = {} }) {
  const rx = Math.round(size * 0.25)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        borderRadius: `${rx}px`,
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        {/* Background Ambient Glow */}
        <radialGradient id="rl-bg-aura" cx="256" cy="256" r="256" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27B7F5" stopOpacity="0.22" />
          <stop offset="45%" stopColor="#786BFF" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Master Signal Gradient (Electric Mint -> Azure Blue -> Cyber Violet) */}
        <linearGradient id="rl-signal" x1="74" y1="74" x2="438" y2="438" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#55F3D2" />
          <stop offset="48%" stopColor="#27B7F5" />
          <stop offset="100%" stopColor="#786BFF" />
        </linearGradient>

        {/* Radar Sweep Sector Gradient */}
        <linearGradient id="rl-sweep" x1="256" y1="256" x2="436" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27B7F5" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#2CD8D0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#55F3D2" stopOpacity="0.65" />
        </linearGradient>

        {/* Chamfer Rim Gradient */}
        <linearGradient id="rl-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#55F3D2" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#27B7F5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#786BFF" stopOpacity="0.4" />
        </linearGradient>

        {/* Precision Signal Glow */}
        <filter id="rl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.15  0 0 0 0 0.85  0 0 0 0 0.95  0 0 0 0.45 0"
            result="colored"
          />
          <feMerge>
            <feMergeNode in="colored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Beacon Lock Flare */}
        <filter id="rl-flare" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="f1" />
          <feGaussianBlur stdDeviation="12" result="f2" />
          <feMerge>
            <feMergeNode in="f2" />
            <feMergeNode in="f1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pitch Black OLED Housing */}
      <rect width="512" height="512" rx="128" fill="#000000" />
      <rect x="2" y="2" width="508" height="508" rx="126" fill="none" stroke="url(#rl-rim)" strokeWidth="2" />

      {/* Ambient Radar Aura */}
      <circle cx="256" cy="256" r="236" fill="url(#rl-bg-aura)" />

      {/* Symbol Graphic Group */}
      <g filter="url(#rl-glow)">
        {/* Outer Scope Framing Accent */}
        <circle cx="256" cy="256" r="204" stroke="#27B7F5" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="5 7" />

        {/* Master Scope Boundary Ring */}
        <circle cx="256" cy="256" r="180" stroke="url(#rl-signal)" strokeWidth="12" />

        {/* Concentric Range Rings */}
        <circle cx="256" cy="256" r="130" stroke="#55F3D2" strokeOpacity="0.35" strokeWidth="3.5" />
        <circle cx="256" cy="256" r="78" stroke="#27B7F5" strokeOpacity="0.30" strokeWidth="3" />
        <circle cx="256" cy="256" r="36" stroke="#786BFF" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />

        {/* Reticle Crosshair Axes */}
        <path d="M256 66V446M66 256H446" stroke="#78DCD9" strokeOpacity="0.20" strokeWidth="2.5" />

        {/* 45-degree Alignment Ticks */}
        <path d="M158 108L178 128M334 334L354 354" stroke="#58D9D8" strokeOpacity="0.55" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M354 158L334 178M178 334L158 354" stroke="#58D9D8" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round" />

        {/* Active 90-Degree Radar Sweep Sector (12 to 3 o'clock) */}
        <path d="M256 256 L256 76 A180 180 0 0 1 436 256 Z" fill="url(#rl-sweep)" />

        {/* Sweep Trailing Edge Ray */}
        <path d="M256 256 L256 76" stroke="#6BEBD6" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />

        {/* Leading Sweep Ray */}
        <path d="M256 256 L383 129" stroke="url(#rl-signal)" strokeWidth="7" strokeLinecap="round" />

        {/* Luminous Energized Arc along outer perimeter under sweep */}
        <path d="M256 76 A180 180 0 0 1 383 129" fill="none" stroke="#55F3D2" strokeWidth="15" strokeLinecap="round" />

        {/* Central Transceiver Emitter Core */}
        <circle cx="256" cy="256" r="20" fill="#000000" stroke="#55F3D2" strokeWidth="4" />
        <circle cx="256" cy="256" r="11" fill="#F4FFFF" />
        <circle cx="256" cy="256" r="5" fill="#20C9CE" />

        {/* Peripheral Signal Hits */}
        <circle cx="156" cy="301" r="7" fill="#55CFF1" />
        <circle cx="310" cy="352" r="6" fill="#8C83FF" />
        <circle cx="186" cy="180" r="5" fill="#55F3D2" opacity="0.65" />
      </g>

      {/* Primary Target Acquired (Career Opportunity Beacon!) */}
      <g transform="translate(348, 164)" filter="url(#rl-flare)">
        <circle cx="0" cy="0" r="24" fill="none" stroke="#55F3D2" strokeOpacity="0.38" strokeWidth="2.5" strokeDasharray="5 4" />
        <circle cx="0" cy="0" r="14" fill="#55F3D2" fillOpacity="0.32" />
        <path d="M 0 -15 Q 0 0 -15 0 Q 0 0 0 15 Q 0 0 15 0 Q 0 0 0 -15 Z" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

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
        {/* Deep Space / Holographic Ambient Backlight */}
        <radialGradient id="rl-holo-bg" cx="256" cy="256" r="240" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27B7F5" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#786BFF" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Master Signal Gradient */}
        <linearGradient id="rl-signal" x1="74" y1="74" x2="438" y2="438" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#55F3D2" />
          <stop offset="50%" stopColor="#27B7F5" />
          <stop offset="100%" stopColor="#786BFF" />
        </linearGradient>

        {/* Volumetric Sweep Gradient */}
        <linearGradient id="rl-dynamic-sweep" x1="256" y1="256" x2="436" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27B7F5" stopOpacity="0.02" />
          <stop offset="45%" stopColor="#2CD8D0" stopOpacity="0.18" />
          <stop offset="85%" stopColor="#55F3D2" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#55F3D2" stopOpacity="0.65" />
        </linearGradient>

        {/* Leading Ray Gradient */}
        <linearGradient id="rl-lead-ray" x1="256" y1="256" x2="383" y2="129" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#55F3D2" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#27B7F5" stopOpacity="0.8" />
        </linearGradient>

        {/* Subtle Housing Rim */}
        <linearGradient id="rl-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#55F3D2" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#27B7F5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#786BFF" stopOpacity="0.35" />
        </linearGradient>

        {/* Holographic Lens Glow Filter */}
        <filter id="rl-lens-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="soft-blur" />
          <feColorMatrix
            in="soft-blur"
            type="matrix"
            values="0 0 0 0 0.18  0 0 0 0 0.88  0 0 0 0 0.94  0 0 0 0.40 0"
            result="colored"
          />
          <feMerge>
            <feMergeNode in="colored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Target Hit Glow */}
        <filter id="rl-hit-flare" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b1" />
          <feGaussianBlur stdDeviation="11" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pitch Black OLED Housing */}
      <rect width="512" height="512" rx="128" fill="#000000" />
      <rect x="2" y="2" width="508" height="508" rx="126" fill="none" stroke="url(#rl-rim)" strokeWidth="2" />

      {/* Holographic Ambient Backlight */}
      <circle cx="256" cy="256" r="210" fill="url(#rl-holo-bg)" />

      {/* Symbol Graphic */}
      <g filter="url(#rl-lens-glow)">
        {/* Outer Scope Boundary Ring */}
        <circle cx="256" cy="256" r="180" stroke="url(#rl-signal)" strokeWidth="11" />

        {/* Concentric Range Rings */}
        <circle cx="256" cy="256" r="130" stroke="#55F3D2" strokeOpacity="0.32" strokeWidth="3.5" />
        <circle cx="256" cy="256" r="78" stroke="#27B7F5" strokeOpacity="0.25" strokeWidth="3" />
        <circle cx="256" cy="256" r="40" stroke="#786BFF" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="4 4" />

        {/* Reticle Crosshair Axes */}
        <path d="M256 70V442M70 256H442" stroke="#78DCD9" strokeOpacity="0.16" strokeWidth="2.5" />

        {/* 45-degree Diagonal Ticks */}
        <path d="M158 108L178 128M334 334L354 354" stroke="#58D9D8" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />

        {/* Dynamic Radar Sweep Sector (12 to 3 o'clock) */}
        <path d="M256 256 L256 76 A180 180 0 0 1 436 256 Z" fill="url(#rl-dynamic-sweep)" />

        {/* Sweep Trailing Edge Ray */}
        <path d="M256 256 L256 76" stroke="#6BEBD6" strokeOpacity="0.5" strokeWidth="3.5" strokeLinecap="round" />

        {/* High-Intensity Dynamic Leading Sweep Ray */}
        <path d="M256 256 L383 129" stroke="url(#rl-lead-ray)" strokeWidth="7" strokeLinecap="round" />

        {/* Luminous Energized Arc along outer rim */}
        <path d="M256 76 A180 180 0 0 1 383 129" fill="none" stroke="#55F3D2" strokeWidth="13" strokeLinecap="round" />

        {/* Central Emitter Core */}
        <circle cx="256" cy="256" r="18" fill="#000000" stroke="#55F3D2" strokeWidth="3.5" />
        <circle cx="256" cy="256" r="11" fill="#F4FFFF" />
        <circle cx="256" cy="256" r="5" fill="#20C9CE" />

        {/* Peripheral Detected Hits */}
        <circle cx="156" cy="301" r="7" fill="#55CFF1" />
        <circle cx="310" cy="352" r="6" fill="#8C83FF" />
        <circle cx="186" cy="186" r="5" fill="#55F3D2" opacity="0.6" />
      </g>

      {/* Primary Target Acquired (Opportunity Beacon with Holographic Pulse Echo) */}
      <g transform="translate(348, 164)" filter="url(#rl-hit-flare)">
        <circle cx="0" cy="0" r="22" fill="none" stroke="#55F3D2" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray="5 4" />
        <circle cx="0" cy="0" r="14" fill="#6AF0D5" fillOpacity="0.25" />
        <circle cx="0" cy="0" r="8" fill="#6AF0D5" />
        <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

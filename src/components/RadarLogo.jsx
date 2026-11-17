import React from 'react'

export function RadarLogo({ size = 28, className = '', style = {} }) {
  const rx = Math.round(size * 0.238)

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
        {/* Master Signature Instagram Gradient */}
        <linearGradient id="rl-brand-ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#833ab4" />
          <stop offset="26%" stopColor="#9b2d97" />
          <stop offset="50%" stopColor="#c13584" />
          <stop offset="70%" stopColor="#e1306c" />
          <stop offset="88%" stopColor="#fd1d1d" />
          <stop offset="100%" stopColor="#f56040" />
        </linearGradient>

        {/* Inner Echo Pulse Wave Gradient */}
        <linearGradient id="rl-pulse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#f56040" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#fd1d1d" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c13584" stopOpacity="0.2" />
        </linearGradient>

        {/* Squircle Chamfer Border Gradient */}
        <linearGradient id="rl-border-ig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f56040" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#e1306c" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#833ab4" stopOpacity="0.5" />
        </linearGradient>

        {/* Ambient Glow behind R */}
        <radialGradient id="rl-ambient-radar" cx="55%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#e1306c" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#833ab4" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Neon Drop Shadow for depth */}
        <filter id="rl-radar-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#e1306c" floodOpacity="0.45" />
        </filter>

        {/* Opportunity Beacon Flare */}
        <filter id="rl-beacon-flare" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b1" />
          <feGaussianBlur stdDeviation="12" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pitch Black OLED Housing */}
      <rect width="512" height="512" rx="122" fill="#000000" />
      <rect x="5" y="5" width="502" height="502" rx="117" fill="none" stroke="url(#rl-border-ig)" strokeWidth="2.5" />

      {/* Ambient Radar Aura */}
      <circle cx="280" cy="240" r="210" fill="url(#rl-ambient-radar)" />

      {/* Screen Capture / OCR Viewfinder Frame (Targeting Corners) */}
      <g stroke="url(#rl-brand-ig)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.35">
        <path d="M 64 100 V 64 H 100" />
        <path d="M 412 64 H 448 V 100" />
        <path d="M 64 412 V 448 H 100" />
        <path d="M 412 448 H 448 V 412" />
      </g>

      {/* Concentric Radar Ripple Echoes (Faint Background Signal Waveforms) */}
      <g fill="none" stroke="#262626" opacity="0.45">
        <circle cx="270" cy="226" r="110" strokeWidth="2" strokeDasharray="6 8" />
        <circle cx="270" cy="226" r="172" strokeWidth="2" strokeDasharray="10 12" />
      </g>

      {/* The Master Iconic "R" Signal Emblem */}
      <g filter="url(#rl-radar-shadow)">
        {/* 1. Vertical Spine (The Data Capture / Interceptor Stream) */}
        <rect x="116" y="98" width="56" height="316" rx="28" fill="url(#rl-brand-ig)" />

        {/* 2. Concentric Radar Outer Wave (Lobe of R) */}
        <path
          d="M 170 124 H 276 C 348 124 402 170 402 228 C 402 286 348 332 276 332 H 170"
          fill="none"
          stroke="url(#rl-brand-ig)"
          strokeWidth="48"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Concentric Radar Inner Wave (Echo Pulse of R) */}
        <path
          d="M 170 182 H 262 C 294 182 320 202 320 228 C 320 254 294 274 262 274 H 170"
          fill="none"
          stroke="url(#rl-pulse-grad)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. Diagonal Laser Interceptor / Career Opportunity Sweep Beam (Kick of R) */}
        <path
          d="M 266 308 L 386 414"
          fill="none"
          stroke="url(#rl-brand-ig)"
          strokeWidth="52"
          strokeLinecap="round"
        />
      </g>

      {/* 5. Optical OCR Aperture / Focal Intelligence Core inside the Loop */}
      <g transform="translate(262, 228)">
        <circle cx="0" cy="0" r="19" fill="#121212" stroke="url(#rl-brand-ig)" strokeWidth="6" />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
        <line x1="0" y1="-26" x2="0" y2="-21" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <line x1="0" y1="21" x2="0" y2="26" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <line x1="-26" y1="0" x2="-21" y2="0" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <line x1="21" y1="0" x2="26" y2="0" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      </g>

      {/* 6. Locked Opportunity Beacon (Detected Target at Apex of Interceptor Kick) */}
      <g transform="translate(390, 416)" filter="url(#rl-beacon-flare)">
        <circle cx="0" cy="0" r="18" fill="#fd1d1d" fillOpacity="0.35" />
        <circle cx="0" cy="0" r="10" fill="#f56040" />
        <path d="M 0 -13 Q 0 0 -13 0 Q 0 0 0 13 Q 0 0 13 0 Q 0 0 0 -13 Z" fill="#ffffff" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
      </g>
    </svg>
  )
}

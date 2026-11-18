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
      {/* Pitch Black OLED Housing */}
      <rect width="512" height="512" rx="128" fill="#000000" />
      <rect x="2" y="2" width="508" height="508" rx="126" fill="none" stroke="#222222" strokeWidth="2" />

      {/* Scope Boundary Ring: Solid Stark White */}
      <circle cx="256" cy="256" r="180" stroke="#FFFFFF" strokeWidth="11" fill="none" />

      {/* Concentric Range Rings: Technical Muted Grays */}
      <circle cx="256" cy="256" r="130" stroke="#383838" strokeWidth="3" fill="none" />
      <circle cx="256" cy="256" r="78" stroke="#2B2B2B" strokeWidth="2.5" fill="none" />

      {/* Reticle Crosshair Axes */}
      <path d="M256 76V436M76 256H436" stroke="#2E2E2E" strokeWidth="2.5" />

      {/* Diagonal Sensor Ticks */}
      <path d="M158 108L178 128M334 334L354 354" stroke="#484848" strokeWidth="4" strokeLinecap="round" />

      {/* 90-Degree Radar Sweep Sector (Translucent Flat White, Zero Gradient) */}
      <path d="M256 256 L256 76 A180 180 0 0 1 436 256 Z" fill="#FFFFFF" fillOpacity="0.08" />

      {/* Sweep Trailing Edge Ray */}
      <path d="M256 256 L256 76" stroke="#555555" strokeWidth="3" strokeLinecap="round" />

      {/* Solid Stark White Leading Sweep Ray */}
      <path d="M256 256 L383 129" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" />

      {/* Outer Rim Arc under sweep */}
      <path d="M256 76 A180 180 0 0 1 383 129" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" fill="none" />

      {/* Center Transceiver Core: Solid White & Black */}
      <circle cx="256" cy="256" r="18" fill="#000000" stroke="#FFFFFF" strokeWidth="4" />
      <circle cx="256" cy="256" r="7" fill="#FFFFFF" />

      {/* Peripheral Hits */}
      <circle cx="156" cy="301" r="6" fill="#505050" />
      <circle cx="310" cy="352" r="5" fill="#3D3D3D" />

      {/* Single Crisp Tactical Accent Beacon */}
      <g transform="translate(348, 164)">
        <circle cx="0" cy="0" r="22" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeDasharray="5 4" opacity="0.85" />
        <circle cx="0" cy="0" r="10" fill="#FF3B30" />
        <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

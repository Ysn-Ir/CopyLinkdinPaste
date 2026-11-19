/**
 * RADAR Mobile Design System
 * Human Professional Template matching the user reference design,
 * perfectly colored with the RADAR logo brand:
 * - Signature Tactical Red Beacon (#FF3B30, #E11D48)
 * - Pitch Black & Deep Obsidian Housing (#000000, #09090B, #18181B)
 * - Pure White Elevated Cards (#FFFFFF) & Crisp Scope Borders (#E2E8F0)
 * - Mint Green Sensor Radar (#10B981) for freshness and success
 */

export const THEME = {
  colors: {
    // Canvas & Light Surfaces (clean scope background)
    bgApp: '#F8FAFC',         // Soft tech canvas
    bgDark: '#F8FAFC',        // Compatibility fallback
    bgCard: '#FFFFFF',        // Pure white elevated card
    bgCardSubtle: '#F1F5F9',  // Subtle tinted section background
    bgElevated: '#FFFFFF',    // Elevated sheets & modals
    bgInput: '#FFFFFF',       // Input field background
    bgHover: '#FEE2E2',       // Subtle crimson tactile press state

    // Borders & Scope Reticle Lines
    border: '#E2E8F0',        // Clean scope reticle line
    borderSubtle: '#F1F5F9',  // Micro-divider
    borderElevated: '#CBD5E1',// Highlight border
    borderFocus: '#FF3B30',   // RADAR Beacon highlight

    // Typography
    textPrimary: '#09090B',   // Deep obsidian high-contrast text
    textSecondary: '#64748B', // Muted slate technical text
    textMuted: '#94A3B8',     // Tertiary captions & timestamps
    textInverse: '#FFFFFF',   // White text on dark/gradient buttons

    // Core Brand Accents: Synchronized with the RADAR Logo
    primary: '#FF3B30',       // RADAR Red Beacon from logo
    primaryDark: '#D9261D',   // Deep beacon red
    primaryLight: '#FFF1F0',  // Soft beacon glow background
    primaryBorder: '#FECDD3', // Soft beacon border
    accent: '#FF3B30',        // Primary action
    accentLight: '#FFF1F0',
    accentBorder: '#FECDD3',

    // Supporting Scope Colors
    brandBlack: '#09090B',    // Obsidian housing
    brandGray: '#475569',     // Scope ring
    accentGreen: '#10B981',   // Sensor radar green (applied / verified)
    accentGreenLight: '#ECFDF5',
    accentAmber: '#F59E0B',   // Warning / Interview amber
    accentAmberLight: '#FFFBEB',
    accentBlue: '#2563EB',    // Link blue
    accentBlueLight: '#EFF6FF',
    badgeRed: '#FF3B30',      // Red notification badge from template

    // Gradients for Recommended Job Cards (Template Replica in RADAR Palette)
    gradientRadar: ['#FF3B30', '#BE123C'], // Vibrant Crimson / Ruby gradient (Card 1)
    gradientObsidian: ['#18181B', '#09090B'], // Deep Obsidian titanium gradient (Card 2)
    gradientPurple: ['#FF3B30', '#991B1B'], // Compatibility alias -> Red
    gradientPink: ['#18181B', '#27272A'],   // Compatibility alias -> Dark Titanium
    gradientBlue: ['#2563EB', '#1D4ED8'],

    // Status Badges
    badgeNeutralBg: '#F1F5F9',
    badgeNeutralText: '#475569',
    badgeNeutralBorder: '#E2E8F0',

    badgeActiveBg: '#FFF1F0',
    badgeActiveText: '#FF3B30',
    badgeActiveBorder: '#FECDD3',

    badgeMutedBg: '#F8FAFC',
    badgeMutedText: '#94A3B8',
    badgeMutedBorder: '#E2E8F0',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
    { id: 'ready', label: 'Ready', color: '#09090B', bg: '#F1F5F9', border: '#CBD5E1' },
    { id: 'applied', label: 'Applied', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    { id: 'interview', label: 'Interview', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { id: 'offer', label: 'Offer Received', color: '#FF3B30', bg: '#FFF1F0', border: '#FECDD3' },
    { id: 'rejected', label: 'Archived', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || {
    id: stageId,
    label: stageId ? stageId.toUpperCase() : 'SAVED',
    color: '#64748B',
    bg: '#F1F5F9',
    border: '#E2E8F0',
  }
}

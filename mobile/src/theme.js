/**
 * RADAR Mobile Design System
 * Stark Monochrome Technical HUD Palette (Linear / Raycast / Vercel Aesthetic)
 * Pure OLED Black (#000000), Zinc Surfaces (#0D0D0D, #171717), Tactical Red Beacon (#FF3B30).
 */

export const THEME = {
  colors: {
    // Canvas & Surfaces
    bgDark: '#000000',      // Pure pitch OLED black
    bgCard: '#0D0D0D',      // Precision surface card
    bgElevated: '#171717',  // Elevated sheets, bottom sheets, modals
    bgInput: '#18181B',     // Technical input field background
    bgHover: '#202023',     // Subtle tactile press state

    // Borders & Dividers
    border: '#27272A',      // Standard 1px structural border
    borderSubtle: '#1C1C1F',// Micro-divider
    borderElevated: '#3F3F46', // Highlight border
    borderFocus: '#FF3B30', // Tactical beacon highlight

    // Typography
    textPrimary: '#FFFFFF',   // High-contrast primary text
    textSecondary: '#A1A1AA', // Zinc secondary text
    textMuted: '#71717A',     // Tertiary captions & timestamps
    textInverse: '#000000',   // Dark text on white buttons

    // Tactical Accent: Single Signature Red Beacon
    accent: '#FF3B30',
    accentLight: 'rgba(255, 59, 48, 0.12)',
    accentBorder: 'rgba(255, 59, 48, 0.35)',

    // Technical Status Badges (Monochrome + Red)
    badgeNeutralBg: 'rgba(255, 255, 255, 0.06)',
    badgeNeutralText: '#E4E4E7',
    badgeNeutralBorder: 'rgba(255, 255, 255, 0.15)',

    badgeActiveBg: 'rgba(255, 59, 48, 0.12)',
    badgeActiveText: '#FF3B30',
    badgeActiveBorder: 'rgba(255, 59, 48, 0.35)',

    badgeMutedBg: 'rgba(113, 113, 122, 0.12)',
    badgeMutedText: '#A1A1AA',
    badgeMutedBorder: 'rgba(113, 113, 122, 0.25)',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#A1A1AA', bg: 'rgba(113, 113, 122, 0.12)', border: '#27272A' },
    { id: 'ready', label: 'Ready', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.10)', border: '#3F3F46' },
    { id: 'applied', label: 'Applied', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.16)', border: '#52525B' },
    { id: 'interview', label: 'Interview', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.14)', border: 'rgba(255, 59, 48, 0.40)' },
    { id: 'offer', label: 'Offer Received', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.22)', border: '#FF3B30' },
    { id: 'rejected', label: 'Archived', color: '#71717A', bg: 'rgba(113, 113, 122, 0.10)', border: '#27272A' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || {
    id: stageId,
    label: stageId ? stageId.toUpperCase() : 'UNKNOWN',
    color: '#A1A1AA',
    bg: 'rgba(113, 113, 122, 0.12)',
    border: '#27272A',
  }
}

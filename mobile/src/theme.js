export const THEME = {
  colors: {
    // Stark Monochrome Technical HUD Palette
    bgDark: '#000000',      // Pure pitch OLED black
    bgCard: '#0D0D0D',      // Deep charcoal card surface
    bgElevated: '#171717',  // Elevated sheet / modal
    bgInput: '#1F1F1F',     // Technical input background
    border: '#27272A',      // Subtle 1px technical border
    borderFocus: '#FF3B30', // Tactical red focus beacon

    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA', // Zinc secondary text
    textMuted: '#71717A',     // Zinc tertiary text

    // Signature Accent: Single Tactical Red Beacon (Zero AI Rainbow Gradients)
    accent: '#FF3B30',
    accentGradientStart: '#FFFFFF',
    accentGradientMiddle: '#CCCCCC',
    accentGradientEnd: '#888888',
    accentLight: 'rgba(255, 59, 48, 0.12)',
    accentBorder: 'rgba(255, 59, 48, 0.40)',

    // Technical Badges
    linkBlue: '#FFFFFF',
    likeRed: '#FF3B30',
    storyOrange: '#FFFFFF',
    storyYellow: '#A1A1AA',

    success: '#FFFFFF',
    successLight: 'rgba(255, 255, 255, 0.08)',
    successBorder: 'rgba(255, 255, 255, 0.25)',

    warning: '#D4D4D8',
    warningLight: 'rgba(212, 212, 216, 0.08)',
    warningBorder: 'rgba(212, 212, 216, 0.25)',

    info: '#FFFFFF',
    infoLight: 'rgba(255, 255, 255, 0.08)',
    infoBorder: 'rgba(255, 255, 255, 0.25)',

    danger: '#FF3B30',
    dangerLight: 'rgba(255, 59, 48, 0.14)',
    dangerBorder: 'rgba(255, 59, 48, 0.35)',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#A1A1AA', bg: '#18181B' },
    { id: 'ready', label: 'Ready', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.10)' },
    { id: 'applied', label: 'Applied', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.14)' },
    { id: 'interview', label: 'Interview', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.14)' },
    { id: 'offer', label: 'Offer Received', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.20)' },
    { id: 'rejected', label: 'Archived', color: '#71717A', bg: 'rgba(113, 113, 122, 0.14)' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || { id: stageId, label: stageId || 'Unknown', color: '#A1A1AA', bg: '#18181B' }
}

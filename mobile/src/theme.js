export const THEME = {
  colors: {
    // Instagram Dark Mode Pitch Black & Surfaces
    bgDark: '#000000',      // Pure pitch OLED black
    bgCard: '#121212',      // Deep charcoal card surface
    bgElevated: '#1a1a1a',  // Elevated sheet / modal
    bgInput: '#262626',     // Instagram search & input background
    border: '#262626',      // 1px subtle divider
    borderFocus: '#e1306c', // Instagram vibrant pink focus

    textPrimary: '#ffffff',
    textSecondary: '#a8a8a8', // Instagram handle & secondary text gray
    textMuted: '#737373',     // Instagram tertiary timestamp gray

    // Instagram Signature Accents & Gradients
    accent: '#e1306c',        // Instagram primary pink
    accentGradientStart: '#833ab4', // Royal Purple
    accentGradientMiddle: '#fd1d1d', // Electric Red
    accentGradientEnd: '#f56040',   // Coral Orange
    accentLight: 'rgba(225, 48, 108, 0.12)',
    accentBorder: 'rgba(225, 48, 108, 0.35)',

    // Instagram Special Elements
    linkBlue: '#0095f6',     // Instagram verified blue
    likeRed: '#ed4956',      // Instagram heart red
    storyOrange: '#f56040',
    storyYellow: '#fcaf45',

    success: '#00e676',      // Meta active green
    successLight: 'rgba(0, 230, 118, 0.12)',
    successBorder: 'rgba(0, 230, 118, 0.35)',

    warning: '#fcaf45',      // Warm amber
    warningLight: 'rgba(252, 175, 69, 0.12)',
    warningBorder: 'rgba(252, 175, 69, 0.35)',

    info: '#0095f6',         // Verified blue
    infoLight: 'rgba(0, 149, 246, 0.12)',
    infoBorder: 'rgba(0, 149, 246, 0.35)',

    danger: '#ed4956',       // Heart red
    dangerLight: 'rgba(237, 73, 86, 0.14)',
    dangerBorder: 'rgba(237, 73, 86, 0.35)',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#a8a8a8', bg: '#1c1c1e' },
    { id: 'ready', label: 'Ready', color: '#0095f6', bg: 'rgba(0, 149, 246, 0.14)' },
    { id: 'applied', label: 'Applied', color: '#00e676', bg: 'rgba(0, 230, 118, 0.14)' },
    { id: 'interview', label: 'Interview', color: '#fcaf45', bg: 'rgba(252, 175, 69, 0.14)' },
    { id: 'offer', label: 'Offer Received', color: '#e1306c', bg: 'rgba(225, 48, 108, 0.16)' },
    { id: 'rejected', label: 'Archived', color: '#737373', bg: 'rgba(115, 115, 115, 0.14)' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || { id: stageId, label: stageId || 'Unknown', color: '#a8a8a8', bg: '#1c1c1e' }
}

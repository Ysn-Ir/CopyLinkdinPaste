export const THEME = {
  colors: {
    // Executive Obsidian & Slate Titanium
    bgDark: '#08090d',
    bgCard: '#11141c',
    bgElevated: '#171b26',
    border: '#1f2638',
    borderFocus: '#ffffff',

    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',

    // Executive Monochrome Accent (Zero Blue, Zero Purple)
    accent: '#ffffff',
    accentDark: '#e4e4e7',
    accentLight: 'rgba(255, 255, 255, 0.08)',
    accentBorder: 'rgba(255, 255, 255, 0.25)',

    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.35)',

    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.35)',

    info: '#10b981',
    infoLight: 'rgba(16, 185, 129, 0.12)',
    infoBorder: 'rgba(16, 185, 129, 0.35)',

    danger: '#f43f5e',
    dangerLight: 'rgba(244, 63, 94, 0.12)',
    dangerBorder: 'rgba(244, 63, 94, 0.35)',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#94a3b8', bg: '#171b26' },
    { id: 'ready', label: 'Ready', color: '#ffffff', bg: 'rgba(255, 255, 255, 0.08)' },
    { id: 'applied', label: 'Applied', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { id: 'interview', label: 'Interview', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { id: 'offer', label: 'Offer Received', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { id: 'rejected', label: 'Archived', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || { id: stageId, label: stageId || 'Unknown', color: '#94a3b8', bg: '#171b26' }
}

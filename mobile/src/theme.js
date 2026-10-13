export const THEME = {
  colors: {
    bgDark: '#080a0f',
    bgCard: '#11141c',
    bgElevated: '#171b26',
    border: '#1f2638',
    borderFocus: '#4f46e5',

    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',

    accent: '#4f46e5',
    accentLight: 'rgba(79, 70, 229, 0.12)',
    accentBorder: 'rgba(79, 70, 229, 0.3)',

    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.12)',

    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.12)',

    info: '#38bdf8',
    infoLight: 'rgba(56, 189, 248, 0.12)',

    danger: '#f43f5e',
    dangerLight: 'rgba(244, 63, 94, 0.12)',
  },

  stages: [
    { id: 'saved', label: 'Saved', color: '#94a3b8', bg: '#171b26' },
    { id: 'ready', label: 'Ready', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
    { id: 'applied', label: 'Applied', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)' },
    { id: 'interview', label: 'Interview', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    { id: 'offer', label: 'Offer Received', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
    { id: 'rejected', label: 'Archived', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || { id: stageId, label: stageId || 'Unknown', color: '#94a3b8', bg: '#171b26' }
}

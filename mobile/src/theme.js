export const THEME = {
  colors: {
    bgDark: '#09090b',
    bgCard: '#121215',
    bgElevated: '#18181b',
    border: '#27272a',
    borderFocus: '#3f3f46',
    
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',

    accent: '#a855f7',
    accentLight: 'rgba(168, 85, 247, 0.15)',
    accentBorder: 'rgba(168, 85, 247, 0.35)',

    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.15)',

    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.15)',

    info: '#3b82f6',
    infoLight: 'rgba(59, 130, 246, 0.15)',

    danger: '#ef4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
  },

  stages: [
    { id: 'saved', label: 'Enregistré', color: '#a1a1aa', bg: '#27272a' },
    { id: 'ready', label: 'Prêt', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
    { id: 'applied', label: 'Candidaté', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)' },
    { id: 'interview', label: 'Entretien', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { id: 'offer', label: 'Offre reçue', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
    { id: 'rejected', label: 'Refusé', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
  ],
}

export function getStageMeta(stageId) {
  const match = THEME.stages.find((s) => s.id === stageId)
  return match || { id: stageId, label: stageId || 'Inconnu', color: '#a1a1aa', bg: '#27272a' }
}

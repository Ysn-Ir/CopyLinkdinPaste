import React, { useState, useEffect, useMemo } from 'react'
import {
  Clipboard,
  Star,
  StarOff,
  Search,
  Trash2,
  ArrowUpRight,
  Code,
  Briefcase,
  FileText,
  MessageCircle,
  Link2,
  Tag,
  Globe,
  Clock,
  Filter,
  Sparkles,
  Smartphone,
  Monitor,
  Zap,
  RefreshCw,
} from 'lucide-react'

const CONTENT_TYPES = [
  { id: 'all', label: 'Tout', icon: '📋', color: '#94a3b8' },
  { id: 'job_offer', label: 'Offres', icon: '💼', color: '#a855f7' },
  { id: 'code_snippet', label: 'Code', icon: '💻', color: '#22d3ee' },
  { id: 'tech_article', label: 'Articles', icon: '📰', color: '#3b82f6' },
  { id: 'social_post', label: 'Social', icon: '💬', color: '#f59e0b' },
  { id: 'tool_or_repo', label: 'Outils/Repos', icon: '🔧', color: '#10b981' },
  { id: 'note', label: 'Notes', icon: '📝', color: '#8b5cf6' },
  { id: 'contact', label: 'Contacts', icon: '👤', color: '#f43f5e' },
]

function getTypeInfo(typeId) {
  return CONTENT_TYPES.find((t) => t.id === typeId) || CONTENT_TYPES[0]
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getDomainIcon(domain) {
  if (!domain) return '🌐'
  const d = domain.toLowerCase()
  if (d.includes('linkedin')) return '🔗'
  if (d.includes('github')) return '🐙'
  if (d.includes('twitter') || d.includes('x.com')) return '🐦'
  if (d.includes('stackoverflow')) return '📚'
  if (d.includes('medium')) return '📖'
  if (d.includes('reddit')) return '🟠'
  if (d.includes('youtube')) return '▶️'
  if (d.includes('indeed') || d.includes('glassdoor')) return '💼'
  return '🌐'
}

export function ClipVaultView({
  clips,
  onRefresh,
  onDeleteClip,
  onStarClip,
  onConvertToOffer,
  clipboardMonitorActive,
  onToggleMonitor,
}) {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeDomain, setActiveDomain] = useState('all')
  const [showStarredOnly, setShowStarredOnly] = useState(false)

  // Derive unique domains from clips
  const domains = useMemo(() => {
    const domainSet = new Set()
    clips.forEach((c) => {
      if (c.sourceDomain && c.sourceDomain !== 'clipboard') {
        domainSet.add(c.sourceDomain)
      }
    })
    return ['all', ...Array.from(domainSet).sort()]
  }, [clips])

  // Filter clips
  const filteredClips = useMemo(() => {
    let result = [...clips]
    if (activeType !== 'all') {
      result = result.filter((c) => c.contentType === activeType)
    }
    if (activeDomain !== 'all') {
      result = result.filter((c) => c.sourceDomain === activeDomain)
    }
    if (showStarredOnly) {
      result = result.filter((c) => c.isStarred)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.content || '').toLowerCase().includes(q) ||
        (c.summary || '').toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [clips, activeType, activeDomain, showStarredOnly, search])

  // Type counts
  const typeCounts = useMemo(() => {
    const counts = { all: clips.length }
    clips.forEach((c) => {
      counts[c.contentType] = (counts[c.contentType] || 0) + 1
    })
    return counts
  }, [clips])

  return (
    <div className="workspace-view" style={{ padding: '20px 24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Clipboard size={22} style={{ color: '#a855f7' }} />
            Clip Vault — Universal Clipboard
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Tout ce que vous copiez est automatiquement classifié, taggé et mémorisé par l'IA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Monitor toggle */}
          <button
            onClick={onToggleMonitor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${clipboardMonitorActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              background: clipboardMonitorActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: clipboardMonitorActive ? '#34d399' : '#f87171',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <Zap size={14} />
            {clipboardMonitorActive ? 'Auto-Capture ON' : 'Auto-Capture OFF'}
          </button>

          <button
            onClick={onRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={13} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Type Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
        {CONTENT_TYPES.map((type) => {
          const count = typeCounts[type.id] || 0
          const isActive = activeType === type.id
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '20px',
                border: `1px solid ${isActive ? type.color + '80' : 'var(--border-default)'}`,
                background: isActive ? type.color + '20' : 'transparent',
                color: isActive ? type.color : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
              {count > 0 && (
                <span style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: isActive ? type.color + '30' : 'var(--bg-elevated)',
                  color: isActive ? type.color : 'var(--text-tertiary)',
                  fontWeight: 600,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + Domain Filter + Starred */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          position: 'relative',
          flex: '1 1 280px',
          maxWidth: '400px',
        }}>
          <Search size={14} style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }} />
          <input
            type="text"
            placeholder="Rechercher clips, tags, contenus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        {/* Domain filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={13} style={{ color: 'var(--text-tertiary)' }} />
          <select
            value={activeDomain}
            onChange={(e) => setActiveDomain(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="all">Toutes les sources</option>
            {domains.filter((d) => d !== 'all').map((d) => (
              <option key={d} value={d}>{getDomainIcon(d)} {d}</option>
            ))}
          </select>
        </div>

        {/* Starred filter */}
        <button
          onClick={() => setShowStarredOnly(!showStarredOnly)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: `1px solid ${showStarredOnly ? 'rgba(250, 204, 21, 0.4)' : 'var(--border-default)'}`,
            background: showStarredOnly ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
            color: showStarredOnly ? '#facc15' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {showStarredOnly ? <Star size={13} /> : <StarOff size={13} />}
          Favoris
        </button>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '18px',
        padding: '10px 16px',
        borderRadius: '8px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
      }}>
        <span><strong style={{ color: '#a855f7' }}>{clips.length}</strong> clips total</span>
        <span><strong style={{ color: '#f59e0b' }}>{clips.filter((c) => c.isStarred).length}</strong> favoris</span>
        <span><strong style={{ color: '#10b981' }}>{clips.filter((c) => c.convertedToOffer).length}</strong> convertis en offres</span>
        <span><strong style={{ color: '#3b82f6' }}>{domains.length - 1}</strong> sources détectées</span>
        <span>Affiché: <strong>{filteredClips.length}</strong></span>
      </div>

      {/* Clips Grid */}
      {filteredClips.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}>
          <Clipboard size={42} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Aucun clip trouvé</p>
          <p style={{ fontSize: '12px', maxWidth: '350px', marginTop: '6px' }}>
            {clipboardMonitorActive
              ? 'Copiez n\'importe quel texte — il sera automatiquement capturé et classifié par l\'IA.'
              : 'Activez l\'Auto-Capture pour commencer à mémoriser automatiquement tout ce que vous copiez.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredClips.map((clip) => {
            const typeInfo = getTypeInfo(clip.contentType)
            return (
              <div
                key={clip.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${clip.isStarred ? 'rgba(250, 204, 21, 0.3)' : 'var(--border-default)'}`,
                  background: 'var(--bg-card)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Top row: Type + Title + Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    {/* Type badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: typeInfo.color + '18',
                      border: `1px solid ${typeInfo.color}30`,
                      color: typeInfo.color,
                      fontSize: '10px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>

                    {/* Title */}
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {clip.title}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={() => onStarClip(clip.id)}
                      title={clip.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: clip.isStarred ? '#facc15' : 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >
                      {clip.isStarred ? <Star size={14} /> : <StarOff size={14} />}
                    </button>

                    {!clip.convertedToOffer && clip.contentType === 'job_offer' && (
                      <button
                        onClick={() => onConvertToOffer(clip.id)}
                        title="Convertir en offre PFE"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          background: 'rgba(168, 85, 247, 0.1)',
                          color: '#a855f7',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Briefcase size={11} />
                        → Offre
                      </button>
                    )}

                    {clip.convertedToOffer && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}>
                        ✓ Offre créée
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteClip(clip.id)}
                      title="Supprimer"
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 10px 0',
                  lineHeight: '1.55',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {clip.summary || clip.content?.slice(0, 200)}
                </p>

                {/* Meta row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  flexWrap: 'wrap',
                }}>
                  {/* Source */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getDomainIcon(clip.sourceDomain)} {clip.sourceDomain || 'clipboard'}
                  </span>

                  {/* Device */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {clip.sourceDevice === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                    {clip.sourceDevice === 'mobile' ? 'Mobile' : 'Desktop'}
                  </span>

                  {/* Time */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} />
                    {formatTimestamp(clip.copiedAt || clip.createdAt)}
                  </span>

                  {/* Source URL */}
                  {clip.sourceUrl && (
                    <a
                      href={clip.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontSize: '11px',
                      }}
                    >
                      <ArrowUpRight size={11} />
                      Ouvrir
                    </a>
                  )}

                  {/* Tags */}
                  {(clip.tags || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {clip.tags.slice(0, 4).map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            fontSize: '10px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

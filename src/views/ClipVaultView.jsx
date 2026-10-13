import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  Camera,
} from 'lucide-react'
import { StorageService } from '../services/storage.js'

const CONTENT_TYPES = [
  { id: 'all', label: 'All', icon: '📋', color: '#94a3b8' },
  { id: 'job_offer', label: 'Job Offers', icon: '💼', color: '#10b981' },
  { id: 'educational_video', label: 'Videos & Shorts', icon: '🎬', color: '#f59e0b' },
  { id: 'code_snippet', label: 'Code Snippets', icon: '💻', color: '#e2e8f0' },
  { id: 'tech_article', label: 'Articles', icon: '📰', color: '#f59e0b' },
  { id: 'social_post', label: 'Social', icon: '💬', color: '#14b8a6' },
  { id: 'tool_or_repo', label: 'Tools & Repos', icon: '🔧', color: '#10b981' },
  { id: 'note', label: 'Notes', icon: '📝', color: '#a1a1aa' },
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
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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
  if (d.includes('youtube') || d.includes('youtu.be')) return '🎬'
  if (d.includes('tiktok')) return '🎵'
  if (d.includes('instagram')) return '📸'
  if (d.includes('indeed') || d.includes('glassdoor')) return '💼'
  return '🌐'
}

function detectClipChannel(clip) {
  const text = (clip.content || '') + ' ' + (clip.summary || '')
  if (/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(text)) {
    return { id: 'email', label: 'Email Channel', color: '#34d399' }
  }
  if (/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/.test(text) || /whatsapp|linkedin\.com\/in/i.test(text)) {
    return { id: 'direct_contact', label: 'Direct DM / WA', color: '#2dd4bf' }
  }
  return { id: 'external', label: 'ATS Portal', color: '#94a3b8' }
}

export function ClipVaultView({
  clips,
  onRefresh,
  onDeleteClip,
  onStarClip,
  onConvertToOffer,
  onSyncAllClips,
  clipboardMonitorActive,
  onToggleMonitor,
}) {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeDomain, setActiveDomain] = useState('all')
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const fileInputRef = useRef(null)

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsOcrProcessing(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1]
          await StorageService.ocrIngestClip({
            imageBase64: base64,
            sourceDevice: 'desktop',
          })
          if (onRefresh) await onRefresh()
        } catch (err) {
          console.error('OCR ingest failed:', err)
        } finally {
          setIsOcrProcessing(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Screenshot read failed:', err)
      setIsOcrProcessing(false)
    }
  }

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

  const handleSyncAll = async () => {
    if (!onSyncAllClips || isSyncing) return
    setIsSyncing(true)
    try {
      await onSyncAllClips()
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="workspace-view" style={{ padding: '20px 24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Clipboard size={22} style={{ color: '#ffffff' }} />
            Clip Vault — Universal Memory
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Copied content from any site or app is classified, tagged, and synced to career channels.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sync to Channels Button */}
          {onSyncAllClips && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #ffffff',
                color: '#09090b',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={13} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Offers to Channels'}</span>
            </button>
          )}

          {/* Monitor toggle */}
          <button
            onClick={onToggleMonitor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${clipboardMonitorActive ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
              background: clipboardMonitorActive ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)',
              color: clipboardMonitorActive ? '#34d399' : '#f87171',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={13} />
            {clipboardMonitorActive ? 'Auto-Capture Active' : 'Auto-Capture Paused'}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleScreenshotUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isOcrProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Camera size={13} style={{ color: '#10b981' }} />
            <span>{isOcrProcessing ? 'Extracting OCR...' : 'Screenshot OCR'}</span>
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
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Type Filter Pills with Generous Space and Distinct Badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
          flexShrink: 0,
          minHeight: '44px',
          alignItems: 'center',
        }}
      >
        {CONTENT_TYPES.map((type) => {
          const count = typeCounts[type.id] || 0
          const isActive = activeType === type.id
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 15px',
                borderRadius: '8px',
                border: isActive ? '1px solid #ffffff' : '1px solid var(--border-default)',
                background: isActive ? '#27272a' : 'var(--bg-surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 500,
                minHeight: '38px',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{type.icon}</span>
              <span>{type.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.18)'
                    : count > 0
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isActive
                    ? '#ffffff'
                    : count > 0
                    ? 'var(--text-primary)'
                    : 'var(--text-tertiary)',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + Domain Filter + Starred */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
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
            placeholder="Search clips, tags, content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
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
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Sources</option>
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
            color: showStarredOnly ? '#fbbf24' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {showStarredOnly ? <Star size={13} /> : <StarOff size={13} />}
          Favorites
        </button>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '18px',
        padding: '10px 16px',
        borderRadius: '8px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <span><strong style={{ color: '#ffffff' }}>{clips.length}</strong> total clips</span>
        <span><strong style={{ color: '#f59e0b' }}>{clips.filter((c) => c.isStarred).length}</strong> favorites</span>
        <span><strong style={{ color: '#10b981' }}>{clips.filter((c) => c.convertedToOffer).length}</strong> routed to offers</span>
        <span><strong style={{ color: '#e2e8f0' }}>{domains.length - 1}</strong> web sources</span>
        <span>Showing: <strong>{filteredClips.length}</strong></span>
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
          <p style={{ fontSize: '14px', fontWeight: 600 }}>No clips captured yet</p>
          <p style={{ fontSize: '12px', maxWidth: '350px', marginTop: '6px' }}>
            {clipboardMonitorActive
              ? 'Copy text from any site or app — OmniMemory AI will classify and organize it automatically.'
              : 'Turn on Auto-Capture above to automatically remember everything you copy.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredClips.map((clip) => {
            const typeInfo = getTypeInfo(clip.contentType)
            const channelMeta = detectClipChannel(clip)
            const isJobOffer = clip.contentType === 'job_offer' || /stage|pfe|recrute|hiring|candidat|poste|cdi|internship|job/i.test(clip.content)

            return (
              <div
                key={clip.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${clip.isStarred ? 'rgba(250, 204, 21, 0.3)' : 'var(--border-default)'}`,
                  background: 'var(--bg-surface)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Top row: Type + Channel Badge + Title + Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
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

                    {/* Detected Channel Badge */}
                    {isJobOffer && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${channelMeta.color}35`,
                        color: channelMeta.color,
                        fontSize: '10px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {channelMeta.label}
                      </span>
                    )}

                    {/* Title */}
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: '160px',
                    }}>
                      {clip.title}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => onStarClip(clip.id)}
                      title={clip.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: clip.isStarred ? '#fbbf24' : 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >
                      {clip.isStarred ? <Star size={14} /> : <StarOff size={14} />}
                    </button>

                    {!clip.convertedToOffer && isJobOffer && (
                      <button
                        onClick={() => onConvertToOffer(clip.id)}
                        title="Route to Offer Channel"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          cursor: 'pointer',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Briefcase size={11} />
                        → Route to Channel
                      </button>
                    )}

                    {clip.convertedToOffer && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        color: '#34d399',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}>
                        ✓ Synced in Channel
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteClip(clip.id)}
                      title="Delete"
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

                {/* Educational Video Breakdown & Key Takeaways */}
                {(clip.contentType === 'educational_video' || clip.entities?.videoData) && (
                  <div style={{
                    marginTop: '8px',
                    marginBottom: '12px',
                    padding: '12px 14px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.22)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🎬</span> Video Takeaways & Key Insights
                      </span>
                      {clip.entities?.videoData?.creator && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          By {clip.entities.videoData.creator}
                        </span>
                      )}
                    </div>
                    {clip.entities?.videoData?.coreConcept && (
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Core Concept: {clip.entities.videoData.coreConcept}
                      </div>
                    )}
                    {Array.isArray(clip.entities?.videoData?.keyTakeaways) && clip.entities.videoData.keyTakeaways.length > 0 && (
                      <ul style={{ margin: '0 0 6px 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {clip.entities.videoData.keyTakeaways.map((point, idx) => (
                          <li key={idx} style={{ marginBottom: '3px' }}>{point}</li>
                        ))}
                      </ul>
                    )}
                    {Array.isArray(clip.entities?.videoData?.toolsMentioned) && clip.entities.videoData.toolsMentioned.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Tools:</span>
                        {clip.entities.videoData.toolsMentioned.map((t, idx) => (
                          <span key={idx} style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)',
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: '11px',
                      }}
                    >
                      <ArrowUpRight size={11} />
                      Open Source
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
                            background: 'var(--bg-app)',
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

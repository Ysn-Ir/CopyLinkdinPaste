import React, { useState, useMemo } from 'react'
import {
  Mail,
  Globe,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Download,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { CATEGORIES } from '../data/categories.js'
import { EmlGenerator } from '../services/emlGenerator.js'
import { EMAIL_TEMPLATES } from '../data/defaultTemplates.js'

const PIPELINE_COLUMNS = [
  { id: 'saved', label: 'Saved', color: '#71717a' },
  { id: 'ready', label: 'Ready', color: '#3b82f6' },
  { id: 'applied', label: 'Applied', color: '#60a5fa' },
  { id: 'replied', label: 'Replied', color: '#ec4899' },
  { id: 'interview', label: 'Interview', color: '#a855f7' },
  { id: 'offer', label: 'Offer', color: '#10b981' },
  { id: 'rejected', label: 'Rejected', color: '#52525b' },
]

function formatInsertionDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 2) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch (e) {
    return ''
  }
}

export function PipelineView({
  offers = [],
  categories = [],
  candidateProfile = {},
  onUpdateStatus,
  onSaveOffer,
  onNavigate,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedChannel, setSelectedChannel] = useState('all')

  const domainCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : CATEGORIES
  }, [categories])

  const handleMoveStatus = (offerId, newStatus) => {
    onUpdateStatus(offerId, newStatus)
    if (newStatus === 'offer' || newStatus === 'applied') {
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.65 } })
    }
  }

  // Next / Previous stage helpers
  const handleShiftStage = (offer, direction) => {
    const currentIdx = PIPELINE_COLUMNS.findIndex((c) => {
      if (c.id === 'saved') return offer.status === 'saved' || offer.status === 'to_apply'
      return offer.status === c.id
    })

    const targetIdx = currentIdx + direction
    if (targetIdx >= 0 && targetIdx < PIPELINE_COLUMNS.length) {
      handleMoveStatus(offer.id, PIPELINE_COLUMNS[targetIdx].id)
    }
  }

  // Quick Action: Draft .EML
  const handleQuickDraftEml = (offer) => {
    const tpl = EMAIL_TEMPLATES[0]
    const skillsText = (offer.skills || []).join(', ') || candidateProfile.skills || 'IA et Software Engineering'
    const cat = domainCategories.find((c) => c.id === offer.category)

    const subject = offer.customEmailSubject || `Candidature Stage PFE - ${offer.title} - ${candidateProfile.fullName || 'Khalil'}`
    const body = offer.customEmailBody || tpl.body
      .replace(/\[RECIPIENT_NAME\]/g, offer.sharer?.name || offer.recruiterName || 'Madame, Monsieur')
      .replace(/\[ROLE\]/g, offer.title)
      .replace(/\[COMPANY\]/g, offer.company)
      .replace(/\[DOMAIN\]/g, cat?.label || 'Informatique & Ingénierie')
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[ATTACHED_CV\]/g, offer.attachedCvTag || 'CV Ingénieur')
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Khalil')
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone || '')
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn || '')
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString('fr-FR'))

    EmlGenerator.downloadEml({
      to: offer.recruiterEmail || 'recrutement@entreprise.com',
      from: candidateProfile.email || 'khalil.pfe@gmail.com',
      subject,
      body,
      attachedCvTag: offer.attachedCvTag,
    })

    // Advance to 'applied' if user wants
    handleMoveStatus(offer.id, 'applied')
  }

  // Quick Action: Direct Contact WhatsApp / InMail
  const handleQuickDirectOutreach = (offer) => {
    const phone = offer.sharer?.phone?.replace(/[^0-9+]/g, '')
    const msg = offer.whatsAppMsg || `Bonjour ${offer.sharer?.name || ''}, je vous contacte au sujet de votre offre de stage PFE chez ${offer.company}.`

    if (phone) {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(msg)}`, '_blank')
    } else if (offer.sharer?.profileUrl) {
      navigator.clipboard.writeText(offer.linkedInNote || msg)
      alert(`LinkedIn note copied to clipboard!\n\nOpening profile: ${offer.sharer.profileUrl}`)
      window.open(offer.sharer.profileUrl, '_blank')
    } else {
      navigator.clipboard.writeText(msg)
      alert('Outreach pitch copied to clipboard!')
    }
  }

  // Filter computation
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (selectedCategory !== 'all' && o.category !== selectedCategory) return false
      if (selectedChannel !== 'all' && o.channel !== selectedChannel) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (o.title || '').toLowerCase().includes(q)
        const matchCompany = (o.company || '').toLowerCase().includes(q)
        const matchRecruiter = (o.sharer?.name || o.recruiterName || '').toLowerCase().includes(q)
        const matchSkills = (o.skills || []).some((s) => s.toLowerCase().includes(q))
        if (!matchTitle && !matchCompany && !matchRecruiter && !matchSkills) return false
      }

      return true
    })
  }, [offers, selectedCategory, selectedChannel, searchQuery])

  return (
    <div className="workspace-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. TOP PIPELINE TOOLBAR */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', height: '32px', fontSize: '12px', paddingLeft: '28px' }}
              placeholder="Search cards, skills, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search
              size={13}
              style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
            />
          </div>

          {/* Domain Dropdown Filter */}
          <select
            className="form-select"
            style={{ height: '32px', fontSize: '11.5px', width: '150px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Domains ({offers.length})</option>
            {domainCategories.filter((c) => c.id !== 'all').map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Channel Filter Pills */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`pill-btn ${selectedChannel === 'all' ? 'active' : ''}`}
              style={{ height: '32px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setSelectedChannel('all')}
            >
              All Channels
            </button>
            <button
              className={`pill-btn ${selectedChannel === 'email' ? 'active' : ''}`}
              style={{ height: '32px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setSelectedChannel('email')}
            >
              <Mail size={11} />
              <span>Email</span>
            </button>
            <button
              className={`pill-btn ${selectedChannel === 'direct_contact' ? 'active' : ''}`}
              style={{ height: '32px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setSelectedChannel('direct_contact')}
            >
              <MessageSquare size={11} />
              <span>DM / WA</span>
            </button>
            <button
              className={`pill-btn ${selectedChannel === 'external' ? 'active' : ''}`}
              style={{ height: '32px', fontSize: '11px', padding: '0 8px' }}
              onClick={() => setSelectedChannel('external')}
            >
              <Globe size={11} />
              <span>ATS</span>
            </button>
          </div>
        </div>

        {/* Counter Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredOffers.length}</strong> of {offers.length} offers
          </span>
          <span style={{ color: 'var(--border-default)' }}>•</span>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>Active Kanban</span>
        </div>
      </div>

      {/* 2. KANBAN HORIZONTAL BOARD */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px' }}>
        <div className="kanban-board" style={{ height: '100%', minWidth: '1420px', gap: '14px' }}>
          {PIPELINE_COLUMNS.map((col, colIdx) => {
            const colOffers = filteredOffers.filter((o) => {
              if (col.id === 'saved') return o.status === 'saved' || o.status === 'to_apply'
              return o.status === col.id
            })

            return (
              <div
                key={col.id}
                className="kanban-col"
                style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  width: '240px',
                }}
              >
                {/* Column Header */}
                <div
                  className="kanban-col-header"
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: col.color,
                        boxShadow: `0 0 6px ${col.color}88`,
                      }}
                    />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {col.label}
                    </span>
                  </div>
                  <span
                    className="nav-counter"
                    style={{
                      background: colOffers.length > 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: colOffers.length > 0 ? col.color : 'var(--text-disabled)',
                      fontWeight: 700,
                    }}
                  >
                    {colOffers.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div
                  className="kanban-col-content"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {colOffers.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--text-disabled)',
                        fontSize: '11px',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: '6px',
                        marginTop: '4px',
                      }}
                    >
                      No cards in {col.label}
                    </div>
                  ) : (
                    colOffers.map((offer) => {
                      const cat = domainCategories.find((c) => c.id === offer.category)

                      return (
                        <div
                          key={offer.id}
                          className="tool-card"
                          style={{
                            padding: '10px 12px',
                            background: 'var(--bg-surface)',
                            border: `1px solid ${offer.needsUserReview ? 'rgba(234, 179, 8, 0.4)' : 'var(--border-subtle)'}`,
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'border-color 0.12s ease',
                          }}
                        >
                          {/* Card Top: Channel, Domain & Insertion Date */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span className={`badge-channel ${offer.channel}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {offer.channel === 'email' ? <Mail size={9} /> : offer.channel === 'direct_contact' ? <MessageSquare size={9} /> : <Globe size={9} />}
                              <span>{offer.channel === 'email' ? 'Email' : offer.channel === 'direct_contact' ? 'DM / WA' : 'ATS'}</span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {offer.createdAt && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                  title={`Added: ${offer.createdAt}`}
                                >
                                  <Clock size={8} />
                                  <span>{formatInsertionDate(offer.createdAt)}</span>
                                </span>
                              )}

                              <span
                                className="badge-category"
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  color: cat?.color || '#a1a1aa',
                                  borderColor: cat?.borderColor || '#27272a',
                                }}
                              >
                                {cat?.shortLabel || offer.category}
                              </span>
                            </div>
                          </div>

                          {/* Company Name */}
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#93c5fd' }}>
                            {offer.company || 'Entreprise Confidentielle'}
                          </div>

                          {/* Role Title */}
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              lineHeight: 1.3,
                              cursor: 'pointer',
                            }}
                            onClick={() => onNavigate('command-center')}
                            title="Open in Command Center"
                          >
                            {offer.title}
                          </div>

                          {/* Recruiter / Sharer chip */}
                          {(offer.sharer?.name || offer.recruiterName) && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <User size={10} style={{ color: '#38bdf8' }} />
                              <span>{offer.sharer?.name || offer.recruiterName}</span>
                            </div>
                          )}

                          {/* Attached CV Tag */}
                          {offer.attachedCvTag && (
                            <div style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              CV: {offer.attachedCvTag.replace('CV - ', '')}
                            </div>
                          )}

                          {/* Direct Action Shortcut Row */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '4px',
                              paddingTop: '6px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {offer.channel === 'email' ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  flex: 1,
                                  height: '24px',
                                  fontSize: '10px',
                                  padding: '0 6px',
                                  color: '#34d399',
                                  borderColor: 'rgba(52, 211, 153, 0.3)',
                                  justifyContent: 'center',
                                }}
                                onClick={() => handleQuickDraftEml(offer)}
                                title="Generate and download .EML email draft"
                              >
                                <Download size={10} />
                                <span>Draft .EML</span>
                              </button>
                            ) : offer.channel === 'direct_contact' ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  flex: 1,
                                  height: '24px',
                                  fontSize: '10px',
                                  padding: '0 6px',
                                  color: '#c084fc',
                                  borderColor: 'rgba(192, 132, 252, 0.3)',
                                  justifyContent: 'center',
                                }}
                                onClick={() => handleQuickDirectOutreach(offer)}
                                title="Open WhatsApp or copy LinkedIn note"
                              >
                                <MessageSquare size={10} />
                                <span>DM / WA</span>
                              </button>
                            ) : (
                              <a
                                href={offer.sourceUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{
                                  flex: 1,
                                  height: '24px',
                                  fontSize: '10px',
                                  padding: '0 6px',
                                  color: '#60a5fa',
                                  borderColor: 'rgba(96, 165, 250, 0.3)',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                }}
                                title="Open application portal in new tab"
                              >
                                <span>Portal</span>
                                <ExternalLink size={10} />
                              </a>
                            )}

                            {/* Jump to Command Center button */}
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ height: '24px', width: '24px', padding: 0, justifyContent: 'center' }}
                              onClick={() => onNavigate('command-center')}
                              title="Inspect full details in Command Center"
                            >
                              <ArrowRight size={11} />
                            </button>
                          </div>

                          {/* Stage Transition Navigation Bar (← Stage Selector →) */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                              marginTop: '2px',
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                height: '22px',
                                width: '22px',
                                padding: 0,
                                justifyContent: 'center',
                                visibility: colIdx > 0 ? 'visible' : 'hidden',
                              }}
                              onClick={() => handleShiftStage(offer, -1)}
                              title={`Move back to ${PIPELINE_COLUMNS[colIdx - 1]?.label}`}
                            >
                              <ChevronLeft size={13} />
                            </button>

                            <select
                              className="form-select"
                              style={{
                                flex: 1,
                                height: '22px',
                                fontSize: '10px',
                                padding: '0 4px',
                                background: 'transparent',
                                borderColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-secondary)',
                              }}
                              value={col.id}
                              onChange={(e) => handleMoveStatus(offer.id, e.target.value)}
                            >
                              {PIPELINE_COLUMNS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                height: '22px',
                                width: '22px',
                                padding: 0,
                                justifyContent: 'center',
                                visibility: colIdx < PIPELINE_COLUMNS.length - 1 ? 'visible' : 'hidden',
                              }}
                              onClick={() => handleShiftStage(offer, 1)}
                              title={`Advance to ${PIPELINE_COLUMNS[colIdx + 1]?.label}`}
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

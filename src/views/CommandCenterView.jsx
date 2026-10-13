import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Sparkles,
  Link as LinkIcon,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Globe,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Download,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  User,
  Phone,
  FileText,
  Bot,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  Edit3,
  Sliders,
  Layers,
  Zap,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { CATEGORIES, APPLICATION_STATUSES } from '../data/categories.js'
import { EMAIL_TEMPLATES, COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'
import { EmlGenerator } from '../services/emlGenerator.js'
import { PdfGenerator } from '../services/pdfGenerator.js'
import { AiService } from '../services/aiService.js'

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

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return ''
  }
}

export function CommandCenterView({
  offers = [],
  cvList = [],
  categories = [],
  onOpenCategoryManager,
  candidateProfile = {},
  aiConfig = {},
  onSaveOffer,
  onDeleteOffer,
  onQuickIngest,
  isIngesting = false,
  initialCategoryFilter = 'all',
  initialChannelFilter = 'all',
  clips = [],
  onSyncClips,
  onNavigate,
}) {
  const domainCategories = useMemo(() => {
    return (categories && categories.length > 0) ? categories : CATEGORIES
  }, [categories])

  // Navigation & selection
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id || null)
  const [activeChannelFilter, setActiveChannelFilter] = useState(initialChannelFilter) // 'all' | 'email' | 'direct_contact' | 'external'
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [groupBy, setGroupBy] = useState('none') // 'none' | 'channel' | 'category' | 'status'
  const [mobilePane, setMobilePane] = useState('list') // 'list' | 'detail'

  useEffect(() => {
    if (initialCategoryFilter) {
      setCategoryFilter(initialCategoryFilter)
    }
  }, [initialCategoryFilter])

  useEffect(() => {
    if (initialChannelFilter) {
      setActiveChannelFilter(initialChannelFilter)
    }
  }, [initialChannelFilter])

  // Top Ingestion Input
  const [ingestInput, setIngestInput] = useState('')
  const [showExtendedIngest, setShowExtendedIngest] = useState(false)
  const [ingestFlyerUrl, setIngestFlyerUrl] = useState('')

  // Active Inspector Tab
  const [inspectorTab, setInspectorTab] = useState('email') // 'email' | 'direct' | 'cover' | 'flyer' | 'copilot'
  const [copiedKey, setCopiedKey] = useState(null)

  // Current selected offer
  const currentOffer = useMemo(() => {
    return offers.find((o) => o.id === selectedOfferId) || offers[0] || null
  }, [offers, selectedOfferId])

  const currentCategory = useMemo(() => {
    if (!currentOffer) return null
    return domainCategories.find((c) => c.id === currentOffer.category) || null
  }, [currentOffer, domainCategories])

  // Sync selectedOfferId if current one gets removed
  useEffect(() => {
    if (offers.length > 0 && (!selectedOfferId || !offers.some((o) => o.id === selectedOfferId))) {
      setSelectedOfferId(offers[0].id)
    }
  }, [offers, selectedOfferId])

  // Automatically adapt the active inspector tab to the offer channel when offer selection changes
  useEffect(() => {
    if (currentOffer) {
      if (currentOffer.channel === 'direct_contact') {
        setInspectorTab('direct')
      } else if (currentOffer.channel === 'external') {
        setInspectorTab('cover')
      } else {
        setInspectorTab('email')
      }
    }
  }, [currentOffer?.id])

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  // Live filter computation
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      // Channel
      if (activeChannelFilter !== 'all' && o.channel !== activeChannelFilter) {
        return false
      }
      // Category
      if (categoryFilter !== 'all' && o.category !== categoryFilter) {
        return false
      }
      // Status
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (o.title || '').toLowerCase().includes(q)
        const matchCompany = (o.company || '').toLowerCase().includes(q)
        const matchRecruiter = (o.sharer?.name || o.recruiterName || '').toLowerCase().includes(q)
        const matchSkills = (o.skills || []).some((s) => s.toLowerCase().includes(q))
        if (!matchTitle && !matchCompany && !matchRecruiter && !matchSkills) {
          return false
        }
      }
      return true
    })
  }, [offers, activeChannelFilter, categoryFilter, statusFilter, searchQuery])

  // Grouped computation for structured categorization
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: null, items: filteredOffers }]
    }

    if (groupBy === 'channel') {
      const channels = [
        { id: 'email', label: 'Direct Email Outreach', color: '#10b981' },
        { id: 'direct_contact', label: 'Direct Contact (DM & WhatsApp)', color: '#f59e0b' },
        { id: 'external', label: 'External Portals & ATS', color: '#a1a1aa' },
      ]
      return channels
        .map((ch) => ({
          id: ch.id,
          title: ch.label,
          color: ch.color,
          items: filteredOffers.filter((o) => o.channel === ch.id),
        }))
        .filter((g) => g.items.length > 0)
    }

    if (groupBy === 'category') {
      return domainCategories.filter((c) => c.id !== 'all')
        .map((cat) => ({
          id: cat.id,
          title: cat.label,
          color: cat.color,
          items: filteredOffers.filter((o) => o.category === cat.id),
        }))
        .filter((g) => g.items.length > 0)
    }

    if (groupBy === 'status') {
      return APPLICATION_STATUSES.map((st) => ({
        id: st.id,
        title: st.label,
        color: st.color,
        items: filteredOffers.filter((o) => o.status === st.id),
      })).filter((g) => g.items.length > 0)
    }

    return [{ id: 'all', title: null, items: filteredOffers }]
  }, [filteredOffers, groupBy])


  // Ingestion handler
  const handleTriggerIngest = async (e) => {
    e?.preventDefault()
    if (!ingestInput.trim() || isIngesting) return
    const input = ingestInput.trim()
    setIngestInput('')
    setShowExtendedIngest(false)
    await onQuickIngest(input)
  }

  // Status changer
  const handleUpdateStatus = (newStatus) => {
    if (!currentOffer) return
    const updated = { ...currentOffer, status: newStatus, updatedAt: new Date().toISOString() }
    onSaveOffer(updated)
    if (newStatus === 'applied' || newStatus === 'offer') {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } })
    }
  }

  // Field updater
  const handleUpdateField = (key, val) => {
    if (!currentOffer) return
    const updated = { ...currentOffer, [key]: val, updatedAt: new Date().toISOString() }
    onSaveOffer(updated)
  }

  // Recruiter field updater
  const handleUpdateSharer = (key, val) => {
    if (!currentOffer) return
    const updatedSharer = { ...(currentOffer.sharer || {}), [key]: val }
    const updated = {
      ...currentOffer,
      sharer: updatedSharer,
      recruiterName: key === 'name' ? val : currentOffer.recruiterName,
      updatedAt: new Date().toISOString(),
    }
    onSaveOffer(updated)
  }

  // Interpolated Email Body
  const emailDraftBody = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customEmailBody) return currentOffer.customEmailBody
    const tpl = EMAIL_TEMPLATES[0]
    const skillsText = (currentOffer.skills || []).join(', ') || candidateProfile.skills || 'IA et Software Engineering'
    const cat = domainCategories.find((c) => c.id === currentOffer.category)

    return tpl.body
      .replace(/\[RECIPIENT_NAME\]/g, currentOffer.sharer?.name || currentOffer.recruiterName || 'Madame, Monsieur')
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[DOMAIN\]/g, cat?.label || 'Informatique & Ingénierie')
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[ATTACHED_CV\]/g, currentOffer.attachedCvTag || 'CV Ingénieur')
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Khalil')
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone || '')
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn || '')
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString('fr-FR'))
  }, [currentOffer, candidateProfile])

  // Interpolated Email Subject
  const emailDraftSubject = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customEmailSubject) return currentOffer.customEmailSubject
    return `Candidature Stage PFE : ${currentOffer.title} - ${candidateProfile.fullName || 'Khalil'}`
  }, [currentOffer, candidateProfile])

  // Interpolated Cover Letter Body
  const coverLetterBody = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customCoverLetter) return currentOffer.customCoverLetter
    const tpl = COVER_LETTER_TEMPLATES[0]
    const skillsText = (currentOffer.skills || []).join(', ') || candidateProfile.skills || 'systèmes informatiques'

    return tpl.defaultText
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Khalil')
  }, [currentOffer, candidateProfile])

  // Direct Contact notes
  const linkedInNote = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.linkedInNote) return currentOffer.linkedInNote
    const firstName = currentOffer.sharer?.name ? currentOffer.sharer.name.split(' ')[0] : ''
    const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour'
    return `${greeting}, passionné par ${currentOffer.skills?.[0] || 'vos projets'}, je serais ravi d'échanger avec vous au sujet de l'opportunité "${currentOffer.title}" chez ${currentOffer.company}. Bien cordialement.`
  }, [currentOffer])

  const whatsAppMessage = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.whatsAppMsg) return currentOffer.whatsAppMsg
    return `Bonjour ${currentOffer.sharer?.name || ''}, je vous contacte suite à votre offre de stage PFE "${currentOffer.title}" chez ${currentOffer.company}. Je serais honoré d'échanger avec vous. ${candidateProfile.fullName || ''}`
  }, [currentOffer, candidateProfile])

  // Download .eml file
  const handleDownloadEml = () => {
    if (!currentOffer) return
    EmlGenerator.downloadEml({
      to: currentOffer.recruiterEmail || 'contact@recruteur.com',
      subject: emailDraftSubject,
      body: emailDraftBody,
      candidateName: candidateProfile.fullName || 'Khalil',
      candidateEmail: candidateProfile.email || 'khalil.pfe@gmail.com',
      cvFileName: `${(currentOffer.attachedCvTag || 'CV').replace(/\s+/g, '_')}.pdf`,
    })
  }

  // Download Cover Letter PDF
  const handleDownloadPdf = () => {
    if (!currentOffer) return
    PdfGenerator.downloadPdf({
      candidate: candidateProfile,
      offer: currentOffer,
      text: coverLetterBody,
      style: 'latex-classic',
    })
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
  }

  // Launch WhatsApp Web
  const handleOpenWhatsApp = () => {
    if (!currentOffer?.sharer?.phone) return
    const phone = currentOffer.sharer.phone.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsAppMessage)}`
    window.open(url, '_blank')
  }

  // Launch LinkedIn profile
  const handleOpenLinkedIn = () => {
    const url = currentOffer?.sharer?.profileUrl || currentOffer?.sourceUrl
    if (url) window.open(url, '_blank')
  }

  // AI Copilot State
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [isCopilotLoading, setIsCopilotLoading] = useState(false)
  const [copilotOutput, setCopilotOutput] = useState('')

  const handleRunCopilot = async (customInstruction) => {
    if (!currentOffer || isCopilotLoading) return
    const promptToRun = customInstruction || copilotPrompt
    if (!promptToRun.trim()) return

    setIsCopilotLoading(true)
    setCopilotOutput('')

    try {
      const result = await AiService.runFreeformPrompt({
        prompt: promptToRun,
        systemPrompt: `You are an elite, unrestricted career copilot. Current offer context: Title: "${currentOffer.title}", Company: "${currentOffer.company}", Location: "${currentOffer.location}", Skills: ${JSON.stringify(currentOffer.skills)}, Sharer: "${currentOffer.sharer?.name || 'Recruiter'}". Candidate: "${candidateProfile.fullName}", Degree: "${candidateProfile.degree}".`,
        config: aiConfig,
      })
      setCopilotOutput(result)
    } catch (err) {
      setCopilotOutput(`[Error calling Groq API]: ${err.message}`)
    } finally {
      setIsCopilotLoading(false)
    }
  }

  // Apply Copilot to Email Body
  const handleApplyCopilotToEmail = () => {
    if (!copilotOutput) return
    handleUpdateField('customEmailBody', copilotOutput)
    setInspectorTab('email')
    setCopilotOutput('')
  }

  // Counts for channel tabs
  const emailOffersCount = offers.filter((o) => o.channel === 'email').length
  const directOffersCount = offers.filter((o) => o.channel === 'direct_contact').length
  const externalOffersCount = offers.filter((o) => o.channel === 'external').length

  return (
    <div className="workspace-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. UNIVERSAL INGESTION HERO BAR */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          padding: '12px 18px',
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleTriggerIngest} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingRight: '100px',
                height: '40px',
                fontSize: '13px',
                background: 'var(--bg-app)',
              }}
              placeholder="Paste any LinkedIn post link, Indeed URL, or raw post text to ingest with Groq AI..."
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              disabled={isIngesting}
            />
            <LinkIcon
              size={15}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }}
            />
            <button
              type="button"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              onClick={() => setShowExtendedIngest(!showExtendedIngest)}
            >
              <span>{showExtendedIngest ? 'Less options' : '+ Paste flyer / text'}</span>
              <ChevronDown size={12} style={{ transform: showExtendedIngest ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: '40px',
              padding: '0 18px',
              background: 'var(--accent-primary)',
              borderColor: 'var(--border-focus)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
            disabled={isIngesting || !ingestInput.trim()}
          >
            {isIngesting ? <RefreshCw size={14} className="pulse-glow" /> : <Zap size={14} />}
            <span>{isIngesting ? 'Extracting with Groq...' : 'Ingest with Groq'}</span>
          </button>
        </form>

        {/* Extended Ingestion Drawer (Flyer / Image / Full text) */}
        {showExtendedIngest && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px',
              background: 'var(--bg-app)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Optional: Add Flyer Image URL or paste full multi-paragraph recruiter text
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Image Flyer URL (e.g. https://media.licdn.com/...)"
                value={ingestFlyerUrl}
                onChange={(e) => setIngestFlyerUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (ingestFlyerUrl && currentOffer) {
                    handleUpdateField('imageUrl', ingestFlyerUrl)
                    setIngestFlyerUrl('')
                    setShowExtendedIngest(false)
                  }
                }}
              >
                <ImageIcon size={13} />
                <span>Attach Flyer to Selected Offer</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. MASTER-DETAIL SPLIT WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PANE: OFFERS STREAM (390px wide on desktop, responsive) */}
        <aside
          className={`command-master-pane ${mobilePane === 'detail' ? 'mobile-hidden' : ''}`}
          style={{
            width: '390px',
            borderRight: '1px solid var(--border-default)',
            background: 'var(--bg-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Channel Filters */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '4px',
              background: 'var(--bg-surface)',
              overflowX: 'auto',
            }}
          >
            <button
              className={`pill-btn ${activeChannelFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('all')}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <span>All</span>
              <span className="badge-pill">{offers.length}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'email' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('email')}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <Mail size={11} />
              <span>Email</span>
              <span className="badge-pill">{emailOffersCount}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'direct_contact' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('direct_contact')}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <MessageSquare size={11} />
              <span>DM / WA</span>
              <span className="badge-pill">{directOffersCount}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'external' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('external')}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
            >
              <Globe size={11} />
              <span>ATS</span>
              <span className="badge-pill">{externalOffersCount}</span>
            </button>

            {clips && clips.some((c) => !c.convertedToOffer && (c.contentType === 'job_offer' || /stage|pfe|recrute|hiring|candidat|poste|cdi|internship|job/i.test(c.content || ''))) && onSyncClips && (
              <button
                className="pill-btn"
                onClick={onSyncClips}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  background: '#27272a',
                  borderColor: '#3f3f46',
                  color: '#fafafa',
                  fontWeight: 600,
                  marginLeft: 'auto',
                }}
                title="Sync captured job offers from clipboard vault into channels"
              >
                <Zap size={11} />
                <span>Sync Vault</span>
              </button>
            )}
          </div>

          {/* Search, Category & Grouping Filter Bar */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', height: '30px', fontSize: '11.5px', paddingLeft: '26px' }}
                placeholder="Search offers, skills, recruiter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={12}
                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>

            <select
              className="form-select"
              style={{ height: '30px', fontSize: '11px', width: '96px', padding: '0 4px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              title="Filter by domain field"
            >
              <option value="all">All Domains</option>
              {domainCategories.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortLabel || c.label}
                </option>
              ))}
            </select>

            {onOpenCategoryManager && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  height: '30px',
                  padding: '0 6px',
                  fontSize: '10.5px',
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                onClick={onOpenCategoryManager}
                title="Add or configure custom engineering domains"
              >
                <Plus size={11} />
                <span>Domain</span>
              </button>
            )}

            <select
              className="form-select"
              style={{ height: '30px', fontSize: '11px', width: '92px', padding: '0 4px' }}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              title="Group offers into sections"
            >
              <option value="none">Group: Off</option>
              <option value="channel">By Channel</option>
              <option value="category">By Domain</option>
              <option value="status">By Status</option>
            </select>
          </div>

          {/* Stream List with Categorized Groupings */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {filteredOffers.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No offers match your current filter. Paste a link above to add one!
              </div>
            ) : (
              groupedSections.map((section) => (
                <div key={section.id} style={{ marginBottom: '8px' }}>
                  {section.title && (
                    <div
                      style={{
                        padding: '4px 8px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: section.color || 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '4px',
                        margin: '6px 0 4px 0',
                        borderLeft: `3px solid ${section.color || 'var(--border-default)'}`,
                      }}
                    >
                      <span>{section.title}</span>
                      <span className="badge-pill">{section.items.length}</span>
                    </div>
                  )}

                  {section.items.map((offer) => {
                    const isSelected = offer.id === currentOffer?.id
                    const cat = domainCategories.find((c) => c.id === offer.category)

                    return (
                      <div
                        key={offer.id}
                        onClick={() => {
                          setSelectedOfferId(offer.id)
                          setMobilePane('detail')
                        }}
                        style={{
                          padding: '10px 12px',
                          marginBottom: '4px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--bg-surface-active)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--border-focus)' : offer.needsUserReview ? 'rgba(234, 179, 8, 0.25)' : 'transparent'}`,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                            {offer.company || 'Confidential Company'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {offer.createdAt && (
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  color: 'var(--text-tertiary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title={`Added on ${formatFullDate(offer.createdAt)}`}
                              >
                                <Clock size={9} />
                                <span>{formatInsertionDate(offer.createdAt)}</span>
                              </span>
                            )}
                            <span className={`badge-channel ${offer.channel}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                              {offer.channel === 'email' ? <Mail size={9} /> : offer.channel === 'direct_contact' ? <MessageSquare size={9} /> : <Globe size={9} />}
                              <span>{offer.channel === 'email' ? 'Email' : offer.channel === 'direct_contact' ? 'DM / WA' : 'ATS'}</span>
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {offer.title}
                        </div>

                        {/* Sharer / Recruiter tag */}
                        {(offer.sharer?.name || offer.recruiterName) && (
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: 'var(--text-secondary)',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <User size={10} style={{ color: '#38bdf8' }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {offer.sharer?.name || offer.recruiterName}
                              {offer.sharer?.title ? ` • ${offer.sharer.title}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Footer chips */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span
                              className="badge-category"
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                color: cat?.color || '#a1a1aa',
                                borderColor: cat?.borderColor || '#27272a',
                              }}
                            >
                              {cat?.shortLabel || offer.category}
                            </span>
                            {offer.needsUserReview && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  border: '1px solid rgba(234, 179, 8, 0.35)',
                                  color: '#facc15',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="AI classification pending your review"
                              >
                                <Sparkles size={8} />
                                <span>Review</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {offer.attachedCvTag && (
                              <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                                {offer.attachedCvTag.replace('CV - ', '')}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '9.5px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: offer.status === 'applied' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: offer.status === 'applied' ? '#10b981' : 'var(--text-tertiary)',
                                textTransform: 'capitalize',
                              }}
                            >
                              {offer.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT PANE: SELECTED OFFER ACTION HUB */}
        <main
          className={`command-inspector-pane ${mobilePane === 'list' ? 'mobile-hidden' : ''}`}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-app)',
            overflow: 'hidden',
          }}
        >
          {/* Mobile Back Button Bar */}
          <div
            className="mobile-back-bar"
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setMobilePane('list')}
            >
              ← Back to Offers List
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd' }}>
              {currentOffer?.company}
            </span>
          </div>

          {currentOffer ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* AI Categorization Review & Acceptance Banner */}
              {currentOffer.needsUserReview && (
                <div
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: '#27272a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                          AI Classified as:
                        </span>
                        <span
                          className="badge-category"
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            color: '#ffffff',
                            borderColor: '#3f3f46',
                            background: '#18181b',
                          }}
                        >
                          {currentCategory?.label || currentOffer.category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          ({Math.round((currentOffer.confidence || 0.9) * 100)}% certainty)
                        </span>
                      </div>
                      {currentOffer.categoryReasoning && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Rationale: {currentOffer.categoryReasoning}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Inline Change Domain select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Change:</span>
                      <select
                        className="form-select"
                        style={{ height: '30px', fontSize: '11px', background: 'var(--bg-surface)' }}
                        value={currentOffer.category}
                        onChange={(e) => {
                          const newCatId = e.target.value
                          const catObj = domainCategories.find((c) => c.id === newCatId)
                          const updated = {
                            ...currentOffer,
                            category: newCatId,
                            attachedCvTag: catObj?.defaultCvTag || currentOffer.attachedCvTag,
                            needsUserReview: false,
                            updatedAt: new Date().toISOString(),
                          }
                          onSaveOffer(updated)
                        }}
                      >
                        {domainCategories.filter((c) => c.id !== 'all').map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Accept button */}
                    <button
                      className="btn btn-primary"
                      style={{
                        height: '30px',
                        padding: '0 12px',
                        fontSize: '11.5px',
                        background: '#10b981',
                        borderColor: '#059669',
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        const updated = {
                          ...currentOffer,
                          needsUserReview: false,
                          updatedAt: new Date().toISOString(),
                        }
                        onSaveOffer(updated)
                        confetti({ particleCount: 30, spread: 45, origin: { y: 0.8 } })
                      }}
                    >
                      <Check size={13} />
                      <span>Accept Domain</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Offer Header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexShrink: 0,
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input
                      type="text"
                      value={currentOffer.title}
                      onChange={(e) => handleUpdateField('title', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '17px',
                        fontWeight: 700,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Company:</span>
                      <input
                        type="text"
                        value={currentOffer.company}
                        onChange={(e) => handleUpdateField('company', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#93c5fd',
                          fontWeight: 600,
                          fontSize: '12px',
                          outline: 'none',
                          width: '130px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Location:</span>
                      <input
                        type="text"
                        value={currentOffer.location}
                        onChange={(e) => handleUpdateField('location', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          outline: 'none',
                          width: '140px',
                        }}
                      />
                    </div>

                    {/* Date of Insertion */}
                    {currentOffer.createdAt && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--text-tertiary)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                        }}
                        title={`Inserted: ${currentOffer.createdAt}`}
                      >
                        <Clock size={11} style={{ color: '#94a3b8' }} />
                        <span>Added: {formatFullDate(currentOffer.createdAt)}</span>
                      </div>
                    )}

                    {currentOffer.sourceUrl && (
                      <a
                        href={currentOffer.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#38bdf8',
                          textDecoration: 'none',
                        }}
                      >
                        <span>View Source</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right controls: Domain Field, Channel, Status, Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Domain Field Switcher */}
                  <select
                    className="form-select"
                    style={{
                      height: '32px',
                      fontSize: '11px',
                      background: 'var(--bg-app)',
                      color: currentCategory?.color || 'var(--text-primary)',
                      borderColor: currentCategory?.borderColor || 'var(--border-default)',
                      fontWeight: 600,
                      maxWidth: '130px',
                    }}
                    value={currentOffer.category}
                    onChange={(e) => {
                      const newCatId = e.target.value
                      const catObj = domainCategories.find((c) => c.id === newCatId)
                      const updated = {
                        ...currentOffer,
                        category: newCatId,
                        attachedCvTag: catObj?.defaultCvTag || currentOffer.attachedCvTag,
                        needsUserReview: false,
                        updatedAt: new Date().toISOString(),
                      }
                      onSaveOffer(updated)
                    }}
                    title="Change Domain Field"
                  >
                    {domainCategories.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortLabel || c.label}
                      </option>
                    ))}
                  </select>

                  {/* Channel Switcher */}
                  <select
                    className="form-select"
                    style={{ height: '32px', fontSize: '11px', background: 'var(--bg-app)' }}
                    value={currentOffer.channel}
                    onChange={(e) => handleUpdateField('channel', e.target.value)}
                  >
                    <option value="email">Email</option>
                    <option value="direct_contact">DM / WA</option>
                    <option value="external">ATS Portal</option>
                  </select>

                  {/* Status Dropdown */}
                  <select
                    className="form-select"
                    style={{ height: '32px', fontSize: '11px', background: 'var(--bg-app)', fontWeight: 600 }}
                    value={currentOffer.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                  >
                    <option value="saved">Saved</option>
                    <option value="ready">Ready to apply</option>
                    <option value="applied">Applied</option>
                    <option value="replied">Replied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <button
                    className="btn btn-secondary"
                    style={{ height: '32px', padding: '0 8px', color: '#f87171' }}
                    onClick={() => {
                      if (confirm(`Delete offer "${currentOffer.title}"?`)) {
                        onDeleteOffer(currentOffer.id)
                      }
                    }}
                    title="Delete offer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Recruiter / Sharer Profile Card */}
              <div
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-app)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {(currentOffer.sharer?.name || currentOffer.recruiterName || 'R')[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Recruiter Name"
                        value={currentOffer.sharer?.name || currentOffer.recruiterName || ''}
                        onChange={(e) => handleUpdateSharer('name', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '12.5px',
                          outline: 'none',
                          width: '180px',
                        }}
                      />
                      {currentOffer.sharer?.phone && (
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Phone size={10} />
                          {currentOffer.sharer.phone}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Recruiter headline / role at company"
                      value={currentOffer.sharer?.title || ''}
                      onChange={(e) => handleUpdateSharer('title', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        fontSize: '11px',
                        outline: 'none',
                        width: '320px',
                      }}
                    />
                  </div>
                </div>

                {/* Recruiter Quick Action Launchers */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(currentOffer.sharer?.profileUrl || currentOffer.sourceUrl) && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '28px', padding: '0 8px', fontSize: '11px', color: '#ffffff' }}
                      onClick={handleOpenLinkedIn}
                    >
                      <Share2 size={11} />
                      <span>LinkedIn Profile</span>
                    </button>
                  )}

                  {currentOffer.sharer?.phone && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '28px', padding: '0 8px', fontSize: '11px', color: '#4ade80' }}
                      onClick={handleOpenWhatsApp}
                    >
                      <Phone size={11} />
                      <span>WhatsApp Launcher</span>
                    </button>
                  )}

                  {currentOffer.recruiterEmail && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                      onClick={() => handleCopy(currentOffer.recruiterEmail, 'recruiterEmail')}
                    >
                      {copiedKey === 'recruiterEmail' ? <Check size={11} /> : <Copy size={11} />}
                      <span>{currentOffer.recruiterEmail}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Outreach Hub Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                  background: 'var(--bg-surface)',
                  padding: '6px 16px 0 16px',
                  borderBottom: '1px solid var(--border-default)',
                  flexShrink: 0,
                }}
              >
                <button
                  className={`tab-btn ${inspectorTab === 'email' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('email')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Mail size={13} />
                  <span>Email Outreach</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'direct' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('direct')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageSquare size={13} />
                  <span>Direct Contact (LinkedIn / WA)</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'cover' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('cover')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={13} />
                  <span>Cover Letter & ATS</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'flyer' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('flyer')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ImageIcon size={13} />
                  <span>Post Flyer & Raw Text</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'copilot' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('copilot')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}
                >
                  <Bot size={13} />
                  <span>Groq AI Copilot</span>
                </button>
              </div>

              {/* Outreach Tab Content (Scrollable) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
                {/* 1. EMAIL OUTREACH TAB */}
                {inspectorTab === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
                    {/* CV Vault binding */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-surface)',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Matched CV Variant:</span>
                        <select
                          className="form-select"
                          style={{ height: '30px', fontSize: '11.5px', background: 'var(--bg-app)' }}
                          value={currentOffer.attachedCvTag || ''}
                          onChange={(e) => handleUpdateField('attachedCvTag', e.target.value)}
                        >
                          {cvList.map((cv) => (
                            <option key={cv.id} value={cv.name}>
                              {cv.name}
                            </option>
                          ))}
                          <option value="CV - Général Ingénieur">CV - Général Ingénieur</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" onClick={handleDownloadEml}>
                          <Download size={13} />
                          <span>Download .EML</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleCopy(`${emailDraftSubject}\n\n${emailDraftBody}`, 'copyEmailAll')}
                        >
                          {copiedKey === 'copyEmailAll' ? <Check size={13} /> : <Copy size={13} />}
                          <span>Copy for Gmail</span>
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleUpdateStatus('applied')}
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Applied</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipient and Subject */}
                    <div className="form-group">
                      <label className="form-label">Recipient Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recruteur@entreprise.com"
                        value={currentOffer.recruiterEmail || ''}
                        onChange={(e) => handleUpdateField('recruiterEmail', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Subject Line</label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer' }}
                          onClick={() => handleCopy(emailDraftSubject, 'subject')}
                        >
                          {copiedKey === 'subject' ? 'Copied!' : 'Copy Subject'}
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        value={emailDraftSubject}
                        onChange={(e) => handleUpdateField('customEmailSubject', e.target.value)}
                      />
                    </div>

                    {/* Email Body */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Email Body (Tailored & Editable)</label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer' }}
                          onClick={() => handleCopy(emailDraftBody, 'body')}
                        >
                          {copiedKey === 'body' ? 'Copied Body!' : 'Copy Body'}
                        </button>
                      </div>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '260px', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.6 }}
                        value={emailDraftBody}
                        onChange={(e) => handleUpdateField('customEmailBody', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 2. DIRECT CONTACT TAB (LinkedIn & WhatsApp) */}
                {inspectorTab === 'direct' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '820px' }}>
                    {/* LinkedIn Connection Note (<300 chars) */}
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        padding: '16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            LinkedIn Connection Request Note
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Personalized invitation note strictly under LinkedIn's 300 character limit.
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: linkedInNote.length > 300 ? '#f87171' : '#34d399',
                              fontWeight: 600,
                            }}
                          >
                            {linkedInNote.length} / 300 chars
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleCopy(linkedInNote, 'liNote')}
                          >
                            {copiedKey === 'liNote' ? <Check size={12} /> : <Copy size={12} />}
                            <span>Copy Note</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={linkedInNote}
                        onChange={(e) => handleUpdateField('linkedInNote', e.target.value)}
                        style={{ fontSize: '12.5px', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* WhatsApp Direct Message */}
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        padding: '16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            WhatsApp Direct Outreach Pitch
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Crisp, professional mobile pitch for recruiters who provided phone / WhatsApp contact.
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleCopy(whatsAppMessage, 'waPitch')}
                          >
                            {copiedKey === 'waPitch' ? <Check size={12} /> : <Copy size={12} />}
                            <span>Copy Text</span>
                          </button>
                          {currentOffer.sharer?.phone && (
                            <button className="btn btn-primary" onClick={handleOpenWhatsApp}>
                              <Phone size={12} />
                              <span>Launch WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={whatsAppMessage}
                        onChange={(e) => handleUpdateField('whatsAppMsg', e.target.value)}
                        style={{ fontSize: '12.5px', lineHeight: 1.5 }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. COVER LETTER & ATS TAB */}
                {inspectorTab === 'cover' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-surface)',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Tailored Cover Letter
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Formatted according to classic engineering standards. Generates vector PDF via jsPDF.
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {currentOffer.sourceUrl && (
                          <a
                            href={currentOffer.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none' }}
                          >
                            <Globe size={13} />
                            <span>Open Portal Link</span>
                          </a>
                        )}
                        <button className="btn btn-secondary" onClick={() => handleCopy(coverLetterBody, 'coverLetter')}>
                          {copiedKey === 'coverLetter' ? <Check size={13} /> : <Copy size={13} />}
                          <span>Copy Text</span>
                        </button>
                        <button className="btn btn-primary" onClick={handleDownloadPdf}>
                          <Download size={13} />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Paper Document Preview */}
                    <div className="latex-paper" style={{ minHeight: '340px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em' }}>
                          {(candidateProfile.fullName || 'Khalil').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '3px' }}>
                          {[candidateProfile.email, candidateProfile.phone, candidateProfile.city].filter(Boolean).join(' • ')}
                        </div>
                      </div>

                      <div style={{ fontSize: '11.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1f2937' }}>
                        {coverLetterBody}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. FLYER & RAW TEXT TAB */}
                {inspectorTab === 'flyer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
                    {/* Flyer Image */}
                    {currentOffer.imageUrl ? (
                      <div
                        style={{
                          background: 'var(--bg-surface)',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={currentOffer.imageUrl}
                          alt="Offer Flyer"
                          style={{
                            maxHeight: '360px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '24px',
                          background: 'var(--bg-surface)',
                          borderRadius: '6px',
                          border: '1px dashed var(--border-default)',
                          textAlign: 'center',
                          color: 'var(--text-tertiary)',
                          fontSize: '12px',
                        }}
                      >
                        No image flyer attached for this offer. You can paste an image URL in the header or edit fields.
                      </div>
                    )}

                    {/* Skills Tags */}
                    {currentOffer.skills && currentOffer.skills.length > 0 && (
                      <div>
                        <div className="form-label" style={{ marginBottom: '6px' }}>
                          Extracted Tech Skills & Keywords
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {currentOffer.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#1e293b',
                                color: '#93c5fd',
                                border: '1px solid #334155',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Raw Post Text */}
                    <div className="form-group">
                      <label className="form-label">Full Raw Post Content</label>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '220px', fontSize: '12px', lineHeight: 1.55 }}
                        value={currentOffer.description || ''}
                        onChange={(e) => handleUpdateField('description', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 5. GROQ AI COPILOT TAB */}
                {inspectorTab === 'copilot' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '6px',
                        padding: '14px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Bot size={16} style={{ color: '#ffffff' }} />
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          Groq AI Career Copilot ({aiConfig.model || 'openai/gpt-oss-120b'})
                        </span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                        High-speed Groq agent. Rewrite emails, translate, extract interview questions, or sharpen your pitch.
                      </p>
                    </div>

                    {/* Quick Prompt Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Make the cold email much punchier, confident, and under 120 words.')}
                      >
                        ⚡ Punchy cold email (&lt;120 words)
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Translate the outreach email and LinkedIn pitch to professional English.')}
                      >
                        🌐 Translate to English
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Highlight my specific NLP and PyTorch experience in the email body.')}
                      >
                        🧠 Highlight NLP / PyTorch
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Generate 5 technical interview questions likely to be asked for this exact role.')}
                      >
                        🎯 5 Technical Interview Questions
                      </button>
                    </div>

                    {/* Copilot Prompt Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, height: '38px', fontSize: '12.5px' }}
                        placeholder="Type any custom instruction or question for this offer..."
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRunCopilot()
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRunCopilot()}
                        disabled={isCopilotLoading || !copilotPrompt.trim()}
                        style={{ height: '38px', padding: '0 16px' }}
                      >
                        {isCopilotLoading ? <RefreshCw size={13} className="pulse-glow" /> : <Send size={13} />}
                        <span>Ask AI</span>
                      </button>
                    </div>

                    {/* Output Box */}
                    {copilotOutput && (
                      <div
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '6px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
                            Groq Output
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ height: '26px', fontSize: '10.5px' }}
                              onClick={() => handleCopy(copilotOutput, 'copilotOut')}
                            >
                              {copiedKey === 'copilotOut' ? <Check size={11} /> : <Copy size={11} />}
                              <span>Copy</span>
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ height: '26px', fontSize: '10.5px', color: '#38bdf8' }}
                              onClick={handleApplyCopilotToEmail}
                            >
                              <span>Apply as Email Body</span>
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '12.5px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {copilotOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PRIVATE NOTES (Always present at bottom of any tab) */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', maxWidth: '820px' }}>
                  <label className="form-label">Private Notes & Action Log</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. Sent message to recruiter Alexandre; follow-up scheduled for Tuesday..."
                    value={currentOffer.notes || ''}
                    onChange={(e) => handleUpdateField('notes', e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-tertiary)',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <FileText size={32} />
              <span>Select an offer on the left or paste a link above to get started</span>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

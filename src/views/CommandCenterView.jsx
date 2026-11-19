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
        { id: 'email', label: 'Direct Email Outreach', color: '#ffffff' },
        { id: 'direct_contact', label: 'Direct Contact (DM & WhatsApp)', color: '#ffffff' },
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
      .replace(/\[ATTACHED_CV\]/g, currentOffer.attachedCvTag || 'Resume')
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Candidate')
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone || '')
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn || '')
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString('en-US'))
  }, [currentOffer, candidateProfile])

  // Interpolated Email Subject
  const emailDraftSubject = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customEmailSubject) return currentOffer.customEmailSubject
    return `Application: ${currentOffer.title} - ${candidateProfile.fullName || 'Applicant'}`
  }, [currentOffer, candidateProfile])

  // Interpolated Cover Letter Body
  const coverLetterBody = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customCoverLetter) return currentOffer.customCoverLetter
    const tpl = COVER_LETTER_TEMPLATES[0]
    const skillsText = (currentOffer.skills || []).join(', ') || candidateProfile.skills || 'software systems'

    return tpl.defaultText
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Candidate')
  }, [currentOffer, candidateProfile])

  // Direct Contact notes
  const linkedInNote = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.linkedInNote) return currentOffer.linkedInNote
    const firstName = currentOffer.sharer?.name ? currentOffer.sharer.name.split(' ')[0] : ''
    const greeting = firstName ? `Hi ${firstName}` : 'Hello'
    return `${greeting}, I noticed your opening for "${currentOffer.title}" at ${currentOffer.company} and would love to connect and discuss how my background aligns with your team.`
  }, [currentOffer])

  const whatsAppMessage = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.whatsAppMsg) return currentOffer.whatsAppMsg
    return `Hi ${currentOffer.sharer?.name || ''}, I am reaching out regarding the ${currentOffer.title} position at ${currentOffer.company}. Would you be open for a brief conversation? ${candidateProfile.fullName || ''}`
  }, [currentOffer, candidateProfile])

  // Download .eml file
  const handleDownloadEml = () => {
    if (!currentOffer) return
    EmlGenerator.downloadEml({
      to: currentOffer.recruiterEmail || 'recruiter@company.com',
      subject: emailDraftSubject,
      body: emailDraftBody,
      candidateName: candidateProfile.fullName || 'Candidate',
      candidateEmail: candidateProfile.email || 'applicant@radar.ai',
      cvFileName: `${(currentOffer.attachedCvTag || 'Resume').replace(/\s+/g, '_')}.pdf`,
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

  const handleDumpClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        if (!text || !text.trim()) {
          alert('Your clipboard is empty! Copy a LinkedIn link, job post, or text first.')
          return
        }
        setIngestInput(text.trim())
        onQuickIngest(text.trim())
      } else {
        alert('Clipboard API is not supported in this browser context.')
      }
    } catch (e) {
      alert(`Could not access clipboard: ${e.message}`)
    }
  }

  return (
    <div className="workspace-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', padding: 0, gap: 0, minWidth: 0, minHeight: 0 }}>
      {/* 1. UNIVERSAL INGESTION HERO BAR */}
      <section
        style={{
          background: '#0D0D0E',
          borderBottom: '1px solid #1F1F23',
          padding: '14px 22px',
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleTriggerIngest} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '120px',
                height: '44px',
                fontSize: '13.5px',
                background: '#121215',
                borderColor: '#27272A',
                color: '#FFFFFF',
                borderRadius: '8px',
              }}
              placeholder="Paste LinkedIn post link, Indeed URL, or raw job text to ingest with Groq AI..."
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              disabled={isIngesting}
            />
            <LinkIcon
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717A',
              }}
            />
            <button
              type="button"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onClick={() => setShowExtendedIngest(!showExtendedIngest)}
            >
              <span>{showExtendedIngest ? 'Less options' : '+ Paste flyer / text'}</span>
              <ChevronDown size={13} style={{ transform: showExtendedIngest ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>

          {/* Dump Clipboard Button */}
          <button
            type="button"
            onClick={handleDumpClipboard}
            disabled={isIngesting}
            style={{
              height: '44px',
              padding: '0 16px',
              backgroundColor: '#1E1414',
              borderColor: '#FF3B30',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: '#FF3B30',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isIngesting ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Dump whatever is currently copied on your clipboard and process with Groq AI"
          >
            <span>📥</span>
            <span>Dump Clipboard</span>
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: '44px',
              padding: '0 20px',
              backgroundColor: '#FF3B30',
              borderColor: '#FF3B30',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isIngesting || !ingestInput.trim() ? 'not-allowed' : 'pointer',
              opacity: isIngesting || !ingestInput.trim() ? 0.6 : 1,
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
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
        {/* LEFT PANE: OFFERS STREAM (470px wide on desktop, executive & spacious) */}
        <aside
          className={`command-master-pane ${mobilePane === 'detail' ? 'mobile-hidden' : ''}`}
          style={{
            width: '470px',
            borderRight: '1px solid #1F1F23',
            background: '#0B0B0D',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Channel Filters */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid #1F1F23',
              display: 'flex',
              gap: '8px',
              background: '#0E0E12',
              alignItems: 'center',
              overflowX: 'auto',
            }}
          >
            <button
              className={`pill-btn ${activeChannelFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('all')}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                borderRadius: '6px',
                backgroundColor: activeChannelFilter === 'all' ? '#1E1414' : '#141418',
                borderColor: activeChannelFilter === 'all' ? '#FF3B30' : '#27272A',
                color: activeChannelFilter === 'all' ? '#FF3B30' : '#A1A1AA',
              }}
            >
              <span>All</span>
              <span className="badge-pill" style={{ backgroundColor: activeChannelFilter === 'all' ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{offers.length}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'email' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('email')}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                borderRadius: '6px',
                backgroundColor: activeChannelFilter === 'email' ? '#1E1414' : '#141418',
                borderColor: activeChannelFilter === 'email' ? '#FF3B30' : '#27272A',
                color: activeChannelFilter === 'email' ? '#FF3B30' : '#A1A1AA',
              }}
            >
              <Mail size={13} />
              <span>Email</span>
              <span className="badge-pill" style={{ backgroundColor: activeChannelFilter === 'email' ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{emailOffersCount}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'direct_contact' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('direct_contact')}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                borderRadius: '6px',
                backgroundColor: activeChannelFilter === 'direct_contact' ? '#1E1414' : '#141418',
                borderColor: activeChannelFilter === 'direct_contact' ? '#FF3B30' : '#27272A',
                color: activeChannelFilter === 'direct_contact' ? '#FF3B30' : '#A1A1AA',
              }}
            >
              <MessageSquare size={13} />
              <span>DM / WA</span>
              <span className="badge-pill" style={{ backgroundColor: activeChannelFilter === 'direct_contact' ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{directOffersCount}</span>
            </button>
            <button
              className={`pill-btn ${activeChannelFilter === 'external' ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter('external')}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                borderRadius: '6px',
                backgroundColor: activeChannelFilter === 'external' ? '#1E1414' : '#141418',
                borderColor: activeChannelFilter === 'external' ? '#FF3B30' : '#27272A',
                color: activeChannelFilter === 'external' ? '#FF3B30' : '#A1A1AA',
              }}
            >
              <Globe size={13} />
              <span>ATS</span>
              <span className="badge-pill" style={{ backgroundColor: activeChannelFilter === 'external' ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{externalOffersCount}</span>
            </button>

            {clips && clips.some((c) => !c.convertedToOffer && (c.contentType === 'job_offer' || /stage|pfe|recrute|hiring|candidat|poste|cdi|internship|job/i.test(c.content || ''))) && onSyncClips && (
              <button
                className="pill-btn"
                onClick={onSyncClips}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center',
                  background: '#27272A',
                  borderColor: '#3F3F46',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  borderRadius: '6px',
                }}
                title="Sync captured job offers from clipboard vault into channels"
              >
                <Zap size={12} color="#FF3B30" />
                <span>Sync</span>
              </button>
            )}
          </div>

          {/* Search Bar & Export CSV */}
          <div
            style={{
              padding: '14px 18px 10px 18px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                style={{
                  width: '100%',
                  height: '38px',
                  fontSize: '13px',
                  paddingLeft: '34px',
                  background: '#121215',
                  borderColor: '#27272A',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
                placeholder="Search opportunities, skills, recruiter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }}
              />
            </div>
            <a
              href="/api/offers/export/csv"
              className="btn btn-secondary"
              style={{
                height: '38px',
                padding: '0 12px',
                fontSize: '12px',
                color: '#FFFFFF',
                borderColor: '#27272A',
                background: '#141418',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 700,
              }}
              title="Export all offers to CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </a>
          </div>

          {/* Domain Taxonomy Section Inside the Command Center */}
          <div
            style={{
              padding: '10px 18px',
              borderBottom: '1px solid #1F1F23',
              background: '#0D0D10',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              flexShrink: 0,
            }}
          >
            <button
              className={`pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                backgroundColor: categoryFilter === 'all' ? '#1E1414' : '#141418',
                borderColor: categoryFilter === 'all' ? '#FF3B30' : '#27272A',
                color: categoryFilter === 'all' ? '#FF3B30' : '#A1A1AA',
              }}
            >
              <span>All Domains</span>
              <span className="badge-pill" style={{ backgroundColor: categoryFilter === 'all' ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{offers.length}</span>
            </button>

            {domainCategories.filter((c) => c.id !== 'all').map((cat) => {
              const count = offers.filter((o) => o.category === cat.id).length
              const isActive = categoryFilter === cat.id
              return (
                <button
                  key={cat.id}
                  className={`pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(isActive ? 'all' : cat.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    backgroundColor: isActive ? '#1E1414' : '#141418',
                    borderColor: isActive ? '#FF3B30' : '#27272A',
                    color: isActive ? '#FF3B30' : '#A1A1AA',
                  }}
                  title={`Filter by ${cat.label}`}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: cat.color || '#A1A1AA',
                    }}
                  />
                  <span>{cat.shortLabel || cat.label}</span>
                  {count > 0 && <span className="badge-pill" style={{ backgroundColor: isActive ? '#FF3B30' : '#27272A', color: '#FFFFFF' }}>{count}</span>}
                </button>
              )
            })}

            {onOpenCategoryManager && (
              <button
                type="button"
                onClick={onOpenCategoryManager}
                style={{
                  background: 'transparent',
                  border: '1px dashed #3F3F46',
                  color: '#A1A1AA',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
                title="Configure Engineering Domains"
              >
                <Plus size={11} />
                <span>Domain</span>
              </button>
            )}
          </div>

          {/* Grouping Row */}
          <div
            style={{
              padding: '8px 18px 10px 18px',
              borderBottom: '1px solid #1F1F23',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#71717A',
            }}
          >
            <span>Showing {filteredOffers.length} opportunities</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Group:</span>
              <select
                className="form-select"
                style={{ height: '30px', fontSize: '11.5px', padding: '0 8px', background: '#141418', borderColor: '#27272A', color: '#FFFFFF', width: 'auto', borderRadius: '6px' }}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="none">Off</option>
                <option value="channel">Channel</option>
                <option value="category">Domain</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Stream List with Categorized Groupings */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {filteredOffers.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#71717A', fontSize: '13px' }}>
                No opportunities match your filter. Paste a link or dump clipboard above!
              </div>
            ) : (
              groupedSections.map((section) => (
                <div key={section.id} style={{ marginBottom: '12px' }}>
                  {section.title && (
                    <div
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: section.color || '#A1A1AA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px',
                        margin: '8px 0 6px 0',
                        borderLeft: `3px solid ${section.color || '#FF3B30'}`,
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
                          padding: '14px 16px',
                          marginBottom: '10px',
                          borderRadius: '10px',
                          background: isSelected ? '#1B1718' : '#111114',
                          border: `1px solid ${isSelected ? '#FF3B30' : '#232328'}`,
                          borderLeft: isSelected ? '4px solid #FF3B30' : '1px solid #232328',
                          boxShadow: isSelected ? '0 4px 16px rgba(255, 59, 48, 0.12)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#FF3B30' : '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {offer.company || 'Confidential Company'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {offer.createdAt && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  color: '#71717A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title={`Added on ${formatFullDate(offer.createdAt)}`}
                              >
                                <Clock size={10} />
                                <span>{formatInsertionDate(offer.createdAt)}</span>
                              </span>
                            )}
                            <span className={`badge-channel ${offer.channel}`} style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px' }}>
                              {offer.channel === 'email' ? <Mail size={10} /> : offer.channel === 'direct_contact' ? <MessageSquare size={10} /> : <Globe size={10} />}
                              <span>{offer.channel === 'email' ? 'Email' : offer.channel === 'direct_contact' ? 'DM / WA' : 'ATS'}</span>
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '14.5px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            marginBottom: '6px',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {offer.title}
                        </div>

                        {/* Sharer / Recruiter tag */}
                        {(offer.sharer?.name || offer.recruiterName) && (
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: '#71717A',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <User size={11} style={{ color: '#FF3B30' }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {offer.sharer?.name || offer.recruiterName}
                              {offer.sharer?.title ? ` • ${offer.sharer.title}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Footer chips */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span
                              className="badge-category"
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                color: cat?.color || '#A1A1AA',
                                borderColor: cat?.borderColor || '#27272A',
                                background: '#16161B',
                                fontWeight: 600,
                              }}
                            >
                              {cat?.shortLabel || offer.category}
                            </span>
                            {offer.needsUserReview && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  border: '1px solid rgba(234, 179, 8, 0.35)',
                                  color: '#FACC15',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="AI classification pending your review"
                              >
                                <Sparkles size={9} />
                                <span>Review</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {offer.attachedCvTag && (
                              <span style={{ fontSize: '10.5px', color: '#71717A', fontFamily: 'var(--font-mono)' }}>
                                {offer.attachedCvTag.replace('CV - ', '')}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                background: offer.status === 'applied' ? 'rgba(16, 185, 129, 0.15)' : offer.status === 'offer' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: offer.status === 'applied' ? '#10B981' : offer.status === 'offer' ? '#FF3B30' : '#A1A1AA',
                                border: `1px solid ${offer.status === 'applied' ? 'rgba(16, 185, 129, 0.3)' : offer.status === 'offer' ? 'rgba(255, 59, 48, 0.3)' : '#27272A'}`,
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
            minWidth: 0,
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
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
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
                        <span style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>
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
                        background: '#ffffff',
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

              {/* Offer Header (Spacious Executive Cockpit) */}
              <div
                style={{
                  padding: '20px 28px',
                  borderBottom: '1px solid #1F1F24',
                  background: '#0F0F13',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexShrink: 0,
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={currentOffer.title}
                      onChange={(e) => handleUpdateField('title', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 800,
                        width: '100%',
                        outline: 'none',
                        letterSpacing: '-0.02em',
                      }}
                      placeholder="Opportunity Role Title"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#A1A1AA', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#71717A', fontWeight: 600 }}>Company:</span>
                      <input
                        type="text"
                        value={currentOffer.company}
                        onChange={(e) => handleUpdateField('company', e.target.value)}
                        style={{
                          background: '#16161C',
                          border: '1px solid #27272A',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#FF3B30',
                          fontWeight: 700,
                          fontSize: '13px',
                          outline: 'none',
                          minWidth: '150px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#71717A', fontWeight: 600 }}>Location:</span>
                      <input
                        type="text"
                        value={currentOffer.location}
                        onChange={(e) => handleUpdateField('location', e.target.value)}
                        style={{
                          background: '#16161C',
                          border: '1px solid #27272A',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#E4E4E7',
                          fontSize: '13px',
                          outline: 'none',
                          minWidth: '160px',
                        }}
                      />
                    </div>

                    {/* Date of Insertion */}
                    {currentOffer.createdAt && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#71717A',
                          fontSize: '12px',
                          fontFamily: 'var(--font-mono)',
                        }}
                        title={`Inserted: ${currentOffer.createdAt}`}
                      >
                        <Clock size={12} style={{ color: '#A1A1AA' }} />
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
                          gap: '5px',
                          color: '#FFFFFF',
                          background: '#1E1E24',
                          border: '1px solid #2E2E36',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        <span>Target Posting</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right controls: Domain Field, Channel, Status, Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {/* Domain Field Switcher */}
                  <select
                    className="form-select"
                    style={{
                      height: '36px',
                      fontSize: '12px',
                      background: '#16161C',
                      color: currentCategory?.color || '#FFFFFF',
                      borderColor: '#27272A',
                      fontWeight: 700,
                      borderRadius: '6px',
                      padding: '0 10px',
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
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Channel Switcher */}
                  <select
                    className="form-select"
                    style={{ height: '36px', fontSize: '12px', background: '#16161C', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '6px', padding: '0 10px', fontWeight: 600 }}
                    value={currentOffer.channel}
                    onChange={(e) => handleUpdateField('channel', e.target.value)}
                  >
                    <option value="email">✉️ Email Channel</option>
                    <option value="direct_contact">💬 DM / WA</option>
                    <option value="external">🌐 ATS Portal</option>
                  </select>

                  {/* Status Dropdown */}
                  <select
                    className="form-select"
                    style={{
                      height: '36px',
                      fontSize: '12px',
                      background: '#1A0F0F',
                      borderColor: '#FF3B30',
                      color: '#FF3B30',
                      fontWeight: 700,
                      borderRadius: '6px',
                      padding: '0 10px',
                    }}
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
                    style={{ height: '36px', padding: '0 10px', color: '#FF3B30', borderColor: '#27272A', borderRadius: '6px', background: '#16161C' }}
                    onClick={() => {
                      if (confirm(`Delete offer "${currentOffer.title}"?`)) {
                        onDeleteOffer(currentOffer.id)
                      }
                    }}
                    title="Delete offer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Recruiter / Sharer Profile Card */}
              <div
                style={{
                  padding: '14px 28px',
                  background: '#111116',
                  borderBottom: '1px solid #1F1F24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#181820',
                      border: '1px solid #FF3B30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF3B30',
                      fontWeight: 800,
                      fontSize: '16px',
                    }}
                  >
                    {(currentOffer.sharer?.name || currentOffer.recruiterName || 'R')[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Recruiter Name"
                        value={currentOffer.sharer?.name || currentOffer.recruiterName || ''}
                        onChange={(e) => handleUpdateSharer('name', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '14.5px',
                          outline: 'none',
                          minWidth: '200px',
                        }}
                      />
                      {currentOffer.sharer?.phone && (
                        <span style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Phone size={12} />
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
                        color: '#A1A1AA',
                        fontSize: '12px',
                        outline: 'none',
                        minWidth: '340px',
                      }}
                    />
                  </div>
                </div>

                {/* Recruiter Quick Action Launchers */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(currentOffer.sharer?.profileUrl || currentOffer.sourceUrl) && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '34px', padding: '0 12px', fontSize: '12px', color: '#FFFFFF', background: '#181820', borderColor: '#27272A', borderRadius: '6px', fontWeight: 600 }}
                      onClick={handleOpenLinkedIn}
                    >
                      <Share2 size={13} color="#0A66C2" />
                      <span>LinkedIn Profile</span>
                    </button>
                  )}

                  {currentOffer.sharer?.phone && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '34px', padding: '0 12px', fontSize: '12px', color: '#10B981', background: '#0F1E16', borderColor: '#10B981', borderRadius: '6px', fontWeight: 700 }}
                      onClick={handleOpenWhatsApp}
                    >
                      <Phone size={13} />
                      <span>Launch WhatsApp</span>
                    </button>
                  )}

                  {currentOffer.recruiterEmail && (
                    <button
                      className="btn btn-secondary"
                      style={{ height: '34px', padding: '0 12px', fontSize: '12px', background: '#181820', borderColor: '#27272A', borderRadius: '6px', color: '#FFFFFF', fontWeight: 600 }}
                      onClick={() => handleCopy(currentOffer.recruiterEmail, 'recruiterEmail')}
                    >
                      {copiedKey === 'recruiterEmail' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                      <span>{currentOffer.recruiterEmail}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Outreach Hub Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: '#0F0F13',
                  padding: '8px 28px 0 28px',
                  borderBottom: '1px solid #1F1F24',
                  flexShrink: 0,
                }}
              >
                <button
                  className={`tab-btn ${inspectorTab === 'email' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('email')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <Mail size={14} />
                  <span>Email Outreach</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'direct' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('direct')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <MessageSquare size={14} />
                  <span>Direct Contact (LinkedIn / WA)</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'cover' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('cover')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <FileText size={14} />
                  <span>Cover Letter & ATS</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'flyer' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('flyer')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <ImageIcon size={14} />
                  <span>Post Flyer & Raw Text</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'copilot' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('copilot')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '10px 16px', color: '#FF3B30' }}
                >
                  <Bot size={14} />
                  <span>Groq AI Copilot</span>
                </button>
              </div>

              {/* Outreach Tab Content (Scrollable & Expansive) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {/* 1. EMAIL OUTREACH TAB */}
                {inspectorTab === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
                    {/* CV Vault binding */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#121217',
                        padding: '12px 18px',
                        borderRadius: '8px',
                        border: '1px solid #27272A',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA' }}>Matched CV Variant:</span>
                        <select
                          className="form-select"
                          style={{ height: '34px', fontSize: '12px', background: '#181820', borderColor: '#3F3F46', color: '#FFFFFF', borderRadius: '6px' }}
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

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }} onClick={handleDownloadEml}>
                          <Download size={13} />
                          <span>Export .EML</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }}
                          onClick={() => handleCopy(`${emailDraftSubject}\n\n${emailDraftBody}`, 'copyEmailAll')}
                        >
                          {copiedKey === 'copyEmailAll' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                          <span>Copy for Gmail</span>
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ height: '36px', fontSize: '12px', borderRadius: '6px', background: '#10B981', borderColor: '#10B981', color: '#FFFFFF', fontWeight: 700 }}
                          onClick={() => handleUpdateStatus('applied')}
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Applied</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipient and Subject */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>Recipient Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recruteur@entreprise.com"
                        style={{ height: '42px', fontSize: '13.5px', background: '#121217', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '8px' }}
                        value={currentOffer.recruiterEmail || ''}
                        onChange={(e) => handleUpdateField('recruiterEmail', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>Subject Line</label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleCopy(emailDraftSubject, 'subject')}
                        >
                          {copiedKey === 'subject' ? '✓ Copied!' : 'Copy Subject'}
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '42px', fontSize: '13.5px', background: '#121217', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '8px' }}
                        value={emailDraftSubject}
                        onChange={(e) => handleUpdateField('customEmailSubject', e.target.value)}
                      />
                    </div>

                    {/* Email Body */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>Email Body (Personalized & Editable)</label>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleCopy(emailDraftBody, 'body')}
                        >
                          {copiedKey === 'body' ? '✓ Copied Body!' : 'Copy Body'}
                        </button>
                      </div>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '300px', fontFamily: 'var(--font-sans)', fontSize: '14px', lineHeight: 1.65, background: '#121217', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '8px', padding: '16px' }}
                        value={emailDraftBody}
                        onChange={(e) => handleUpdateField('customEmailBody', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 2. DIRECT CONTACT TAB (LinkedIn & WhatsApp) */}
                {inspectorTab === 'direct' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '100%' }}>
                    {/* LinkedIn Connection Note (<300 chars) */}
                    <div
                      style={{
                        background: '#121217',
                        padding: '18px',
                        borderRadius: '8px',
                        border: '1px solid #27272A',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
                            LinkedIn Connection Request Note
                          </div>
                          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                            Personalized invitation note strictly under LinkedIn's 300 character limit.
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                              color: linkedInNote.length > 300 ? '#FF3B30' : '#10B981',
                              fontWeight: 700,
                            }}
                          >
                            {linkedInNote.length} / 300 chars
                          </span>
                          <button
                            className="btn btn-secondary"
                            style={{ height: '34px', fontSize: '12px', borderRadius: '6px' }}
                            onClick={() => handleCopy(linkedInNote, 'liNote')}
                          >
                            {copiedKey === 'liNote' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                            <span>Copy Note</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={linkedInNote}
                        onChange={(e) => handleUpdateField('linkedInNote', e.target.value)}
                        style={{ fontSize: '13.5px', lineHeight: 1.6, background: '#16161C', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '8px', padding: '12px' }}
                      />
                    </div>

                    {/* WhatsApp Direct Message */}
                    <div
                      style={{
                        background: '#121217',
                        padding: '18px',
                        borderRadius: '8px',
                        border: '1px solid #27272A',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
                            WhatsApp Direct Outreach Pitch
                          </div>
                          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                            Crisp, professional mobile pitch for recruiters who provided phone / WhatsApp contact.
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ height: '34px', fontSize: '12px', borderRadius: '6px' }}
                            onClick={() => handleCopy(whatsAppMessage, 'waPitch')}
                          >
                            {copiedKey === 'waPitch' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                            <span>Copy Text</span>
                          </button>
                          {currentOffer.sharer?.phone && (
                            <button className="btn btn-primary" style={{ height: '34px', fontSize: '12px', borderRadius: '6px', background: '#10B981', borderColor: '#10B981', color: '#FFFFFF', fontWeight: 700 }} onClick={handleOpenWhatsApp}>
                              <Phone size={13} />
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
                        style={{ fontSize: '13.5px', lineHeight: 1.6, background: '#16161C', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '8px', padding: '12px' }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. COVER LETTER & ATS TAB */}
                {inspectorTab === 'cover' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#121217',
                        padding: '14px 20px',
                        borderRadius: '8px',
                        border: '1px solid #27272A',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                          Tailored Cover Letter
                        </div>
                        <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                          Formatted according to classic engineering standards. Generates vector PDF via jsPDF.
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {currentOffer.sourceUrl && (
                          <a
                            href={currentOffer.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none', height: '36px', fontSize: '12px', borderRadius: '6px' }}
                          >
                            <Globe size={13} />
                            <span>Open Portal Link</span>
                          </a>
                        )}
                        <button className="btn btn-secondary" style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }} onClick={() => handleCopy(coverLetterBody, 'coverLetter')}>
                          {copiedKey === 'coverLetter' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                          <span>Copy Text</span>
                        </button>
                        <button className="btn btn-primary" style={{ height: '36px', fontSize: '12px', borderRadius: '6px', background: '#FF3B30', borderColor: '#FF3B30', color: '#FFFFFF', fontWeight: 700 }} onClick={handleDownloadPdf}>
                          <Download size={13} />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Paper Document Preview */}
                    <div className="latex-paper" style={{ minHeight: '360px', padding: '28px', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px' }}>
                        <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.04em' }}>
                          {(candidateProfile.fullName || 'Candidate Name').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
                          {[candidateProfile.email, candidateProfile.phone, candidateProfile.city].filter(Boolean).join(' • ')}
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#1f2937' }}>
                        {coverLetterBody}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. FLYER & RAW TEXT TAB */}
                {inspectorTab === 'flyer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
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
                                color: '#ffffff',
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
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
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
                              style={{ height: '26px', fontSize: '10.5px', color: '#ffffff' }}
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

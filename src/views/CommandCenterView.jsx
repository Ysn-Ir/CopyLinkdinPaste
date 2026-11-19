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
  Star,
  ShieldCheck,
  Play,
  Settings,
  X,
  Terminal,
  Cpu,
  ArrowUpRight,
  CheckSquare,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { CATEGORIES, APPLICATION_STATUSES } from '../data/categories.js'
import { EMAIL_TEMPLATES, COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'
import { EmlGenerator } from '../services/emlGenerator.js'
import { PdfGenerator } from '../services/pdfGenerator.js'
import { AiService } from '../services/aiService.js'
import { N8nService } from '../services/n8nService.js'

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
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  } catch (e) {
    return ''
  }
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', {
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
    return categories && categories.length > 0 ? categories : CATEGORIES
  }, [categories])

  // Selection & 3-Pane Navigation States
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id || null)
  const [activeChannelFilter, setActiveChannelFilter] = useState(initialChannelFilter) // 'all' | 'email' | 'direct_contact' | 'external' | 'high_fit'
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'fit' | 'company'
  const [mobilePane, setMobilePane] = useState('list') // 'list' | 'detail' for responsive screens

  // Top Ingestion Input
  const [ingestInput, setIngestInput] = useState('')
  const [showExtendedIngest, setShowExtendedIngest] = useState(false)
  const [ingestFlyerUrl, setIngestFlyerUrl] = useState('')

  // Active Studio Tab in Pane 3
  const [inspectorTab, setInspectorTab] = useState('email') // 'email' | 'direct' | 'cover' | 'n8n' | 'flyer' | 'copilot'
  const [copiedKey, setCopiedKey] = useState(null)

  // n8n Automation Engine State
  const [n8nConfig, setN8nConfig] = useState({
    webhookAts: '',
    webhookEmail: '',
    webhookWhatsApp: '',
    webhookFullCycle: '',
    isEnabled: true,
  })
  const [isN8nRunning, setIsN8nRunning] = useState(false)
  const [n8nStatusMessage, setN8nStatusMessage] = useState(null)
  const [n8nLastResult, setN8nLastResult] = useState(null)
  const [showN8nConfigModal, setShowN8nConfigModal] = useState(false)
  const [n8nTemplates, setN8nTemplates] = useState([])

  // Load n8n configurations and templates on mount
  useEffect(() => {
    N8nService.getConfig().then((cfg) => {
      if (cfg) setN8nConfig(cfg)
    })
    N8nService.getTemplates().then((tpls) => {
      if (tpls && tpls.length > 0) setN8nTemplates(tpls)
    })
  }, [])

  // Sync category filter
  useEffect(() => {
    if (initialCategoryFilter) {
      setCategoryFilter(initialCategoryFilter)
    }
  }, [initialCategoryFilter])

  // Sync channel filter
  useEffect(() => {
    if (initialChannelFilter) {
      setActiveChannelFilter(initialChannelFilter)
    }
  }, [initialChannelFilter])

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

  // Automatically adapt tab on offer change
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

  // Live filter and sort computation
  const filteredOffers = useMemo(() => {
    return offers
      .filter((o) => {
        // Channel
        if (activeChannelFilter === 'high_fit') {
          if ((o.fitScore || 0) < 80) return false
        } else if (activeChannelFilter !== 'all' && o.channel !== activeChannelFilter) {
          return false
        }
        // Category / Domain
        if (categoryFilter !== 'all' && o.category !== categoryFilter) {
          return false
        }
        // Pipeline Stage
        if (statusFilter !== 'all' && o.status !== statusFilter) {
          return false
        }
        // Search query
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
      .sort((a, b) => {
        if (sortBy === 'fit') {
          return (b.fitScore || 0) - (a.fitScore || 0)
        }
        if (sortBy === 'company') {
          return (a.company || '').localeCompare(b.company || '')
        }
        // 'newest' default:
        const tA = new Date(a.createdAt || 0).getTime()
        const tB = new Date(b.createdAt || 0).getTime()
        return tB - tA
      })
  }, [offers, activeChannelFilter, categoryFilter, statusFilter, searchQuery, sortBy])

  // Channel counts
  const emailOffersCount = useMemo(() => offers.filter((o) => o.channel === 'email').length, [offers])
  const directOffersCount = useMemo(() => offers.filter((o) => o.channel === 'direct_contact').length, [offers])
  const externalOffersCount = useMemo(() => offers.filter((o) => o.channel === 'external').length, [offers])
  const highFitOffersCount = useMemo(() => offers.filter((o) => (o.fitScore || 0) >= 80).length, [offers])

  // Top Ingestion Handlers
  const handleTriggerIngest = async (e) => {
    e?.preventDefault()
    if (!ingestInput.trim() || isIngesting) return
    const input = ingestInput.trim()
    setIngestInput('')
    setShowExtendedIngest(false)
    await onQuickIngest(input)
  }

  const handleDumpClipboard = async () => {
    try {
      let text = ''
      if (typeof window !== 'undefined' && window.radarNative?.dumpClipboard) {
        text = await window.radarNative.dumpClipboard()
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText()
      }
      if (!text || !text.trim()) {
        alert('Your clipboard is empty! Copy a LinkedIn job URL, post, or text first.')
        return
      }
      setIngestInput(text.trim())
      await onQuickIngest(text.trim())
    } catch (e) {
      alert(`Could not access clipboard: ${e.message}`)
    }
  }

  // Offer updates
  const handleUpdateStatus = (newStatus) => {
    if (!currentOffer) return
    const updated = { ...currentOffer, status: newStatus, updatedAt: new Date().toISOString() }
    onSaveOffer(updated)
    if (newStatus === 'applied' || newStatus === 'offer') {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } })
    }
  }

  const handleUpdateField = (key, val) => {
    if (!currentOffer) return
    const updated = { ...currentOffer, [key]: val, updatedAt: new Date().toISOString() }
    onSaveOffer(updated)
  }

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

  // Dynamic LinkedIn Search URLs
  const companyLinkedInUrl = useMemo(() => {
    if (currentOffer?.companyLinkedInUrl) return currentOffer.companyLinkedInUrl
    if (currentOffer?.company) {
      return `https://www.linkedin.com/company/${encodeURIComponent(currentOffer.company.toLowerCase().replace(/[^a-z0-9]/g, ''))}`
    }
    return 'https://www.linkedin.com'
  }, [currentOffer])

  const recruiterSearchUrl = useMemo(() => {
    if (currentOffer?.recruiterSearchUrl) return currentOffer.recruiterSearchUrl
    const query = currentOffer?.company ? `recruiter ${currentOffer.company}` : 'talent acquisition'
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`
  }, [currentOffer])

  // Interpolated Email Body
  const emailDraftBody = useMemo(() => {
    if (!currentOffer) return ''
    if (currentOffer.customEmailBody) return currentOffer.customEmailBody
    const tpl = EMAIL_TEMPLATES[0]
    const skillsText = (currentOffer.skills || []).join(', ') || candidateProfile.skills || 'AI, Machine Learning & Software Systems'
    const cat = domainCategories.find((c) => c.id === currentOffer.category)

    return tpl.body
      .replace(/\[RECIPIENT_NAME\]/g, currentOffer.sharer?.name || currentOffer.recruiterName || 'Hiring Team')
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[DOMAIN\]/g, cat?.label || 'Software Engineering')
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[ATTACHED_CV\]/g, currentOffer.attachedCvTag || 'Resume')
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName || 'Candidate')
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone || '')
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn || '')
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString('en-US'))
  }, [currentOffer, candidateProfile, domainCategories])

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
    const skillsText = (currentOffer.skills || []).join(', ') || candidateProfile.skills || 'modern software engineering principles'

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

  // Download / Launch .eml file
  const handleDownloadEml = async () => {
    if (!currentOffer) return
    const payload = {
      to: currentOffer.recruiterEmail || 'recruiter@company.com',
      subject: emailDraftSubject,
      body: emailDraftBody,
      candidateName: candidateProfile.fullName || 'Candidate',
      candidateEmail: candidateProfile.email || 'applicant@radar.ai',
      cvFileName: `${(currentOffer.attachedCvTag || 'Resume').replace(/\s+/g, '_')}.pdf`,
    }

    if (typeof window !== 'undefined' && window.radarNative?.launchEml) {
      const res = await window.radarNative.launchEml(payload)
      if (res?.success) {
        window.radarNative.showNotification?.('Mail Client Launched', `Draft opened for ${currentOffer.title}`)
        return
      }
    }
    EmlGenerator.downloadEml(payload)
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

  // Launch WhatsApp
  const handleOpenWhatsApp = () => {
    const rawPhone = currentOffer?.sharer?.phone || currentOffer?.recruiterPhone
    if (!rawPhone) return
    const phone = rawPhone.replace(/[^0-9]/g, '')
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
        systemPrompt: `You are an elite career intelligence copilot for RADAR. Current context: Title: "${currentOffer.title}", Company: "${currentOffer.company}", Location: "${currentOffer.location}", Skills: ${JSON.stringify(currentOffer.skills)}, Sharer: "${currentOffer.sharer?.name || 'Recruiter'}". Candidate: "${candidateProfile.fullName}", Degree: "${candidateProfile.degree}".`,
        config: aiConfig,
      })
      setCopilotOutput(result)
    } catch (err) {
      setCopilotOutput(`[Error calling Groq API]: ${err.message}`)
    } finally {
      setIsCopilotLoading(false)
    }
  }

  const handleApplyCopilotToEmail = () => {
    if (!copilotOutput) return
    handleUpdateField('customEmailBody', copilotOutput)
    setInspectorTab('email')
    setCopilotOutput('')
  }

  // n8n Trigger Execution Handler
  const handleTriggerN8n = async (workflowType = 'full_cycle') => {
    if (!currentOffer || isN8nRunning) return
    setIsN8nRunning(true)
    setN8nStatusMessage(`Dispatching ${workflowType} to n8n webhook...`)

    try {
      const result = await N8nService.triggerWorkflow({
        workflowType,
        offer: currentOffer,
        candidateProfile,
      })

      setN8nLastResult({
        workflowType,
        timestamp: new Date().toLocaleTimeString(),
        ...result,
      })

      if (result.success) {
        setN8nStatusMessage(`✓ Workflow ${workflowType} dispatched successfully!`)
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } })
        if (typeof window !== 'undefined' && window.radarNative?.showNotification) {
          window.radarNative.showNotification('n8n Cycle Executed', `Triggered ${workflowType} for ${currentOffer.title}`)
        }
      } else {
        setN8nStatusMessage(`Workflow queued (Mock/Local mode active)`)
      }
    } catch (err) {
      setN8nStatusMessage(`n8n Trigger Failed: ${err.message}`)
    } finally {
      setIsN8nRunning(false)
      setTimeout(() => setN8nStatusMessage(null), 5000)
    }
  }

  // Download n8n Template JSON
  const handleDownloadN8nTemplate = (tpl) => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tpl.schema, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `${tpl.id}_workflow.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      confetti({ particleCount: 25, spread: 45 })
    } catch (e) {
      alert('Failed downloading template: ' + e.message)
    }
  }

  return (
    <div
      className="workspace-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        padding: 0,
        gap: 0,
        minWidth: 0,
        minHeight: 0,
        backgroundColor: '#09090B',
      }}
    >
      {/* 1. UNIVERSAL INGESTION HERO BAR */}
      <section
        style={{
          background: '#0B0B0E',
          borderBottom: '1px solid #1F1F24',
          padding: '12px 24px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
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
                height: '42px',
                fontSize: '13.5px',
                background: '#121217',
                borderColor: '#27272A',
                color: '#FFFFFF',
                borderRadius: '8px',
              }}
              placeholder="Paste LinkedIn post link, Indeed job URL, or raw job text to ingest with Groq AI..."
              value={ingestInput}
              onChange={(e) => setIngestInput(e.target.value)}
              disabled={isIngesting}
            />
            <LinkIcon
              size={15}
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
              <span>{showExtendedIngest ? 'Less options' : '+ Flyer / text'}</span>
              <ChevronDown size={13} style={{ transform: showExtendedIngest ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>

          {/* Quick Dump Clipboard Button */}
          <button
            type="button"
            onClick={handleDumpClipboard}
            disabled={isIngesting}
            style={{
              height: '42px',
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
              fontSize: '12.5px',
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

          {/* Ingest with Groq Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: '42px',
              padding: '0 20px',
              backgroundColor: '#FF3B30',
              borderColor: '#FF3B30',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: isIngesting || !ingestInput.trim() ? 'not-allowed' : 'pointer',
              opacity: isIngesting || !ingestInput.trim() ? 0.6 : 1,
              borderRadius: '8px',
              whiteSpace: 'nowrap',
            }}
            disabled={isIngesting || !ingestInput.trim()}
          >
            {isIngesting ? <RefreshCw size={14} className="pulse-glow" /> : <Zap size={14} />}
            <span>{isIngesting ? 'Ingesting...' : 'Ingest with Groq'}</span>
          </button>
        </form>

        {/* Extended Ingestion Drawer */}
        {showExtendedIngest && (
          <div
            style={{
              padding: '12px 16px',
              background: '#121217',
              borderRadius: '8px',
              border: '1px solid #27272A',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11.5px', color: '#A1A1AA', fontWeight: 600 }}>
              Optional: Attach Flyer Image URL to currently selected opportunity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Image Flyer URL (e.g. https://media.licdn.com/...)"
                value={ingestFlyerUrl}
                onChange={(e) => setIngestFlyerUrl(e.target.value)}
                style={{ height: '36px', fontSize: '12px', background: '#181820', borderColor: '#2E2E36', color: '#FFFFFF' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => {
                  if (ingestFlyerUrl && currentOffer) {
                    handleUpdateField('imageUrl', ingestFlyerUrl)
                    setIngestFlyerUrl('')
                    setShowExtendedIngest(false)
                  }
                }}
              >
                <ImageIcon size={13} />
                <span>Attach Flyer</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. THE 3-PANE EXECUTIVE COCKPIT WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* ======================================================== */}
        {/* PANE 1: TRIAGE & CHANNELS SIDEBAR (Width: 240px)          */}
        {/* ======================================================== */}
        <nav
          className="command-pane-triage"
          style={{
            width: '240px',
            background: '#0B0B0E',
            borderRight: '1px solid #1E1E24',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '14px 12px',
            gap: '18px',
          }}
        >
          {/* Quick Clipboard Ingestion Pill */}
          <button
            type="button"
            onClick={handleDumpClipboard}
            disabled={isIngesting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#1A0F0F',
              border: '1px solid #FF3B30',
              color: '#FF3B30',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Dump whatever is in your clipboard directly into Groq AI"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📥</span>
              <span>Dump Clipboard</span>
            </div>
            <span style={{ fontSize: '10px', background: 'rgba(255, 59, 48, 0.2)', padding: '1px 5px', borderRadius: '4px' }}>
              Alt+V
            </span>
          </button>

          {/* Section: Channels */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#71717A',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
                paddingLeft: '6px',
              }}
            >
              Channels & Routing
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                className={`sidebar-nav-btn ${activeChannelFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveChannelFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeChannelFilter === 'all' ? '#1E1414' : 'transparent',
                  color: activeChannelFilter === 'all' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: activeChannelFilter === 'all' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Layers size={13} />
                  <span>All Signals</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeChannelFilter === 'all' ? '#FF3B30' : '#1C1C22',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {offers.length}
                </span>
              </button>

              <button
                className={`sidebar-nav-btn ${activeChannelFilter === 'email' ? 'active' : ''}`}
                onClick={() => setActiveChannelFilter('email')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeChannelFilter === 'email' ? '#1E1414' : 'transparent',
                  color: activeChannelFilter === 'email' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: activeChannelFilter === 'email' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Mail size={13} />
                  <span>Direct Email</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeChannelFilter === 'email' ? '#FF3B30' : '#1C1C22',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {emailOffersCount}
                </span>
              </button>

              <button
                className={`sidebar-nav-btn ${activeChannelFilter === 'direct_contact' ? 'active' : ''}`}
                onClick={() => setActiveChannelFilter('direct_contact')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeChannelFilter === 'direct_contact' ? '#1E1414' : 'transparent',
                  color: activeChannelFilter === 'direct_contact' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: activeChannelFilter === 'direct_contact' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <MessageSquare size={13} />
                  <span>DM & WhatsApp</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeChannelFilter === 'direct_contact' ? '#FF3B30' : '#1C1C22',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {directOffersCount}
                </span>
              </button>

              <button
                className={`sidebar-nav-btn ${activeChannelFilter === 'external' ? 'active' : ''}`}
                onClick={() => setActiveChannelFilter('external')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeChannelFilter === 'external' ? '#1E1414' : 'transparent',
                  color: activeChannelFilter === 'external' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: activeChannelFilter === 'external' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Globe size={13} />
                  <span>ATS Portals</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeChannelFilter === 'external' ? '#FF3B30' : '#1C1C22',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {externalOffersCount}
                </span>
              </button>

              <button
                className={`sidebar-nav-btn ${activeChannelFilter === 'high_fit' ? 'active' : ''}`}
                onClick={() => setActiveChannelFilter('high_fit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeChannelFilter === 'high_fit' ? '#1E1414' : 'transparent',
                  color: activeChannelFilter === 'high_fit' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: activeChannelFilter === 'high_fit' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Star size={13} color="#F59E0B" />
                  <span>High Fit (80%+)</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeChannelFilter === 'high_fit' ? '#FF3B30' : '#1C1C22',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {highFitOffersCount}
                </span>
              </button>
            </div>
          </div>

          {/* Section: Engineering Domains */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                paddingLeft: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#71717A',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Engineering Domain
              </span>
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF3B30',
                    fontSize: '10.5px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  title="Configure Domains"
                >
                  + Edit
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <button
                className={`sidebar-nav-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: categoryFilter === 'all' ? '#1E1414' : 'transparent',
                  color: categoryFilter === 'all' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: categoryFilter === 'all' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>All Domains</span>
                <span style={{ fontSize: '11px', color: '#71717A' }}>{offers.length}</span>
              </button>

              {domainCategories
                .filter((c) => c.id !== 'all')
                .map((cat) => {
                  const count = offers.filter((o) => o.category === cat.id).length
                  const isActive = categoryFilter === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(isActive ? 'all' : cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? '#1E1414' : 'transparent',
                        color: isActive ? '#FF3B30' : '#A1A1AA',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: cat.color || '#A1A1AA',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cat.shortLabel || cat.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#71717A' }}>{count}</span>
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Section: Pipeline Stage */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#71717A',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
                paddingLeft: '6px',
              }}
            >
              Pipeline Stage
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'all' ? '#1E1414' : 'transparent',
                  color: statusFilter === 'all' ? '#FF3B30' : '#A1A1AA',
                  fontWeight: statusFilter === 'all' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>All Stages</span>
                <span style={{ fontSize: '11px', color: '#71717A' }}>{offers.length}</span>
              </button>

              {APPLICATION_STATUSES.map((st) => {
                const count = offers.filter((o) => o.status === st.id).length
                const isActive = statusFilter === st.id
                return (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(isActive ? 'all' : st.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#1E1414' : 'transparent',
                      color: isActive ? '#FF3B30' : '#A1A1AA',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: st.color || '#A1A1AA',
                        }}
                      />
                      <span>{st.label}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#71717A' }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Automation Engine (n8n Cycle) */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#121217',
              border: '1px solid #27272A',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} color="#FF3B30" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  n8n ENGINE
                </span>
              </div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                }}
              >
                LIVE
              </span>
            </div>
            <p style={{ fontSize: '10.5px', color: '#71717A', margin: 0, lineHeight: 1.4 }}>
              Autonomous ATS checking, email dispatching & WhatsApp queues via n8n.
            </p>
            <button
              type="button"
              onClick={() => {
                setInspectorTab('n8n')
                if (mobilePane === 'list') setMobilePane('detail')
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                background: '#181820',
                border: '1px solid #2E2E36',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Cpu size={12} color="#FF3B30" />
              <span>Open Automation Hub</span>
            </button>
          </div>

          {/* Bottom Utility Tools */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px' }}>
            <a
              href="/api/offers/export/csv"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px',
                borderRadius: '6px',
                background: '#141418',
                border: '1px solid #27272A',
                color: '#A1A1AA',
                fontSize: '11.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              title="Download full offers dataset in CSV format"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </a>

            {clips && clips.some((c) => !c.convertedToOffer) && onSyncClips && (
              <button
                type="button"
                onClick={onSyncClips}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px',
                  borderRadius: '6px',
                  background: '#141418',
                  border: '1px solid #27272A',
                  color: '#FF3B30',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Sync all captured vault clips to pipeline offers"
              >
                <Zap size={12} />
                <span>Sync Captured Clips</span>
              </button>
            )}
          </div>
        </nav>

        {/* ======================================================== */}
        {/* PANE 2: OPPORTUNITY STREAM & CARD DECK (Width: 440px)     */}
        {/* ======================================================== */}
        <aside
          className={`command-master-pane ${mobilePane === 'detail' ? 'mobile-hidden' : ''}`}
          style={{
            width: '440px',
            background: '#0E0E12',
            borderRight: '1px solid #1E1E24',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Deck Search and Sort Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #1F1F24',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              background: '#0B0B0E',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                style={{
                  width: '100%',
                  height: '36px',
                  fontSize: '12.5px',
                  paddingLeft: '32px',
                  background: '#14141A',
                  borderColor: '#27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                }}
                placeholder="Search role, company, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#71717A',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#71717A',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: '36px',
                fontSize: '11.5px',
                padding: '0 8px',
                background: '#14141A',
                borderColor: '#27272A',
                color: '#A1A1AA',
                borderRadius: '6px',
                width: 'auto',
                fontWeight: 600,
              }}
              title="Sort opportunities"
            >
              <option value="newest">Newest</option>
              <option value="fit">Best Fit</option>
              <option value="company">Company</option>
            </select>
          </div>

          {/* Active Filter Counter Strip */}
          <div
            style={{
              padding: '6px 16px',
              fontSize: '11px',
              color: '#71717A',
              borderBottom: '1px solid #18181E',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0D0D11',
            }}
          >
            <span>
              Showing <strong style={{ color: '#FFFFFF' }}>{filteredOffers.length}</strong> opportunities
            </span>
            {activeChannelFilter !== 'all' && (
              <span style={{ color: '#FF3B30', fontWeight: 600 }}>
                Filter: {activeChannelFilter}
              </span>
            )}
          </div>

          {/* Cards Stream Deck */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {filteredOffers.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#71717A', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📡</div>
                No opportunities found matching your filters.
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleDumpClipboard}
                    style={{
                      background: '#1E1414',
                      border: '1px solid #FF3B30',
                      color: '#FF3B30',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    📥 Dump Clipboard Now
                  </button>
                </div>
              </div>
            ) : (
              filteredOffers.map((offer) => {
                const isSelected = offer.id === currentOffer?.id
                const cat = domainCategories.find((c) => c.id === offer.category)
                const fitScore = offer.fitScore || 85

                return (
                  <div
                    key={offer.id}
                    onClick={() => {
                      setSelectedOfferId(offer.id)
                      setMobilePane('detail')
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: isSelected ? '#1B1718' : '#111115',
                      border: `1px solid ${isSelected ? '#FF3B30' : '#212126'}`,
                      borderLeft: isSelected ? '4px solid #FF3B30' : '1px solid #212126',
                      boxShadow: isSelected ? '0 4px 16px rgba(255, 59, 48, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                    }}
                  >
                    {/* Top Row: Company Initial + Name + Channel Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: '#181820',
                            border: '1px solid #27272A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FF3B30',
                            fontWeight: 800,
                            fontSize: '11px',
                            flexShrink: 0,
                          }}
                        >
                          {(offer.company || 'C')[0]?.toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isSelected ? '#FF3B30' : '#A1A1AA',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {offer.company || 'Confidential'}
                        </span>
                      </div>

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
                        <span
                          className={`badge-channel ${offer.channel}`}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {offer.channel === 'email' ? '✉️ Email' : offer.channel === 'direct_contact' ? '💬 WA' : '🌐 ATS'}
                        </span>
                      </div>
                    </div>

                    {/* Role Title */}
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {offer.title}
                    </div>

                    {/* Recruiter / Lead preview if present */}
                    {(offer.sharer?.name || offer.recruiterName) && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#8A8A93',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <User size={11} style={{ color: '#FF3B30', flexShrink: 0 }} />
                        <span>
                          {offer.sharer?.name || offer.recruiterName}
                          {offer.sharer?.title ? ` • ${offer.sharer.title}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Footer Row: Domain Chip + Fit Score + Status Badge + Quick n8n Trigger */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            color: cat?.color || '#A1A1AA',
                            background: '#16161C',
                            border: '1px solid #27272A',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cat?.shortLabel || offer.category || 'Tech'}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38BDF8',
                            fontWeight: 700,
                          }}
                          title="Computed ATS & Profile Match"
                        >
                          ⭐ {fitScore}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Status Advancement Pill */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            const nextMap = {
                              saved: 'ready',
                              ready: 'applied',
                              applied: 'interview',
                              interview: 'offer',
                              offer: 'saved',
                              rejected: 'saved',
                            }
                            const next = nextMap[offer.status] || 'applied'
                            const updated = { ...offer, status: next, updatedAt: new Date().toISOString() }
                            onSaveOffer(updated)
                            if (next === 'applied' || next === 'offer') {
                              confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } })
                            }
                          }}
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background:
                              offer.status === 'applied'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : offer.status === 'offer'
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color:
                              offer.status === 'applied'
                                ? '#10B981'
                                : offer.status === 'offer'
                                ? '#FF3B30'
                                : '#A1A1AA',
                            border: `1px solid ${
                              offer.status === 'applied'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : offer.status === 'offer'
                                ? 'rgba(255, 59, 48, 0.3)'
                                : '#27272A'
                            }`,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                          }}
                          title="Click to cycle next stage"
                        >
                          {offer.status}
                        </span>

                        {/* Quick n8n trigger right from card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOfferId(offer.id)
                            handleTriggerN8n('full_cycle')
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            background: '#1A0F0F',
                            border: '1px solid #FF3B30',
                            color: '#FF3B30',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          title="Run 1-Click n8n Complete Cycle for this opportunity"
                        >
                          <Zap size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* PANE 3: TACTICAL EXECUTION STUDIO (Flex 1 - Spacious)    */}
        {/* ======================================================== */}
        <main
          className={`command-inspector-pane ${mobilePane === 'list' ? 'mobile-hidden' : ''}`}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#09090B',
            overflow: 'hidden',
          }}
        >
          {/* Mobile Back Button */}
          <div
            className="mobile-back-bar"
            style={{
              padding: '8px 16px',
              borderBottom: '1px solid #1F1F24',
              background: '#0E0E12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
              onClick={() => setMobilePane('list')}
            >
              ← Back to Stream
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>
              {currentOffer?.company}
            </span>
          </div>

          {currentOffer ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Top Banner: Status or Feedback */}
              {n8nStatusMessage && (
                <div
                  style={{
                    padding: '8px 24px',
                    background: '#181015',
                    borderBottom: '1px solid #FF3B30',
                    color: '#FF3B30',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={14} className={isN8nRunning ? 'pulse-glow' : ''} />
                  <span>{n8nStatusMessage}</span>
                </div>
              )}

              {/* Master Header: Title + Company + Location + Date + Actions */}
              <div
                style={{
                  padding: '20px 28px',
                  borderBottom: '1px solid #1F1F24',
                  background: '#0D0D11',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexShrink: 0,
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ marginBottom: '6px' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: '#A1A1AA', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#71717A', fontWeight: 600 }}>Company:</span>
                      <input
                        type="text"
                        value={currentOffer.company}
                        onChange={(e) => handleUpdateField('company', e.target.value)}
                        style={{
                          background: '#14141A',
                          border: '1px solid #27272A',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#FF3B30',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          outline: 'none',
                          minWidth: '140px',
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
                          background: '#14141A',
                          border: '1px solid #27272A',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#E4E4E7',
                          fontSize: '12.5px',
                          outline: 'none',
                          minWidth: '140px',
                        }}
                      />
                    </div>

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
                      >
                        <Clock size={12} style={{ color: '#A1A1AA' }} />
                        <span>Added: {formatInsertionDate(currentOffer.createdAt)}</span>
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
                          background: '#1A1A22',
                          border: '1px solid #2E2E36',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '11.5px',
                        }}
                      >
                        <span>Target Posting</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Master Controls: 1-Click n8n Full Cycle + Stage + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {/* 1-Click Complete n8n Cycle Trigger */}
                  <button
                    type="button"
                    onClick={() => handleTriggerN8n('full_cycle')}
                    disabled={isN8nRunning}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      backgroundColor: '#FF3B30',
                      borderColor: '#FF3B30',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: isN8nRunning ? 'not-allowed' : 'pointer',
                      borderRadius: '6px',
                      boxShadow: '0 2px 10px rgba(255, 59, 48, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Run external ATS check + draft email + WhatsApp prep in one coordinated n8n cycle"
                  >
                    <Zap size={14} className={isN8nRunning ? 'pulse-glow' : ''} />
                    <span>{isN8nRunning ? 'Running n8n Cycle...' : 'Run n8n Complete Cycle'}</span>
                  </button>

                  {/* Stage Switcher */}
                  <select
                    className="form-select"
                    style={{
                      height: '38px',
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

                  {/* Delete */}
                  <button
                    className="btn btn-secondary"
                    style={{
                      height: '38px',
                      padding: '0 10px',
                      color: '#FF3B30',
                      borderColor: '#27272A',
                      borderRadius: '6px',
                      background: '#14141A',
                    }}
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

              {/* Recruiter / Lead Command Strip */}
              <div
                style={{
                  padding: '12px 28px',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#181820',
                      border: '1px solid #FF3B30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF3B30',
                      fontWeight: 800,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {(currentOffer.sharer?.name || currentOffer.recruiterName || 'R')[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Recruiter / Contact Name"
                        value={currentOffer.sharer?.name || currentOffer.recruiterName || ''}
                        onChange={(e) => handleUpdateSharer('name', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '13.5px',
                          outline: 'none',
                          minWidth: '180px',
                        }}
                      />
                      {(currentOffer.recruiterEmail || currentOffer.sharer?.email) && (
                        <span
                          onClick={() =>
                            handleCopy(currentOffer.recruiterEmail || currentOffer.sharer?.email, 'recruiterEmailTop')
                          }
                          style={{
                            fontSize: '11px',
                            color: '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                          title="Click to copy verified recruiter email"
                        >
                          <Mail size={11} />
                          <span>{currentOffer.recruiterEmail || currentOffer.sharer?.email}</span>
                          {copiedKey === 'recruiterEmailTop' ? <Check size={10} /> : <Copy size={10} />}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Recruiter headline / role (e.g. Senior Tech Recruiter)"
                      value={currentOffer.sharer?.title || ''}
                      onChange={(e) => handleUpdateSharer('title', e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#8A8A93',
                        fontSize: '11.5px',
                        outline: 'none',
                        minWidth: '280px',
                      }}
                    />
                  </div>
                </div>

                {/* Contact Action Launchers */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Recruiter LinkedIn profile if available */}
                  {(currentOffer.sharer?.profileUrl || currentOffer.sourceUrl) && (
                    <button
                      className="btn btn-secondary"
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        color: '#FFFFFF',
                        background: '#181820',
                        borderColor: '#27272A',
                        borderRadius: '6px',
                        fontWeight: 600,
                      }}
                      onClick={handleOpenLinkedIn}
                      title="Open Recruiter LinkedIn Profile"
                    >
                      <Share2 size={12} color="#0A66C2" />
                      <span>LinkedIn Profile</span>
                    </button>
                  )}

                  {/* Search Recruiters on LinkedIn */}
                  <a
                    href={recruiterSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      fontSize: '11.5px',
                      color: '#0A66C2',
                      background: 'rgba(10, 102, 194, 0.1)',
                      border: '1px solid rgba(10, 102, 194, 0.3)',
                      borderRadius: '6px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      textDecoration: 'none',
                    }}
                    title={`Find recruiters at ${currentOffer.company} on LinkedIn`}
                  >
                    <Search size={12} />
                    <span>Find Recruiters</span>
                  </a>

                  {/* WhatsApp launcher if phone available */}
                  {(currentOffer.sharer?.phone || currentOffer.recruiterPhone) && (
                    <button
                      className="btn btn-secondary"
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        color: '#10B981',
                        background: '#0F1E16',
                        borderColor: '#10B981',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                      onClick={handleOpenWhatsApp}
                    >
                      <Phone size={12} />
                      <span>Launch WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tactical Studio Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: '#0D0D11',
                  padding: '6px 28px 0 28px',
                  borderBottom: '1px solid #1F1F24',
                  flexShrink: 0,
                  overflowX: 'auto',
                }}
              >
                <button
                  className={`tab-btn ${inspectorTab === 'email' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('email')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <Mail size={13} />
                  <span>Email Outreach</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'direct' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('direct')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp & DM</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'cover' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('cover')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <FileText size={13} />
                  <span>ATS & Tailored CV</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'n8n' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('n8n')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    padding: '10px 16px',
                    color: inspectorTab === 'n8n' ? '#FF3B30' : '#A1A1AA',
                  }}
                >
                  <Zap size={13} color="#FF3B30" />
                  <span>n8n Workflows</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'flyer' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('flyer')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <ImageIcon size={13} />
                  <span>Job Spec & Flyer</span>
                </button>
                <button
                  className={`tab-btn ${inspectorTab === 'copilot' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('copilot')}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, padding: '10px 16px' }}
                >
                  <Bot size={13} />
                  <span>Groq AI Copilot</span>
                </button>
              </div>

              {/* Studio Content Area (Scrollable & Spacious) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {/* 1. EMAIL OUTREACH TAB */}
                {inspectorTab === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
                    {/* CV Selector and Action Strip */}
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
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA' }}>Matched Resume:</span>
                        <select
                          className="form-select"
                          style={{
                            height: '34px',
                            fontSize: '12px',
                            background: '#181820',
                            borderColor: '#3F3F46',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                          }}
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

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Launch .eml (Native Electron or Web) */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '34px', fontSize: '12px', borderRadius: '6px' }}
                          onClick={handleDownloadEml}
                        >
                          <Download size={13} />
                          <span>Launch .EML</span>
                        </button>

                        {/* Copy for Gmail */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '34px', fontSize: '12px', borderRadius: '6px' }}
                          onClick={() => handleCopy(`${emailDraftSubject}\n\n${emailDraftBody}`, 'copyEmailAll')}
                        >
                          {copiedKey === 'copyEmailAll' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                          <span>Copy for Gmail</span>
                        </button>

                        {/* Dispatch via n8n */}
                        <button
                          type="button"
                          onClick={() => handleTriggerN8n('email_dispatch')}
                          disabled={isN8nRunning}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '6px',
                            background: '#1A0F0F',
                            border: '1px solid #FF3B30',
                            color: '#FF3B30',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Zap size={12} />
                          <span>Dispatch via n8n</span>
                        </button>

                        {/* Mark Applied */}
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            height: '34px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            background: '#10B981',
                            borderColor: '#10B981',
                            color: '#FFFFFF',
                            fontWeight: 700,
                          }}
                          onClick={() => handleUpdateStatus('applied')}
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Applied</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipient Email */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                        Recipient Email
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recruiter@company.com"
                        style={{ height: '40px', fontSize: '13px', background: '#121217', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '8px' }}
                        value={currentOffer.recruiterEmail || ''}
                        onChange={(e) => handleUpdateField('recruiterEmail', e.target.value)}
                      />
                    </div>

                    {/* Subject Line */}
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
                        style={{ height: '40px', fontSize: '13px', background: '#121217', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '8px' }}
                        value={emailDraftSubject}
                        onChange={(e) => handleUpdateField('customEmailSubject', e.target.value)}
                      />
                    </div>

                    {/* Email Body */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                          Email Body (Tailored & Editable)
                        </label>
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
                        style={{
                          minHeight: '260px',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '13.5px',
                          lineHeight: 1.65,
                          background: '#121217',
                          borderColor: '#27272A',
                          color: '#F4F4F5',
                          borderRadius: '8px',
                          padding: '16px',
                        }}
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
                        rows={3}
                        value={linkedInNote}
                        onChange={(e) => handleUpdateField('linkedInNote', e.target.value)}
                        style={{ fontSize: '13px', lineHeight: 1.6, background: '#16161C', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '8px', padding: '12px' }}
                      />
                    </div>

                    {/* WhatsApp Direct Outreach Message */}
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
                            Direct pitch for recruiters who provided telephone contact or mobile WhatsApp.
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
                          <button
                            type="button"
                            onClick={() => handleTriggerN8n('whatsapp_dispatch')}
                            disabled={isN8nRunning}
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              background: '#0F1E16',
                              border: '1px solid #10B981',
                              color: '#10B981',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Zap size={12} />
                            <span>Queue via n8n</span>
                          </button>
                          {(currentOffer.sharer?.phone || currentOffer.recruiterPhone) && (
                            <button
                              className="btn btn-primary"
                              style={{ height: '34px', fontSize: '12px', borderRadius: '6px', background: '#10B981', borderColor: '#10B981', color: '#FFFFFF', fontWeight: 700 }}
                              onClick={handleOpenWhatsApp}
                            >
                              <Phone size={13} />
                              <span>Launch WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={whatsAppMessage}
                        onChange={(e) => handleUpdateField('whatsAppMsg', e.target.value)}
                        style={{ fontSize: '13px', lineHeight: 1.6, background: '#16161C', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '8px', padding: '12px' }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. ATS & TAILORED COVER LETTER TAB */}
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
                          ATS Keyword Match & Vector Cover Letter
                        </div>
                        <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                          Formatted according to classic engineering standards. Generates vector PDF via jsPDF.
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* n8n ATS Check */}
                        <button
                          type="button"
                          onClick={() => handleTriggerN8n('ats_check')}
                          disabled={isN8nRunning}
                          style={{
                            height: '36px',
                            padding: '0 12px',
                            borderRadius: '6px',
                            background: '#1A0F0F',
                            border: '1px solid #FF3B30',
                            color: '#FF3B30',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Zap size={12} />
                          <span>External ATS Check (n8n)</span>
                        </button>

                        <button className="btn btn-secondary" style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }} onClick={() => handleCopy(coverLetterBody, 'coverLetter')}>
                          {copiedKey === 'coverLetter' ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                          <span>Copy Text</span>
                        </button>

                        <button
                          className="btn btn-primary"
                          style={{ height: '36px', fontSize: '12px', borderRadius: '6px', background: '#FF3B30', borderColor: '#FF3B30', color: '#FFFFFF', fontWeight: 700 }}
                          onClick={handleDownloadPdf}
                        >
                          <Download size={13} />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Paper Document Preview */}
                    <div className="latex-paper" style={{ minHeight: '340px', padding: '26px', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.04em' }}>
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

                {/* 4. n8n AUTOMATION CONSOLE TAB */}
                {inspectorTab === 'n8n' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '100%' }}>
                    {/* Header Card */}
                    <div
                      style={{
                        padding: '18px',
                        borderRadius: '8px',
                        background: '#121217',
                        border: '1px solid #27272A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Zap size={16} color="#FF3B30" />
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                            RADAR n8n Autonomous Workflow Cycles
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>
                          Connect your self-hosted or cloud n8n instance to automate external ATS scoring, Gmail/Outlook sending, and WhatsApp queueing.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: '36px', fontSize: '12px', borderRadius: '6px' }}
                          onClick={() => setShowN8nConfigModal(true)}
                        >
                          <Settings size={13} />
                          <span>Configure Webhooks</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerN8n('full_cycle')}
                          disabled={isN8nRunning}
                          style={{
                            height: '36px',
                            padding: '0 16px',
                            backgroundColor: '#FF3B30',
                            borderColor: '#FF3B30',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '12.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Play size={13} />
                          <span>Trigger Full Cycle Now</span>
                        </button>
                      </div>
                    </div>

                    {/* Workflow Matrix Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {/* Flow 1: ATS & CV Score */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: '#111116',
                          border: '1px solid #222228',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                            1. External ATS & CV Check
                          </span>
                          <span style={{ fontSize: '10px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            Webhook
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#71717A', margin: 0 }}>
                          Sends opportunity keywords and attached CV to external n8n AI parser to compute keyword match % and gaps.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => handleTriggerN8n('ats_check')}
                            disabled={isN8nRunning}
                            style={{
                              flex: 1,
                              height: '32px',
                              borderRadius: '6px',
                              background: '#181820',
                              border: '1px solid #27272A',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ⚡ Trigger ATS
                          </button>
                        </div>
                      </div>

                      {/* Flow 2: Email Dispatch */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: '#111116',
                          border: '1px solid #222228',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                            2. Direct Email Node
                          </span>
                          <span style={{ fontSize: '10px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            Gmail / Outlook
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#71717A', margin: 0 }}>
                          Sends recipient, tailored subject, body, and resume attachment to n8n email nodes for automatic draft creation or direct send.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => handleTriggerN8n('email_dispatch')}
                            disabled={isN8nRunning}
                            style={{
                              flex: 1,
                              height: '32px',
                              borderRadius: '6px',
                              background: '#181820',
                              border: '1px solid #27272A',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ⚡ Dispatch Email
                          </button>
                        </div>
                      </div>

                      {/* Flow 3: WhatsApp Dispatch */}
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: '#111116',
                          border: '1px solid #222228',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                            3. WhatsApp DM Router
                          </span>
                          <span style={{ fontSize: '10px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            WhatsApp API
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#71717A', margin: 0 }}>
                          Dispatches mobile pitch message and phone number to WhatsApp Business API or Baileys webhook node.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => handleTriggerN8n('whatsapp_dispatch')}
                            disabled={isN8nRunning}
                            style={{
                              flex: 1,
                              height: '32px',
                              borderRadius: '6px',
                              background: '#181820',
                              border: '1px solid #27272A',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ⚡ Dispatch WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Downloadable n8n Templates Section */}
                    {n8nTemplates.length > 0 && (
                      <div
                        style={{
                          padding: '18px',
                          borderRadius: '8px',
                          background: '#121217',
                          border: '1px solid #27272A',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF' }}>
                          Download Ready-to-Import n8n Workflow JSON Schemas
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                          {n8nTemplates.map((tpl) => (
                            <div
                              key={tpl.id}
                              style={{
                                padding: '12px 14px',
                                background: '#16161C',
                                borderRadius: '6px',
                                border: '1px solid #2A2A32',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tpl.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#71717A' }}>
                                  {tpl.nodesCount || 4} nodes configured
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadN8nTemplate(tpl)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '4px',
                                  background: '#1F1F28',
                                  border: '1px solid #3F3F4A',
                                  color: '#FFFFFF',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  flexShrink: 0,
                                }}
                              >
                                <Download size={11} />
                                <span>JSON</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Execution Result Log */}
                    {n8nLastResult && (
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: '#0D0D11',
                          border: '1px solid #27272A',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', marginBottom: '8px' }}>
                          <span style={{ color: '#10B981', fontWeight: 700 }}>
                            Last Execution: {n8nLastResult.workflowType} ({n8nLastResult.timestamp})
                          </span>
                          <span>Status: {n8nLastResult.success ? 'Success' : 'Local Queue'}</span>
                        </div>
                        <pre style={{ margin: 0, color: '#D4D4D8', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(n8nLastResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. JOB SPEC & FLYER TAB */}
                {inspectorTab === 'flyer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
                    {/* Flyer Preview */}
                    {currentOffer.imageUrl ? (
                      <div
                        style={{
                          background: '#121217',
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid #27272A',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={currentOffer.imageUrl}
                          alt="Offer Flyer"
                          style={{
                            maxHeight: '340px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '6px',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '24px',
                          background: '#121217',
                          borderRadius: '8px',
                          border: '1px dashed #27272A',
                          textAlign: 'center',
                          color: '#71717A',
                          fontSize: '12.5px',
                        }}
                      >
                        No flyer attached. You can attach a flyer URL from the top ingestion bar.
                      </div>
                    )}

                    {/* Extracted Skills */}
                    {currentOffer.skills && currentOffer.skills.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                          Extracted Keywords & Tech Stack
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {currentOffer.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#16161C',
                                color: '#FFFFFF',
                                border: '1px solid #2E2E36',
                                padding: '4px 10px',
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

                    {/* Raw Job Spec */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                        Full Job Posting Text
                      </label>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '220px', fontSize: '12.5px', lineHeight: 1.6, background: '#121217', borderColor: '#27272A', color: '#F4F4F5' }}
                        value={currentOffer.description || ''}
                        onChange={(e) => handleUpdateField('description', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 6. GROQ AI COPILOT TAB */}
                {inspectorTab === 'copilot' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '840px' }}>
                    <div
                      style={{
                        background: '#121217',
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                        padding: '14px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Bot size={16} color="#FF3B30" />
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>
                          Groq AI Career Copilot ({aiConfig.model || 'openai/gpt-oss-120b'})
                        </span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#71717A', margin: 0 }}>
                        High-speed Groq agent. Rewrite outreach emails, extract technical interview questions, or sharpen your pitch.
                      </p>
                    </div>

                    {/* Prompt Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Make the cold email punchier, confident, and under 120 words.')}
                      >
                        ⚡ Punchy cold email (&lt;120 words)
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Translate outreach email and LinkedIn pitch to professional English.')}
                      >
                        🌐 Translate to English
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Highlight my specific AI and software engineering experience in the email.')}
                      >
                        🧠 Highlight AI / Systems
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => handleRunCopilot('Generate 5 technical interview questions likely to be asked for this exact role.')}
                      >
                        🎯 5 Technical Interview Questions
                      </button>
                    </div>

                    {/* Copilot Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, height: '38px', fontSize: '12.5px', background: '#121217', borderColor: '#27272A', color: '#FFFFFF' }}
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
                        style={{ height: '38px', padding: '0 16px', background: '#FF3B30', borderColor: '#FF3B30' }}
                      >
                        {isCopilotLoading ? <RefreshCw size={13} className="pulse-glow" /> : <Send size={13} />}
                        <span>Ask AI</span>
                      </button>
                    </div>

                    {/* Copilot Output */}
                    {copilotOutput && (
                      <div
                        style={{
                          background: '#121217',
                          border: '1px solid #27272A',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFFFFF' }}>
                            Groq Output
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ height: '26px', fontSize: '11px' }}
                              onClick={() => handleCopy(copilotOutput, 'copilotOut')}
                            >
                              {copiedKey === 'copilotOut' ? <Check size={11} /> : <Copy size={11} />}
                              <span>Copy</span>
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ height: '26px', fontSize: '11px', color: '#FFFFFF' }}
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
                            color: '#F4F4F5',
                          }}
                        >
                          {copilotOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Persistent Private Notes */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1E1E24' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#A1A1AA', marginBottom: '6px' }}>
                    Private Action Notes & Recruiter Log
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. Sent outreach to recruiter; followed up via LinkedIn on Tuesday..."
                    value={currentOffer.notes || ''}
                    onChange={(e) => handleUpdateField('notes', e.target.value)}
                    style={{ fontSize: '12px', background: '#121217', borderColor: '#27272A', color: '#F4F4F5', borderRadius: '6px' }}
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
                color: '#71717A',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <FileText size={32} />
              <span>Select an opportunity from the stream or dump clipboard above</span>
            </div>
          )}
        </main>
      </div>

      {/* n8n Configuration Modal */}
      {showN8nConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0F0F14',
              border: '1px solid #27272A',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#FF3B30" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  n8n Webhook Configuration
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowN8nConfigModal(false)}
                style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>
              Specify your n8n webhook URLs. If left blank, local mock responses are provided so you can test without an active n8n instance.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: '#FFFFFF' }}>
                  ATS & CV Scoring Webhook URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px', background: '#16161C' }}
                  placeholder="https://n8n.yourdomain.com/webhook/ats-score"
                  value={n8nConfig.webhookAts || ''}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, webhookAts: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: '#FFFFFF' }}>
                  Email Dispatch Webhook URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px', background: '#16161C' }}
                  placeholder="https://n8n.yourdomain.com/webhook/send-email"
                  value={n8nConfig.webhookEmail || ''}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, webhookEmail: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: '#FFFFFF' }}>
                  WhatsApp Dispatch Webhook URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px', background: '#16161C' }}
                  placeholder="https://n8n.yourdomain.com/webhook/whatsapp-message"
                  value={n8nConfig.webhookWhatsApp || ''}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, webhookWhatsApp: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: '#FFFFFF' }}>
                  Full Automation Cycle Webhook URL
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '36px', fontSize: '12px', background: '#16161C' }}
                  placeholder="https://n8n.yourdomain.com/webhook/full-cycle"
                  value={n8nConfig.webhookFullCycle || ''}
                  onChange={(e) => setN8nConfig({ ...n8nConfig, webhookFullCycle: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '36px', fontSize: '12px' }}
                onClick={() => setShowN8nConfigModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '12px', background: '#FF3B30', borderColor: '#FF3B30' }}
                onClick={async () => {
                  await N8nService.saveConfig(n8nConfig)
                  setShowN8nConfigModal(false)
                  confetti({ particleCount: 30, spread: 45 })
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

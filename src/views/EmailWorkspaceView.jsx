import React, { useState } from 'react'
import {
  Mail,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  Sparkles,
  Send,
  FileDown,
  Zap,
  Loader2,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { EMAIL_TEMPLATES } from '../data/defaultTemplates.js'
import { CATEGORIES } from '../data/categories.js'
import { EmlGenerator } from '../services/emlGenerator.js'
import { AiService } from '../services/aiService.js'

export function EmailWorkspaceView({
  offers = [],
  cvList = [],
  candidateProfile,
  aiConfig,
  onUpdateOfferStatus,
  onUpdateOfferCv,
}) {
  const emailOffers = offers.filter((o) => o.channel === 'email')
  const [selectedOfferId, setSelectedOfferId] = useState(emailOffers[0]?.id || null)
  const [activeTemplateId, setActiveTemplateId] = useState('fr-pfe-standard')
  const [fillMode, setFillMode] = useState('auto') // 'manual' | 'auto' | 'hybrid'
  const [copiedKey, setCopiedKey] = useState(null)
  const [aiCustomInstruction, setAiCustomInstruction] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  const currentOffer = emailOffers.find((o) => o.id === selectedOfferId) || emailOffers[0]
  const currentTemplate = EMAIL_TEMPLATES.find((t) => t.id === activeTemplateId) || EMAIL_TEMPLATES[0]

  // Interpolated fields
  const getInterpolatedSubject = () => {
    if (!currentOffer) return ''
    return currentTemplate.subject
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)
  }

  const getInterpolatedBody = () => {
    if (!currentOffer) return ''
    const cat = CATEGORIES.find((c) => c.id === currentOffer.category)
    const skillsText = currentOffer.skills?.join(', ') || 'software engineering and AI'

    return currentTemplate.body
      .replace(/\[RECIPIENT_NAME\]/g, currentOffer.recruiterName || 'Madame, Monsieur')
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[DOMAIN\]/g, cat?.label || 'Informatique & Nouvelles Technologies')
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[ATTACHED_CV\]/g, currentOffer.attachedCvTag || 'CV Ingénieur')
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone)
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn)
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString())
  }

  const [customBody, setCustomBody] = useState('')

  React.useEffect(() => {
    setCustomBody(getInterpolatedBody())
  }, [selectedOfferId, activeTemplateId, candidateProfile])

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const handleCopyAll = () => {
    if (!currentOffer) return
    const bundle = `TO: ${currentOffer.recruiterEmail}\nSUBJECT: ${getInterpolatedSubject()}\nATTACHED: ${currentOffer.attachedCvTag}\n\n${customBody}`
    handleCopy(bundle, 'all')
  }

  const handleOpenMailApp = () => {
    if (!currentOffer) return
    const mailto = `mailto:${encodeURIComponent(currentOffer.recruiterEmail)}?subject=${encodeURIComponent(
      getInterpolatedSubject()
    )}&body=${encodeURIComponent(customBody)}`
    window.location.href = mailto
  }

  const handleExportEml = () => {
    if (!currentOffer) return
    EmlGenerator.downloadEml({
      to: currentOffer.recruiterEmail,
      subject: getInterpolatedSubject(),
      body: customBody,
      candidateName: candidateProfile.fullName,
      candidateEmail: candidateProfile.email,
      cvFileName: `${(currentOffer.attachedCvTag || 'CV').replace(/\s+/g, '_')}.pdf`,
    })
  }

  const handleMarkApplied = () => {
    if (!currentOffer) return
    onUpdateOfferStatus(currentOffer.id, 'applied')
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
  }

  const handleRunAiCopilot = async (customInstructionOverride) => {
    if (!currentOffer) return
    const instruction = customInstructionOverride || aiCustomInstruction
    setIsAiLoading(true)

    try {
      const taskPrompt = `Draft a personalized, high-agency application email for the role "${currentOffer.title}" at "${currentOffer.company}".
Recipient recruiter: ${currentOffer.recruiterName || 'Madame, Monsieur'} (${currentOffer.recruiterEmail}).
${instruction ? `User special directive: ${instruction}` : ''}
Candidate Background:
- Name: ${candidateProfile.fullName}
- Degree: ${candidateProfile.degree}
- Target Skills: ${currentOffer.skills?.join(', ') || candidateProfile.skills}
- Attached CV variant: ${currentOffer.attachedCvTag}
- Tone Preference: ${candidateProfile.tonePreference || 'Direct, confident, technical'}

Output ONLY the email body text without the Subject line or placeholder brackets.`

      const generated = await AiService.runFreeformPrompt({
        prompt: taskPrompt,
        context: {
          offer: currentOffer,
          candidate: candidateProfile,
        },
        config: aiConfig || {},
      })

      if (generated && generated.trim()) {
        setCustomBody(generated.trim())
      }
    } catch (err) {
      alert(`AI Generation error: ${err.message}`)
    } finally {
      setIsAiLoading(false)
    }
  }

  if (emailOffers.length === 0) {
    return (
      <div className="workspace-view">
        <div className="kpi-card" style={{ textAlign: 'center', padding: '40px' }}>
          <Mail size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>No direct email offers tracked</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Paste a recruiter LinkedIn post or offer containing an email address to manage outreach here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-view" style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', height: '100%' }}>
        {/* Left Column: Email Offers List */}
        <div className="kpi-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div className="section-header" style={{ marginBottom: '6px' }}>
            <span className="section-title">Email Outreach Offers ({emailOffers.length})</span>
          </div>

          {emailOffers.map((offer) => {
            const isSelected = offer.id === currentOffer?.id
            return (
              <div
                key={offer.id}
                onClick={() => setSelectedOfferId(offer.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-app)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {offer.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {offer.company} • <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{offer.recruiterEmail}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span className="skill-tag">{offer.attachedCvTag}</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    {offer.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Ready-to-Send Workspace Card */}
        {currentOffer && (
          <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* Header with Sharer Profile and Template Selector */}
            <div className="section-header">
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Ready-to-Send Email Outreach</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                    Target: {currentOffer.company}
                  </span>
                  {currentOffer.sharer?.name && (
                    <span style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(168, 85, 247, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                      Shared by: <strong>{currentOffer.sharer.name}</strong> ({currentOffer.sharer.title || 'Recruiter'})
                    </span>
                  )}
                  {currentOffer.sourceUrl && (
                    <a
                      href={currentOffer.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      <span>Original Link</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Template and Mode Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '28px', fontSize: '11px' }}
                  value={activeTemplateId}
                  onChange={(e) => setActiveTemplateId(e.target.value)}
                >
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>

                <div className="segmented-control">
                  {['manual', 'auto', 'hybrid'].map((m) => (
                    <button
                      key={m}
                      className={`seg-btn ${fillMode === m ? 'active' : ''}`}
                      onClick={() => setFillMode(m)}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipient Row */}
            <div className="form-group">
              <label className="form-label">To (Recruiter Address):</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}
                  value={currentOffer.recruiterEmail}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopy(currentOffer.recruiterEmail, 'to')}
                >
                  {copiedKey === 'to' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'to' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Subject Row */}
            <div className="form-group">
              <label className="form-label">Subject:</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={getInterpolatedSubject()}
                  readOnly={fillMode === 'auto'}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopy(getInterpolatedSubject(), 'subject')}
                >
                  {copiedKey === 'subject' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'subject' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Attached CV Strip & Swap */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="#3b82f6" />
                <span style={{ fontSize: '12px' }}>
                  Attached CV: <strong>{currentOffer.attachedCvTag}</strong>
                </span>
              </div>

              {/* Swap CV Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Swap:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '26px', fontSize: '11px' }}
                  value={currentOffer.attachedCvTag}
                  onChange={(e) => onUpdateOfferCv(currentOffer.id, e.target.value)}
                >
                  {cvList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* UNCONSTRAINED AI PROMPT COPILOT BAR */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                padding: '8px 10px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: '4px',
              }}
            >
              <Sparkles size={14} color="#3b82f6" />
              <input
                type="text"
                className="form-input"
                style={{ height: '28px', fontSize: '11px', flex: 1 }}
                placeholder="Ask AI Copilot with complete freedom: e.g. 'Make it 3 sentences ultra-short', 'Emphasize LLM agents', 'Write in English'..."
                value={aiCustomInstruction}
                onChange={(e) => setAiCustomInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRunAiCopilot())}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '28px', fontSize: '11px', gap: '4px' }}
                onClick={() => handleRunAiCopilot()}
                disabled={isAiLoading}
              >
                {isAiLoading ? <Loader2 size={12} className="pulse-glow" /> : <Zap size={12} color="#3b82f6" />}
                <span>{isAiLoading ? 'Drafting...' : 'Run AI'}</span>
              </button>
            </div>

            {/* Body Field */}
            <div className="form-group" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <label className="form-label">Email Body (Grounded strictly to your CV):</label>
                <button
                  className="btn btn-secondary"
                  style={{ height: '24px', fontSize: '11px' }}
                  onClick={() => handleCopy(customBody, 'body')}
                >
                  {copiedKey === 'body' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedKey === 'body' ? 'Copied Body' : 'Copy Body'}</span>
                </button>
              </div>
              <textarea
                className="form-textarea"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  lineHeight: 1.6,
                  height: '240px',
                }}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </div>

            {/* Original Post Text & Flyer Image Drawer */}
            <div
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Original Post Text & Image
                </span>
                {currentOffer.sourceUrl && (
                  <a
                    href={currentOffer.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <span>View Link</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentOffer.imageUrl && (
                  <img
                    src={currentOffer.imageUrl}
                    alt="Post flyer"
                    style={{
                      maxHeight: '160px',
                      width: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                )}
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    background: '#121215',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                >
                  {currentOffer.description || 'No raw text provided.'}
                </pre>
              </div>
            </div>

            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={handleCopyAll}>
                  {copiedKey === 'all' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'all' ? 'All Copied!' : 'Copy All Bundle'}</span>
                </button>

                <button className="btn btn-secondary" onClick={handleExportEml} title="Download .eml file">
                  <FileDown size={14} />
                  <span>Export .eml</span>
                </button>

                <button className="btn btn-secondary" onClick={handleOpenMailApp}>
                  <ExternalLink size={14} />
                  <span>Open in Mail Client</span>
                </button>
              </div>

              <button className="btn btn-accent" onClick={handleMarkApplied}>
                <Send size={14} />
                <span>Mark as Applied</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

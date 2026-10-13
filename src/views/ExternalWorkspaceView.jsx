import React, { useState } from 'react'
import {
  Globe,
  FileText,
  FileDown,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Type,
  CheckSquare,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'
import { PdfGenerator } from '../services/pdfGenerator.js'
import { AiService } from '../services/aiService.js'

export function ExternalWorkspaceView({
  offers = [],
  candidateProfile,
  aiConfig,
  onUpdateOfferStatus,
}) {
  const externalOffers = offers.filter((o) => o.channel === 'external')
  const [selectedOfferId, setSelectedOfferId] = useState(externalOffers[0]?.id || null)
  const [selectedTemplate, setSelectedTemplate] = useState('latex-classic')
  const [coverLetterText, setCoverLetterText] = useState('')
  const [copied, setCopied] = useState(false)
  const [aiCustomInstruction, setAiCustomInstruction] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  // Checklist state
  const [checkedSteps, setCheckedSteps] = useState({
    opened: false,
    cvUploaded: false,
    letterPasted: false,
  })

  const currentOffer = externalOffers.find((o) => o.id === selectedOfferId) || externalOffers[0]

  React.useEffect(() => {
    if (!currentOffer) return
    const tpl = COVER_LETTER_TEMPLATES.find((t) => t.id === selectedTemplate) || COVER_LETTER_TEMPLATES[0]
    const skillsText = currentOffer.skills?.join(', ') || 'modern technology and problem solving'

    const interpolated = tpl.defaultText
      .replace(/\[ROLE\]/g, currentOffer.title)
      .replace(/\[COMPANY\]/g, currentOffer.company)
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)

    setCoverLetterText(interpolated)
    setCheckedSteps({ opened: false, cvUploaded: false, letterPasted: false })
  }, [selectedOfferId, selectedTemplate, candidateProfile])

  const handleDownloadPdf = () => {
    if (!currentOffer) return
    PdfGenerator.downloadPdf({
      candidate: candidateProfile,
      offer: currentOffer,
      text: coverLetterText,
      style: selectedTemplate,
    })
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(coverLetterText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleOpenPortal = () => {
    if (currentOffer?.sourceUrl) {
      window.open(currentOffer.sourceUrl, '_blank')
      setCheckedSteps((prev) => ({ ...prev, opened: true }))
    }
  }

  const handleMarkApplied = () => {
    if (!currentOffer) return
    onUpdateOfferStatus(currentOffer.id, 'applied')
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
  }

  const handleRunAiCopilot = async (customInstructionOverride) => {
    if (!currentOffer) return
    const instruction = customInstructionOverride || aiCustomInstruction
    setIsAiLoading(true)

    try {
      const taskPrompt = `Draft a customized, high-impact cover letter for the role "${currentOffer.title}" at "${currentOffer.company}".
${instruction ? `User special directive: ${instruction}` : ''}
Candidate Background:
- Candidate Name: ${candidateProfile.fullName}
- Degree/Education: ${candidateProfile.degree}
- Target Skills: ${currentOffer.skills?.join(', ') || candidateProfile.skills}
- Tone Preference: ${candidateProfile.tonePreference || 'Professional, concise, confident'}

Output the cover letter content formatted cleanly in paragraphs without greeting placeholders.`

      const generated = await AiService.runFreeformPrompt({
        prompt: taskPrompt,
        context: {
          offer: currentOffer,
          candidate: candidateProfile,
        },
        config: aiConfig || {},
      })

      if (generated && generated.trim()) {
        setCoverLetterText(generated.trim())
      }
    } catch (err) {
      alert(`AI Generation error: ${err.message}`)
    } finally {
      setIsAiLoading(false)
    }
  }

  if (externalOffers.length === 0) {
    return (
      <div className="workspace-view">
        <div className="kpi-card" style={{ textAlign: 'center', padding: '40px' }}>
          <Globe size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>No external portal offers tracked</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Offers without recruiter email addresses appear here with the Cover Letter PDF generator and submission checklist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-view" style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', height: '100%' }}>
        {/* Left Column: List of External Offers */}
        <div className="kpi-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div className="section-header" style={{ marginBottom: '6px' }}>
            <span className="section-title">External ATS Offers ({externalOffers.length})</span>
          </div>

          {externalOffers.map((offer) => {
            const isSelected = offer.id === currentOffer?.id
            return (
              <div
                key={offer.id}
                onClick={() => setSelectedOfferId(offer.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: isSelected ? '1px solid #ffffff' : '1px solid var(--border-subtle)',
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
                  {offer.company} • {offer.location || 'Remote'}
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

        {/* Right Column: External Application & Cover Letter Studio */}
        {currentOffer && (
          <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* Header */}
            <div className="section-header">
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600 }}>External Portal Workspace & Cover Letter</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                    {currentOffer.company} • {currentOffer.title}
                  </span>
                  {currentOffer.sharer?.name && (
                    <span style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                      Shared by: <strong>{currentOffer.sharer.name}</strong>
                    </span>
                  )}
                  {currentOffer.sourceUrl && (
                    <a
                      href={currentOffer.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      <span>Original Link</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Template:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', height: '28px', fontSize: '11px' }}
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {COVER_LETTER_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {currentOffer.sourceUrl && (
                  <button className="btn btn-secondary" onClick={handleOpenPortal}>
                    <ExternalLink size={13} />
                    <span>Open Portal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Checklist Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkedSteps.opened}
                    onChange={(e) => setCheckedSteps({ ...checkedSteps, opened: e.target.checked })}
                  />
                  <span>1. Open Portal</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkedSteps.cvUploaded}
                    onChange={(e) => setCheckedSteps({ ...checkedSteps, cvUploaded: e.target.checked })}
                  />
                  <span>2. Upload CV ({currentOffer.attachedCvTag})</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkedSteps.letterPasted}
                    onChange={(e) => setCheckedSteps({ ...checkedSteps, letterPasted: e.target.checked })}
                  />
                  <span>3. Attach / Paste Cover Letter</span>
                </label>
              </div>

              <button
                className="btn btn-accent"
                onClick={handleMarkApplied}
                disabled={currentOffer.status === 'applied'}
              >
                <CheckCircle2 size={13} />
                <span>Mark as Applied</span>
              </button>
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
              <Sparkles size={14} color="#ffffff" />
              <input
                type="text"
                className="form-input"
                style={{ height: '28px', fontSize: '11px', flex: 1 }}
                placeholder="Ask AI Copilot with complete freedom: e.g. 'Emphasize graduation project on transformers', 'Make it concise and assertive', 'Write in French'..."
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
                {isAiLoading ? <Loader2 size={12} className="pulse-glow" /> : <Zap size={12} color="#f59e0b" />}
                <span>{isAiLoading ? 'Drafting...' : 'Run AI'}</span>
              </button>
            </div>

            {/* Editor & Live A4 Paper Preview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}>
              {/* Left: Text Editor */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <label className="form-label">Free-Text Cover Letter Editor:</label>
                  <button className="btn btn-ghost" style={{ height: '22px', fontSize: '11px' }} onClick={handleCopyText}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    lineHeight: 1.6,
                    flex: 1,
                    minHeight: '280px',
                  }}
                  value={coverLetterText}
                  onChange={(e) => setCoverLetterText(e.target.value)}
                />
              </div>

              {/* Right: Live A4 Preview */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <label className="form-label">Live A4 Paper Preview:</label>
                  <button className="btn btn-primary" style={{ height: '24px', fontSize: '11px' }} onClick={handleDownloadPdf}>
                    <FileDown size={13} />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div
                  className="latex-paper"
                  style={{
                    fontFamily: selectedTemplate === 'latex-classic' ? "'Times New Roman', serif" : 'sans-serif',
                  }}
                >
                  <div style={{ textAlign: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '8px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
                      {candidateProfile.fullName}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#52525b' }}>
                      {[candidateProfile.email, candidateProfile.phone, candidateProfile.city].filter(Boolean).join(' • ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#52525b', marginBottom: '8px' }}>
                    <div>
                      <strong>Hiring Team</strong><br />
                      {currentOffer.company}
                    </div>
                    <div>{new Date().toLocaleDateString()}</div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '11.5px', marginBottom: '8px', color: '#18181b' }}>
                    Subject: Application for {currentOffer.title}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#27272a' }}>
                    {coverLetterText.split('\n\n').map((para, i) => (
                      <p key={i} style={{ textIndent: selectedTemplate === 'latex-classic' ? '1.5em' : '0' }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

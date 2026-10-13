import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Phone,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Send,
  User,
  Image as ImageIcon,
  Sparkles,
  Share2,
  Zap,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { AiService } from '../services/aiService.js'

function LinkedinIcon({ size = 14, color = 'var(--text-primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export function DirectContactWorkspaceView({
  offers = [],
  cvList = [],
  candidateProfile,
  aiConfig,
  onUpdateOfferStatus,
  onUpdateOfferCv,
}) {
  const directOffers = offers.filter((o) => o.channel === 'direct_contact')
  const [selectedOfferId, setSelectedOfferId] = useState(directOffers[0]?.id || null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [activeTab, setActiveTab] = useState('linkedin_note') // 'linkedin_note' | 'inmail' | 'whatsapp'
  const [showFullPost, setShowFullPost] = useState(false)
  const [aiCustomInstruction, setAiCustomInstruction] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  const currentOffer = directOffers.find((o) => o.id === selectedOfferId) || directOffers[0]

  // Default pre-drafted connection note (< 300 chars for LinkedIn limit)
  const defaultNote =
    currentOffer?.linkedInNote ||
    `Bonjour ${currentOffer?.sharer?.name || ''}, étudiant en fin de cycle (${candidateProfile?.degree || 'Ingénieur'}), je serais ravi d'échanger au sujet de votre stage PFE ${currentOffer?.title || ''} chez ${currentOffer?.company || ''}. Bien cordialement.`

  const [noteText, setNoteText] = useState(defaultNote)

  // Full InMail pitch
  const defaultInmail = `Bonjour ${currentOffer?.sharer?.name || 'Bonjour'},

Je me permets de vous contacter suite à votre publication concernant l'offre de Stage PFE "${currentOffer?.title || 'Stage PFE'}" au sein de ${currentOffer?.company || 'votre équipe'}.

Actuellement en dernière année (${candidateProfile?.degree || 'Master / Diplôme Ingénieur'}), j'ai développé des compétences solides en ${currentOffer?.skills?.join(', ') || 'technologies modernes'}.

Je serais très honoré de vous transmettre mon CV (${currentOffer?.attachedCvTag || 'CV PFE'}) et d'échanger quelques minutes avec vous pour vous présenter mon profil.

Bien cordialement,
${candidateProfile?.fullName || 'Khalil'}
${candidateProfile?.phone || ''}
${candidateProfile?.linkedIn || ''}`

  const [inmailText, setInmailText] = useState(defaultInmail)

  // WhatsApp message
  const cleanPhone = (currentOffer?.sharer?.phone || '').replace(/[^0-9+]/g, '')
  const defaultWhatsapp =
    currentOffer?.whatsAppMsg ||
    `Bonjour ${currentOffer?.sharer?.name || ''}, je vous contacte suite à votre post pour le stage PFE "${currentOffer?.title || 'Stage PFE'}" chez ${currentOffer?.company || ''}. Seriez-vous disponible pour échanger brièvement ? Bien à vous, ${candidateProfile?.fullName || ''}.`

  const [whatsappText, setWhatsappText] = useState(defaultWhatsapp)

  useEffect(() => {
    if (currentOffer) {
      setNoteText(
        currentOffer.linkedInNote ||
          `Bonjour ${currentOffer.sharer?.name || ''}, passionné par ${currentOffer.skills?.[0] || 'la tech'}, je serais ravi d'échanger au sujet de votre stage PFE ${currentOffer.title} chez ${currentOffer.company}. Bien cordialement.`
      )
      setInmailText(defaultInmail)
      setWhatsappText(
        currentOffer.whatsAppMsg ||
          `Bonjour ${currentOffer.sharer?.name || ''}, je vous contacte suite à votre publication LinkedIn pour l'offre PFE "${currentOffer.title}" chez ${currentOffer.company}. ${candidateProfile?.fullName || ''}.`
      )
    }
  }, [selectedOfferId, candidateProfile])

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const handleOpenLinkedIn = () => {
    if (currentOffer?.sharer?.profileUrl) {
      window.open(currentOffer.sharer.profileUrl, '_blank')
    } else if (currentOffer?.sourceUrl) {
      window.open(currentOffer.sourceUrl, '_blank')
    }
  }

  const handleOpenWhatsApp = () => {
    const phoneNum = cleanPhone.replace(/^\+/, '')
    if (phoneNum) {
      const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(whatsappText)}`
      window.open(url, '_blank')
    }
  }

  const handleMarkApplied = () => {
    if (!currentOffer) return
    onUpdateOfferStatus(currentOffer.id, 'applied')
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
  }

  // Freeform unconstrained AI regeneration
  const handleRunAiCopilot = async (customInstructionOverride) => {
    if (!currentOffer) return
    const instruction = customInstructionOverride || aiCustomInstruction
    setIsAiLoading(true)

    try {
      let taskPrompt = ''
      if (activeTab === 'linkedin_note') {
        taskPrompt = `Draft a concise, high-impact LinkedIn connection note strictly UNDER 280 characters for recruiter "${currentOffer.sharer?.name || 'Recruiter'}" regarding the role "${currentOffer.title}" at "${currentOffer.company}".
${instruction ? `User special directive: ${instruction}` : ''}
Output ONLY the final connection note text without quotation marks or conversational commentary.`
      } else if (activeTab === 'inmail') {
        taskPrompt = `Draft a compelling, direct InMail pitch message to recruiter "${currentOffer.sharer?.name || 'Recruiter'}" regarding the role "${currentOffer.title}" at "${currentOffer.company}".
${instruction ? `User special directive: ${instruction}` : ''}
Include candidate background: ${candidateProfile?.fullName}, ${candidateProfile?.headline || candidateProfile?.degree}, skills: ${currentOffer.skills?.join(', ')}.
Output ONLY the final InMail message body.`
      } else {
        taskPrompt = `Draft a crisp WhatsApp direct message to recruiter "${currentOffer.sharer?.name || 'Recruiter'}" regarding "${currentOffer.title}" at "${currentOffer.company}".
${instruction ? `User special directive: ${instruction}` : ''}
Output ONLY the WhatsApp message text.`
      }

      const generated = await AiService.runFreeformPrompt({
        prompt: taskPrompt,
        context: {
          offer: currentOffer,
          candidate: candidateProfile,
        },
        config: aiConfig || {},
      })

      if (generated && generated.trim()) {
        const cleaned = generated.trim().replace(/^["']|["']$/g, '')
        if (activeTab === 'linkedin_note') setNoteText(cleaned)
        else if (activeTab === 'inmail') setInmailText(cleaned)
        else setWhatsappText(cleaned)
      }
    } catch (err) {
      alert(`AI Generation error: ${err.message}`)
    } finally {
      setIsAiLoading(false)
    }
  }

  if (directOffers.length === 0) {
    return (
      <div className="workspace-view">
        <div className="kpi-card" style={{ textAlign: 'center', padding: '40px' }}>
          <MessageSquare size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>No Direct Contact / DM offers yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Posts where recruiters invite you to send a LinkedIn private message (DM), WhatsApp, or phone outreach appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-view" style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', height: '100%' }}>
        {/* Left Column: Direct Contact Offers List */}
        <div className="kpi-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div className="section-header" style={{ marginBottom: '6px' }}>
            <span className="section-title">Direct DM & WhatsApp Offers ({directOffers.length})</span>
          </div>

          {directOffers.map((offer) => {
            const isSelected = offer.id === currentOffer?.id
            return (
              <div
                key={offer.id}
                onClick={() => setSelectedOfferId(offer.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: isSelected ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
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
                  {offer.company} • Contact: <strong style={{ color: '#f59e0b' }}>{offer.sharer?.name || 'Recruiter'}</strong>
                </div>
                {offer.sharer?.phone && (
                  <div style={{ fontSize: '10.5px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    WhatsApp: {offer.sharer.phone}
                  </div>
                )}
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

        {/* Right Column: Sharer Profile & DM Outreach Workspace */}
        {currentOffer && (
          <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* Sharer Profile Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentOffer.sharer?.name || 'Post Author / Recruiter'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {currentOffer.sharer?.title || `Team Lead @ ${currentOffer.company}`}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Sharer Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(currentOffer.sharer?.profileUrl || currentOffer.sourceUrl) && (
                  <button className="btn btn-secondary" onClick={handleOpenLinkedIn}>
                    <LinkedinIcon size={13} color="var(--text-primary)" />
                    <span>Open LinkedIn Profile</span>
                  </button>
                )}

                {cleanPhone && (
                  <button className="btn btn-secondary" onClick={handleOpenWhatsApp}>
                    <Phone size={13} color="#34d399" />
                    <span>Chat on WhatsApp</span>
                  </button>
                )}
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
                <FileText size={15} color="#ffffff" />
                <span style={{ fontSize: '12px' }}>
                  Attached CV: <strong>{currentOffer.attachedCvTag}</strong>
                </span>
              </div>

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

            {/* Outreach Pitch Tabs (LinkedIn Connection Note vs InMail vs WhatsApp) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div className="segmented-control">
                  <button
                    className={`seg-btn ${activeTab === 'linkedin_note' ? 'active' : ''}`}
                    onClick={() => setActiveTab('linkedin_note')}
                  >
                    <LinkedinIcon size={12} />
                    <span>Connection Note (&lt;300 Chars)</span>
                  </button>
                  <button
                    className={`seg-btn ${activeTab === 'inmail' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inmail')}
                  >
                    <MessageSquare size={12} />
                    <span>InMail / Full Message</span>
                  </button>
                  {cleanPhone && (
                    <button
                      className={`seg-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
                      onClick={() => setActiveTab('whatsapp')}
                    >
                      <Phone size={12} />
                      <span>WhatsApp Direct Pitch</span>
                    </button>
                  )}
                </div>

                {activeTab === 'linkedin_note' && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: noteText.length > 300 ? '#f87171' : 'var(--text-tertiary)',
                    }}
                  >
                    {noteText.length} / 300 characters
                  </span>
                )}
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
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={14} color="#ffffff" />
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '28px', fontSize: '11px', flex: 1 }}
                  placeholder="Ask AI to adapt with complete freedom: e.g. 'Make it punchy and direct', 'Write in English', 'Mention my PyTorch project'..."
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

              {/* Tab 1: LinkedIn Connection Note */}
              {activeTab === 'linkedin_note' && (
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      height: '110px',
                      borderColor: noteText.length > 300 ? '#f87171' : undefined,
                    }}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCopy(noteText, 'note')}
                    >
                      {copiedKey === 'note' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKey === 'note' ? 'Copied Note!' : 'Copy Connection Note'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Full InMail Pitch */}
              {activeTab === 'inmail' && (
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11.5px',
                      height: '180px',
                      lineHeight: 1.6,
                    }}
                    value={inmailText}
                    onChange={(e) => setInmailText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCopy(inmailText, 'inmail')}
                    >
                      {copiedKey === 'inmail' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKey === 'inmail' ? 'Copied InMail!' : 'Copy Full Message'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: WhatsApp Pitch */}
              {activeTab === 'whatsapp' && cleanPhone && (
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      height: '110px',
                    }}
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCopy(whatsappText, 'whatsapp')}
                    >
                      {copiedKey === 'whatsapp' ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKey === 'whatsapp' ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                    <button className="btn btn-accent" onClick={handleOpenWhatsApp}>
                      <Send size={13} />
                      <span>Send via WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Original Post Text & Flyer Image Drawer */}
            <div
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setShowFullPost(!showFullPost)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Original Post Text & Image ({showFullPost ? 'Collapse' : 'Expand'})
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {showFullPost ? 'Hide details' : 'View original post'}
                </span>
              </div>

              {showFullPost && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentOffer.imageUrl && (
                    <div style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '240px' }}>
                      <img
                        src={currentOffer.imageUrl}
                        alt="Post flyer"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#09090b' }}
                      />
                    </div>
                  )}

                  <div style={{ background: '#09090b', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Original Post Content:</div>
                    <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {currentOffer.description || 'No raw post text captured.'}
                    </pre>
                  </div>

                  {currentOffer.sourceUrl && (
                    <div style={{ fontSize: '11px' }}>
                      <a
                        href={currentOffer.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <span>Open original post link</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Final Action: Mark as Contacted */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Application Channel: <strong style={{ color: '#f59e0b' }}>Direct Outreach (LinkedIn / WhatsApp)</strong>
              </div>

              <button
                className="btn btn-secondary"
                style={{
                  borderColor: currentOffer.status === 'applied' ? '#34d399' : undefined,
                  color: currentOffer.status === 'applied' ? '#34d399' : undefined,
                }}
                onClick={handleMarkApplied}
              >
                <Check size={13} />
                <span>{currentOffer.status === 'applied' ? 'Contacted ✓' : 'Mark as Contacted'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

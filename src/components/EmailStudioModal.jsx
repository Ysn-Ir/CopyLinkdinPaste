import React, { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Send,
  FileText,
  User,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { EMAIL_TEMPLATES } from '../data/defaultTemplates.js'
import { CATEGORIES } from '../data/categories.js'

export function EmailStudioModal({
  isOpen,
  onClose,
  offer,
  candidateProfile,
  onMarkAsApplied,
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('fr-pfe-standard')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [copiedField, setCopiedField] = useState(null) // 'email' | 'subject' | 'body' | 'all'

  useEffect(() => {
    if (!offer) return

    // Pick best default template based on category
    let initialTplId = 'fr-pfe-standard'
    if (offer.category === 'ai-ml' || offer.category === 'data') {
      initialTplId = 'fr-pfe-ai-data'
    }
    setSelectedTemplateId(initialTplId)
    generateEmailContent(initialTplId)
  }, [offer, candidateProfile])

  const generateEmailContent = (tplId) => {
    if (!offer) return
    const template = EMAIL_TEMPLATES.find((t) => t.id === tplId) || EMAIL_TEMPLATES[0]
    const categoryMeta = CATEGORIES.find((c) => c.id === offer.category)

    const recipient = offer.recruiterName ? offer.recruiterName : 'Madame, Monsieur'
    const skillsText =
      offer.skills && offer.skills.length > 0
        ? offer.skills.join(', ')
        : 'développement logiciel et technologies modernes'
    const domainText = categoryMeta ? categoryMeta.label : 'Informatique & Nouvelles Technologies'
    const cvTag = offer.attachedCvTag || 'CV Ingénieur PFE'

    const processedSubject = template.subject
      .replace(/\[ROLE\]/g, offer.title)
      .replace(/\[COMPANY\]/g, offer.company)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)

    const processedBody = template.body
      .replace(/\[RECIPIENT_NAME\]/g, recipient)
      .replace(/\[ROLE\]/g, offer.title)
      .replace(/\[COMPANY\]/g, offer.company)
      .replace(/\[DOMAIN\]/g, domainText)
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[ATTACHED_CV\]/g, cvTag)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)
      .replace(/\[CANDIDATE_PHONE\]/g, candidateProfile.phone)
      .replace(/\[CANDIDATE_LINKEDIN\]/g, candidateProfile.linkedIn)
      .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString('fr-FR'))

    setSubject(processedSubject)
    setBody(processedBody)
  }

  const handleTemplateChange = (e) => {
    const newId = e.target.value
    setSelectedTemplateId(newId)
    generateEmailContent(newId)
  }

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCopyAll = () => {
    const fullText = `TO: ${offer.recruiterEmail}\nSUBJECT: ${subject}\n\nATTACHMENT: ${offer.attachedCvTag}\n\n${body}`
    handleCopy(fullText, 'all')
  }

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(offer.recruiterEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
  }

  const handleMarkAppliedInternal = () => {
    onMarkAsApplied(offer.id)
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
    })
    onClose()
  }

  if (!isOpen || !offer) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Direct Email Outreach Studio</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: {offer.company} • {offer.title}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Top Bar: Template Selector & Attached CV */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.02)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} className="text-gradient" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Template:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                value={selectedTemplateId}
                onChange={handleTemplateChange}
              >
                {EMAIL_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: '#38bdf8',
                background: 'rgba(14, 165, 233, 0.12)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(14, 165, 233, 0.3)',
              }}
            >
              <FileText size={14} />
              <span>CV To Attach: <strong>{offer.attachedCvTag}</strong></span>
            </div>
          </div>

          {/* Recruiter Email Field */}
          <div className="studio-box">
            <div className="form-group">
              <label className="form-label">Recipient Email:</label>
              <div className="studio-field-row">
                <span className="studio-field-content" style={{ fontWeight: 600, color: '#34d399' }}>
                  {offer.recruiterEmail || 'No email provided'}
                </span>
                <button
                  type="button"
                  className="copy-badge-btn"
                  onClick={() => handleCopy(offer.recruiterEmail, 'email')}
                >
                  {copiedField === 'email' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === 'email' ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
            </div>

            {/* Subject Line Field */}
            <div className="form-group">
              <label className="form-label">Email Subject:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flexShrink: 0 }}
                  onClick={() => handleCopy(subject, 'subject')}
                >
                  {copiedField === 'subject' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedField === 'subject' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Email Body Field */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label">Email Body (Ready to Send):</label>
                <button
                  type="button"
                  className="copy-badge-btn"
                  onClick={() => handleCopy(body, 'body')}
                >
                  {copiedField === 'body' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === 'body' ? 'Copied Body!' : 'Copy Body'}</span>
                </button>
              </div>
              <textarea
                className="form-textarea"
                rows={10}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.6 }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopyAll}
              title="Copy everything to clipboard"
            >
              {copiedField === 'all' ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedField === 'all' ? 'All Copied!' : 'Copy Everything'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenMailClient}
              title="Open your OS default email app (Thunderbird, Outlook, Mail)"
            >
              <ExternalLink size={16} />
              <span>Open in Mail App</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleMarkAppliedInternal}
            >
              <Send size={16} />
              <span>Mark as Sent / Applied</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

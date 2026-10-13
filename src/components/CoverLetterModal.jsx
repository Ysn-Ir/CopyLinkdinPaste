import React, { useState, useEffect } from 'react'
import {
  X,
  FileDown,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Eye,
  Type,
  FileText,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'
import { PdfGenerator } from '../services/pdfGenerator.js'

export function CoverLetterModal({
  isOpen,
  onClose,
  offer,
  candidateProfile,
  onMarkAsApplied,
}) {
  const [selectedStyle, setSelectedStyle] = useState('latex-classic')
  const [letterText, setLetterText] = useState('')
  const [activeView, setActiveView] = useState('split') // 'edit' | 'preview' | 'split'
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    if (!offer) return

    const template = COVER_LETTER_TEMPLATES.find((t) => t.id === selectedStyle) || COVER_LETTER_TEMPLATES[0]
    const skillsText =
      offer.skills && offer.skills.length > 0
        ? offer.skills.join(', ')
        : 'software engineering and problem solving'

    const initialText = template.defaultText
      .replace(/\[ROLE\]/g, offer.title)
      .replace(/\[COMPANY\]/g, offer.company)
      .replace(/\[SKILLS\]/g, skillsText)
      .replace(/\[CANDIDATE_NAME\]/g, candidateProfile.fullName)

    setLetterText(initialText)
    setFileName(`Lettre_Motivation_${offer.company.replace(/\s+/g, '_')}_${candidateProfile.fullName.replace(/\s+/g, '_')}`)
  }, [offer, selectedStyle, candidateProfile])

  const handleDownloadPdf = () => {
    PdfGenerator.downloadPdf({
      candidate: candidateProfile,
      offer,
      text: letterText,
      style: selectedStyle,
      fileName,
    })
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    })
  }

  const handleOpenPortal = () => {
    if (offer?.sourceUrl) {
      window.open(offer.sourceUrl, '_blank')
    }
  }

  const handleMarkApplied = () => {
    onMarkAsApplied(offer.id)
    onClose()
  }

  if (!isOpen || !offer) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>LaTeX Cover Letter Generator</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                For External Application Portal: {offer.company}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Controls Bar */}
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
              <Type size={16} className="text-gradient" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Typography Template:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
              >
                {COVER_LETTER_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {offer.sourceUrl && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                onClick={handleOpenPortal}
              >
                <ExternalLink size={14} />
                <span>Open Application Portal</span>
              </button>
            )}
          </div>

          {/* Editor & Live Preview Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              gap: '1.25rem',
            }}
          >
            {/* Left: Text Editor */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Editable Cover Letter Text:</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total Freedom: Edit any paragraph
                </span>
              </div>
              <textarea
                className="form-textarea"
                rows={14}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  height: '380px',
                }}
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
              />
            </div>

            {/* Right: Live Paper Preview */}
            <div className="form-group">
              <label className="form-label">Live A4 Paper Preview:</label>
              <div
                className="latex-paper"
                style={{
                  fontFamily: selectedStyle === 'latex-classic' ? "'Times New Roman', serif" : 'Helvetica, Arial, sans-serif',
                }}
              >
                {/* Header */}
                <div className="latex-paper-header">
                  <h3>{candidateProfile.fullName}</h3>
                  <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '0.2rem' }}>
                    {[candidateProfile.email, candidateProfile.phone, candidateProfile.city].filter(Boolean).join(' • ')}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#374151', marginBottom: '0.8rem' }}>
                  <div>
                    <strong>À l'attention de l'équipe recrutement</strong><br />
                    {offer.company}
                  </div>
                  <div>
                    {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.9rem', color: '#111827' }}>
                  Objet : Candidature Stage PFE – {offer.title}
                </div>

                {/* Paragraphs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem', color: '#1f2937' }}>
                  {letterText.split('\n\n').map((para, i) => (
                    <p key={i} style={{ textIndent: selectedStyle === 'latex-classic' ? '1.5em' : '0' }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>PDF Filename:</span>
            <input
              type="text"
              className="form-input"
              style={{ width: '260px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
            >
              <FileDown size={16} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleMarkApplied}
              title="Mark offer as Applied"
            >
              <CheckCircle2 size={16} />
              <span>Mark Applied</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

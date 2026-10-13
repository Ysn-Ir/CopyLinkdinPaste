import React, { useState, useEffect } from 'react'
import {
  X,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Mail,
  MessageSquare,
  Globe,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { CATEGORIES, APPLICATION_STATUSES } from '../data/categories.js'
import { MetadataFetcher } from '../services/metadataFetcher.js'
import { ParserService } from '../services/parser.js'

export function OfferModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  cvList = [],
}) {
  const [activeTab, setActiveTab] = useState('link') // 'link' | 'text'
  const [linkInput, setLinkInput] = useState('')
  const [postTextInput, setPostTextInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: 'Paris, France (Hybride)',
    category: 'ai-ml',
    channel: 'email',
    recruiterEmail: '',
    recruiterName: '',
    sourceUrl: '',
    imageUrl: '',
    skills: [],
    skillsString: '',
    description: '',
    status: 'to_apply',
    attachedCvTag: 'CV - AI & Machine Learning',
    notes: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        skillsString: (initialData.skills || []).join(', '),
      })
      setLinkInput(initialData.sourceUrl || '')
      setPostTextInput(initialData.description || '')
    } else {
      // Reset form
      setFormData({
        title: '',
        company: '',
        location: 'Paris, France (Hybride)',
        category: 'ai-ml',
        channel: 'email',
        recruiterEmail: '',
        recruiterName: '',
        sourceUrl: '',
        imageUrl: '',
        skills: [],
        skillsString: 'Python, PyTorch, LangChain',
        description: '',
        status: 'to_apply',
        attachedCvTag: cvList[0]?.name || 'CV - AI & Machine Learning',
        notes: '',
      })
      setLinkInput('')
      setPostTextInput('')
    }
    setStatusMessage(null)
  }, [initialData, isOpen, cvList])

  if (!isOpen) return null

  // Fetch link preview
  const handleFetchLink = async () => {
    if (!linkInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid URL' })
      return
    }

    setIsLoading(true)
    setStatusMessage({ type: 'info', text: 'Fetching link metadata & image preview...' })

    try {
      const meta = await MetadataFetcher.fetchUrlMetadata(linkInput.trim())
      
      // Also run parser on title + description
      const parsed = ParserService.parsePostText(`${meta.title}\n${meta.description}`)

      // Determine matching CV
      const categoryMeta = CATEGORIES.find((c) => c.id === parsed.category)
      const matchingCv = cvList.find((cv) => cv.category === parsed.category)?.name || categoryMeta?.defaultCvTag

      setFormData((prev) => ({
        ...prev,
        title: meta.title || prev.title || 'PFE Internship',
        company: parsed.company || meta.siteName || prev.company,
        sourceUrl: meta.url || linkInput.trim(),
        imageUrl: meta.image || prev.imageUrl,
        description: meta.description || prev.description,
        category: parsed.category || prev.category,
        channel: parsed.recruiterEmail ? 'email' : 'external',
        recruiterEmail: parsed.recruiterEmail || prev.recruiterEmail,
        skills: parsed.skills.length > 0 ? parsed.skills : prev.skills,
        skillsString: parsed.skills.length > 0 ? parsed.skills.join(', ') : prev.skillsString,
        attachedCvTag: matchingCv || prev.attachedCvTag,
      }))

      setStatusMessage({ type: 'success', text: 'Link metadata successfully captured!' })
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to fetch: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  // Parse raw post text
  const handleParseText = () => {
    if (!postTextInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste post content to analyze' })
      return
    }

    setIsLoading(true)
    setStatusMessage({ type: 'info', text: 'Analyzing text with smart entity extraction...' })

    setTimeout(() => {
      try {
        const parsed = ParserService.parsePostText(postTextInput)
        const categoryMeta = CATEGORIES.find((c) => c.id === parsed.category)
        const matchingCv = cvList.find((cv) => cv.category === parsed.category)?.name || categoryMeta?.defaultCvTag

        setFormData((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          company: parsed.company || prev.company,
          location: parsed.location || prev.location,
          category: parsed.category,
          channel: parsed.channel,
          recruiterEmail: parsed.recruiterEmail,
          recruiterName: parsed.recruiterName,
          skills: parsed.skills,
          skillsString: parsed.skills.join(', '),
          description: postTextInput,
          attachedCvTag: matchingCv || prev.attachedCvTag,
        }))

        setStatusMessage({
          type: 'success',
          text: `Extracted: ${parsed.category.toUpperCase()} | Recruiter: ${parsed.recruiterEmail || 'No email found (Portal only)'}`,
        })
      } catch (err) {
        setStatusMessage({ type: 'error', text: `Extraction error: ${err.message}` })
      } finally {
        setIsLoading(false)
      }
    }, 200)
  }

  // Category change should auto-suggest matching CV
  const handleCategoryChange = (newCat) => {
    const matchingCv = cvList.find((cv) => cv.category === newCat)?.name
    const catMeta = CATEGORIES.find((c) => c.id === newCat)
    setFormData((prev) => ({
      ...prev,
      category: newCat,
      attachedCvTag: matchingCv || catMeta?.defaultCvTag || prev.attachedCvTag,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setStatusMessage({ type: 'error', text: 'Job title is required' })
      return
    }

    const skillsArray = formData.skillsString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    onSave({
      ...formData,
      skills: skillsArray,
      updatedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} className="text-gradient" />
            <h2 style={{ fontSize: '1.25rem' }}>
              {initialData ? 'Edit PFE Opportunity' : 'New PFE / Job Opportunity'}
            </h2>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Ingestion Tabs */}
          <div className="ingest-tabs">
            <button
              type="button"
              className={`ingest-tab-btn ${activeTab === 'link' ? 'active' : ''}`}
              onClick={() => setActiveTab('link')}
            >
              <LinkIcon size={16} />
              <span>Paste URL Link</span>
            </button>
            <button
              type="button"
              className={`ingest-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              <FileText size={16} />
              <span>Paste Raw Post Text</span>
            </button>
          </div>

          {/* Quick Input based on tab */}
          {activeTab === 'link' ? (
            <div className="form-group">
              <label className="form-label">Offer / Post URL (LinkedIn, Indeed, Career Site):</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://www.linkedin.com/posts/... or https://indeed.com/..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchLink())}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFetchLink}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={16} className="pulse-glow" /> : <Sparkles size={16} />}
                  <span>Fetch Preview</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Paste Post Content (Recruiter text from LinkedIn/socials):</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Paste the recruiter's post text here: 'Bonjour, nous recrutons un stagiaire PFE en IA... contact: rh@tech.com'..."
                value={postTextInput}
                onChange={(e) => setPostTextInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleParseText}
                disabled={isLoading}
                style={{ alignSelf: 'flex-start', marginTop: '0.4rem' }}
              >
                {isLoading ? <Loader2 size={16} className="pulse-glow" /> : <Sparkles size={16} />}
                <span>Auto-Extract Details</span>
              </button>
            </div>
          )}

          {/* Status Alert */}
          {statusMessage && (
            <div
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor:
                  statusMessage.type === 'error'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : statusMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(14, 165, 233, 0.15)',
                color:
                  statusMessage.type === 'error'
                    ? '#f87171'
                    : statusMessage.type === 'success'
                    ? '#34d399'
                    : '#38bdf8',
                border: '1px solid currentColor',
              }}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <hr style={{ borderColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />

          {/* Main Form Fields */}
          <form onSubmit={handleSubmit} id="offer-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Job Title / Offer Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Stage PFE: Ingénieur IA & NLP"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mistral AI, Thales..."
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Domain / Category</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '10.5px', cursor: 'pointer', padding: 0 }}
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                  >
                    {isCustomCategory ? 'Pick standard' : 'Custom category'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Embedded Rust, Robotics, Quant..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                ) : (
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                    <option value="custom">Custom (Type any domain)...</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Pipeline Status</label>
                <select
                  className="form-select"
                  value={formData.status || 'to_apply'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="saved">Saved (Draft)</option>
                  <option value="to_apply">To Apply</option>
                  <option value="ready">Ready to Send</option>
                  <option value="applied">Contacted / Applied</option>
                  <option value="interview">Interview Scheduled</option>
                  <option value="offer">Offer Received</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location / Work Mode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Paris / Télétravail / Casablanca"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            {/* Application Channel Selector */}
            <div className="form-group">
              <label className="form-label">How to Apply (Application Channel):</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: formData.channel === 'email' ? '#34d399' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={formData.channel === 'email'}
                    onChange={() => setFormData({ ...formData, channel: 'email' })}
                  />
                  <Mail size={15} />
                  <span>Direct Recruiter Email</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: formData.channel === 'direct_contact' ? '#f59e0b' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="direct_contact"
                    checked={formData.channel === 'direct_contact'}
                    onChange={() => setFormData({ ...formData, channel: 'direct_contact' })}
                  />
                  <MessageSquare size={15} />
                  <span>Direct DM / WhatsApp</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: formData.channel === 'external' ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="external"
                    checked={formData.channel === 'external'}
                    onChange={() => setFormData({ ...formData, channel: 'external' })}
                  />
                  <Globe size={15} />
                  <span>External Portal / ATS</span>
                </label>
              </div>
            </div>

            {/* Conditional Channel Fields */}
            {formData.channel === 'email' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Recruiter / Application Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="recruiter@company.com"
                    value={formData.recruiterEmail || ''}
                    onChange={(e) => setFormData({ ...formData, recruiterEmail: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recruiter Contact Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Marie Laurent"
                    value={formData.recruiterName || ''}
                    onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {formData.channel === 'direct_contact' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Sharer LinkedIn Profile URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://linkedin.com/in/recruiter-profile"
                    value={formData.sharer?.profileUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sharer: { ...(formData.sharer || {}), profileUrl: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp or Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+33 6 12 34 56 78"
                    value={formData.sharer?.phone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sharer: { ...(formData.sharer || {}), phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {formData.channel === 'external' && (
              <div className="form-group">
                <label className="form-label">External Application Link</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://company.wd3.myworkdayjobs.com/..."
                  value={formData.sourceUrl || ''}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                />
              </div>
            )}

            {/* Sharer Details (Saved Profile of who posted it) */}
            <div style={{ background: 'var(--bg-app)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Post Sharer Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alexandre Dupont"
                  value={formData.sharer?.name || formData.recruiterName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recruiterName: e.target.value,
                      sharer: { ...(formData.sharer || {}), name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sharer Role / Headline</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lead Tech & AI Recruiter @ Mistral"
                  value={formData.sharer?.title || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sharer: { ...(formData.sharer || {}), title: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {/* CV Assignment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Attached CV Profile (from CV Vault)</label>
                <select
                  className="form-select"
                  value={formData.attachedCvTag}
                  onChange={(e) => setFormData({ ...formData, attachedCvTag: e.target.value })}
                >
                  {cvList.map((cv) => (
                    <option key={cv.id} value={cv.name}>
                      {cv.name}
                    </option>
                  ))}
                  <option value="CV - Custom">CV - Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Image Banner / Flyer URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://image-url.com/flyer.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Tech Skills */}
            <div className="form-group">
              <label className="form-label">Tech Skills / Keywords (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Python, PyTorch, React, Docker..."
                value={formData.skillsString}
                onChange={(e) => setFormData({ ...formData, skillsString: e.target.value })}
              />
            </div>

            {/* Description & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Full Post Text or Job Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Paste recruiter post text or requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Private Notes & Action Plan</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Sent message to Alexandre on LinkedIn; Scheduled follow-up on Thursday..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="offer-form" className="btn btn-primary">
            <CheckCircle2 size={16} />
            <span>{initialData ? 'Update Offer' : 'Save Offer to Board'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

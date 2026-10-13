import React, { useState } from 'react'
import {
  X,
  FileText,
  Upload,
  Plus,
  Trash2,
  Check,
  User,
  Sparkles,
  Award,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories.js'

export function CVManagerModal({
  isOpen,
  onClose,
  cvList,
  onSaveCvs,
  candidateProfile,
  onSaveProfile,
}) {
  const [profile, setProfile] = useState(candidateProfile)
  const [cvs, setCvs] = useState(cvList)
  const [newCvName, setNewCvName] = useState('')
  const [newCvCategory, setNewCvCategory] = useState('ai-ml')
  const [saveFeedback, setSaveFeedback] = useState(false)

  if (!isOpen) return null

  const handleProfileChange = (field, val) => {
    setProfile((prev) => ({ ...prev, [field]: val }))
  }

  const handleAddCv = (e) => {
    e.preventDefault()
    if (!newCvName.trim()) return

    const newCv = {
      id: `cv-${Date.now()}`,
      name: newCvName.trim(),
      category: newCvCategory,
      fileName: `${newCvName.trim().replace(/\s+/g, '_')}.pdf`,
      fileSize: '210 KB',
      updatedAt: new Date().toISOString(),
      isDefault: false,
    }

    const updated = [...cvs, newCv]
    setCvs(updated)
    setNewCvName('')
  }

  const handleDeleteCv = (id) => {
    const updated = cvs.filter((c) => c.id !== id)
    setCvs(updated)
  }

  const handleCategoryChangeForCv = (cvId, newCat) => {
    const updated = cvs.map((c) => (c.id === cvId ? { ...c, category: newCat } : c))
    setCvs(updated)
  }

  const handleSaveAll = () => {
    onSaveProfile(profile)
    onSaveCvs(cvs)
    setSaveFeedback(true)
    setTimeout(() => {
      setSaveFeedback(false)
      onClose()
    }, 800)
  }

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
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>CV Vault & Candidate Profile</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configure multi-CV mapping by offer category
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Candidate Profile Details */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User size={16} className="text-gradient" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Your Candidate Information (For Email & PDF Auto-Fill)</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => handleProfileChange('fullName', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LinkedIn Profile URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.linkedIn}
                  onChange={(e) => handleProfileChange('linkedIn', e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Engineering Degree / School Specialization</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Master en Intelligence Artificielle & Génie Logiciel"
                  value={profile.degree}
                  onChange={(e) => handleProfileChange('degree', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* CV Category Auto-Mapping Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} className="text-gradient" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Multi-CV Vault & Category Auto-Attach</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Offers in matching category auto-select this CV
              </span>
            </div>

            {/* List of Registered CVs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {cvs.map((cv) => (
                <div
                  key={cv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(14, 18, 30, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div
                      style={{
                        padding: '0.4rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{cv.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cv.fileName} {cv.fileSize && `• ${cv.fileSize}`}
                      </div>
                    </div>
                  </div>

                  {/* Category Assignment Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Auto-attach for:</span>
                    <select
                      className="form-select"
                      style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      value={cv.category}
                      onChange={(e) => handleCategoryChangeForCv(cv.id, e.target.value)}
                    >
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.shortLabel}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-secondary btn-icon-only"
                      onClick={() => handleDeleteCv(cv.id)}
                      title="Remove this CV profile"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New CV Form */}
            <form onSubmit={handleAddCv} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
                placeholder="New CV Title (e.g. CV - Embedded & Robotics)"
                value={newCvName}
                onChange={(e) => setNewCvName(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={newCvCategory}
                onChange={(e) => setNewCvCategory(e.target.value)}
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortLabel}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary">
                <Plus size={16} />
                <span>Add CV Profile</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAll}>
            {saveFeedback ? <Check size={16} /> : <Award size={16} />}
            <span>{saveFeedback ? 'Saved!' : 'Save CV Profiles & Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

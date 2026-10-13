import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Tag,
  Palette,
  FileText,
  Key,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react'

const PRESET_COLORS = [
  { name: 'Purple', hex: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)' },
  { name: 'Cyan', hex: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.35)' },
  { name: 'Blue', hex: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
  { name: 'Emerald', hex: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
  { name: 'Rose', hex: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)' },
  { name: 'Amber', hex: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  { name: 'Indigo', hex: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.35)' },
  { name: 'Orange', hex: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)' },
]

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories = [],
  cvList = [],
  onAddCategory,
  onDeleteCategory,
}) {
  const [label, setLabel] = useState('')
  const [shortLabel, setShortLabel] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [defaultCvTag, setDefaultCvTag] = useState('')
  const [keywordsInput, setKeywordsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!label.trim()) return

    setIsSubmitting(true)
    const slug = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    const newCategory = {
      id: slug || `domain-${Date.now()}`,
      label: label.trim(),
      shortLabel: shortLabel.trim() || label.trim().slice(0, 14),
      color: selectedColor.hex,
      bgColor: selectedColor.bg,
      borderColor: selectedColor.border,
      defaultCvTag: defaultCvTag || (cvList[0]?.name || 'CV - General Engineering'),
      keywords: keywords.length > 0 ? keywords : [label.toLowerCase().trim()],
      isCustom: true,
    }

    try {
      await onAddCategory(newCategory)
      setLabel('')
      setShortLabel('')
      setKeywordsInput('')
      setDefaultCvTag('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeDomains = categories.filter((c) => c.id !== 'all')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Custom Domain Fields & AI Categorization
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Add your own engineering domains. The LLM dynamically categorizes offers at runtime!
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '16px 20px', gap: '18px' }}>
          {/* Active Domains List */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Active Domains ({activeDomains.length})</span>
              <span style={{ color: '#38bdf8' }}>LLM Dynamic Matching Enabled</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeDomains.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: cat.color,
                        boxShadow: `0 0 8px ${cat.color}66`,
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cat.label}
                        </span>
                        <span
                          className="badge-category"
                          style={{
                            fontSize: '9.5px',
                            padding: '1px 5px',
                            color: cat.color,
                            borderColor: cat.borderColor,
                          }}
                        >
                          {cat.shortLabel}
                        </span>
                        {cat.isCustom && (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 600,
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Keywords: {(cat.keywords || []).slice(0, 5).join(', ') || 'General'}
                        {cat.defaultCvTag ? ` • Attached CV: ${cat.defaultCvTag.replace('CV - ', '')}` : ''}
                      </div>
                    </div>
                  </div>

                  {cat.isCustom && (
                    <button
                      className="btn-icon"
                      style={{ color: '#f87171' }}
                      onClick={() => onDeleteCategory(cat.id)}
                      title={`Delete custom domain ${cat.label}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Domain Form */}
          <form
            onSubmit={handleCreate}
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: '#18181b',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '12.5px', fontWeight: 700 }}>
              <Plus size={14} />
              <span>Add New Domain Field</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Domain Name / Title *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="e.g. Robotics & Autonomous Systems"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Badge Label (Short)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="e.g. Robotics"
                  value={shortLabel}
                  onChange={(e) => setShortLabel(e.target.value)}
                />
              </div>
            </div>

            {/* Color Accent Picker */}
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((col) => {
                  const isSelected = selectedColor.hex === col.hex
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: col.hex,
                        border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.12s ease',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      }}
                      title={col.name}
                    >
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Default CV Selection */}
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Default CV Variant
              </label>
              <select
                className="form-select"
                style={{ height: '32px', fontSize: '11.5px' }}
                value={defaultCvTag}
                onChange={(e) => setDefaultCvTag(e.target.value)}
              >
                <option value="">-- Choose Default CV Tag --</option>
                {cvList.map((cv) => (
                  <option key={cv.id} value={cv.name}>
                    {cv.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keywords */}
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Keywords & Tech Stack (Comma separated)
              </label>
              <input
                type="text"
                className="form-input"
                style={{ height: '32px', fontSize: '12px' }}
                placeholder="e.g. ros, slam, lidar, autonomy, c++, kinematics, stm32"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                Keywords are automatically supplied to the LLM system prompt to guide runtime classification.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', height: '30px' }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontSize: '11.5px', height: '30px' }}
                disabled={!label.trim() || isSubmitting}
              >
                <Sparkles size={13} />
                <span>Save Domain & Register with LLM</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

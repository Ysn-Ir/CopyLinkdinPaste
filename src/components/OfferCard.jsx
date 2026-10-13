import React from 'react'
import {
  Mail,
  Globe,
  MessageSquare,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Edit3,
  Trash2,
  Send,
  User,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { CATEGORIES, APPLICATION_STATUSES } from '../data/categories.js'

export function OfferCard({
  offer,
  onEdit,
  onDelete,
  onOpenEmailStudio,
  onOpenCoverLetter,
  onOpenDirectContact,
  onStatusChange,
}) {
  const categoryMeta = CATEGORIES.find((c) => c.id === offer.category) || CATEGORIES[1]
  const statusMeta = APPLICATION_STATUSES.find((s) => s.id === offer.status) || APPLICATION_STATUSES[0]

  const handleStatusChangeInternal = (newStatus) => {
    onStatusChange(offer.id, newStatus)
    if (newStatus === 'applied' || newStatus === 'offer') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      })
    }
  }

  const formattedDate = new Date(offer.createdAt || Date.now()).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <article className="tool-card">
      {/* Banner / Header Image if present */}
      {offer.imageUrl && (
        <img
          src={offer.imageUrl}
          alt={offer.title}
          style={{
            width: '100%',
            height: '110px',
            objectFit: 'cover',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}

      {/* Badges Row */}
      <div className="card-top">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {offer.channel === 'email' && (
            <span className="badge-channel email" title="Recruiter email outreach">
              <Mail size={11} />
              <span>Direct Email</span>
            </span>
          )}
          {offer.channel === 'direct_contact' && (
            <span
              className="badge-channel"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.25)',
              }}
              title="LinkedIn DM or WhatsApp outreach"
            >
              <MessageSquare size={11} />
              <span>Direct DM</span>
            </span>
          )}
          {offer.channel === 'external' && (
            <span className="badge-channel external" title="Portal application">
              <Globe size={11} />
              <span>Portal Link</span>
            </span>
          )}

          <span
            className="badge-category"
            style={{
              color: categoryMeta.color,
              borderColor: categoryMeta.borderColor,
            }}
          >
            {categoryMeta.shortLabel}
          </span>
        </div>

        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={11} />
          {formattedDate}
        </span>
      </div>

      {/* Title & Company */}
      <div>
        <h3 className="card-title">{offer.title}</h3>
        <div className="card-meta-line" style={{ marginTop: '4px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{offer.company}</strong>
          {offer.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              • <MapPin size={11} /> {offer.location}
            </span>
          )}
        </div>
      </div>

      {/* Sharer Profile Preview if available */}
      {offer.sharer?.name && (
        <div
          style={{
            fontSize: '11px',
            color: '#c084fc',
            background: '#121215',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflow: 'hidden',
          }}
        >
          <User size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Shared by: <strong>{offer.sharer.name}</strong> {offer.sharer.title && `(${offer.sharer.title})`}
          </span>
        </div>
      )}

      {/* Recruiter Email preview if channel is email */}
      {offer.channel === 'email' && offer.recruiterEmail && (
        <div
          style={{
            fontSize: '11px',
            color: '#34d399',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Mail size={11} />
          <span>{offer.recruiterEmail}</span>
        </div>
      )}

      {/* Phone / WhatsApp if available */}
      {offer.sharer?.phone && (
        <div
          style={{
            fontSize: '11px',
            color: '#34d399',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>WhatsApp: {offer.sharer.phone}</span>
        </div>
      )}

      {/* Skills Pills */}
      {offer.skills && offer.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {offer.skills.slice(0, 5).map((skill) => (
            <span key={skill} className="skill-tag">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Attached CV Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={12} color="#3b82f6" />
          <span>{offer.attachedCvTag || 'CV - General'}</span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Auto-Matched</span>
      </div>

      {/* Pipeline Status Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Status:</span>
        <select
          className="form-select"
          style={{ width: 'auto', height: '24px', fontSize: '11px', padding: '1px 6px' }}
          value={offer.status || 'saved'}
          onChange={(e) => handleStatusChangeInternal(e.target.value)}
        >
          {APPLICATION_STATUSES.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions Footer */}
      <div className="card-actions">
        <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
          {offer.channel === 'email' && (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => onOpenEmailStudio(offer)}
            >
              <Send size={12} />
              <span>Email Studio</span>
            </button>
          )}

          {offer.channel === 'direct_contact' && (
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: '#a855f7', borderColor: '#a855f7', color: '#fff' }}
              onClick={() => onOpenDirectContact ? onOpenDirectContact(offer) : onOpenEmailStudio(offer)}
            >
              <MessageSquare size={12} />
              <span>Direct DM Studio</span>
            </button>
          )}

          {offer.channel === 'external' && (
            <>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => onOpenCoverLetter(offer)}
              >
                <FileText size={12} />
                <span>Cover Letter PDF</span>
              </button>

              {offer.sourceUrl && (
                <a
                  href={offer.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-icon"
                  title="Open Portal Link"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onEdit(offer)}
            title="Edit offer"
          >
            <Edit3 size={13} />
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => onDelete(offer.id)}
            title="Delete offer"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}

import React, { useState } from 'react'
import {
  Inbox,
  Sparkles,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories.js'

export function InboxView({
  offers = [],
  onQuickIngest,
  onResolveReview,
  onNavigate,
  isIngesting = false,
}) {
  const [inputText, setInputText] = useState('')

  const reviewNeededOffers = offers.filter((o) => o.needsUserReview)
  const recentOffers = offers.slice(0, 8)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onQuickIngest(inputText.trim())
    setInputText('')
  }

  return (
    <div className="workspace-view">
      {/* Top Paste / Ingestion Hero */}
      <div className="kpi-card" style={{ padding: '16px' }}>
        <div className="section-header" style={{ marginBottom: '10px' }}>
          <span className="section-title">
            <Sparkles size={16} color="#ffffff" />
            <span>Autonomous Ingestion Engine</span>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Paste URL (LinkedIn, Indeed, Career Site) or raw post text
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, height: '36px' }}
            placeholder="https://linkedin.com/posts/... or paste raw recruiter post text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isIngesting}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: '36px', padding: '0 16px' }}
            disabled={isIngesting || !inputText.trim()}
          >
            {isIngesting ? <Loader2 size={14} className="pulse-glow" /> : <Sparkles size={14} />}
            <span>{isIngesting ? 'Agent Analyzing...' : 'Run Ingestion'}</span>
          </button>
        </form>
      </div>

      {/* Review Queue (Confidence < 0.85 Save-or-Ask flow) */}
      {reviewNeededOffers.length > 0 && (
        <div
          className="kpi-card"
          style={{
            border: '1px solid #eab308',
            background: 'rgba(234, 179, 8, 0.03)',
            padding: '16px',
          }}
        >
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <span className="section-title" style={{ color: '#fef08a' }}>
              <AlertCircle size={16} color="#eab308" />
              <span>Review Required ({reviewNeededOffers.length}) — Confidence Below 0.85</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Pick the right category with one click instead of guessing
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reviewNeededOffers.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#121215',
                  border: '1px solid var(--border-default)',
                  borderRadius: '4px',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {item.company} • Confidence: <strong>{item.confidence || 0.72}</strong>
                  </div>
                </div>

                {/* 1-tap category picker with agent's top guesses */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Select:</span>
                  {(item.top3Guesses || ['ai-ml', 'data', 'dev-fullstack']).map((catId) => {
                    const cat = CATEGORIES.find((c) => c.id === catId)
                    if (!cat) return null
                    return (
                      <button
                        key={catId}
                        className="btn btn-secondary"
                        onClick={() => onResolveReview(item.id, catId)}
                      >
                        <Check size={12} />
                        <span>{cat.shortLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Ingestions Table */}
      <div className="kpi-card" style={{ padding: '16px' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <span className="section-title">Recent Ingestions ({offers.length})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {recentOffers.map((offer) => {
            const cat = CATEGORIES.find((c) => c.id === offer.category)
            return (
              <div
                key={offer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge-channel ${offer.channel}`}>{offer.channel}</span>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{offer.title}</strong>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>
                      at {offer.company}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className="badge-category"
                    style={{ color: cat?.color, borderColor: cat?.borderColor }}
                  >
                    {cat?.shortLabel}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {offer.attachedCvTag}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      onNavigate(offer.channel === 'email' ? 'email-workspace' : 'external-workspace')
                    }
                  >
                    <span>View Card</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  Search,
  Command,
  PlusCircle,
  Inbox,
  Mail,
  MessageSquare,
  Globe,
  Kanban,
  FileText,
  Bot,
  Settings,
  ArrowRight,
  Layers,
} from 'lucide-react'

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onQuickIngest,
  onFilterCategory,
  onToggleDensity,
  density,
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClose(!isOpen)
      } else if (e.key === 'Escape' && isOpen) {
        onClose(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isUrl = /^https?:\/\//i.test(query.trim())

  const navItems = [
    { id: 'dashboard', label: 'Go to Dashboard & Analytics', icon: Layers },
    { id: 'inbox', label: 'Go to Inbox & Ingest', icon: Inbox },
    { id: 'email-workspace', label: 'Go to Email Offers Workspace', icon: Mail },
    { id: 'direct-contact', label: 'Go to Direct DM & WhatsApp Outreach', icon: MessageSquare },
    { id: 'external-workspace', label: 'Go to External Portals & Cover Letters', icon: Globe },
    { id: 'pipeline', label: 'Go to Pipeline Kanban Board', icon: Kanban },
    { id: 'cv-vault', label: 'Go to CV Vault & Profiles', icon: FileText },
    { id: 'agent-console', label: 'Go to AI Agent Console & Traces', icon: Bot },
    { id: 'settings', label: 'Go to Settings & Profile', icon: Settings },
  ]

  const filteredNav = navItems.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelectNav = (id) => {
    onNavigate(id)
    onClose(false)
  }

  const handleIngestNow = () => {
    if (!query.trim()) return
    onQuickIngest(query.trim())
    setQuery('')
    onClose(false)
  }

  return (
    <div className="cmd-overlay" onClick={() => onClose(false)}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            className="cmd-input"
            placeholder="Type a command, or paste a link/text to ingest..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (isUrl || query.length > 20) {
                  handleIngestNow()
                } else if (filteredNav.length > 0) {
                  handleSelectNav(filteredNav[0].id)
                }
              }
            }}
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="cmd-list">
          {/* If URL or raw post is entered, show instant ingest action */}
          {query.trim().length > 3 && (
            <button className="cmd-item" onClick={handleIngestNow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={15} color="#ffffff" />
                <span>
                  <strong>Ingest Offer:</strong> "{query.slice(0, 45)}..."
                </span>
              </div>
              <span className="kbd">↵ Enter</span>
            </button>
          )}

          {/* Navigation Items */}
          {filteredNav.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className="cmd-item"
                onClick={() => handleSelectNav(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon size={15} color="var(--text-secondary)" />
                  <span>{item.label}</span>
                </div>
                <ArrowRight size={13} color="var(--text-tertiary)" />
              </button>
            )
          })}

          {/* Quick Density Toggle */}
          <button
            className="cmd-item"
            onClick={() => {
              onToggleDensity()
              onClose(false)
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Command size={15} color="var(--text-secondary)" />
              <span>
                Toggle Density (Current: <strong>{density}</strong>)
              </span>
            </div>
            <span className="kbd">Tab</span>
          </button>
        </div>
      </div>
    </div>
  )
}

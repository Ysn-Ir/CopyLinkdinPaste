import React from 'react'
import {
  Compass,
  Layers,
  Clipboard,
  Inbox,
  Mail,
  MessageSquare,
  Globe,
  Kanban,
  BarChart3,
  FileText,
  Bot,
  Settings,
  Sliders,
  Command,
  Brain,
  Database,
  Code2,
  Cloud,
  ShieldCheck,
  Cpu,
  Briefcase,
  Smartphone,
  Plus,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories.js'

const CATEGORY_ICONS = {
  'ai-ml': Brain,
  'data': Database,
  'dev-fullstack': Code2,
  'devops-cloud': Cloud,
  'cybersecurity': ShieldCheck,
  'embedded-iot': Cpu,
  'other': Briefcase,
}

export function Sidebar({
  activeView,
  onNavigate,
  offers = [],
  categories = [],
  onOpenCategoryManager,
  cvCount = 5,
  clipCount = 0,
  density,
  onToggleDensity,
  onOpenCommandPalette,
  activeCategory = 'all',
  onSelectCategory,
  networkIp,
  onOpenMobileConnect,
}) {
  const emailOffersCount = offers.filter((o) => o.channel === 'email').length
  const directOffersCount = offers.filter((o) => o.channel === 'direct_contact').length
  const externalOffersCount = offers.filter((o) => o.channel === 'external').length
  const reviewCount = offers.filter((o) => o.needsUserReview).length

  const mainWorkspaces = [
    { id: 'command-center', label: 'Command Center', icon: Layers, count: offers.length },
    { id: 'clip-vault', label: 'Universal Clip Vault', icon: Clipboard, count: clipCount > 0 ? clipCount : null },
    { id: 'inbox', label: 'Review Queue', icon: Inbox, count: reviewCount > 0 ? reviewCount : null, alert: reviewCount > 0 },
    { id: 'pipeline', label: 'Pipeline Board', icon: Kanban, count: null },
    { id: 'dashboard', label: 'Analytics & KPIs', icon: BarChart3, count: null },
  ]

  const channelWorkspaces = [
    { id: 'email-workspace', label: 'Direct Email Studio', icon: Mail, count: emailOffersCount, color: '#10b981' },
    { id: 'direct-contact', label: 'Direct DM & WhatsApp', icon: MessageSquare, count: directOffersCount, color: '#c084fc' },
    { id: 'external-workspace', label: 'External Portals & ATS', icon: Globe, count: externalOffersCount, color: '#60a5fa' },
  ]

  const toolViews = [
    { id: 'cv-vault', label: 'CV Vault & Matching', icon: FileText, count: cvCount },
    { id: 'agent-console', label: 'Agent Console', icon: Bot, count: 'live' },
    { id: 'settings', label: 'Settings & Android Hub', icon: Settings, count: null },
  ]

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge" onClick={() => onNavigate('command-center')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <Compass size={14} />
          </div>
          <span className="sidebar-label" style={{ letterSpacing: '0.04em' }}>CAREER COMMAND</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-content">
        {/* 1. Core Workspaces */}
        <div className="sidebar-nav-group">
          <div className="sidebar-section-title">Workspaces</div>
          {mainWorkspaces.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <div className="nav-item-left">
                  <Icon size={15} />
                  <span className="sidebar-label">{item.label}</span>
                </div>
                {item.count !== null && (
                  <span
                    className="nav-counter sidebar-label"
                    style={item.alert ? { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' } : {}}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 2. Channel Split Workspaces */}
        <div className="sidebar-nav-group">
          <div className="sidebar-section-title">Outreach Channels</div>
          {channelWorkspaces.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <div className="nav-item-left">
                  <Icon size={15} style={{ color: item.color }} />
                  <span className="sidebar-label">{item.label}</span>
                </div>
                {item.count !== null && (
                  <span className="nav-counter sidebar-label">{item.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 3. Category Domains Breakdown */}
        <div className="sidebar-nav-group">
          <div
            className="sidebar-section-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingRight: '6px',
            }}
          >
            <span>Domain Fields</span>
            {onOpenCategoryManager && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCategoryManager()
                }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '1px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9.5px',
                  fontWeight: 600,
                }}
                title="Add & configure custom engineering domains"
              >
                <Plus size={10} />
                <span>Add</span>
              </button>
            )}
          </div>
          {((categories && categories.length > 0) ? categories : CATEGORIES).filter((c) => c.id !== 'all').map((cat) => {
            const count = offers.filter((o) => o.category === cat.id).length
            const isFilterActive = activeView === 'command-center' && activeCategory === cat.id

            return (
              <button
                key={cat.id}
                className={`nav-item ${isFilterActive ? 'active' : ''}`}
                onClick={() => {
                  if (onSelectCategory) {
                    onSelectCategory(cat.id)
                  } else {
                    onNavigate('command-center')
                  }
                }}
                style={{ padding: '4px 8px' }}
                title={`Filter by ${cat.label}`}
              >
                <div className="nav-item-left">
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="sidebar-label" style={{ fontSize: '12px' }}>
                    {cat.shortLabel || cat.label}
                  </span>
                </div>
                <span
                  className="sidebar-label"
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: count > 0 ? 'var(--text-secondary)' : 'var(--text-disabled)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 4. Tools & Configuration */}
        <div className="sidebar-nav-group">
          <div className="sidebar-section-title">System & Network</div>
          {toolViews.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <div className="nav-item-left">
                  <Icon size={15} />
                  <span className="sidebar-label">{item.label}</span>
                </div>
                {item.count !== null && (
                  <span
                    className="nav-counter sidebar-label"
                    style={item.count === 'live' ? { color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)' } : {}}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Network / Android Live Chip */}
      <button
        onClick={onOpenMobileConnect}
        className="sidebar-label"
        style={{
          width: '100%',
          padding: '7px 12px',
          fontSize: '10.5px',
          color: 'var(--text-tertiary)',
          borderTop: '1px solid var(--border-subtle)',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(168, 85, 247, 0.05)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
        title="Ouvrir le menu d'appairage mobile & QR code"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={13} color="#a855f7" />
          <span style={{ color: '#d8b4fe', fontWeight: 600 }}>Mobile App</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', color: '#93c5fd', fontSize: '10px' }}>
          {networkIp || '192.168.1.12'}
        </span>
      </button>

      {/* Footer Controls */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          className="btn btn-ghost"
          style={{ height: '24px', fontSize: '11px', padding: '0 6px' }}
          onClick={onToggleDensity}
          title="Toggle density between Comfortable and Compact"
        >
          <Sliders size={12} />
          <span className="sidebar-label">{density === 'comfortable' ? 'Compact' : 'Comfortable'}</span>
        </button>

        <button
          className="btn btn-ghost"
          style={{ height: '24px', fontSize: '11px', padding: '0 6px' }}
          onClick={() => onOpenCommandPalette(true)}
          title="Open command palette (⌘K)"
        >
          <Command size={12} />
          <span className="sidebar-label">⌘K</span>
        </button>
      </div>
    </aside>
  )
}

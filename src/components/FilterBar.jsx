import React from 'react'
import {
  Search,
  Mail,
  Globe,
  Layers,
  Brain,
  Database,
  Code2,
  Cloud,
  ShieldCheck,
  Cpu,
  Briefcase,
  X,
} from 'lucide-react'
import { CATEGORIES, APPLICATION_STATUSES } from '../data/categories.js'

const ICON_MAP = {
  Layers,
  Brain,
  Database,
  Code2,
  Cloud,
  ShieldCheck,
  Cpu,
  Briefcase,
}

export function FilterBar({
  selectedChannel,
  onSelectChannel,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  offers = [],
}) {
  const emailCount = offers.filter((o) => o.channel === 'email').length
  const externalCount = offers.filter((o) => o.channel === 'external').length

  const getCategoryCount = (catId) => {
    if (catId === 'all') return offers.length
    return offers.filter((o) => o.category === catId).length
  }

  return (
    <div className="controls-panel">
      {/* Row 1: Channel Segmentation & Status Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="channel-segmented-control">
          <button
            className={`channel-tab ${selectedChannel === 'all' ? 'active' : ''}`}
            onClick={() => onSelectChannel('all')}
          >
            <span>All Channels</span>
            <span className="channel-tab-count">{offers.length}</span>
          </button>

          <button
            className={`channel-tab ${selectedChannel === 'email' ? 'active' : ''}`}
            onClick={() => onSelectChannel('email')}
          >
            <Mail size={15} />
            <span>Direct Email</span>
            <span className="channel-tab-count">{emailCount}</span>
          </button>

          <button
            className={`channel-tab ${selectedChannel === 'external' ? 'active' : ''}`}
            onClick={() => onSelectChannel('external')}
          >
            <Globe size={15} />
            <span>External Portals</span>
            <span className="channel-tab-count">{externalCount}</span>
          </button>
        </div>

        {/* Status Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Status:
          </span>
          <select
            className="status-select"
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
          >
            <option value="all">All Statuses ({offers.length})</option>
            {APPLICATION_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label} ({offers.filter((o) => o.status === st.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Category Filter Chips */}
      <div className="category-scroll-container">
        {CATEGORIES.map((cat) => {
          const IconComponent = ICON_MAP[cat.icon] || Layers
          const isActive = selectedCategory === cat.id
          const count = getCategoryCount(cat.id)

          return (
            <button
              key={cat.id}
              className={`category-chip ${isActive ? 'active' : ''}`}
              style={{
                color: isActive ? cat.color : undefined,
                backgroundColor: isActive ? cat.bgColor : undefined,
                borderColor: isActive ? cat.borderColor : undefined,
              }}
              onClick={() => onSelectCategory(cat.id)}
            >
              <IconComponent size={14} />
              <span>{cat.shortLabel}</span>
              <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Row 3: Search Bar */}
      <div className="search-view-row">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by role, company, skills (e.g. PyTorch, React, Capgemini)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

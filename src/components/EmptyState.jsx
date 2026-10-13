import React from 'react'
import { PlusCircle, SearchX } from 'lucide-react'

export function EmptyState({ isFiltered, onResetFilters, onOpenAddModal }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '4rem 1.5rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--border-card)',
        margin: '2rem 0',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          color: '#818cf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}
      >
        {isFiltered ? <SearchX size={26} /> : <PlusCircle size={26} />}
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>
        {isFiltered ? 'No opportunities match your filter' : 'Your board is clear'}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
        {isFiltered
          ? 'Try adjusting your category selection, channel tabs, or search query.'
          : 'Paste an offer link from LinkedIn or Indeed, or copy/paste raw recruiter post text to begin tracking.'}
      </p>

      {isFiltered ? (
        <button className="btn btn-secondary" onClick={onResetFilters}>
          Clear All Filters
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onOpenAddModal}>
          <PlusCircle size={16} />
          <span>Paste First Offer</span>
        </button>
      )}
    </div>
  )
}

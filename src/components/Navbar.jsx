import React from 'react'
import {
  PlusCircle,
  FileText,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react'
import { RadarLogo } from './RadarLogo.jsx'

export function Navbar({ onOpenAddModal, onOpenCvVault, onExportBackup, onImportBackup, cvCount = 5 }) {
  const fileInputRef = React.useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      onImportBackup(event.target.result)
    }
    reader.readAsText(file)
  }

  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <RadarLogo size={26} />
        </div>
        <div>
          <h1 className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            RADAR
            <span style={{ fontSize: '10px', color: '#FF3B30', fontWeight: '800', letterSpacing: '0.05em' }}>
              ● LIVE
            </span>
          </h1>
          <div className="brand-subtitle">Signal Intelligence & Opportunity Vault</div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Hidden file input for JSON import */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleFileChange}
        />

        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON backup"
        >
          <Upload size={16} />
          <span className="hidden-mobile">Import</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onExportBackup}
          title="Export backup as JSON"
        >
          <Download size={16} />
          <span className="hidden-mobile">Backup</span>
        </button>

        <button
          className="btn btn-accent"
          onClick={onOpenCvVault}
          title="Manage your CVs and Category Mappings"
        >
          <FileText size={16} />
          <span>CV Vault</span>
          <span className="channel-tab-count">{cvCount}</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={onOpenAddModal}
        >
          <PlusCircle size={18} />
          <span>Paste & Add Offer</span>
        </button>
      </div>
    </header>
  )
}

import React from 'react'
import {
  Compass,
  PlusCircle,
  FileText,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react'

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
        <div className="brand-logo">
          <Compass size={24} />
        </div>
        <div>
          <h1 className="brand-title">
            PFE<span className="text-gradient">HUNTER</span>
          </h1>
          <div className="brand-subtitle">Career & Application Command Center</div>
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

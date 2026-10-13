import React, { useState, useEffect, useRef } from 'react'
import {
  Settings,
  User,
  Download,
  Upload,
  Check,
  Layers,
  Sparkles,
  Zap,
  Save,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Globe,
  Sliders,
  RefreshCw,
  Smartphone,
  Wifi,
  Server,
  Copy,
  Terminal,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories.js'
import { AiService } from '../services/aiService.js'
import { StorageService } from '../services/storage.js'

export function SettingsView({
  candidateProfile,
  onSaveProfile,
  aiConfig,
  onSaveAiConfig,
  onExportBackup,
  onImportBackup,
  offersCount = 0,
  onOpenMobileConnect,
}) {
  const [profile, setProfile] = useState({
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    degree: '',
    city: '',
    skills: '',
    projects: '',
    tonePreference: '',
    customInstructions: '',
    bio: '',
    customLinks: [],
    ...candidateProfile,
  })

  const [ai, setAi] = useState({
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.25,
    customSystemPrompt: '',
    ...aiConfig,
  })

  const [customModelMode, setCustomModelMode] = useState(false)
  const [isTestingAi, setIsTestingAi] = useState(false)
  const [aiTestResult, setAiTestResult] = useState(null)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [dbStats, setDbStats] = useState(null)
  const [networkInfo, setNetworkInfo] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [copiedLink, setCopiedLink] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (candidateProfile) {
      setProfile((prev) => ({ ...prev, ...candidateProfile }))
    }
  }, [candidateProfile])

  useEffect(() => {
    if (aiConfig) {
      setAi((prev) => ({ ...prev, ...aiConfig }))
    }
  }, [aiConfig])

  // Fetch PostgreSQL/FastAPI database & network statistics
  const fetchStats = async () => {
    setIsLoadingStats(true)
    try {
      const stats = await StorageService.getDbStats()
      const net = await StorageService.getNetworkInfo()
      setDbStats(stats)
      setNetworkInfo(net)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleProfileChange = (key, val) => {
    setProfile((prev) => ({ ...prev, [key]: val }))
  }

  const handleAiChange = (key, val) => {
    setAi((prev) => ({ ...prev, [key]: val }))
  }

  const handleAddCustomLink = () => {
    const current = profile.customLinks || []
    setProfile((prev) => ({
      ...prev,
      customLinks: [...current, { id: `link-${Date.now()}`, title: '', url: '' }],
    }))
  }

  const handleUpdateCustomLink = (id, field, val) => {
    const updated = (profile.customLinks || []).map((l) =>
      l.id === id ? { ...l, [field]: val } : l
    )
    setProfile((prev) => ({ ...prev, customLinks: updated }))
  }

  const handleRemoveCustomLink = (id) => {
    const updated = (profile.customLinks || []).filter((l) => l.id !== id)
    setProfile((prev) => ({ ...prev, customLinks: updated }))
  }

  const handleSaveAll = () => {
    onSaveProfile(profile)
    onSaveAiConfig(ai)
    setSavedFeedback(true)
    fetchStats()
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  const handleTestGroqKey = async () => {
    if (!ai.apiKey?.trim()) {
      setAiTestResult({ ok: false, msg: 'Please enter a Groq API key first' })
      return
    }
    setIsTestingAi(true)
    setAiTestResult(null)
    try {
      await AiService.testConnection(ai.apiKey, ai.model)
      setAiTestResult({ ok: true, msg: 'Connection successful! Groq LLM inference is active and responding.' })
    } catch (err) {
      setAiTestResult({ ok: false, msg: `Connection failed: ${err.message}` })
    } finally {
      setIsTestingAi(false)
    }
  }

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
    <div className="workspace-view" style={{ padding: '16px', maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner with Global Save */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>System Settings & Profile Customization</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
            Complete freedom for candidate facts, zero-restraint AI configuration, and direct SQLite backend storage.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveAll} style={{ height: '32px' }}>
          {savedFeedback ? <Check size={14} /> : <Save size={14} />}
          <span>{savedFeedback ? 'All Saved in SQLite!' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* 1. AI ENGINE (GROQ) - TOTAL FREEDOM */}
      <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#ffffff" />
            <span className="section-title">AI Engine Settings (Groq API / Llama 3.3 — No Restraints)</span>
          </div>
          <span className="skill-tag" style={{ color: '#10b981' }}>LLM Agent Copilot</span>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
          Powered by ultra-fast Groq LLM inference. Analyzes raw LinkedIn posts, extracts recruiter profiles, determines channels (Email vs Direct DM vs Portal), and drafts outreach without generic corporate tone.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Groq API Key:</label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <span>Get free key</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="gsk_..."
                value={ai.apiKey || ''}
                onChange={(e) => handleAiChange('apiKey', e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestGroqKey}
                disabled={isTestingAi}
              >
                {isTestingAi ? <Loader2 size={13} className="pulse-glow" /> : <Zap size={13} />}
                <span>Test Ping</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Model Selection:</label>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: '10.5px', cursor: 'pointer', padding: 0 }}
                onClick={() => setCustomModelMode(!customModelMode)}
              >
                {customModelMode ? 'Pick from list' : 'Type custom model'}
              </button>
            </div>
            {customModelMode ? (
              <input
                type="text"
                className="form-input"
                placeholder="e.g. llama-3.3-70b-versatile, deepseek-r1-distill-llama-70b"
                value={ai.model || ''}
                onChange={(e) => handleAiChange('model', e.target.value)}
              />
            ) : (
              <select
                className="form-select"
                value={ai.model || 'llama-3.3-70b-versatile'}
                onChange={(e) => handleAiChange('model', e.target.value)}
              >
                <option value="openai/gpt-oss-120b">OpenAI GPT-OSS 120B (Recommended - Ultra-fast & High reasoning)</option>
                <option value="qwen/qwen3.8-27b">Qwen 3.8 27B (High speed, versatile)</option>
                <option value="openai/gpt-oss-20b">OpenAI GPT-OSS 20B (Instant latency)</option>
              </select>
            )}
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0 }}>
              Temperature (Creativity & Flexibility): <strong style={{ color: '#ffffff' }}>{ai.temperature ?? 0.25}</strong>
            </label>
            <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
              {ai.temperature < 0.2 ? 'Deterministic & strict' : ai.temperature > 0.7 ? 'Highly creative & freeform' : 'Balanced precision'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={ai.temperature ?? 0.25}
            onChange={(e) => handleAiChange('temperature', parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#ffffff' }}
          />
        </div>

        {/* AI Test Result Alert */}
        {aiTestResult && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: aiTestResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: aiTestResult.ok ? '#34d399' : '#f87171',
              border: `1px solid ${aiTestResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            {aiTestResult.ok ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
            <span>{aiTestResult.msg}</span>
          </div>
        )}

        {/* Custom AI Instructions (Total Freedom) */}
        <div className="form-group">
          <label className="form-label">Master AI Prompt Instructions (Complete Prompt Freedom — Zero Restraints):</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="e.g. Always write like an ambitious senior software engineer. Avoid corporate clichés like 'je me permets de vous contacter'. Emphasize my graduation project on LLM agents and multi-GPU fine-tuning. Write in French or English depending on context. Be direct, confident, and high-agency."
            value={ai.customSystemPrompt || ''}
            onChange={(e) => handleAiChange('customSystemPrompt', e.target.value)}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            These instructions will take top precedence in all AI drafts (Emails, LinkedIn notes, Cover letters, and Ingestion analysis).
          </span>
        </div>
      </div>

      {/* 2. CANDIDATE PROFILE & GROUNDED FACTS - COMPLETE FREEDOM */}
      <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#ffffff" />
            <span className="section-title">Candidate Profile & Grounded Experience (Complete Freedom)</span>
          </div>
          <span className="skill-tag" style={{ color: '#34d399' }}>Synced in SQLite</span>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
          All personal facts, links, and preferences saved here are grounded directly into your applications. You can add or edit any field with zero restrictions.
        </p>

        {/* Core Identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Khalil Ben Salem"
              value={profile.fullName || ''}
              onChange={(e) => handleProfileChange('fullName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professional Headline / Target Role</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ingénieur PFE en IA, NLP & Génie Logiciel"
              value={profile.headline || ''}
              onChange={(e) => handleProfileChange('headline', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="khalil@example.com"
              value={profile.email || ''}
              onChange={(e) => handleProfileChange('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+33 6 12 34 56 78"
              value={profile.phone || ''}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Number (Direct Contact)</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+33 6 12 34 56 78"
              value={profile.whatsapp || ''}
              onChange={(e) => handleProfileChange('whatsapp', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">City, Country & Mobility</label>
            <input
              type="text"
              className="form-input"
              placeholder="Paris, France (Full Remote / Worldwide Relocation)"
              value={profile.city || ''}
              onChange={(e) => handleProfileChange('city', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Degree & School / Specialization</label>
            <input
              type="text"
              className="form-input"
              placeholder="Master 2 / Diplôme d'Ingénieur en Informatique & Intelligence Artificielle"
              value={profile.degree || ''}
              onChange={(e) => handleProfileChange('degree', e.target.value)}
            />
          </div>
        </div>

        {/* Digital Profiles & Links */}
        <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Profiles & Social Links</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '24px', fontSize: '10.5px' }}
              onClick={handleAddCustomLink}
            >
              <Plus size={11} />
              <span>Add Custom Link</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://linkedin.com/in/khalil"
                value={profile.linkedIn || ''}
                onChange={(e) => handleProfileChange('linkedIn', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">GitHub URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://github.com/khalil"
                value={profile.github || ''}
                onChange={(e) => handleProfileChange('github', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Portfolio / Website</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://khalil.dev"
                value={profile.portfolio || ''}
                onChange={(e) => handleProfileChange('portfolio', e.target.value)}
              />
            </div>
          </div>

          {/* Arbitrary Custom Links (Total Freedom) */}
          {(profile.customLinks || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Custom Links (e.g. Hugging Face, Medium, Kaggle):</span>
              {profile.customLinks.map((link) => (
                <div key={link.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '160px' }}
                    placeholder="Link Name (e.g. HuggingFace)"
                    value={link.title}
                    onChange={(e) => handleUpdateCustomLink(link.id, 'title', e.target.value)}
                  />
                  <input
                    type="url"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="https://huggingface.co/..."
                    value={link.url}
                    onChange={(e) => handleUpdateCustomLink(link.id, 'url', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon-only"
                    style={{ height: '30px', width: '30px' }}
                    onClick={() => handleRemoveCustomLink(link.id)}
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Profile & Projects */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">Primary Tech Stack & Keywords (Comma separated)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Python, PyTorch, LangChain, Transformers, Docker, FastAPI, React, TypeScript..."
              value={profile.skills || ''}
              onChange={(e) => handleProfileChange('skills', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notable Projects & Achievements (AI context)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Developed autonomous agentic pipeline for PFE search; Fine-tuned 7B LLM on domain corpus..."
              value={profile.projects || ''}
              onChange={(e) => handleProfileChange('projects', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">Tone & Pitch Preference</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Direct, high-agency, confident, concise (no corporate clichés)"
              value={profile.tonePreference || ''}
              onChange={(e) => handleProfileChange('tonePreference', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Personal Bio & Target Goals (Freeform)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Seeking 6-month graduation internship in Generative AI / NLP starting March 2026..."
              value={profile.bio || ''}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. POSTGRESQL & FASTAPI BACKEND STORAGE */}
      <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} color="#ffffff" />
            <span className="section-title">Database Storage & FastAPI Backend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="skill-tag"
              style={{
                color: dbStats?.engine === 'postgresql' ? '#10b981' : '#f59e0b',
                background: dbStats?.engine === 'postgresql' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${dbStats?.engine === 'postgresql' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontWeight: 600,
              }}
            >
              {dbStats?.engine === 'postgresql' ? '🐘 PostgreSQL Active (Port 5432)' : 'SQLite WAL Active'}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              style={{ height: '24px', width: '24px' }}
              onClick={fetchStats}
              title="Refresh database diagnostics"
            >
              <RefreshCw size={12} className={isLoadingStats ? 'pulse-glow' : ''} />
            </button>
          </div>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
          Connected via SQLAlchemy to PostgreSQL (<span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>postgresql://postgres:root@localhost:5432/pfe_hunter</span>). All tables (offers, cv_vault, user_profile, ai_config) are auto-migrated on startup with seamless SQLite fallback if PostgreSQL is offline.
        </p>

        {/* Database Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ background: 'var(--bg-app)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Database Engine</div>
            <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px', color: 'var(--text-primary)' }}>
              {dbStats?.engine === 'postgresql' ? 'PostgreSQL 16' : 'SQLite WAL'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Persisted Offers</div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {dbStats?.counts?.offers ?? offersCount}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Active CV Variants</div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
              {dbStats?.counts?.cvs ?? 5}
            </div>
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Backend API Port</div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: '#4ade80' }}>
              FastAPI: {networkInfo?.backendPort || 8003}
            </div>
          </div>
        </div>

        {/* Backup and Restore Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileChange}
          />
          <button className="btn btn-secondary" onClick={onExportBackup}>
            <Download size={13} />
            <span>Export Database Backup (.JSON)</span>
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            <span>Restore Database from JSON</span>
          </button>
        </div>
      </div>

      {/* 4. ANDROID MOBILE & TAILSCALE NETWORK HUB */}
      <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={16} color="#10b981" />
            <span className="section-title">📱 Android Mobile & Network Access (Tailscale / LAN)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenMobileConnect && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  height: '26px',
                  padding: '0 10px',
                  fontSize: '11px',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-app)',
                  fontWeight: 600,
                }}
                onClick={onOpenMobileConnect}
              >
                <Smartphone size={12} />
                <span>Open Pairing QR Code</span>
              </button>
            )}
            <span className="skill-tag" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
              React Native & Expo Ready
            </span>
          </div>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Access this application natively on your Android smartphone or tablet over local Wi-Fi or remotely via Tailscale. The Vite server and FastAPI backend listen on <span style={{ fontFamily: 'var(--font-mono)', color: '#93c5fd' }}>0.0.0.0</span> so any device on your network can connect directly.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {/* LAN Wi-Fi Link Card */}
          <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                <Wifi size={14} />
                <span>Local Wi-Fi Network (LAN)</span>
              </div>
              <span className="skill-tag" style={{ fontSize: '10px' }}>Same Router</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Connect your Android phone to your home Wi-Fi and open:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                readOnly
                value={networkInfo?.localIps?.[0] ? `http://${networkInfo.localIps[0]}:5174` : 'http://192.168.1.12:5174'}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0 10px' }}
                onClick={() => {
                  const url = networkInfo?.localIps?.[0] ? `http://${networkInfo.localIps[0]}:5174` : 'http://192.168.1.12:5174'
                  navigator.clipboard.writeText(url)
                  setCopiedLink('lan')
                  setTimeout(() => setCopiedLink(null), 1800)
                }}
              >
                {copiedLink === 'lan' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copiedLink === 'lan' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Tailscale Remote VPN Card */}
          <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>
                <Server size={14} />
                <span>Tailscale Mesh VPN</span>
              </div>
              <span className="skill-tag" style={{ fontSize: '10px' }}>Anywhere 4G/5G</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              If Tailscale is installed on PC & Android, use your Tailscale IP:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                readOnly
                value="http://100.x.y.z:5174 (Your Tailscale IP)"
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0 10px' }}
                onClick={() => {
                  alert('On your Android phone:\n1. Open the Tailscale app\n2. Note this PC\'s 100.x.y.z IP\n3. Open Chrome on Android: http://100.x.y.z:5174')
                }}
              >
                <span>Guide</span>
              </button>
            </div>
          </div>
        </div>

        {/* Android PWA tip banner */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
            📱 Install as Android App (Add to Home Screen):
          </div>
          <ol style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: 1.6 }}>
            <li>Open the LAN URL in Chrome or Firefox on your Android phone.</li>
            <li>Tap the browser menu (<strong>⋮</strong> in top-right).</li>
            <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
            <li>The Career Command Center now opens like a native full-screen Android app!</li>
          </ol>
        </div>
      </div>

      {/* 5. DOCKER & CONTAINER DEPLOYMENT */}
      <div className="kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="#f59e0b" />
            <span className="section-title">One-Click Docker Deployment</span>
          </div>
          <span className="skill-tag" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>
            docker-compose.yml Ready
          </span>
        </div>

        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          To deploy the complete stack (PostgreSQL + FastAPI backend + Frontend) anywhere on Linux, Docker Desktop, or a home server:
        </p>

        <pre
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-default)',
            borderRadius: '4px',
            padding: '10px 14px',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            color: '#4ade80',
            overflowX: 'auto',
          }}
        >
          docker compose up -d --build
        </pre>
      </div>
    </div>
  )
}

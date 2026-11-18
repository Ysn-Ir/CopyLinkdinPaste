import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  RefreshCw,
  Sliders,
  Award,
  Layers,
  Send,
  Code,
  Briefcase,
  Eye,
  Edit3,
  Upload,
  CheckCircle2,
  FileCode,
  Zap,
  Save,
  RotateCcw,
} from 'lucide-react'

export function AtsResumeStudioView({ offers = [], candidateProfile, initialJob = null }) {
  const [selectedOfferId, setSelectedOfferId] = useState(initialJob?.id || (offers[0]?.id || 'custom'))
  const [customTitle, setCustomTitle] = useState(initialJob?.title || 'Senior Software Engineer')
  const [customDesc, setCustomDesc] = useState(
    initialJob?.description || 'Looking for an experienced engineer in Python, PyTorch, React, and scalable backend systems.'
  )

  // Input Base CV Mode: 'my_cv' (user pasted/uploaded latex/typst) vs 'template' (built-in template)
  const [cvSourceMode, setCvSourceMode] = useState('my_cv')

  // User's Own Base CV Text (LaTeX or Typst)
  const [userBaseCvText, setUserBaseCvText] = useState(() => {
    return localStorage.getItem('radar_user_base_cv') || `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.4cm))
#set text(font: "Liberation Sans", size: 10pt, fill: rgb("#000000"))

#align(center)[
  = Radar Operator
  operator@radar.local · +1 (555) 019-2834 · San Francisco, CA
  linkedin.com/in/radar-operator · github.com/radar-operator
]

== Professional Summary
Results-driven software engineer specialized in distributed backend services, high-concurrency microservices, and autonomous data extraction pipelines.

== Technical Skills
- *Languages*: Python, TypeScript, Go, SQL, Bash
- *Frameworks & Libraries*: FastAPI, React, PyTorch, Node.js
- *Cloud, Databases & Tools*: PostgreSQL, Redis, Docker, Kubernetes, AWS, Git

== Experience
=== Senior Software Engineer -- Engineering Labs (2022 - Present)
- Architected high-throughput async data ingestion microservices processing 50k+ records per second with 99.99% uptime.
- Reduced p99 API query response latencies from 340ms to 42ms via Redis caching and optimized PostgreSQL index topologies.
- Spearheaded automated CI/CD deployment pipelines cutting staging-to-production release cycles by 65%.

== Education
=== B.S. in Software Engineering & Computer Science (2021)
State Engineering University -- Magna Cum Laude
`
  })

  // Template State
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('typst_modern_ats')

  // Tailoring & Output State
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [result, setResult] = useState(null)
  const [editableCode, setEditableCode] = useState(userBaseCvText)
  const [copiedCode, setCopiedCode] = useState(false)
  const [compileError, setCompileError] = useState(null)
  const [savedBaseNotice, setSavedBaseNotice] = useState(false)

  const fileInputRef = useRef(null)

  // Load built-in templates from backend
  useEffect(() => {
    fetch('/api/cv/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          setTemplates(data.templates)
        }
      })
      .catch((err) => console.error('Failed to load templates:', err))
  }, [])

  // Auto-compile initial preview on first mount
  useEffect(() => {
    if (editableCode && !result?.pdfBase64) {
      handleRecompilePdf(editableCode)
    }
  }, [])

  useEffect(() => {
    if (initialJob) {
      setCustomTitle(initialJob.title || '')
      setCustomDesc(initialJob.description || '')
      setSelectedOfferId(initialJob.id || 'custom')
    }
  }, [initialJob])

  const handleSelectOffer = (e) => {
    const val = e.target.value
    setSelectedOfferId(val)
    if (val !== 'custom') {
      const match = offers.find((o) => o.id === val)
      if (match) {
        setCustomTitle(match.title || '')
        setCustomDesc(match.description || '')
      }
    }
  }

  // Save current userBaseCvText as default
  const handleSaveAsDefaultBase = () => {
    localStorage.setItem('radar_user_base_cv', userBaseCvText)
    setSavedBaseNotice(true)
    setTimeout(() => setSavedBaseNotice(false), 2000)
  }

  // Handle file upload (.tex, .typ, .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setUserBaseCvText(content)
        setEditableCode(content)
        handleRecompilePdf(content)
      }
    }
    reader.readAsText(file)
  }

  // In-place Selective Tailoring (Summary, Bullets, Skills, or Full)
  const handleTailorPartial = async (mode) => {
    if (!customTitle.trim() || !customDesc.trim()) return

    const sourceText = cvSourceMode === 'my_cv' ? editableCode || userBaseCvText : editableCode

    setIsGenerating(true)
    setCompileError(null)

    try {
      if (mode === 'full' && cvSourceMode === 'template') {
        // Run full template generation
        const res = await fetch('/api/cv/tailor-latex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: customTitle,
            jobDescription: customDesc,
            candidateProfile: candidateProfile || {},
            templateId: selectedTemplateId,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setResult(data)
          setEditableCode(data.code || data.latexCode || '')
        } else {
          setCompileError(data.error || 'Failed to tailor CV.')
        }
      } else {
        // Run in-place partial modification
        const res = await fetch('/api/cv/tailor-partial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvText: sourceText,
            jobTitle: customTitle,
            jobDescription: customDesc,
            mode: mode,
            candidateProfile: candidateProfile || {},
          }),
        })
        const data = await res.json()
        if (data.success) {
          setResult(data)
          setEditableCode(data.code || '')
        } else {
          setCompileError(data.error || 'Failed to apply in-place modification.')
        }
      }
    } catch (e) {
      console.error('Tailor error:', e)
      setCompileError(e.message || 'Network error tailoring CV.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRecompilePdf = async (codeToCompile) => {
    const targetCode = codeToCompile || editableCode
    if (!targetCode || !targetCode.trim()) return

    setIsCompiling(true)
    setCompileError(null)

    const isLatex = targetCode.includes('\\documentclass') || targetCode.includes('\\begin{document}')

    try {
      const res = await fetch('/api/cv/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetCode,
          format: isLatex ? 'latex' : 'typst',
        }),
      })
      const data = await res.json()
      if (data.success && data.pdfBase64) {
        setResult((prev) => ({
          ...prev,
          pdfBase64: data.pdfBase64,
          hasPdf: true,
          format: isLatex ? 'latex' : 'typst',
        }))
      } else {
        setCompileError(data.detail || data.error || 'Compilation syntax error. Verify your markup.')
      }
    } catch (e) {
      setCompileError(e.message || 'Failed to compile PDF.')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleCopyCode = () => {
    if (!editableCode) return
    navigator.clipboard.writeText(editableCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleDownloadPdf = () => {
    if (!result?.pdfBase64) return
    const linkSource = `data:application/pdf;base64,${result.pdfBase64}`
    const downloadLink = document.createElement('a')
    const fileName = `RADAR_Tailored_Resume_${customTitle.replace(/\s+/g, '_')}.pdf`
    downloadLink.href = linkSource
    downloadLink.download = fileName
    downloadLink.click()
  }

  const handleDownloadSource = () => {
    if (!editableCode) return
    const isLatex = editableCode.includes('\\documentclass')
    const ext = isLatex ? 'tex' : 'typ'
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RADAR_Resume_${customTitle.replace(/\s+/g, '_')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* 1. Header & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <FileCode size={24} color="#FF3B30" />
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
              ATS Resume Studio & Vector PDF Engine
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#18181B',
                color: '#4ADE80',
                border: '1px solid rgba(74, 222, 128, 0.35)',
              }}
            >
              ● IN-PLACE NON-DESTRUCTIVE TAILORING
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Input your existing LaTeX/Typst resume or pick open-source templates (Jake's, RenderCV). Selectively modify summary, experience bullets, or keywords without losing your sections.
          </p>
        </div>
      </div>

      {/* 2. Main Workspace Split: Left Controls & Code, Right Live PDF & Match Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '24px' }}>
        {/* Left Column: Target Configuration, Input Base CV, and Action Suite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Role & Mode Switcher */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '12.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: '#FFFFFF' }}>
                1. Target Position & Base Resume Source
              </h2>
            </div>

            {/* Target Role Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                  Target Offer
                </label>
                <select
                  value={selectedOfferId}
                  onChange={handleSelectOffer}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                >
                  <option value="custom">-- Custom Position / Paste Text --</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                  Target Role Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Target Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                Job Description / Required Stack
              </label>
              <textarea
                rows={4}
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Paste the job requirements, stack, and responsibilities..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#171717',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Source Mode Selector Tabs */}
            <div style={{ marginBottom: '14px', borderTop: '1px solid #27272A', paddingTop: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCvSourceMode('my_cv')
                    setEditableCode(userBaseCvText)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: cvSourceMode === 'my_cv' ? '1px solid #FF3B30' : '1px solid #27272A',
                    backgroundColor: cvSourceMode === 'my_cv' ? '#1E1414' : '#171717',
                    color: cvSourceMode === 'my_cv' ? '#FF3B30' : '#A1A1AA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={13} />
                  <span>My Existing Resume (LaTeX / Typst)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCvSourceMode('template')
                    const tpl = templates.find((t) => t.id === selectedTemplateId)
                    if (tpl) setEditableCode(tpl.templateCode)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: cvSourceMode === 'template' ? '1px solid #FF3B30' : '1px solid #27272A',
                    backgroundColor: cvSourceMode === 'template' ? '#1E1414' : '#171717',
                    color: cvSourceMode === 'template' ? '#FF3B30' : '#A1A1AA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={13} />
                  <span>Open-Source Templates</span>
                </button>
              </div>

              {/* Mode A: User's Own Base CV Input & Upload */}
              {cvSourceMode === 'my_cv' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: '600' }}>
                      Paste your raw LaTeX or Typst CV below, or upload your file:
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".tex,.typ,.txt"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          backgroundColor: '#171717',
                          border: '1px solid #27272A',
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Upload size={11} />
                        <span>Upload .tex / .typ</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAsDefaultBase}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          backgroundColor: '#171717',
                          border: '1px solid #27272A',
                          color: savedBaseNotice ? '#4ADE80' : '#A1A1AA',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {savedBaseNotice ? <Check size={11} /> : <Save size={11} />}
                        <span>{savedBaseNotice ? 'Saved!' : 'Save Base'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={userBaseCvText}
                    onChange={(e) => {
                      setUserBaseCvText(e.target.value)
                      setEditableCode(e.target.value)
                    }}
                    placeholder="Paste your existing LaTeX (\documentclass...) or Typst (#set page...) resume..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#141414',
                      border: '1px solid #27272A',
                      borderRadius: '6px',
                      color: '#E4E4E7',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: '1.4',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>
              ) : (
                /* Mode B: Built-in Template Selector */
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                    Choose Built-in Open-Source Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value)
                      const tpl = templates.find((t) => t.id === e.target.value)
                      if (tpl) setEditableCode(tpl.templateCode)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#171717',
                      border: '1px solid #27272A',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.badge}) -- {tpl.format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Granular In-Place Tailoring Buttons Suite */}
            <div style={{ borderTop: '1px solid #27272A', paddingTop: '14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>
                Selective In-Place Modifications (Keep all your sections):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleTailorPartial('summary')}
                  disabled={isGenerating}
                  style={{
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: '#171717',
                    border: '1px solid #3F3F46',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <Sparkles size={12} color="#FF3B30" />
                  <span>Tailor Summary Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTailorPartial('bullets')}
                  disabled={isGenerating}
                  style={{
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: '#171717',
                    border: '1px solid #3F3F46',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <Zap size={12} color="#4ADE80" />
                  <span>Tailor Bullets Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTailorPartial('skills')}
                  disabled={isGenerating}
                  style={{
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: '#171717',
                    border: '1px solid #3F3F46',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <Award size={12} color="#38BDF8" />
                  <span>Inject Skills Only</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTailorPartial('full')}
                disabled={isGenerating}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  backgroundColor: '#FF3B30',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} className={isGenerating ? 'spin' : ''} />
                <span>{isGenerating ? 'Analyzing & Tailoring CV...' : 'Full Template Tailor / Regenerate'}</span>
              </button>
            </div>
          </div>

          {/* Code Editor Panel */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={14} color="#A1A1AA" />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Document Editor ({editableCode.includes('\\documentclass') ? 'LaTeX' : 'Typst'})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleRecompilePdf(editableCode)}
                  disabled={isCompiling}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#171717',
                    border: '1px solid #3F3F46',
                    color: '#4ADE80',
                    borderRadius: '4px',
                    cursor: isCompiling ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Recompile edited code into PDF"
                >
                  <RefreshCw size={11} className={isCompiling ? 'spin' : ''} />
                  <span>Recompile PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedCode ? <Check size={11} color="#4ADE80" /> : <Copy size={11} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {compileError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 59, 48, 0.1)',
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  borderRadius: '6px',
                  color: '#FF3B30',
                  fontSize: '11.5px',
                  marginBottom: '10px',
                }}
              >
                {compileError}
              </div>
            )}

            <textarea
              rows={18}
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              style={{
                width: '100%',
                flex: 1,
                minHeight: '380px',
                backgroundColor: '#141414',
                border: '1px solid #27272A',
                borderRadius: '6px',
                padding: '12px',
                color: '#E4E4E7',
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                lineHeight: '1.5',
                boxSizing: 'border-box',
                resize: 'vertical',
                whiteSpace: 'pre',
              }}
            />
          </div>
        </div>

        {/* Right Column: Live Vector PDF Preview & ATS Match Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ATS Keyword Match Stats Card */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="#FF3B30" />
                <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  ATS Fit Score & Optimization Intel
                </h3>
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  color: (result?.atsFitScore || 88) >= 85 ? '#4ADE80' : '#FF3B30',
                  letterSpacing: '-0.5px',
                }}
              >
                {result?.atsFitScore || 88}% FIT
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '10px' }}>
              {result?.summaryRationale || result?.explanation || 'Direct keyword alignment matching core technical stack and requirements.'}
            </div>

            {/* Matched Keywords Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(result?.matchedKeywords || ['Python', 'FastAPI', 'PyTorch', 'Microservices', 'Docker']).map((kw, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#18181B',
                    border: '1px solid #27272A',
                    color: '#FFFFFF',
                  }}
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Live Vector PDF Preview Pane */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={15} color="#A1A1AA" />
                <span style={{ fontSize: '12.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Vector PDF Preview
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!result?.pdfBase64}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: result?.pdfBase64 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Download size={12} />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSource}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: '#171717',
                    color: '#FFFFFF',
                    border: '1px solid #27272A',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Download size={12} />
                  <span>Download Source</span>
                </button>
              </div>
            </div>

            {/* Embedded Live PDF Viewer */}
            <div
              style={{
                flex: 1,
                minHeight: '620px',
                backgroundColor: '#171717',
                border: '1px solid #27272A',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {result?.pdfBase64 ? (
                <iframe
                  title="Live ATS Resume Preview"
                  src={`data:application/pdf;base64,${result.pdfBase64}#toolbar=0&navpanes=0&scrollbar=1`}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '620px',
                    border: 'none',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '400px',
                    color: '#71717A',
                    gap: '10px',
                  }}
                >
                  <FileText size={36} color="#3F3F46" />
                  <span style={{ fontSize: '13px' }}>Click "Recompile PDF" or tailor a section to generate live preview.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

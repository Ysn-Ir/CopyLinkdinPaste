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
} from 'lucide-react'

export function AtsResumeStudioView({ offers = [], candidateProfile, initialJob = null }) {
  const [selectedOfferId, setSelectedOfferId] = useState(initialJob?.id || (offers[0]?.id || 'custom'))
  const [customTitle, setCustomTitle] = useState(initialJob?.title || 'Senior Software Engineer')
  const [customDesc, setCustomDesc] = useState(
    initialJob?.description || 'Looking for an experienced engineer in Python, PyTorch, React, and scalable backend systems.'
  )

  // Template State
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('typst_modern_ats')
  const [isCustomTemplate, setIsCustomTemplate] = useState(false)
  const [customTemplateCode, setCustomTemplateCode] = useState('')

  // Generation & Compilation State
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [result, setResult] = useState(null)
  const [editableCode, setEditableCode] = useState('')
  const [activeEditorTab, setActiveEditorTab] = useState('code') // 'code' | 'bullets' | 'custom_tpl'
  const [copiedCode, setCopiedCode] = useState(false)
  const [compileError, setCompileError] = useState(null)

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

  const handleTemplateChange = (e) => {
    const val = e.target.value
    if (val === 'custom') {
      setIsCustomTemplate(true)
      setSelectedTemplateId('custom')
      if (!customTemplateCode && templates.length > 0) {
        setCustomTemplateCode(templates[0].templateCode)
      }
    } else {
      setIsCustomTemplate(false)
      setSelectedTemplateId(val)
    }
  }

  const handleGenerate = async () => {
    if (!customTitle.trim() || !customDesc.trim()) return

    setIsGenerating(true)
    setCompileError(null)

    try {
      const res = await fetch('/api/cv/tailor-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: customTitle,
          jobDescription: customDesc,
          candidateProfile: candidateProfile || {},
          templateId: isCustomTemplate ? 'custom' : selectedTemplateId,
          customTemplate: isCustomTemplate ? customTemplateCode : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        setEditableCode(data.code || data.latexCode || '')
      } else {
        setCompileError(data.error || 'Failed to tailor CV.')
      }
    } catch (e) {
      console.error('Tailor CV error:', e)
      setCompileError(e.message || 'Network error tailoring CV.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRecompilePdf = async () => {
    if (!editableCode.trim()) return
    setIsCompiling(true)
    setCompileError(null)

    try {
      const res = await fetch('/api/cv/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editableCode,
          format: result?.format || (editableCode.includes('\\documentclass') ? 'latex' : 'typst'),
        }),
      })
      const data = await res.json()
      if (data.success && data.pdfBase64) {
        setResult((prev) => ({
          ...prev,
          pdfBase64: data.pdfBase64,
          hasPdf: true,
        }))
      } else {
        setCompileError(data.detail || data.error || 'Compilation syntax error.')
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
    const fileName = `ATS_Resume_${customTitle.replace(/\s+/g, '_')}.pdf`
    downloadLink.href = linkSource
    downloadLink.download = fileName
    downloadLink.click()
  }

  const handleDownloadSource = () => {
    if (!editableCode) return
    const ext = result?.format === 'latex' ? 'tex' : 'typ'
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ATS_Resume_${customTitle.replace(/\s+/g, '_')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <FileCode size={24} color="#FF3B30" />
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
              ATS Resume & LaTeX/Typst Studio
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#18181B',
                color: '#FF3B30',
                border: '1px solid rgba(255, 59, 48, 0.35)',
              }}
            >
              REAL TEMPLATE ENGINE
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Slot-injects tailored experience and ATS keywords into famous open-source templates (Jake's Resume, RenderCV, Typst) with live vector PDF compilation.
          </p>
        </div>
      </div>

      {/* Main Workspace Split Grid: Left Input & Code, Right Live PDF & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '24px' }}>
        {/* Left Column: Job Selector, Template Selector, and Code Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Position Configuration Card */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: '#FFFFFF' }}>
                1. Target Offer & Open-Source Template
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              {/* Load from existing offers */}
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

              {/* Template Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                  ATS Template Engine
                </label>
                <select
                  value={isCustomTemplate ? 'custom' : selectedTemplateId}
                  onChange={handleTemplateChange}
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
                      {tpl.name} ({tpl.badge})
                    </option>
                  ))}
                  <option value="custom">+ Custom User Template (Upload / Paste)</option>
                </select>
              </div>
            </div>

            {/* Position Title */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                Position Title
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
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Job Description */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#A1A1AA', marginBottom: '4px' }}>
                Job Description / Required Stack
              </label>
              <textarea
                rows={5}
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Paste the job description, required skills, and core responsibilities..."
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

            {/* Custom Template Editor Drawer if selected */}
            {isCustomTemplate && (
              <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '6px', backgroundColor: '#141414', border: '1px solid #3F3F46' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FF3B30' }}>
                    YOUR CUSTOM TEMPLATE ({'{{PLACEHOLDERS}}'} SUPPORTED)
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#A1A1AA' }}>
                    Slots: {'{{FULL_NAME}}'}, {'{{SUMMARY}}'}, {'{{EXPERIENCE_BLOCKS}}'}, {'{{SKILLS_LANGUAGES}}'}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customTemplateCode}
                  onChange={(e) => setCustomTemplateCode(e.target.value)}
                  placeholder="Paste your custom LaTeX or Typst template with {{PLACEHOLDERS}} here..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #27272A',
                    color: '#D4D4D8',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Generate Trigger Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !customTitle.trim()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                backgroundColor: '#FF3B30',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} className={isGenerating ? 'spin' : ''} />
              {isGenerating ? 'Tailoring & Compiling Template...' : 'Tailor Experience & Generate Document'}
            </button>
          </div>

          {/* Code Editor Card */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveEditorTab('code')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: activeEditorTab === 'code' ? '#27272A' : 'transparent',
                    color: activeEditorTab === 'code' ? '#FFFFFF' : '#A1A1AA',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Document Source ({result?.format?.toUpperCase() || 'CODE'})
                </button>
                <button
                  onClick={() => setActiveEditorTab('bullets')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: activeEditorTab === 'bullets' ? '#27272A' : 'transparent',
                    color: activeEditorTab === 'bullets' ? '#FFFFFF' : '#A1A1AA',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Tailored Bullets ({result?.tailoredBulletPoints?.length || 0})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleRecompilePdf}
                  disabled={isCompiling || !editableCode}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#18181B',
                    border: '1px solid #3F3F46',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Recompiles the PDF directly from the edited code above"
                >
                  <RefreshCw size={11} className={isCompiling ? 'spin' : ''} />
                  <span>Recompile PDF</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    backgroundColor: '#18181B',
                    border: '1px solid #27272A',
                    color: '#A1A1AA',
                    cursor: 'pointer',
                  }}
                >
                  {copiedCode ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {compileError && (
              <div style={{ padding: '8px 10px', borderRadius: '4px', backgroundColor: 'rgba(255, 59, 48, 0.15)', border: '1px solid #FF3B30', color: '#FF3B30', fontSize: '11px', marginBottom: '8px' }}>
                {compileError}
              </div>
            )}

            {activeEditorTab === 'code' ? (
              <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                placeholder="Generated document source code will appear here. You can modify any line and click 'Recompile PDF'..."
                style={{
                  width: '100%',
                  height: '420px',
                  backgroundColor: '#080808',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#E4E4E7',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '11.5px',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            ) : (
              <div style={{ height: '420px', overflowY: 'auto', padding: '10px', backgroundColor: '#080808', border: '1px solid #27272A', borderRadius: '6px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Targeted ATS Achievement Bullets
                </h3>
                {result?.tailoredBulletPoints?.map((bullet, idx) => (
                  <div key={idx} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#141414', border: '1px solid #27272A', marginBottom: '6px', fontSize: '12px', lineHeight: '1.4' }}>
                    • {bullet}
                  </div>
                )) || <div style={{ color: '#71717A', fontSize: '12px' }}>Generate a tailored CV to view target bullet points.</div>}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Vector PDF Viewer & Download Actions */}
        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Output Header with Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 59, 48, 0.15)',
                  border: '1px solid rgba(255, 59, 48, 0.4)',
                  color: '#FF3B30',
                  fontWeight: '800',
                  fontSize: '12px',
                }}
              >
                {result?.atsFitScore || 92}% ATS FIT
              </div>
              <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                {result?.format?.toUpperCase() || 'TYPST'} Live Vector PDF
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {result?.pdfBase64 && (
                <button
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
              )}
              {editableCode && (
                <button
                  onClick={handleDownloadSource}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#18181B',
                    border: '1px solid #27272A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <span>Export Source</span>
                </button>
              )}
            </div>
          </div>

          {/* Matched Keywords Strip */}
          {result?.matchedKeywords && result.matchedKeywords.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#71717A', fontWeight: '600', textTransform: 'uppercase' }}>
                Integrated Keywords:
              </span>
              {result.matchedKeywords.map((kw, i) => (
                <span
                  key={i}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: '#18181B',
                    border: '1px solid #27272A',
                    color: '#E4E4E7',
                    fontSize: '10.5px',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Embedded PDF Viewer */}
          <div
            style={{
              flex: 1,
              minHeight: '680px',
              backgroundColor: '#141414',
              borderRadius: '8px',
              border: '1px solid #27272A',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {result?.pdfBase64 ? (
              <iframe
                title="Live ATS Resume Preview"
                src={`data:application/pdf;base64,${result.pdfBase64}#toolbar=0&navpanes=0`}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '680px',
                  border: 'none',
                  backgroundColor: '#262626',
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#71717A' }}>
                <FileText size={42} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#A1A1AA', marginBottom: '4px' }}>
                  No Document Rendered Yet
                </div>
                <div style={{ fontSize: '12px', maxWidth: '340px', lineHeight: '1.4' }}>
                  Select an offer from your pipeline or paste job requirements on the left, then click <strong>"Tailor Experience & Generate Document"</strong> to compile a vector PDF.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

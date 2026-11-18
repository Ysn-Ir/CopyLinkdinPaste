import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'

export function AtsResumeStudioView({ offers = [], candidateProfile, initialJob = null }) {
  const [selectedOfferId, setSelectedOfferId] = useState(initialJob?.id || (offers[0]?.id || 'custom'))
  const [customTitle, setCustomTitle] = useState(initialJob?.title || 'Senior Software Engineer')
  const [customDesc, setCustomDesc] = useState(
    initialJob?.description || 'Looking for an experienced engineer in Python, PyTorch, React, and scalable backend systems.'
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState('latex') // 'latex' | 'bullets' | 'email'

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

  const handleGenerate = async () => {
    if (!customTitle.trim() || !customDesc.trim()) return

    setIsGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/cv/tailor-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: customTitle,
          jobDescription: customDesc,
          candidateProfile: candidateProfile || {},
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
      }
    } catch (e) {
      console.error('Tailor CV error:', e)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLatex = () => {
    if (!result?.latexCode) return
    navigator.clipboard.writeText(result.latexCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleDownloadTex = () => {
    if (!result?.latexCode) return
    const blob = new Blob([result.latexCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CV_ATS_${customTitle.replace(/\s+/g, '_')}.tex`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '22px' }}>📄</span>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
              ATS Resume & LaTeX Studio
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#18181B',
                color: '#FF3B30',
                border: '1px solid #27272A',
              }}
            >
              ATS OPTIMIZER
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Rewrites your CV in clean, ATS-compliant LaTeX tailored specifically to any targeted job description.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Config, Right Output */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
        {/* Left Column: Input and Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: '#FFFFFF' }}>
              Target Job Specification
            </h2>

            {/* Select from existing offers */}
            {offers.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
                  Load from Ingested Pipeline
                </label>
                <select
                  value={selectedOfferId}
                  onChange={handleSelectOffer}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                  }}
                >
                  <option value="custom">-- Custom Role / Paste Text --</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.company}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Job Title */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
                Target Position Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#171717',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Job Description */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
                Job Requirements & Context
              </label>
              <textarea
                rows={9}
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Paste the job description, bullet points, or tech stack requirements..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#171717',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  lineHeight: '1.45',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Candidate Snapshot */}
            <div
              style={{
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: '#141414',
                border: '1px solid #27272A',
                marginBottom: '18px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                Profile: {candidateProfile?.fullName || 'Khalil Dev'}
              </div>
              <div style={{ color: '#A1A1AA' }}>
                Stack: {candidateProfile?.skills || 'Python, PyTorch, FastAPI, React, Docker'}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !customTitle.trim()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                backgroundColor: '#FF3B30',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              <RefreshCw size={15} className={isGenerating ? 'spin' : ''} />
              {isGenerating ? 'Generating ATS LaTeX CV...' : 'Generate Tailored LaTeX CV'}
            </button>
          </div>
        </div>

        {/* Right Column: Tailored LaTeX Output */}
        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {result ? (
            <>
              {/* Score & Tabs Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      backgroundColor: 'rgba(255, 59, 48, 0.15)',
                      border: '1px solid #FF3B30',
                      color: '#FF3B30',
                      fontWeight: '800',
                      fontSize: '13px',
                    }}
                  >
                    {result.atsFitScore || 90}% ATS MATCH
                  </div>
                  <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                    Compilable Standard LaTeX
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCopyLatex}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#18181B',
                      color: '#FFFFFF',
                      border: '1px solid #27272A',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCode ? <Check size={13} color="#FF3B30" /> : <Copy size={13} />}
                    {copiedCode ? 'Copied' : 'Copy LaTeX'}
                  </button>

                  <button
                    onClick={handleDownloadTex}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#FF3B30',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={13} />
                    Download .tex
                  </button>
                </div>
              </div>

              {/* Matched Keywords */}
              {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#71717A', fontWeight: '700' }}>MATCHED KEYWORDS:</span>
                  {result.matchedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#18181B',
                        color: '#FFFFFF',
                        border: '1px solid #27272A',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Tailored Bullets */}
              {result.tailoredBulletPoints && result.tailoredBulletPoints.length > 0 && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#141414',
                    border: '1px solid #27272A',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' }}>
                    Top Tailored Experience Bullets:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#D4D4D8', lineHeight: '1.5' }}>
                    {result.tailoredBulletPoints.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* LaTeX Code Box */}
              <div style={{ flex: 1, position: 'relative' }}>
                <pre
                  style={{
                    backgroundColor: '#050505',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    padding: '14px',
                    color: '#E4E4E7',
                    fontFamily: "'JetBrains Mono', Consolas, monospace",
                    fontSize: '12px',
                    lineHeight: '1.45',
                    overflowX: 'auto',
                    maxHeight: '440px',
                    margin: 0,
                    whiteSpace: 'pre',
                  }}
                >
                  {result.latexCode}
                </pre>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
                textAlign: 'center',
                color: '#71717A',
                border: '1px dashed #27272A',
                borderRadius: '8px',
              }}
            >
              <FileText size={42} style={{ marginBottom: '14px', color: '#3F3F46' }} />
              <h3 style={{ fontSize: '16px', color: '#FFFFFF', marginBottom: '6px' }}>
                Ready to Optimize Your Resume
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '380px', margin: 0 }}>
                Select a target role on the left and click &quot;Generate Tailored LaTeX CV&quot; to rewrite your resume for applicant tracking systems.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

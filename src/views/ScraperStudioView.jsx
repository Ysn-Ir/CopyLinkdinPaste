import React, { useState, useEffect } from 'react'
import {
  Search,
  Globe,
  Briefcase,
  Sparkles,
  ExternalLink,
  Plus,
  Check,
  RefreshCw,
  Mail,
  Sliders,
  FileText,
  Copy,
  DollarSign,
  MapPin,
  Clock,
  Send,
  Zap,
  X,
} from 'lucide-react'

export function ScraperStudioView({ candidateProfile, onOfferCreated, onTailorCv }) {
  const [searchTerm, setSearchTerm] = useState('AI Engineer')
  const [location, setLocation] = useState('Remote')
  const [isRemote, setIsRemote] = useState(true)
  const [resultsWanted, setResultsWanted] = useState(15)
  const [selectedSites, setSelectedSites] = useState(['linkedin', 'indeed'])
  
  const [huntStatus, setHuntStatus] = useState('idle') // 'idle', 'running', 'completed', 'error'
  const [huntResults, setHuntResults] = useState([])
  const [savedJobIds, setSavedJobIds] = useState(new Set())
  const [savingId, setSavingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedJobForModal, setSelectedJobForModal] = useState(null)

  // Poll hunt status if running
  useEffect(() => {
    let interval = null
    async function checkStatus() {
      try {
        const res = await fetch('/api/scraper/status')
        const data = await res.json()
        setHuntStatus(data.status || 'idle')
        if (data.results && data.results.length > 0) {
          setHuntResults(data.results)
        }
        if (data.status === 'running') {
          setStatusMessage(`Scanning ${data.sites?.join(', ')} for "${data.searchTerm}"...`)
        } else if (data.status === 'completed') {
          setStatusMessage(`Hunt completed. Found ${data.totalFound || data.results?.length || 0} opportunities.`)
        } else if (data.status === 'error') {
          setStatusMessage(`Hunt error: ${data.error || 'Failed'}`)
        }
      } catch (e) {
        console.warn('Scraper status poll failed', e)
      }
    }

    checkStatus()
    if (huntStatus === 'running') {
      interval = setInterval(checkStatus, 2500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [huntStatus])

  const handleLaunchHunt = async (e) => {
    e?.preventDefault()
    if (!searchTerm.trim()) return

    setHuntStatus('running')
    setStatusMessage(`Initiating autonomous hunt across ${selectedSites.join(', ')}...`)

    try {
      const res = await fetch('/api/scraper/hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sites: selectedSites,
          searchTerm: searchTerm.trim(),
          location: location.trim() || 'Remote',
          resultsWanted: parseInt(resultsWanted, 10),
          isRemote: isRemote,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setHuntStatus('error')
        setStatusMessage(data.message || 'Failed to start hunt')
      }
    } catch (err) {
      setHuntStatus('error')
      setStatusMessage('Network error triggering scraper')
    }
  }

  const handleCancelHunt = async () => {
    try {
      await fetch('/api/scraper/cancel', { method: 'POST' })
      setHuntStatus('idle')
      setStatusMessage('Autonomous hunt cancelled.')
    } catch (err) {
      console.error('Cancel hunt failed:', err)
    }
  }

  const handleSaveToVault = async (job) => {
    setSavingId(job.id)
    try {
      const res = await fetch('/api/scraper/save-to-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      })
      const data = await res.json()
      if (data.success) {
        setSavedJobIds((prev) => new Set([...prev, job.id]))
        if (onOfferCreated && data.offer) {
          onOfferCreated(data.offer)
        }
      }
    } catch (e) {
      console.error('Save to vault failed', e)
    } finally {
      setSavingId(null)
    }
  }

  const toggleSite = (site) => {
    if (selectedSites.includes(site)) {
      if (selectedSites.length > 1) {
        setSelectedSites(selectedSites.filter((s) => s !== site))
      }
    } else {
      setSelectedSites([...selectedSites, site])
    }
  }

  const filteredResults = huntResults.filter((j) => {
    if (!filterQuery) return true
    const q = filterQuery.toLowerCase()
    return (
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      j.skills?.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div style={{ padding: '28px 36px 80px 36px', maxWidth: '1440px', margin: '0 auto', color: '#FFFFFF', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Globe size={24} color="#FF3B30" />
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
              Autonomous Job Scraper
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: huntStatus === 'running' ? '#FF3B30' : '#18181B',
                color: '#FFFFFF',
                border: '1px solid #27272A',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: huntStatus === 'running' ? '#FFFFFF' : '#FF3B30',
                }}
              />
              {huntStatus === 'running' ? 'SCANNING WEB' : 'IDLE / READY'}
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Scrapes LinkedIn, Indeed & Glassdoor asynchronously via Python-JobSpy. Zero manual copy-pasting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {huntStatus === 'running' && (
            <button
              type="button"
              onClick={handleCancelHunt}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: '#18181B',
                color: '#FF3B30',
                border: '1px solid #FF3B30',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
              Cancel Hunt
            </button>
          )}

          <button
            onClick={() => handleLaunchHunt()}
            disabled={huntStatus === 'running'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: huntStatus === 'running' ? 'not-allowed' : 'pointer',
              opacity: huntStatus === 'running' ? 0.6 : 1,
            }}
          >
            <RefreshCw size={15} className={huntStatus === 'running' ? 'spin' : ''} />
            {huntStatus === 'running' ? 'Hunting in Background...' : 'Launch Scraper'}
          </button>
        </div>
      </div>

      {/* Scraper Configuration Controls */}
      <form
        onSubmit={handleLaunchHunt}
        style={{
          backgroundColor: '#0D0D0D',
          border: '1px solid #27272A',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Query */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
              Search Target / Role Title
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. AI Engineer, NLP, Fullstack"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  backgroundColor: '#171717',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#71717A' }} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
              Location / Region
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, France, Paris, USA"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  backgroundColor: '#171717',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
              <MapPin size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#71717A' }} />
            </div>
          </div>

          {/* Results Wanted */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '6px' }}>
              Results Count ({resultsWanted} jobs)
            </label>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={resultsWanted}
              onChange={(e) => setResultsWanted(e.target.value)}
              style={{ width: '100%', accentColor: '#FF3B30', marginTop: '10px' }}
            />
          </div>
        </div>

        {/* Platforms and Remote Toggle */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '12px', borderTop: '1px solid #1F1F1F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#A1A1AA' }}>Platforms:</span>
            {['linkedin', 'indeed', 'glassdoor'].map((site) => (
              <label
                key={site}
                onClick={() => toggleSite(site)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  backgroundColor: selectedSites.includes(site) ? 'rgba(255, 59, 48, 0.15)' : '#171717',
                  border: `1px solid ${selectedSites.includes(site) ? '#FF3B30' : '#27272A'}`,
                  color: selectedSites.includes(site) ? '#FFFFFF' : '#A1A1AA',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: selectedSites.includes(site) ? '700' : '500',
                  textTransform: 'capitalize',
                }}
              >
                {selectedSites.includes(site) && <Check size={12} color="#FF3B30" />}
                {site}
              </label>
            ))}

            <label
              onClick={() => setIsRemote(!isRemote)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '5px',
                backgroundColor: isRemote ? 'rgba(255, 255, 255, 0.1)' : '#171717',
                border: `1px solid ${isRemote ? '#FFFFFF' : '#27272A'}`,
                color: '#FFFFFF',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: isRemote ? '700' : '500',
              }}
            >
              {isRemote && <Check size={12} />}
              Remote Only
            </label>
          </div>

          <div style={{ fontSize: '12.5px', color: '#A1A1AA' }}>
            {statusMessage || `${huntResults.length} opportunities loaded in memory`}
          </div>
        </div>
      </form>

      {/* Results Filter & Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
            Live Opportunities ({filteredResults.length})
          </h2>
          {huntResults.length > 0 && (
            <span style={{ fontSize: '11px', color: '#71717A', backgroundColor: '#18181B', padding: '2px 8px', borderRadius: '4px' }}>
              Auto ATS Ranked
            </span>
          )}
        </div>

        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter results by keyword or company..."
          style={{
            padding: '6px 12px',
            backgroundColor: '#121212',
            border: '1px solid #27272A',
            borderRadius: '6px',
            color: '#FFFFFF',
            fontSize: '12.5px',
            width: '280px',
          }}
        />
      </div>

      {/* Jobs Grid */}
      {filteredResults.length === 0 ? (
        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px dashed #27272A',
            borderRadius: '10px',
            padding: '48px',
            textAlign: 'center',
            color: '#71717A',
          }}
        >
          <Briefcase size={36} style={{ marginBottom: '12px', color: '#3F3F46' }} />
          <h3 style={{ fontSize: '16px', color: '#FFFFFF', marginBottom: '6px' }}>
            {huntStatus === 'running' ? 'Scanning job portals...' : 'No scraped jobs loaded yet'}
          </h3>
          <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            Click &quot;Launch Scraper&quot; to fetch real-time listings from LinkedIn, Indeed, and Glassdoor without leaving RADAR.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {filteredResults.map((job) => {
            const isSaved = savedJobIds.has(job.id)
            const isSaving = savingId === job.id

            return (
              <div
                key={job.id}
                style={{
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #27272A',
                  borderRadius: '10px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Header: Title + ATS Fit Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        margin: 0,
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}
                    >
                      {job.title}
                    </h3>

                    {/* ATS Badge */}
                    <div
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: job.atsFitScore >= 85 ? 'rgba(255, 59, 48, 0.15)' : '#18181B',
                        border: `1px solid ${job.atsFitScore >= 85 ? '#FF3B30' : '#27272A'}`,
                        color: job.atsFitScore >= 85 ? '#FF3B30' : '#A1A1AA',
                        fontSize: '11px',
                        fontWeight: '800',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {job.atsFitScore}% ATS FIT
                    </div>
                  </div>

                  {/* Company & Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#A1A1AA', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', color: '#FFFFFF' }}>{job.company}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {job.location}
                    </span>
                    {job.salary && (
                      <>
                        <span>·</span>
                        <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{job.salary}</span>
                      </>
                    )}
                  </div>

                  {/* Skills tags */}
                  {job.skills && job.skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                      {job.skills.slice(0, 5).map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#18181B',
                            color: '#D4D4D8',
                            border: '1px solid #27272A',
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description preview */}
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#71717A',
                      margin: '0 0 16px 0',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {job.description || 'No detailed description provided.'}
                  </p>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #1F1F1F' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717A', fontWeight: '700' }}>
                      {job.site}
                    </span>
                    {job.emails && job.emails.length > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#FF3B30',
                          backgroundColor: 'rgba(255, 59, 48, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        Email Found
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Tailor CV */}
                    <button
                      onClick={() => onTailorCv && onTailorCv(job)}
                      title="Generate Tailored ATS LaTeX CV"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        backgroundColor: '#18181B',
                        color: '#FFFFFF',
                        border: '1px solid #27272A',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={13} />
                      Tailor CV
                    </button>

                    {/* Add to Vault */}
                    <button
                      onClick={() => handleSaveToVault(job)}
                      disabled={isSaved || isSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: isSaved ? '#18181B' : '#FF3B30',
                        color: isSaved ? '#A1A1AA' : '#FFFFFF',
                        border: isSaved ? '1px solid #27272A' : 'none',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: isSaved ? 'default' : 'pointer',
                      }}
                    >
                      {isSaved ? <Check size={13} color="#FFFFFF" /> : <Plus size={13} />}
                      {isSaved ? 'In Vault' : isSaving ? 'Saving...' : 'Add to Vault'}
                    </button>

                    {/* External Link */}
                    {job.jobUrl && (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View Original Post"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: '#18181B',
                          color: '#A1A1AA',
                          border: '1px solid #27272A',
                          borderRadius: '5px',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


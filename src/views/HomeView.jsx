import React, { useState, useEffect } from 'react'
import {
  Compass,
  Layers,
  Globe,
  FileText,
  Clipboard,
  Download,
  RefreshCw,
  TrendingUp,
  Award,
  Zap,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  Briefcase,
  Radio,
  Share2,
  Terminal,
  Search,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { CATEGORIES } from '../data/categories.js'

export function HomeView({
  offers = [],
  clips = [],
  onNavigate,
  onQuickIngest,
}) {
  const [newsItems, setNewsItems] = useState([])
  const [newsFilter, setNewsFilter] = useState('all') // 'all' | 'ai' | 'systems' | 'career'
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [ingestedUrls, setIngestedUrls] = useState(new Set())
  const [quickInput, setQuickInput] = useState('')
  const [isQuickIngesting, setIsQuickIngesting] = useState(false)

  // KPI calculations
  const totalOffers = offers.length
  const applied = offers.filter((o) => o.status === 'applied').length
  const interviews = offers.filter((o) => o.status === 'interview').length
  const offersWon = offers.filter((o) => o.status === 'offer').length
  const emailOffers = offers.filter((o) => o.channel === 'email').length
  const directOffers = offers.filter((o) => o.channel === 'direct_contact').length
  const externalOffers = offers.filter((o) => o.channel === 'external').length

  const velocityRate = totalOffers > 0 ? Math.round((applied / totalOffers) * 100) : 0
  const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0

  // Pipeline funnel data
  const funnelData = [
    { stage: 'Saved', count: offers.filter((o) => o.status === 'saved' || o.status === 'to_apply').length },
    { stage: 'Ready', count: offers.filter((o) => o.status === 'ready').length },
    { stage: 'Applied', count: applied },
    { stage: 'Interview', count: interviews },
    { stage: 'Offer', count: offersWon },
  ]

  // Channel Distribution Data
  const channelData = [
    { name: 'Direct Email', value: emailOffers, color: '#FFFFFF' },
    { name: 'DM / WhatsApp', value: directOffers, color: '#A1A1AA' },
    { name: 'ATS Portals', value: externalOffers, color: '#52525B' },
  ].filter((c) => c.value > 0)

  // Domain breakdown
  const domainData = CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
    return {
      id: cat.id,
      label: cat.shortLabel || cat.label,
      color: cat.color || '#A1A1AA',
      count: offers.filter((o) => o.category === cat.id).length,
    }
  }).sort((a, b) => b.count - a.count)

  // Fetch Tech Intelligence / News Feed
  const fetchNews = async () => {
    setIsLoadingNews(true)
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      if (data.items) {
        setNewsItems(data.items)
      }
    } catch (e) {
      console.error('Failed to load tech news feed:', e)
    } finally {
      setIsLoadingNews(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const handleCaptureSignal = async (item) => {
    if (!item.url || ingestedUrls.has(item.url)) return
    try {
      if (onQuickIngest) {
        await onQuickIngest(item.url)
      }
      setIngestedUrls((prev) => new Set([...prev, item.url]))
    } catch (e) {
      console.error('Signal capture notice:', e)
    }
  }

  const handleQuickIngestSubmit = async (e) => {
    e.preventDefault()
    if (!quickInput.trim() || isQuickIngesting) return
    setIsQuickIngesting(true)
    try {
      if (onQuickIngest) {
        await onQuickIngest(quickInput.trim())
      }
      setQuickInput('')
    } catch (err) {
      console.error('Quick ingest notice:', err)
    } finally {
      setIsQuickIngesting(false)
    }
  }

  // Filtered news feed
  const filteredNews = newsItems.filter((item) => {
    if (newsFilter === 'all') return true
    const text = (item.title + ' ' + (item.domain || '')).toLowerCase()
    if (newsFilter === 'ai') {
      return /ai|llm|reason|gpt|model|learning|neural|vision|agent/i.test(text)
    }
    if (newsFilter === 'systems') {
      return /rust|python|compiler|database|systems|cloud|scale|linux|kernel|gpu/i.test(text)
    }
    if (newsFilter === 'career') {
      return /hiring|job|engineer|remote|team|startup|company|work/i.test(text)
    }
    return true
  })

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1600px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* 1. Executive Flight Deck Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #27272A',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#FF3B30' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
              RADAR Flight Deck
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
              ● COCKPIT NOMINAL · LOCAL WINOCR READY · 0 LATENCY
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Automated multi-platform job reconnaissance, real-time market signals, and tactical outreach pipeline.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => onNavigate('scraper')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={14} />
            <span>Launch Scraper</span>
          </button>

          <button
            onClick={() => onNavigate('resume-studio')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              border: '1px solid #27272A',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={14} />
            <span>ATS Resume Studio</span>
          </button>

          <button
            onClick={() => onNavigate('command-center')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              border: '1px solid #27272A',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={14} />
            <span>Command Center</span>
          </button>

          <a
            href="/api/offers/export/csv"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* 2. Cockpit Rapid Ingest Terminal */}
      <div
        style={{
          backgroundColor: '#0D0D0D',
          border: '1px solid #27272A',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
        }}
      >
        <form onSubmit={handleQuickIngestSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF3B30' }}>
            <Terminal size={16} />
            <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Instant Ingest
            </span>
          </div>

          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Paste any job link, recruiter DM, LinkedIn URL, or note to instantly capture to your pipeline..."
            style={{
              flex: 1,
              height: '36px',
              padding: '0 12px',
              backgroundColor: '#171717',
              border: '1px solid #27272A',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '12.5px',
            }}
          />

          <button
            type="submit"
            disabled={isQuickIngesting || !quickInput.trim()}
            style={{
              height: '36px',
              padding: '0 16px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: isQuickIngesting ? '#27272A' : '#FFFFFF',
              color: isQuickIngesting ? '#A1A1AA' : '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: isQuickIngesting || !quickInput.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isQuickIngesting ? <RefreshCw size={13} className="spin" /> : <Zap size={13} />}
            <span>{isQuickIngesting ? 'Ingesting...' : 'Ingest Signal'}</span>
          </button>
        </form>
      </div>

      {/* 3. Executive KPI Cards (4 Metric Tiles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Tracked Positions
            </span>
            <Briefcase size={15} color="#A1A1AA" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {totalOffers}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            Across LinkedIn, Indeed & Portals
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Applications Sent
            </span>
            <TrendingUp size={15} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {applied}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            {velocityRate}% pipeline dispatch velocity
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Interview Conversions
            </span>
            <CheckCircle2 size={15} color="#4ADE80" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#4ADE80', letterSpacing: '-0.5px' }}>
            {interviews}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            {interviewRate}% response-to-interview conversion
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Offers Secured
            </span>
            <Award size={15} color="#FF3B30" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FF3B30', letterSpacing: '-0.5px' }}>
            {offersWon}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            Confirmed placement offers
          </div>
        </div>
      </div>

      {/* 4. Visual Analytics & Real-Time Intelligence Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column: Visual Analytics & Domain Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pipeline Funnel Graph */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Pipeline Conversion Funnel
                </h2>
                <span style={{ fontSize: '11.5px', color: '#71717A' }}>
                  Progress through stage gates
                </span>
              </div>
            </div>
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="stage" stroke="#52525B" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <YAxis stroke="#52525B" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Bar dataKey="count" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technical Domain Distribution Pill Strip */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '12.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Engineering Domain Allocation
              </h2>
              <span style={{ fontSize: '11px', color: '#71717A' }}>
                {domainData.reduce((acc, d) => acc + d.count, 0)} Total Classified
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {domainData.map((d) => (
                <div
                  key={d.id}
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: d.color }} />
                    <span style={{ fontSize: '11px', color: '#E4E4E7', fontWeight: '600' }}>{d.label}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Tech Signals & Hiring Feed with Category Filters */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="#FF3B30" />
              <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Tech Signals & Market Intel
              </h2>
            </div>
            <button
              onClick={fetchNews}
              disabled={isLoadingNews}
              style={{
                background: 'none',
                border: '1px solid #27272A',
                borderRadius: '4px',
                color: '#A1A1AA',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
              }}
              title="Refresh live tech intelligence feed"
            >
              <RefreshCw size={11} className={isLoadingNews ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Feed Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'ai', label: 'AI & LLMs' },
              { id: 'systems', label: 'Systems & Cloud' },
              { id: 'career', label: 'Hiring Intel' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setNewsFilter(f.id)}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  borderRadius: '4px',
                  border: newsFilter === f.id ? '1px solid #FF3B30' : '1px solid #27272A',
                  backgroundColor: newsFilter === f.id ? '#1E1414' : '#171717',
                  color: newsFilter === f.id ? '#FF3B30' : '#A1A1AA',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* News List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '430px' }}>
            {filteredNews.map((item) => {
              const isCaptured = ingestedUrls.has(item.url)
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        lineHeight: 1.35,
                        flex: 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#FF3B30')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                    >
                      {item.title}
                    </a>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#71717A', flexShrink: 0 }}
                      title="Open source article"
                    >
                      <ArrowUpRight size={13} />
                    </a>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10.5px', color: '#71717A' }}>
                      <span style={{ color: '#A1A1AA' }}>{item.domain}</span>
                      <span>·</span>
                      <span>▲ {item.score} pts</span>
                      {item.comments > 0 && (
                        <>
                          <span>·</span>
                          <span>{item.comments} comments</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleCaptureSignal(item)}
                      disabled={isCaptured}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: '600',
                        backgroundColor: isCaptured ? '#27272A' : '#1F1F23',
                        color: isCaptured ? '#4ADE80' : '#E4E4E7',
                        border: '1px solid #27272A',
                        borderRadius: '4px',
                        cursor: isCaptured ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isCaptured ? <CheckCircle2 size={11} /> : <Zap size={11} />}
                      <span>{isCaptured ? 'Captured' : 'Capture Signal'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 5. Active Pipeline Queue Preview */}
      <div
        style={{
          backgroundColor: '#0D0D0D',
          border: '1px solid #27272A',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Recent Pipeline Positions & Actions
            </h2>
            <span style={{ fontSize: '11.5px', color: '#71717A' }}>
              Latest opportunities ingested into your operational pipeline
            </span>
          </div>
          <button
            onClick={() => onNavigate('command-center')}
            style={{
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              border: '1px solid #27272A',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>Open Command Center</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {offers.slice(0, 4).map((offer) => (
            <div
              key={offer.id}
              style={{
                backgroundColor: '#171717',
                border: '1px solid #27272A',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                    {offer.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#27272A',
                      color: '#E4E4E7',
                    }}
                  >
                    {offer.channel}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '10px' }}>
                  {offer.company} · {offer.location || 'Remote'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #27272A' }}>
                <span style={{ fontSize: '11px', color: '#71717A' }}>
                  Status: <strong style={{ color: '#FFFFFF', textTransform: 'capitalize' }}>{offer.status || 'Saved'}</strong>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onNavigate('resume-studio')}
                    style={{
                      background: 'none',
                      border: '1px solid #27272A',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '10.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    Tailor CV
                  </button>
                  <button
                    onClick={() => onNavigate('command-center')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FF3B30',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <span>Inspect</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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
  ChevronRight,
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
} from 'recharts'
import { CATEGORIES } from '../data/categories.js'

export function HomeView({
  offers = [],
  clips = [],
  onNavigate,
  onQuickIngest,
}) {
  const [newsItems, setNewsItems] = useState([])
  const [activeTab, setActiveTab] = useState('pipeline') // 'pipeline' | 'market_intel'
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [quickInput, setQuickInput] = useState('')
  const [isQuickIngesting, setIsQuickIngesting] = useState(false)

  // Core KPIs
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
    { name: 'Direct Email', count: emailOffers, pct: totalOffers ? Math.round((emailOffers / totalOffers) * 100) : 0, color: '#FFFFFF' },
    { name: 'Direct DM', count: directOffers, pct: totalOffers ? Math.round((directOffers / totalOffers) * 100) : 0, color: '#A1A1AA' },
    { name: 'ATS Portals', count: externalOffers, pct: totalOffers ? Math.round((externalOffers / totalOffers) * 100) : 0, color: '#52525B' },
  ]

  // Domain breakdown
  const domainData = CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
    const count = offers.filter((o) => o.category === cat.id).length
    return {
      id: cat.id,
      label: cat.shortLabel || cat.label,
      color: cat.color || '#A1A1AA',
      count,
      pct: totalOffers ? Math.round((count / totalOffers) * 100) : 0,
    }
  }).sort((a, b) => b.count - a.count).slice(0, 4)

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoadingNews(true)
      try {
        const res = await fetch('/api/news')
        const data = await res.json()
        if (data.items) setNewsItems(data.items)
      } catch (e) {
        // silent fallback
      } finally {
        setIsLoadingNews(false)
      }
    }
    fetchNews()
  }, [])

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

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* 1. Calm Executive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#FF3B30' }} />
            <h1 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.4px', margin: 0, color: '#FFFFFF' }}>
              Pipeline Overview
            </h1>
            <span style={{ fontSize: '11px', color: '#71717A', marginLeft: '6px' }}>· Host Node 192.168.1.27:8003</span>
          </div>
          <p style={{ color: '#71717A', fontSize: '13px', margin: 0 }}>
            Unified signal intelligence, automated candidate matching, and multichannel dispatch.
          </p>
        </div>

        {/* Primary Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onNavigate('scraper')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.15s ease',
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
              fontWeight: '600',
              backgroundColor: '#18181B',
              color: '#E4E4E7',
              border: '1px solid #27272A',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={14} />
            <span>Resume Studio</span>
          </button>

          <a
            href="/api/offers/export/csv"
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: 'transparent',
              color: '#A1A1AA',
              border: '1px solid #27272A',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </a>
        </div>
      </div>

      {/* 2. Key Metrics Row (4 Clean Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '18px 20px' }}>
          <div style={{ color: '#71717A', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Tracked Opportunities
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {totalOffers}
          </div>
          <div style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>
            Active across all channels
          </div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '18px 20px' }}>
          <div style={{ color: '#71717A', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Applications Dispatched
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {applied}
          </div>
          <div style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>
            {velocityRate}% pipeline progress rate
          </div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '18px 20px' }}>
          <div style={{ color: '#71717A', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Active Interviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {interviews}
          </div>
          <div style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>
            {interviewRate}% application response rate
          </div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '18px 20px' }}>
          <div style={{ color: '#71717A', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Offers Received
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#FF3B30', letterSpacing: '-0.5px' }}>
            {offersWon}
          </div>
          <div style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>
            Confirmed placement stages
          </div>
        </div>
      </div>

      {/* 3. Main Operational View (2-Column Balanced Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Visual Funnel + Recent Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Conversion Funnel */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                  Pipeline Progression Funnel
                </h2>
                <span style={{ fontSize: '11px', color: '#71717A' }}>
                  Distribution of opportunities by operational stage
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="stage" stroke="#3F3F46" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <YAxis stroke="#3F3F46" tick={{ fill: '#71717A', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  />
                  <Bar dataKey="count" fill="#FFFFFF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Opportunities Table */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                  Recent Signals & Positions
                </h2>
                <span style={{ fontSize: '11px', color: '#71717A' }}>
                  Latest ingested postings ready for action
                </span>
              </div>
              <button
                onClick={() => onNavigate('command-center')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A1A1AA',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <span>View All ({totalOffers})</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {offers.slice(0, 5).map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    backgroundColor: '#121215',
                    border: '1px solid #1C1C20',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {offer.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>
                      {offer.company || 'Direct Organization'} · {offer.location || 'Remote'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        backgroundColor: '#18181B',
                        color: '#A1A1AA',
                        border: '1px solid #27272A',
                      }}
                    >
                      {offer.channel || 'ATS'}
                    </span>

                    <button
                      onClick={() => onNavigate('command-center')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#FFFFFF',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Channels + Domains + Instant Ingest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Terminal Ingest */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#71717A', marginBottom: '8px' }}>
              Quick Ingest Signal
            </div>
            <form onSubmit={handleQuickIngestSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="Paste URL, job post, or note..."
                style={{
                  flex: 1,
                  height: '34px',
                  padding: '0 10px',
                  backgroundColor: '#18181B',
                  border: '1px solid #27272A',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="submit"
                disabled={isQuickIngesting || !quickInput.trim()}
                style={{
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: isQuickIngesting ? '#27272A' : '#FFFFFF',
                  color: isQuickIngesting ? '#71717A' : '#000000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isQuickIngesting || !quickInput.trim() ? 'default' : 'pointer',
                }}
              >
                {isQuickIngesting ? '...' : 'Capture'}
              </button>
            </form>
          </div>

          {/* Outreach Channels Mix */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, marginBottom: '14px' }}>
              Dispatch Channel Allocation
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {channelData.map((ch, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                    <span style={{ color: '#E4E4E7' }}>{ch.name}</span>
                    <span style={{ color: '#71717A', fontFamily: 'monospace' }}>{ch.count} ({ch.pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: '#18181B', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${ch.pct}%`, height: '100%', backgroundColor: ch.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Technical Domains */}
          <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, marginBottom: '14px' }}>
              Domain Specialization
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {domainData.map((dom) => (
                <div key={dom.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: dom.color }} />
                    <span style={{ fontSize: '12px', color: '#A1A1AA' }}>{dom.label}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', fontFamily: 'monospace' }}>{dom.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Curated Signals Drawer */}
          {newsItems.length > 0 && (
            <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#71717A' }}>
                  Market Intel Signals
                </span>
                <Radio size={12} color="#FF3B30" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newsItems.slice(0, 3).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11.5px',
                      color: '#A1A1AA',
                      textDecoration: 'none',
                      lineHeight: '1.4',
                      display: 'block',
                      padding: '4px 0',
                      borderBottom: '1px solid #1C1C20',
                    }}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

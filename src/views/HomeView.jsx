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
  const [isLoadingNews, setIsLoadingNews] = useState(false)
  const [ingestedUrls, setIngestedUrls] = useState(new Set())

  // KPI calculations
  const totalOffers = offers.length
  const applied = offers.filter((o) => o.status === 'applied').length
  const interviews = offers.filter((o) => o.status === 'interview').length
  const offersWon = offers.filter((o) => o.status === 'offer').length
  const emailOffers = offers.filter((o) => o.channel === 'email').length
  const directOffers = offers.filter((o) => o.channel === 'direct_contact').length
  const externalOffers = offers.filter((o) => o.channel === 'external').length

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

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1600px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* 1. Executive Flight Deck Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
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
              ● SYSTEM NOMINAL · GUEST SCRAPER READY
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13.5px', margin: 0 }}>
            Unified career reconnaissance, automated multi-platform scraping, and real-time engineering market signals.
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

      {/* 2. Executive KPI Cards (4 Metric Tiles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div
          style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #27272A',
            borderRadius: '10px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Tracked Positions
            </span>
            <Briefcase size={16} color="#A1A1AA" />
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
            <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Applications Dispatched
            </span>
            <TrendingUp size={16} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            {applied}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            Direct Email & Custom Cover Letters
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
            <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Active Interviews
            </span>
            <CheckCircle2 size={16} color="#4ADE80" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#4ADE80', letterSpacing: '-0.5px' }}>
            {interviews}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            Technical screens & hiring manager rounds
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
            <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#A1A1AA' }}>
              Offers Secured
            </span>
            <Award size={16} color="#FF3B30" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FF3B30', letterSpacing: '-0.5px' }}>
            {offersWon}
          </div>
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
            Confirmed placement offers
          </div>
        </div>
      </div>

      {/* 3. Visual Analytics & Real-Time Tech Intelligence Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Left: Interactive Visual Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pipeline Funnel Graph */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Pipeline Conversion Funnel
                </h2>
                <span style={{ fontSize: '11.5px', color: '#71717A' }}>
                  Progress from reconnaissance to offer stage
                </span>
              </div>
            </div>
            <div style={{ width: '100%', height: '220px' }}>
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

          {/* Channels Breakdown Donut Chart */}
          <div
            style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #27272A',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Outreach Channels Split
                </h2>
                <span style={{ fontSize: '11.5px', color: '#71717A' }}>
                  Distribution across Direct Email, WhatsApp/DM, and External Portals
                </span>
              </div>
            </div>
            <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#27272A', color: '#FFFFFF', borderRadius: '6px', fontSize: '12px' }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconSize={10}
                      wrapperStyle={{ fontSize: '12px', color: '#A1A1AA' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: '#71717A', fontSize: '12px' }}>No channel data available yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Real-Time Tech & Hiring Intelligence News Feed */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="#FF3B30" />
              <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Real-Time Tech Signals & Hiring Feed
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

          <p style={{ fontSize: '12px', color: '#71717A', marginTop: '-8px', marginBottom: '16px' }}>
            Live engineering breakthroughs, AI tooling developments, and hiring market intelligence.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '460px' }}>
            {newsItems.map((item) => {
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
                      <span>{isCaptured ? 'Captured' : 'Ingest Signal'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Active Pipeline Queue Preview */}
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
              Recent Tracked Positions & Applications
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
          ))}
        </div>
      </div>
    </div>
  )
}

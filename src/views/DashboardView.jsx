import React from 'react'
import {
  Briefcase,
  Mail,
  Globe,
  Clock,
  Award,
  Calendar,
  AlertCircle,
  TrendingUp,
  Download,
  CheckCircle2,
  Zap,
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

export function DashboardView({ offers = [], onNavigate }) {
  const total = offers.length
  const emailOffers = offers.filter((o) => o.channel === 'email').length
  const directOffers = offers.filter((o) => o.channel === 'direct_contact').length
  const externalOffers = offers.filter((o) => o.channel === 'external').length
  const applied = offers.filter((o) => o.status === 'applied').length
  const interviews = offers.filter((o) => o.status === 'interview').length
  const offersWon = offers.filter((o) => o.status === 'offer').length
  const responseRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0

  // Category counts for Chart (monochrome palette)
  const categoryData = CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
    return {
      name: cat.shortLabel,
      count: offers.filter((o) => o.category === cat.id).length,
      color: '#FFFFFF',
    }
  }).filter((c) => c.count > 0)

  // Pipeline funnel data
  const funnelData = [
    { stage: 'Saved', count: offers.filter((o) => o.status === 'saved' || o.status === 'to_apply').length },
    { stage: 'Ready', count: offers.filter((o) => o.status === 'ready').length },
    { stage: 'Applied', count: applied },
    { stage: 'Interview', count: interviews },
    { stage: 'Offer', count: offersWon },
  ]

  // Channel Distribution
  const channelData = [
    { name: 'Direct Email', count: emailOffers, color: '#FFFFFF' },
    { name: 'DM / WhatsApp', count: directOffers, color: '#A1A1AA' },
    { name: 'ATS Portals', count: externalOffers, color: '#52525B' },
  ].filter(c => c.count > 0)

  // Follow-ups due
  const followUps = offers.filter((o) => o.status === 'follow_up' || o.status === 'applied')

  return (
    <div style={{ padding: '28px 36px 80px 36px', maxWidth: '1440px', margin: '0 auto', color: '#FFFFFF', width: '100%', boxSizing: 'border-box' }}>
      {/* Executive Header with 1-Click CSV Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#FF3B30' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
              Executive Career Intelligence
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
            Real-time analytics across multi-channel job reconnaissance, ATS alignment, and outreach velocity
          </p>
        </div>
        <a
          href="/api/offers/export/csv"
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: '#000000',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Download complete offers dataset with recruiter contacts, skills, and statuses"
        >
          <Download size={14} />
          <span>Export Dataset (CSV)</span>
        </a>
      </div>

      {/* KPI Metric Grid - Spacious 4-Card Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Total Tracked
            </span>
            <Briefcase size={16} color="#A1A1AA" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>{total}</div>
          <div style={{ fontSize: '11.5px', color: '#A1A1AA' }}>Aggregated across all portals & snips</div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Direct Leads
            </span>
            <Mail size={16} color="#A1A1AA" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>{emailOffers + directOffers}</div>
          <div style={{ fontSize: '11.5px', color: '#A1A1AA' }}>{emailOffers} Email • {directOffers} DM/WhatsApp</div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Active Interviews
            </span>
            <Clock size={16} color="#FF3B30" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#FF3B30', marginBottom: '4px' }}>{interviews}</div>
          <div style={{ fontSize: '11.5px', color: '#A1A1AA' }}>{applied} Applications Dispatched</div>
        </div>

        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Response Velocity
            </span>
            <TrendingUp size={16} color="#A1A1AA" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', marginBottom: '4px' }}>{responseRate}%</div>
          <div style={{ fontSize: '11.5px', color: '#A1A1AA' }}>Interview conversion ratio</div>
        </div>
      </div>

      {/* Analytics Charts Grid - Spacious 2-Column Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '22px', marginBottom: '28px' }}>
        {/* Pipeline Funnel Bar Chart */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '22px', height: '340px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Application Pipeline Funnel
              </span>
              <p style={{ fontSize: '11.5px', color: '#71717A', margin: '2px 0 0 0' }}>Conversion from signal saved to active offer</p>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
                backgroundColor: '#171717',
                border: '1px solid #27272A',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Open Kanban →
            </button>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="stage" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#171717', border: '1px solid #27272a', borderRadius: '6px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Breakdown Donut */}
        <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '22px', height: '340px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Channel Distribution
            </span>
            <p style={{ fontSize: '11.5px', color: '#71717A', margin: '2px 0 0 0' }}>Opportunity routing by channel</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '78%' }}>
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={channelData} dataKey="count" nameKey="name" innerRadius={48} outerRadius={78} stroke="#0D0D0D" strokeWidth={3}>
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#171717', border: '1px solid #27272a', borderRadius: '6px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px', flex: 1, paddingLeft: '12px' }}>
              {channelData.map((ch) => (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '2px', background: ch.color }} />
                    <span style={{ color: '#A1A1AA' }}>{ch.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{ch.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups Due & Next Actions */}
      <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #27272A', borderRadius: '10px', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#FF3B30" />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Pending Follow-Ups & Signals ({followUps.length})
            </span>
          </div>
        </div>

        {followUps.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#71717A', fontSize: '12.5px' }}>
            No pending follow-ups required. All dispatched applications are up to date.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {followUps.slice(0, 5).map((offer) => (
              <div
                key={offer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#141414',
                  border: '1px solid #27272A',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#27272A', color: '#E4E4E7' }}>
                    {offer.channel}
                  </span>
                  <div>
                    <strong style={{ color: '#FFFFFF' }}>{offer.title}</strong>
                    <span style={{ color: '#71717A', marginLeft: '10px' }}>at {offer.company || 'Direct Organization'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#A1A1AA' }}>
                    {offer.attachedCvTag || 'Standard CV'}
                  </span>
                  <button
                    onClick={() => onNavigate(offer.channel === 'email' ? 'email-workspace' : 'external-workspace')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      backgroundColor: '#FFFFFF',
                      color: '#000000',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Open Outreach →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

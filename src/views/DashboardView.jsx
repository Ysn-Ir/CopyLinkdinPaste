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

  // Category counts for Chart
  const categoryData = CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
    return {
      name: cat.shortLabel,
      count: offers.filter((o) => o.category === cat.id).length,
      color: cat.color,
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

  // Follow-ups due
  const followUps = offers.filter((o) => o.status === 'follow_up' || o.status === 'applied')

  return (
    <div className="workspace-view">
      {/* KPI Metric Strip */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Tracked</span>
            <Briefcase size={14} />
          </div>
          <div className="kpi-val">{total}</div>
          <div className="kpi-sub">Across all sources</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Direct Email</span>
            <Mail size={14} />
          </div>
          <div className="kpi-val">{emailOffers}</div>
          <div className="kpi-sub">Recruiter email outreach</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Direct DM / WhatsApp</span>
            <span style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>DM</span>
          </div>
          <div className="kpi-val" style={{ color: '#f59e0b' }}>{directOffers}</div>
          <div className="kpi-sub">LinkedIn DM / WhatsApp</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>External Portals</span>
            <Globe size={14} />
          </div>
          <div className="kpi-val">{externalOffers}</div>
          <div className="kpi-sub">ATS & portals</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Active Interviews</span>
            <Clock size={14} />
          </div>
          <div className="kpi-val" style={{ color: '#f59e0b' }}>
            {interviews}
          </div>
          <div className="kpi-sub">Pipeline in progress</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Pipeline Funnel Bar Chart */}
        <div className="kpi-card" style={{ height: '280px', padding: '16px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <span className="section-title">Application Pipeline Funnel</span>
            <button className="btn btn-ghost" onClick={() => onNavigate('pipeline')}>
              View Kanban
            </button>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="stage" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" fill="#ffffff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="kpi-card" style={{ height: '280px', padding: '16px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <span className="section-title">Offers by Taxonomy Category</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '80%' }}>
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="count" nameKey="name" innerRadius={42} outerRadius={68} stroke="#141417">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', flex: 1 }}>
              {categoryData.map((cat) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '2px', background: cat.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups Due & Recent Pipeline Activity */}
      <div className="kpi-card" style={{ padding: '16px' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <span className="section-title">
            <AlertCircle size={15} color="#f59e0b" />
            <span>Follow-ups & Next Actions ({followUps.length})</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {followUps.slice(0, 4).map((offer) => (
            <div
              key={offer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge-channel ${offer.channel}`}>{offer.channel}</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>{offer.title}</strong>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>at {offer.company}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {offer.attachedCvTag}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => onNavigate(offer.channel === 'email' ? 'email-workspace' : 'external-workspace')}
                >
                  Prepare Outreach
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

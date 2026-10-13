import React from 'react'
import {
  Briefcase,
  Mail,
  Globe,
  Clock,
  Award,
} from 'lucide-react'

export function StatCards({ offers = [] }) {
  const total = offers.length
  const emailOffers = offers.filter((o) => o.channel === 'email').length
  const externalOffers = offers.filter((o) => o.channel === 'external').length
  const inPipeline = offers.filter(
    (o) => o.status === 'to_apply' || o.status === 'applied' || o.status === 'interview'
  ).length
  const offersWon = offers.filter((o) => o.status === 'offer').length

  const stats = [
    {
      label: 'Total Saved',
      value: total,
      icon: Briefcase,
      color: '#ffffff',
      bg: 'rgba(255, 255, 255, 0.08)',
    },
    {
      label: 'Direct Email',
      value: emailOffers,
      icon: Mail,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
    },
    {
      label: 'External Portals',
      value: externalOffers,
      icon: Globe,
      color: '#a1a1aa',
      bg: 'rgba(161, 161, 170, 0.12)',
    },
    {
      label: 'Active Pipeline',
      value: inPipeline,
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
    },
    {
      label: 'Offers Won 🎉',
      value: offersWon,
      icon: Award,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.15)',
    },
  ]

  return (
    <div className="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="stat-card">
            <div
              className="stat-icon-wrapper"
              style={{ background: stat.bg, color: stat.color }}
            >
              <Icon size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-number">{stat.value}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

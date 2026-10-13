import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

export function DashboardScreen({ onNavigateTab, onSelectOffer }) {
  const [stats, setStats] = useState({
    total: 0,
    saved: 0,
    ready: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    email: 0,
    direct: 0,
    external: 0,
  })
  const [recentOffers, setRecentOffers] = useState([])
  const [serverInfo, setServerInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    const [offersRes, pingRes] = await Promise.all([
      ApiService.getOffers(),
      ApiService.testConnection(),
    ])

    if (offersRes.success) {
      const all = offersRes.offers || []
      setRecentOffers(all.slice(0, 5))
      setStats({
        total: all.length,
        saved: all.filter((o) => o.status === 'saved').length,
        ready: all.filter((o) => o.status === 'ready').length,
        applied: all.filter((o) => o.status === 'applied').length,
        interview: all.filter((o) => o.status === 'interview').length,
        offer: all.filter((o) => o.status === 'offer').length,
        email: all.filter((o) => o.channel === 'email').length,
        direct: all.filter((o) => o.channel === 'direct_contact').length,
        external: all.filter((o) => o.channel === 'external').length,
      })
    }

    if (pingRes.success) {
      setServerInfo(pingRes.data)
    }

    setIsLoading(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#ffffff"
        />
      }
    >
      {/* Top Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.title}>OmniHunt</Text>
        <Text style={styles.subtitle}>
          Executive Career Command • Cross-Device Sync
        </Text>
      </View>

      {/* Network Server Status Badge */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => onNavigateTab('connect')}
        activeOpacity={0.8}
      >
        <View style={styles.serverStatusDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.serverTitle}>
            {serverInfo ? `Connected to ${serverInfo.hostname || 'PC Server'}` : 'Scanning LAN & Wi-Fi...'}
          </Text>
          <Text style={styles.serverUrl}>{ApiService.getServerUrl()}</Text>
        </View>
        <Text style={styles.serverAction}>Settings →</Text>
      </TouchableOpacity>

      {/* Primary KPI Grid (Zero Purple, Electric Ice & Cyan) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiCardAccent]}>
          <Text style={[styles.kpiNumber, { color: '#f8fafc' }]}>
            {stats.total}
          </Text>
          <Text style={styles.kpiLabel}>Total Tracked</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#ffffff' }]}>
            {stats.ready}
          </Text>
          <Text style={styles.kpiLabel}>Ready to Apply</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#10b981' }]}>
            {stats.applied}
          </Text>
          <Text style={styles.kpiLabel}>Applications Sent</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#f59e0b' }]}>
            {stats.interview}
          </Text>
          <Text style={styles.kpiLabel}>Interviews</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#10b981' }]}>
            {stats.offer}
          </Text>
          <Text style={styles.kpiLabel}>Offers Received</Text>
        </View>
      </View>

      {/* Channel Breakdown Card */}
      <View style={styles.channelBreakdownCard}>
        <Text style={styles.channelSectionTitle}>Channel Distribution</Text>
        <View style={styles.channelRow}>
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.email}</Text>
            <Text style={styles.channelStatLabel}>✉️ Direct Email</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.direct}</Text>
            <Text style={styles.channelStatLabel}>💬 WhatsApp / DM</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.external}</Text>
            <Text style={styles.channelStatLabel}>🌐 ATS Portals</Text>
          </View>
        </View>
      </View>

      {/* Fast Ingestion CTA Banner */}
      <TouchableOpacity
        style={styles.ctaBanner}
        onPress={() => onNavigateTab('capture')}
        activeOpacity={0.8}
      >
        <View style={styles.ctaIconBox}>
          <Text style={styles.ctaIcon}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Capture Clipboard Post</Text>
          <Text style={styles.ctaSubtitle}>
            Copy any LinkedIn post, job alert, or ATS URL — OmniHunt ingests and routes it automatically.
          </Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Offers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Synced Applications</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')}>
          <Text style={styles.viewAllText}>View All ({stats.total}) →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#ffffff" style={{ marginTop: 20 }} />
      ) : recentOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No synced applications yet. Capture or sync from PC.</Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentOffers.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={styles.recentItem}
              onPress={() => onSelectOffer(o)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {o.title}
                </Text>
                <Text style={styles.recentMeta}>
                  {o.company || 'Direct Organization'} • {o.category?.toUpperCase() || 'GENERAL'} • {o.channel === 'email' ? '✉️ Email' : o.channel === 'direct_contact' ? '💬 WhatsApp' : '🌐 ATS'}
                </Text>
              </View>
              <View style={styles.recentStatusBadge}>
                <Text style={styles.recentStatus}>{o.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  content: {
    padding: 16,
    paddingBottom: 120, // generous bottom padding to keep all buttons and items safe from clipping
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  serverTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  serverUrl: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  serverAction: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  kpiCardAccent: {
    borderColor: 'rgba(14, 165, 233, 0.4)',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },

  // Channel Breakdown
  channelBreakdownCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  channelSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  channelStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  channelStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  channelStatLabel: {
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  channelStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },

  // CTA Banner
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  ctaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIcon: {
    fontSize: 16,
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  ctaArrow: {
    fontSize: 16,
    color: '#38bdf8',
    fontWeight: '700',
  },

  // Recent Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  viewAllText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  recentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  recentStatus: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
})

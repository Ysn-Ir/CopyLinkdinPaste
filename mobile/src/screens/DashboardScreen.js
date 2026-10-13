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
      setRecentOffers(all.slice(0, 4))
      setStats({
        total: all.length,
        saved: all.filter((o) => o.status === 'saved').length,
        ready: all.filter((o) => o.status === 'ready').length,
        applied: all.filter((o) => o.status === 'applied').length,
        interview: all.filter((o) => o.status === 'interview').length,
        offer: all.filter((o) => o.status === 'offer').length,
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
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={THEME.colors.accent}
        />
      }
    >
      {/* Top Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.title}>OmniHunt</Text>
        <Text style={styles.subtitle}>
          Mobile Career & Clip Sync • Connected to PC
        </Text>
      </View>

      {/* Network Server Status Badge */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => onNavigateTab('connect')}
      >
        <View style={styles.serverStatusDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.serverTitle}>
            {serverInfo ? `Connected to ${serverInfo.hostname || 'PC'}` : 'Scanning LAN...'}
          </Text>
          <Text style={styles.serverUrl}>{ApiService.getServerUrl()}</Text>
        </View>
        <Text style={styles.serverAction}>Settings →</Text>
      </TouchableOpacity>

      {/* Primary KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderColor: THEME.colors.accentBorder }]}>
          <Text style={[styles.kpiNumber, { color: '#c7d2fe' }]}>
            {stats.total}
          </Text>
          <Text style={styles.kpiLabel}>Total Offers</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#60a5fa' }]}>
            {stats.ready}
          </Text>
          <Text style={styles.kpiLabel}>Ready</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#818cf8' }]}>
            {stats.applied}
          </Text>
          <Text style={styles.kpiLabel}>Applied</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#fbbf24' }]}>
            {stats.interview}
          </Text>
          <Text style={styles.kpiLabel}>Interviews</Text>
        </View>
      </View>

      {/* Fast Ingestion CTA Banner */}
      <TouchableOpacity
        style={styles.ctaBanner}
        onPress={() => onNavigateTab('capture')}
      >
        <View style={styles.ctaIconBox}>
          <Text style={styles.ctaIcon}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Capture Clipboard Post</Text>
          <Text style={styles.ctaSubtitle}>
            Copy any LinkedIn post, job listing, or URL to ingest with AI instantly.
          </Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Offers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Synced Offers</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')}>
          <Text style={styles.viewAllText}>View All ({stats.total}) →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.accent} style={{ marginTop: 20 }} />
      ) : recentOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No synced offers yet. Capture or sync from PC.</Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentOffers.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={styles.recentItem}
              onPress={() => onSelectOffer(o)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {o.title}
                </Text>
                <Text style={styles.recentMeta}>
                  {o.company || 'Company'} • {o.category || 'General'} • {o.channel === 'email' ? 'Email' : o.channel === 'direct_contact' ? 'Direct DM' : 'ATS'}
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
    paddingTop: 28,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
  },
  serverTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  serverUrl: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  serverAction: {
    fontSize: 11,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 14,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  ctaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
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
    color: '#c7d2fe',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  viewAllText: {
    fontSize: 11,
    color: '#a5b4fc',
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
})

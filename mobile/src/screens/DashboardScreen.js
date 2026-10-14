import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { ApiService } from '../services/api'
import { ScreenshotWatcher } from '../services/screenshotWatcher'
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
  const [isScanningScreenshot, setIsScanningScreenshot] = useState(false)

  const handleQuickScanScreenshot = async () => {
    setIsScanningScreenshot(true)
    try {
      const res = await ScreenshotWatcher.scanLatestScreenshot({ force: true })
      if (res && res.success) {
        Alert.alert(
          res.isJobOffer ? '🎯 Opportunity Detected!' : '⚡ Screenshot Captured',
          res.isJobOffer
            ? `"${res.offer?.title || 'Offer'}" extracted and routed!`
            : 'Screenshot OCR text parsed into RADAR Vault.'
        )
        await loadDashboardData()
        if (res.isJobOffer && res.offer && onSelectOffer) {
          onSelectOffer(res.offer)
        }
      } else {
        Alert.alert('Scan Result', res?.error || 'No new screenshots found in device gallery.')
      }
    } catch (err) {
      Alert.alert('Scan Notice', err.message || 'Could not access photo library.')
    } finally {
      setIsScanningScreenshot(false)
    }
  }

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.radarBrandDot} />
          <Text style={styles.title}>RADAR</Text>
        </View>
        <Text style={styles.subtitle}>
          AI Signal & Career Opportunity Intelligence
        </Text>
      </View>

      {/* Network Server Status Badge */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => onNavigateTab('connect')}
        activeOpacity={0.8}
      >
        <View style={styles.serverStatusDot} />
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Text style={styles.serverTitle} numberOfLines={1} ellipsizeMode="tail">
            {serverInfo ? `Connected to ${serverInfo.hostname || 'PC Server'}` : 'Scanning Network...'}
          </Text>
          <Text style={styles.serverUrl} numberOfLines={1} ellipsizeMode="tail">
            {ApiService.getServerUrl()}
          </Text>
        </View>
        <Text style={styles.serverAction}>Settings →</Text>
      </TouchableOpacity>

      {/* 1-Tap Quick Screenshot Scanner */}
      <TouchableOpacity
        style={styles.screenshotQuickCard}
        onPress={handleQuickScanScreenshot}
        disabled={isScanningScreenshot}
        activeOpacity={0.8}
      >
        <View style={styles.screenshotQuickLeft}>
          <View style={styles.screenshotQuickIconBox}>
            <Text style={{ fontSize: 16 }}>📸</Text>
          </View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Text style={styles.screenshotQuickTitle} numberOfLines={1}>
              Instant Scan Last Screenshot
            </Text>
            <Text style={styles.screenshotQuickSub} numberOfLines={1}>
              {isScanningScreenshot ? 'Analyzing with Groq Vision OCR...' : '1-tap inspect newest screenshot in gallery'}
            </Text>
          </View>
        </View>
        <View style={styles.screenshotQuickBtn}>
          {isScanningScreenshot ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.screenshotQuickBtnText}>Scan Now</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Primary KPI Grid (Instagram Dark Mode Palette) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiCardAccent]}>
          <Text style={[styles.kpiNumber, { color: '#ffffff' }]}>
            {stats.total}
          </Text>
          <Text style={styles.kpiLabel}>Total Tracked</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#0095f6' }]}>
            {stats.ready}
          </Text>
          <Text style={styles.kpiLabel}>Ready to Apply</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#00e676' }]}>
            {stats.applied}
          </Text>
          <Text style={styles.kpiLabel}>Applications Sent</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#fcaf45' }]}>
            {stats.interview}
          </Text>
          <Text style={styles.kpiLabel}>Interviews</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#e1306c' }]}>
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
            <Text style={styles.channelStatLabel} numberOfLines={1}>✉️ Direct Email</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.direct}</Text>
            <Text style={styles.channelStatLabel} numberOfLines={1}>💬 WhatsApp / DM</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.external}</Text>
            <Text style={styles.channelStatLabel} numberOfLines={1}>🌐 ATS Portals</Text>
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
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Text style={styles.ctaTitle} numberOfLines={1}>Capture Clipboard or Link</Text>
          <Text style={styles.ctaSubtitle} numberOfLines={2}>
            Copy any job post, alert, or ATS link — RADAR parses and routes it automatically.
          </Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Offers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Synced Opportunities</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')}>
          <Text style={styles.viewAllText}>View All ({stats.total}) →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#e1306c" style={{ marginTop: 20 }} />
      ) : recentOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No synced opportunities yet. Take a screenshot or copy a link.</Text>
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
              <View style={{ flex: 1, overflow: 'hidden' }}>
                <Text style={styles.recentTitle} numberOfLines={1} ellipsizeMode="tail">
                  {o.title}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1} ellipsizeMode="tail">
                  {o.company || 'Direct Organization'} • {o.category?.toUpperCase() || 'GENERAL'} • {o.channel === 'email' ? '✉️ Email' : o.channel === 'direct_contact' ? '💬 WhatsApp' : '🌐 ATS'}
                </Text>
              </View>
              <View style={styles.recentStatusBadge}>
                <Text style={styles.recentStatus} numberOfLines={1}>{o.status}</Text>
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
  radarBrandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e1306c',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#a8a8a8',
    marginTop: 2,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e676',
  },
  serverTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  serverUrl: {
    fontSize: 10,
    color: '#737373',
    marginTop: 1,
  },
  serverAction: {
    fontSize: 11,
    color: '#0095f6',
    fontWeight: '700',
  },

  // 1-Tap Quick Screenshot Scanner Card
  screenshotQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  screenshotQuickLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenshotQuickIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    backgroundColor: 'rgba(225, 48, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotQuickTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  screenshotQuickSub: {
    fontSize: 10.5,
    color: '#a8a8a8',
    marginTop: 1,
  },
  screenshotQuickBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotQuickBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },

  // KPI Grid (Instagram Dark Mode)
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 12,
  },
  kpiCardAccent: {
    borderColor: 'rgba(225, 48, 108, 0.45)',
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#737373',
    fontWeight: '600',
  },

  // Channel Breakdown
  channelBreakdownCard: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  channelSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#737373',
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
    color: '#ffffff',
    marginBottom: 2,
  },
  channelStatLabel: {
    fontSize: 9.5,
    color: '#a8a8a8',
    fontWeight: '600',
  },
  channelStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#262626',
  },

  // CTA Banner
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  ctaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(225, 48, 108, 0.15)',
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

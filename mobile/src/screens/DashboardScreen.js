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
import { THEME, getStageMeta } from '../theme'

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
          res.isJobOffer ? 'Signal Identified' : 'Screenshot Ingested',
          res.isJobOffer
            ? `"${res.offer?.title || 'Offer'}" extracted and routed to pipeline.`
            : 'Screenshot OCR text analyzed and archived in Vault.'
        )
        await loadDashboardData()
        if (res.isJobOffer && res.offer && onSelectOffer) {
          onSelectOffer(res.offer)
        }
      } else {
        Alert.alert('Scan Status', res?.error || 'No new screenshots found in device gallery.')
      }
    } catch (err) {
      Alert.alert('Scan Status', err.message || 'Could not access photo library.')
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
          tintColor={THEME.colors.textPrimary}
        />
      }
    >
      {/* Flight HUD Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.radarBeacon} />
          <Text style={styles.title}>RADAR</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v2.0 HUD</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Signal Reconnaissance & Pipeline Command
        </Text>
      </View>

      {/* Network Server Status Bar */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => onNavigateTab('connect')}
        activeOpacity={0.8}
      >
        <View style={styles.serverStatusDot} />
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Text style={styles.serverTitle} numberOfLines={1} ellipsizeMode="tail">
            {serverInfo ? `Node Active: ${serverInfo.hostname || 'Localhost'}` : 'Scanning Local Network...'}
          </Text>
          <Text style={styles.serverUrl} numberOfLines={1} ellipsizeMode="tail">
            {ApiService.getServerUrl()}
          </Text>
        </View>
        <Text style={styles.serverAction}>Configure →</Text>
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
            <Text style={{ fontSize: 15 }}>📸</Text>
          </View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Text style={styles.screenshotQuickTitle} numberOfLines={1}>
              Inspect Gallery Screenshot
            </Text>
            <Text style={styles.screenshotQuickSub} numberOfLines={1}>
              {isScanningScreenshot ? 'Running Groq OCR & Triage...' : '1-tap OCR latest image in gallery'}
            </Text>
          </View>
        </View>
        <View style={styles.screenshotQuickBtn}>
          {isScanningScreenshot ? (
            <ActivityIndicator size="small" color={THEME.colors.textPrimary} />
          ) : (
            <Text style={styles.screenshotQuickBtnText}>Run OCR</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Primary KPI Grid (Pure Engineering Monochrome) */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
          <Text style={styles.kpiNumber}>{stats.total}</Text>
          <Text style={styles.kpiLabel}>Total Signals</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{stats.ready}</Text>
          <Text style={styles.kpiLabel}>Ready ATS</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{stats.applied}</Text>
          <Text style={styles.kpiLabel}>Applied</Text>
        </View>

        <View style={[styles.kpiCard, stats.interview > 0 && styles.kpiCardActive]}>
          <Text style={[styles.kpiNumber, stats.interview > 0 && { color: THEME.colors.accent }]}>
            {stats.interview}
          </Text>
          <Text style={styles.kpiLabel}>Interviews</Text>
        </View>
      </View>

      {/* Channel Distribution Matrix */}
      <View style={styles.channelBreakdownCard}>
        <Text style={styles.channelSectionTitle}>Distribution by Channel</Text>
        <View style={styles.channelRow}>
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.email}</Text>
            <Text style={styles.channelStatLabel} numberOfLines={1}>Direct Email</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.direct}</Text>
            <Text style={styles.channelStatLabel} numberOfLines={1}>WhatsApp / DM</Text>
          </View>
          <View style={styles.channelStatDivider} />
          <View style={styles.channelStatItem}>
            <Text style={styles.channelStatVal}>{stats.external}</Text>
            <Text style={styles.channelStatLabel} numberOfLines={1}>ATS Portals</Text>
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
          <Text style={styles.ctaTitle} numberOfLines={1}>Ingest Signal or Link</Text>
          <Text style={styles.ctaSubtitle} numberOfLines={2}>
            Paste any career posting, lead, or ATS link for autonomous triage.
          </Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Offers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Opportunities</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')}>
          <Text style={styles.viewAllText}>View All ({stats.total}) →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.textPrimary} style={{ marginTop: 20 }} />
      ) : recentOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No synced opportunities yet. Take a screenshot or paste a link.</Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentOffers.map((o) => {
            const stage = getStageMeta(o.status)
            return (
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
                    {o.company || 'Direct Organization'} • {o.category?.toUpperCase() || 'GENERAL'} • {o.channel === 'email' ? 'Email' : o.channel === 'direct_contact' ? 'Direct' : 'ATS'}
                  </Text>
                </View>
                <View style={[styles.recentStatusBadge, { backgroundColor: stage.bg, borderColor: stage.border }]}>
                  <Text style={[styles.recentStatus, { color: stage.color }]} numberOfLines={1}>
                    {stage.label}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
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
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarBeacon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 1.5,
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginLeft: 4,
  },
  versionText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  serverStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.textPrimary,
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
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },

  // 1-Tap Quick Screenshot Scanner Card
  screenshotQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
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
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotQuickTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  screenshotQuickSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  screenshotQuickBtn: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  screenshotQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
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
    borderRadius: 10,
    padding: 12,
  },
  kpiCardPrimary: {
    borderColor: THEME.colors.borderElevated,
  },
  kpiCardActive: {
    borderColor: THEME.colors.accentBorder,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Channel Distribution
  channelBreakdownCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  channelSectionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
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
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  channelStatLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  channelStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: THEME.colors.border,
  },

  // CTA Banner
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  ctaIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: THEME.colors.accentLight,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIcon: {
    fontSize: 14,
  },
  ctaTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  ctaSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  ctaArrow: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyText: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recentTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
  },
  recentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  recentStatus: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})

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
  Dimensions,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { ApiService } from '../services/api'
import { ScreenshotWatcher } from '../services/screenshotWatcher'
import { THEME, getStageMeta } from '../theme'
import { RadarLogo } from '../components/RadarLogo'

const { width } = Dimensions.get('window')
const RECOMMENDED_CARD_WIDTH = width * 0.74

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
  const [candidateProfile, setCandidateProfile] = useState({
    fullName: 'Khalil Ingénieur PFE',
    headline: 'Élève Ingénieur en Génie Logiciel & IA',
    email: 'khalil.pfe@gmail.com',
    phone: '+33 6 12 34 56 78',
    city: 'Paris, France / Télétravail',
    skills: 'Python, PyTorch, LLMs, NLP, React, FastAPI, Docker',
  })
  const [serverInfo, setServerInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isScanningScreenshot, setIsScanningScreenshot] = useState(false)
  const [isDumpingClipboard, setIsDumpingClipboard] = useState(false)

  const handleDumpClipboard = async () => {
    setIsDumpingClipboard(true)
    try {
      const hasStr = await Clipboard.hasStringAsync()
      if (!hasStr) {
        Alert.alert('Empty Clipboard', 'No text or links copied yet. Copy a LinkedIn job URL or recruiter post first!')
        return
      }
      const text = await Clipboard.getStringAsync()
      if (!text || !text.trim()) {
        Alert.alert('Empty Clipboard', 'Your clipboard contains only blank spaces.')
        return
      }

      const trimmed = text.trim()
      const urls = trimmed.match(/https?:\/\/[^\s]+/g)
      if (urls && urls.length > 1) {
        // Multi-link batch dump
        const res = await ApiService.bulkIngestClips({ rawText: trimmed, urls, sourceDevice: 'android_mobile_dump' })
        Alert.alert('📥 Batch Dump Complete', `Vaulted ${urls.length} links into your RADAR system!`)
        await loadDashboardData()
      } else {
        const res = await ApiService.ingestPost(trimmed)
        if (res && res.success) {
          Alert.alert(
            res.isJobOffer ? '🎯 Opportunity Detected!' : '📋 Clip Saved to Vault',
            res.isJobOffer
              ? `"${res.offer?.title || 'Job'}" at ${res.offer?.company || 'Company'} extracted with Groq AI and added to pipeline.`
              : 'Content cataloged into your RADAR Vault.'
          )
          await loadDashboardData()
          if (res.isJobOffer && res.offer && onSelectOffer) {
            onSelectOffer(res.offer)
          }
        } else {
          Alert.alert('Ingestion Status', res?.error || 'Could not process clipboard text.')
        }
      }
    } catch (err) {
      Alert.alert('Clipboard Error', err.message || 'Failed reading phone clipboard.')
    } finally {
      setIsDumpingClipboard(false)
    }
  }

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
        Alert.alert('Scan Status', res?.error || 'No new screenshots found in gallery.')
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
    try {
      const [offersRes, profileRes, pingRes] = await Promise.all([
        ApiService.getOffers(),
        ApiService.getProfile(),
        ApiService.testConnection(),
      ])

      if (offersRes && offersRes.success) {
        const all = offersRes.offers || []
        setRecentOffers(all)
        setStats({
          total: all.length,
          saved: all.filter((o) => o.status === 'saved' || o.status === 'to_apply').length,
          ready: all.filter((o) => o.status === 'ready').length,
          applied: all.filter((o) => o.status === 'applied').length,
          interview: all.filter((o) => o.status === 'interview').length,
          offer: all.filter((o) => o.status === 'offer').length,
        })
      }

      if (profileRes && profileRes.success && profileRes.profile) {
        setCandidateProfile((prev) => ({ ...prev, ...profileRes.profile }))
      }

      if (pingRes && pingRes.success) {
        setServerInfo(pingRes.data)
      }
    } catch (e) {
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }

  // Use real offers from database or high-fidelity fallback
  const recommendedJobs = recentOffers.length > 0 ? recentOffers.slice(0, 4) : [
    {
      id: 'rec-1',
      title: 'Python Lead Engineer',
      company: 'CetaCorp',
      location: 'Remote / Hybrid',
      channel: 'external',
      confidence: 0.94,
    },
    {
      id: 'rec-2',
      title: 'Stage PFE - Ingénieur Fullstack',
      company: 'Datadog Tech',
      location: 'Paris, France',
      channel: 'external',
      confidence: 0.91,
    },
  ]

  // Dynamic calculations
  const filledFields = [
    candidateProfile.fullName,
    candidateProfile.email,
    candidateProfile.phone,
    candidateProfile.headline || candidateProfile.degree,
    candidateProfile.city,
    candidateProfile.skills,
    candidateProfile.bio || candidateProfile.customInstructions,
  ].filter(Boolean).length
  const completenessPct = Math.min(100, Math.max(50, Math.round((filledFields / 7) * 100)))

  const emailCount = recentOffers.filter((o) => o.channel === 'email').length
  const dmCount = recentOffers.filter((o) => o.channel === 'direct_contact').length
  const atsCount = Math.max(0, stats.total - emailCount - dmCount)
  const funnelMax = Math.max(1, stats.total, stats.saved, stats.ready, stats.applied, stats.interview, stats.offer)

  const initials = (candidateProfile.fullName || 'KP')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={THEME.colors.primary}
        />
      }
    >
      {/* 0. Top Brand Header with RADAR Logo */}
      <View style={styles.topBrandBar}>
        <RadarLogo size={32} showWordmark={true} subtitle="SIGNAL & CAREER HUD" />
        <View style={styles.topBrandActions}>
          <TouchableOpacity
            style={styles.settingsPill}
            onPress={() => onNavigateTab && onNavigateTab('settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsPillText}>⚙️ SETTINGS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Operator Profile Header matching Reference Screen 2 */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => onNavigateTab && onNavigateTab('settings')}
        activeOpacity={0.9}
      >
        <View style={styles.avatarBox}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>

        <Text style={styles.operatorName}>{candidateProfile.fullName || 'Khalil Ingénieur PFE'}</Text>
        <Text style={styles.operatorTitle}>
          {candidateProfile.headline || candidateProfile.degree || 'Élève Ingénieur en Génie Logiciel & IA'}
        </Text>

        {/* Profile Completeness Bar matching Screen 2 */}
        <View style={styles.completenessRow}>
          <Text style={styles.completenessLabel}>Profile completeness</Text>
          <Text style={styles.completenessPct}>{completenessPct}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completenessPct}%` }]} />
        </View>
      </TouchableOpacity>

      {/* 2. Visual Graphs: Pipeline Progression Funnel & Channels */}
      <View style={styles.graphCard}>
        <View style={styles.graphHeaderRow}>
          <View>
            <Text style={styles.graphTitle}>Pipeline Progression Funnel</Text>
            <Text style={styles.graphSubtitle}>
              {stats.total} Tracked Opportunities across operational stages
            </Text>
          </View>
          <View style={styles.graphRateBadge}>
            <Text style={styles.graphRateText}>
              {stats.total > 0
                ? Math.round(((stats.applied + stats.interview + stats.offer) / stats.total) * 100)
                : 0}
              % Active
            </Text>
          </View>
        </View>

        {/* Funnel 5-stage vertical bar pillars */}
        <View style={styles.funnelGrid}>
          {[
            { label: 'SAVED', count: stats.saved, color: '#64748B' },
            { label: 'READY', count: stats.ready, color: '#3B82F6' },
            { label: 'APPLIED', count: stats.applied, color: '#10B981' },
            { label: 'INTERVIEW', count: stats.interview, color: '#F59E0B' },
            { label: 'OFFER', count: stats.offer, color: '#FF3B30' },
          ].map((stage) => {
            const heightPct = Math.max(16, Math.min(100, Math.round((stage.count / funnelMax) * 100)))
            return (
              <TouchableOpacity
                key={stage.label}
                style={styles.funnelPillar}
                onPress={() => onNavigateTab && onNavigateTab('offers')}
                activeOpacity={0.8}
              >
                <Text style={[styles.funnelCount, { color: stage.color }]}>{stage.count}</Text>
                <View style={styles.pillarTrack}>
                  <View
                    style={[
                      styles.pillarBar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: stage.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.funnelLabel}>{stage.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Channel Distribution Progress Bar */}
        <View style={styles.channelSection}>
          <View style={styles.channelHeaderRow}>
            <Text style={styles.channelSectionTitle}>Dispatch Channel Allocation</Text>
            <Text style={styles.channelTotalText}>{stats.total} total</Text>
          </View>

          <View style={styles.segmentedBar}>
            <View
              style={[
                styles.segment,
                {
                  flex: Math.max(0.1, emailCount),
                  backgroundColor: '#FF3B30',
                },
              ]}
            />
            <View
              style={[
                styles.segment,
                {
                  flex: Math.max(0.1, dmCount),
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <View
              style={[
                styles.segment,
                {
                  flex: Math.max(0.1, atsCount),
                  backgroundColor: '#475569',
                },
              ]}
            />
          </View>

          <View style={styles.channelLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.legendText}>Direct Email ({emailCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>WhatsApp/DM ({dmCount})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#475569' }]} />
              <Text style={styles.legendText}>ATS Portals ({atsCount})</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. Recommended Real Opportunities matching Reference Screen 2 */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recommended Opportunities</Text>
        <TouchableOpacity onPress={() => onNavigateTab && onNavigateTab('offers')} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>SEE ALL ({stats.total})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendedScroll}
      >
        {recommendedJobs.map((job, idx) => {
          const isCrimson = idx % 2 === 0
          const fitPct = Math.round((job.confidence || 0.92) * 100)
          return (
            <TouchableOpacity
              key={job.id || idx}
              style={[
                styles.recommendedCard,
                isCrimson ? styles.cardCrimson : styles.cardObsidian,
              ]}
              onPress={() => onSelectOffer && onSelectOffer(job)}
              activeOpacity={0.9}
            >
              <View style={[styles.cardScopeBadge, !isCrimson && { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <Text style={styles.cardScopeText}>{fitPct}% FIT</Text>
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.cardRole} numberOfLines={2}>
                  {job.title}
                </Text>
                <Text style={styles.cardCompany} numberOfLines={1}>
                  {job.company || 'Direct Organization'}
                </Text>
                <Text style={styles.cardLocation} numberOfLines={1}>
                  {job.location || 'Remote / Hybrid'}
                </Text>
              </View>

              <View style={styles.cardActionRow}>
                <View style={styles.applyPill}>
                  <Text style={[styles.applyPillText, { color: isCrimson ? '#FF3B30' : '#09090B' }]}>
                    INSPECT →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* 4. Recent Activities Section matching Screen 2 */}
      <View style={[styles.sectionRow, { marginTop: 22 }]}>
        <Text style={styles.sectionTitle}>Pipeline Metrics</Text>
      </View>

      <View style={styles.activitiesRow}>
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => onNavigateTab && onNavigateTab('offers')}
          activeOpacity={0.85}
        >
          <View style={[styles.activityIconBox, { backgroundColor: '#FFF1F0', borderColor: '#FECDD3' }]}>
            <Text style={[styles.activityIconText, { color: '#FF3B30' }]}>SAVE</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.activityNumber}>{stats.saved + stats.ready}</Text>
            <Text style={styles.activityLabel}>Saved / Ready</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => onNavigateTab && onNavigateTab('offers')}
          activeOpacity={0.85}
        >
          <View style={[styles.activityIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Text style={[styles.activityIconText, { color: '#10B981' }]}>SENT</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.activityNumber}>{stats.applied}</Text>
            <Text style={styles.activityLabel}>Applications Sent</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4.5. 1-Tap Dump Clipboard Hero Action */}
      <TouchableOpacity
        style={styles.dumpClipboardCard}
        onPress={handleDumpClipboard}
        disabled={isDumpingClipboard}
        activeOpacity={0.85}
      >
        <View style={styles.dumpClipboardIconBox}>
          <Text style={{ fontSize: 20 }}>📥</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.dumpClipboardTitle}>Dump Clipboard & Ingest</Text>
            <View style={styles.dumpGroqBadge}>
              <Text style={styles.dumpGroqText}>Groq AI</Text>
            </View>
          </View>
          <Text style={styles.dumpClipboardSub}>
            {isDumpingClipboard ? 'Extracting with Groq AI...' : '1-tap ingest link, post text, or multi-URL dump'}
          </Text>
        </View>
        {isDumpingClipboard ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : (
          <View style={styles.dumpActionBtn}>
            <Text style={styles.dumpActionBtnText}>DUMP</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 5. Autonomous Scraper & Screenshot OCR Launcher Tiles */}
      <View style={styles.toolsRow}>
        <TouchableOpacity
          style={styles.toolCard}
          onPress={() => onNavigateTab && onNavigateTab('scraper')}
          activeOpacity={0.85}
        >
          <View style={[styles.toolBadge, { backgroundColor: '#FFF1F0', borderColor: '#FECDD3' }]}>
            <Text style={{ color: '#FF3B30', fontWeight: '800', fontSize: 10 }}>HUNT</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.toolTitle}>Autonomous Scraper</Text>
            <Text style={styles.toolSub}>Python-JobSpy · LinkedIn & Indeed</Text>
          </View>
          <Text style={styles.toolArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolCard}
          onPress={handleQuickScanScreenshot}
          disabled={isScanningScreenshot}
          activeOpacity={0.85}
        >
          <View style={[styles.toolBadge, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
            <Text style={{ color: '#4F46E5', fontWeight: '800', fontSize: 10 }}>OCR</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.toolTitle}>Gallery Screenshot OCR</Text>
            <Text style={styles.toolSub}>
              {isScanningScreenshot ? 'Running 15ms WinOCR...' : '1-tap snip text & flyers'}
            </Text>
          </View>
          {isScanningScreenshot ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Text style={styles.toolArrow}>→</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 6. Network Node Status Pill */}
      <TouchableOpacity
        style={styles.nodeStatusPill}
        onPress={() => onNavigateTab && onNavigateTab('settings')}
        activeOpacity={0.85}
      >
        <View style={styles.beaconDot} />
        <Text style={styles.nodeStatusText}>
          {serverInfo
            ? `RADAR Host: ${serverInfo.hostname || '192.168.1.27:8003'} · Online (${serverInfo.databaseEngine || 'PostgreSQL'})`
            : 'RADAR Node: 192.168.1.27:8003 · Tap to Configure'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  topBrandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  topBrandActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 0.5,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#09090B',
    borderWidth: 3,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  operatorName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  operatorTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  completenessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  completenessLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  completenessPct: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  graphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  graphHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  graphTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.2,
  },
  graphSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  graphRateBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  graphRateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  funnelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 4,
    marginBottom: 16,
  },
  funnelPillar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 3,
  },
  funnelCount: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  pillarTrack: {
    width: 22,
    height: 75,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pillarBar: {
    width: '100%',
    borderRadius: 5,
  },
  funnelLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
  },
  channelSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090B',
  },
  channelTotalText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  segment: {
    height: '100%',
  },
  channelLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  recommendedScroll: {
    gap: 14,
    paddingRight: 20,
  },
  recommendedCard: {
    width: RECOMMENDED_CARD_WIDTH,
    height: 160,
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  cardCrimson: {
    backgroundColor: '#FF3B30',
  },
  cardObsidian: {
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cardScopeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardScopeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardRole: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardCompany: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 3,
    fontWeight: '600',
  },
  cardLocation: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applyPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  applyPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activitiesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dumpClipboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    marginTop: 14,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dumpClipboardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dumpClipboardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.2,
  },
  dumpGroqBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dumpGroqText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dumpClipboardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dumpActionBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  dumpActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: {
    fontSize: 9,
    fontWeight: '900',
  },
  activityNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  activityLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  toolsRow: {
    marginTop: 16,
    gap: 10,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  toolBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  toolSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  toolArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 6,
  },
  nodeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 18,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  nodeStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
})

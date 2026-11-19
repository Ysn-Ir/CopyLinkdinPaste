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
import { ApiService } from '../services/api'
import { ScreenshotWatcher } from '../services/screenshotWatcher'
import { THEME, getStageMeta } from '../theme'

const { width } = Dimensions.get('window')
const RECOMMENDED_CARD_WIDTH = width * 0.72

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
    fullName: 'Radar Operator',
    degree: 'Software & AI Infrastructure Engineer',
  })
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
        setRecentOffers(all.slice(0, 6))
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

  // Recommended sample jobs or top offers
  const recommendedJobs = recentOffers.length > 0 ? recentOffers.slice(0, 3) : [
    {
      id: 'rec-1',
      title: 'Senior AI & Distributed Systems Engineer',
      company: 'Microsoft Corp.',
      location: 'Remote / Global',
      channel: 'email',
    },
    {
      id: 'rec-2',
      title: 'Fullstack Machine Learning Engineer',
      company: 'OpenAI Ecosystem',
      location: 'San Francisco, CA',
      channel: 'direct_contact',
    },
  ]

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
      {/* 1. Operator Profile Header matching Reference Screen 2 */}
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarInitials}>
            {(candidateProfile.fullName || 'RO').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.operatorName}>{candidateProfile.fullName || 'Radar Operator'}</Text>
        <Text style={styles.operatorTitle}>
          {candidateProfile.headline || candidateProfile.degree || 'Software & AI Infrastructure Engineer'}
        </Text>

        {/* Profile Completeness Bar matching Screen 2 */}
        <View style={styles.completenessRow}>
          <Text style={styles.completenessLabel}>Profile completeness</Text>
          <Text style={styles.completenessPct}>92%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: '92%' }]} />
        </View>
      </View>

      {/* 2. Recommended Jobs Section matching Screen 2 with RADAR Logo Colors */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recommended Jobs</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendedScroll}
      >
        {/* Card 1: Signature RADAR Crimson Beacon Gradient Card */}
        <TouchableOpacity
          style={[styles.recommendedCard, styles.cardCrimson]}
          onPress={() => onSelectOffer && onSelectOffer(recommendedJobs[0])}
          activeOpacity={0.9}
        >
          <View style={styles.cardScopeBadge}>
            <Text style={styles.cardScopeText}>94% FIT</Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.cardRole} numberOfLines={2}>
              {recommendedJobs[0]?.title}
            </Text>
            <Text style={styles.cardCompany} numberOfLines={1}>
              {recommendedJobs[0]?.company}
            </Text>
            <Text style={styles.cardLocation} numberOfLines={1}>
              {recommendedJobs[0]?.location || 'Remote / Global'}
            </Text>
          </View>

          <View style={styles.cardActionRow}>
            <View style={styles.applyPill}>
              <Text style={[styles.applyPillText, { color: '#FF3B30' }]}>APPLY</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card 2: Deep Obsidian Titanium Card */}
        <TouchableOpacity
          style={[styles.recommendedCard, styles.cardObsidian]}
          onPress={() => onSelectOffer && onSelectOffer(recommendedJobs[1] || recommendedJobs[0])}
          activeOpacity={0.9}
        >
          <View style={[styles.cardScopeBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
            <Text style={styles.cardScopeText}>89% FIT</Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.cardRole} numberOfLines={2}>
              {recommendedJobs[1]?.title || 'Backend Microservices Lead'}
            </Text>
            <Text style={styles.cardCompany} numberOfLines={1}>
              {recommendedJobs[1]?.company || 'Cloud Infrastructure'}
            </Text>
            <Text style={styles.cardLocation} numberOfLines={1}>
              {recommendedJobs[1]?.location || 'Remote'}
            </Text>
          </View>

          <View style={styles.cardActionRow}>
            <View style={styles.applyPill}>
              <Text style={[styles.applyPillText, { color: '#09090B' }]}>APPLY</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* 3. Recent Activities Section matching Screen 2 */}
      <View style={[styles.sectionRow, { marginTop: 22 }]}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
      </View>

      <View style={styles.activitiesRow}>
        {/* Card 1: Saved Jobs (with Crimson Bookmark Badge) */}
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => onNavigateTab('offers')}
          activeOpacity={0.85}
        >
          <View style={[styles.activityIconBox, { backgroundColor: '#FFF1F0', borderColor: '#FECDD3' }]}>
            <Text style={[styles.activityIconText, { color: '#FF3B30' }]}>SAVE</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.activityNumber}>{stats.saved + stats.ready}</Text>
            <Text style={styles.activityLabel}>Saved Jobs</Text>
          </View>
        </TouchableOpacity>

        {/* Card 2: Applied (with Emerald Checkmark Badge) */}
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => onNavigateTab('offers')}
          activeOpacity={0.85}
        >
          <View style={[styles.activityIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Text style={[styles.activityIconText, { color: '#10B981' }]}>SENT</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.activityNumber}>{stats.applied}</Text>
            <Text style={styles.activityLabel}>Applied</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Autonomous Scraper & Local OCR Screen Snip Launcher Tiles */}
      <View style={styles.toolsRow}>
        <TouchableOpacity
          style={styles.toolCard}
          onPress={() => onNavigateTab('scraper')}
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

      {/* 5. Network Node Status Pill */}
      <TouchableOpacity
        style={styles.nodeStatusPill}
        onPress={() => onNavigateTab('connect')}
        activeOpacity={0.85}
      >
        <View style={styles.beaconDot} />
        <Text style={styles.nodeStatusText}>
          {serverInfo ? `RADAR Host: ${serverInfo.hostname || '192.168.1.27:8003'} · Online` : 'RADAR Node: 192.168.1.27:8003 · Tap to Link'}
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
    paddingTop: 16,
    paddingBottom: 110,
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
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  operatorTitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
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
    borderRadius: 10,
  },
  cardScopeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardRole: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  cardCompany: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardLocation: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    marginTop: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  applyPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  applyPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
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
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activityNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#09090B',
  },
  activityLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  toolsRow: {
    gap: 10,
    marginBottom: 20,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  toolBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#09090B',
  },
  toolSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  toolArrow: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  nodeStatusPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  beaconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  nodeStatusText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
})

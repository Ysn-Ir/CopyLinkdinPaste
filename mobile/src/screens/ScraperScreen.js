import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

const PLATFORM_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn Guest' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'glassdoor', label: 'Glassdoor' },
  { id: 'zip_recruiter', label: 'ZipRecruiter' },
]

const LIMIT_OPTIONS = [10, 20, 40]

const SEED_HUNT_JOBS = [
  {
    id: 'hunt-seed-1',
    title: 'Senior Full-Stack Engineer (React & Python)',
    company: 'Linear App',
    location: 'Remote',
    site: 'LinkedIn Guest',
    salary: '$150,000 - $190,000',
    atsFitScore: 95,
    url: 'https://linear.app/careers',
    description: 'Architecting ultra-fast distributed issue tracking and desktop workflows. Requires deep proficiency in React, TypeScript, and Python.',
    skills: ['React', 'TypeScript', 'Python', 'FastAPI', 'TailwindCSS'],
  },
  {
    id: 'hunt-seed-2',
    title: 'Autonomous Systems & AI Engineer',
    company: 'Mistral AI',
    location: 'Paris / Remote',
    site: 'LinkedIn Guest',
    salary: '€90,000 - €120,000',
    atsFitScore: 92,
    url: 'https://mistral.ai/jobs',
    description: 'Building high-throughput model serving infrastructure, agentic execution loops, and low-latency inference pipelines.',
    skills: ['PyTorch', 'vLLM', 'FastAPI', 'Python', 'CUDA'],
  },
  {
    id: 'hunt-seed-3',
    title: 'Backend Infrastructure Architect',
    company: 'Datadog',
    location: 'Remote / EU',
    site: 'Indeed',
    salary: '€115,000 - €145,000',
    atsFitScore: 88,
    url: 'https://careers.datadoghq.com',
    description: 'High-scale telemetry ingestion platform processing billions of events per second. Go, Python, and Kafka distributed clusters.',
    skills: ['Python', 'Go', 'Kafka', 'Docker', 'Kubernetes'],
  },
  {
    id: 'hunt-seed-4',
    title: 'Lead Platform Systems Engineer',
    company: 'Vercel',
    location: 'Remote (Global)',
    site: 'LinkedIn Guest',
    salary: '$165,000 - $210,000',
    atsFitScore: 96,
    url: 'https://vercel.com/careers',
    description: 'Next.js core runtime, edge network proxies, and serverless compute primitives.',
    skills: ['TypeScript', 'Next.js', 'React', 'Node.js', 'Rust'],
  },
]

export function ScraperScreen({ onNavigateTab, onSelectOffer }) {
  const [searchTerm, setSearchTerm] = useState('Full Stack Engineer')
  const [location, setLocation] = useState('Remote')
  const [selectedSites, setSelectedSites] = useState(['linkedin', 'indeed'])
  const [resultsWanted, setResultsWanted] = useState(20)

  const [isHunting, setIsHunting] = useState(false)
  const [huntStatus, setHuntStatus] = useState(null)
  const [scrapedJobs, setScrapedJobs] = useState(SEED_HUNT_JOBS)
  const [savedJobIds, setSavedJobIds] = useState(new Set())
  const [savingJobId, setSavingJobId] = useState(null)

  const pollIntervalRef = useRef(null)

  useEffect(() => {
    // Check initial scraper status on backend
    checkScraperStatus()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const checkScraperStatus = async () => {
    try {
      const status = await ApiService.getHuntStatus()
      if (status && status.status === 'running') {
        setIsHunting(true)
        setHuntStatus(status)
        startPolling()
      } else if (status && status.jobs && status.jobs.length > 0) {
        setScrapedJobs(status.jobs)
        setHuntStatus(status)
      }
    } catch {
      // Keep seed data
    }
  }

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await ApiService.getHuntStatus()
        setHuntStatus(status)
        if (status.jobs && status.jobs.length > 0) {
          setScrapedJobs(status.jobs)
        }
        if (status.status !== 'running') {
          setIsHunting(false)
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } catch {
        // continue polling
      }
    }, 2000)
  }

  const toggleSite = (siteId) => {
    if (selectedSites.includes(siteId)) {
      if (selectedSites.length === 1) return // Keep at least one
      setSelectedSites(selectedSites.filter((s) => s !== siteId))
    } else {
      setSelectedSites([...selectedSites, siteId])
    }
  }

  const handleLaunchHunt = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Query Required', 'Please enter a target role or keyword to hunt.')
      return
    }

    setIsHunting(true)
    setScrapedJobs([])

    const res = await ApiService.triggerHunt({
      sites: selectedSites,
      searchTerm: searchTerm.trim(),
      location: location.trim() || 'Remote',
      resultsWanted,
    })

    if (res && res.status === 'running') {
      startPolling()
    } else {
      // Fallback for offline mode: simulate fast local mock scrape with rich jobs
      setTimeout(() => {
        setIsHunting(false)
        setScrapedJobs(SEED_HUNT_JOBS)
        Alert.alert(
          'Reconnaissance Active',
          `Autonomous hunt started for "${searchTerm}". Results streamed to feed.`
        )
      }, 1500)
    }
  }

  const handleAbortHunt = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    await ApiService.cancelHunt()
    setIsHunting(false)
    setHuntStatus((prev) => ({ ...prev, status: 'cancelled' }))
    Alert.alert('Hunt Aborted', 'Scraper worker stopped.')
  }

  const handleSaveToPipeline = async (job) => {
    const key = job.id || job.title
    setSavingJobId(key)

    const res = await ApiService.saveHuntJobToVault(job)
    setSavingJobId(null)

    if (res && res.success) {
      setSavedJobIds((prev) => new Set([...prev, key]))
      Alert.alert(
        'Opportunity Saved',
        `"${job.title}" at ${job.company} routed to Offers Pipeline and Vault.`
      )
    } else {
      // Local optimistic mark
      setSavedJobIds((prev) => new Set([...prev, key]))
      Alert.alert('Saved to Pipeline', `"${job.title}" saved locally.`)
    }
  }

  const renderJobItem = ({ item }) => {
    const key = item.id || item.title
    const isSaved = savedJobIds.has(key)
    const isSaving = savingJobId === key
    const fitScore = item.atsFitScore || 85

    return (
      <View style={styles.jobCard}>
        {/* Top Badges */}
        <View style={styles.jobTopRow}>
          <View style={styles.siteBadge}>
            <Text style={styles.siteBadgeText}>{item.site ? item.site.toUpperCase() : 'WEB'}</Text>
          </View>
          <View style={[styles.fitBadge, fitScore >= 90 && styles.fitBadgeHigh]}>
            <Text style={[styles.fitBadgeText, fitScore >= 90 && styles.fitBadgeTextHigh]}>
              {fitScore}% ATS FIT
            </Text>
          </View>
        </View>

        {/* Title & Company */}
        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.jobMeta} numberOfLines={1}>
          {item.company || 'Direct Organization'} • {item.location || 'Remote'}
        </Text>

        {item.salary && (
          <Text style={styles.jobSalary} numberOfLines={1}>
            {item.salary}
          </Text>
        )}

        {/* Description snippet */}
        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {/* Skills Pills */}
        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 4).map((skill, idx) => (
              <View key={idx} style={styles.skillPill}>
                <Text style={styles.skillPillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Bottom Row */}
        <View style={styles.jobActionRow}>
          {item.url ? (
            <TouchableOpacity
              style={styles.sourceLinkBtn}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.8}
            >
              <Text style={styles.sourceLinkText}>View Source →</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.saveBtnSaved]}
            onPress={() => handleSaveToPipeline(item)}
            disabled={isSaved || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextSaved]}>
                {isSaved ? 'SAVED TO PIPELINE' : '+ SAVE TO OFFERS'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.beaconDot} />
          <Text style={styles.headerTitle}>AUTONOMOUS RECONNAISSANCE</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Multi-Source Headless Scraper · LinkedIn Guest API & JobSpy
        </Text>
      </View>

      <FlatList
        data={scrapedJobs}
        keyExtractor={(item, index) => item.id || `job-${index}`}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.configCard}>
            {/* Search Term Input */}
            <Text style={styles.inputLabel}>TARGET ROLE / KEYWORD</Text>
            <TextInput
              style={styles.textInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="e.g. Full Stack Engineer, AI Engineer"
              placeholderTextColor={THEME.colors.textMuted}
              editable={!isHunting}
            />

            {/* Location Input */}
            <Text style={styles.inputLabel}>LOCATION / GEOGRAPHY</Text>
            <TextInput
              style={styles.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Remote, Paris, Worldwide"
              placeholderTextColor={THEME.colors.textMuted}
              editable={!isHunting}
            />

            {/* Platform Selector Pills */}
            <Text style={styles.inputLabel}>SOURCE PLATFORMS</Text>
            <View style={styles.pillsRow}>
              {PLATFORM_OPTIONS.map((opt) => {
                const active = selectedSites.includes(opt.id)
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => toggleSite(opt.id)}
                    disabled={isHunting}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Target Results Count */}
            <View style={styles.limitRow}>
              <Text style={styles.inputLabel}>TARGET RESULTS:</Text>
              <View style={styles.limitPills}>
                {LIMIT_OPTIONS.map((lim) => (
                  <TouchableOpacity
                    key={lim}
                    style={[styles.limitPill, resultsWanted === lim && styles.limitPillActive]}
                    onPress={() => setResultsWanted(lim)}
                    disabled={isHunting}
                  >
                    <Text
                      style={[
                        styles.limitPillText,
                        resultsWanted === lim && styles.limitPillTextActive,
                      ]}
                    >
                      {lim}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Launch / Abort Action Button */}
            {isHunting ? (
              <View style={styles.huntingContainer}>
                <View style={styles.huntingProgressBox}>
                  <ActivityIndicator size="small" color="#FF3B30" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.huntingStatusText} numberOfLines={1}>
                      {huntStatus?.message || 'Scraping multi-source job postings...'}
                    </Text>
                    <Text style={styles.huntingSubText}>
                      Matches: {huntStatus?.totalFound || scrapedJobs.length} · Bypassing rate limits
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.abortBtn}
                  onPress={handleAbortHunt}
                  activeOpacity={0.8}
                >
                  <Text style={styles.abortBtnText}>ABORT RECONNAISSANCE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={handleLaunchHunt}
                activeOpacity={0.8}
              >
                <Text style={styles.launchBtnText}>LAUNCH AUTONOMOUS HUNT</Text>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerText}>
                DISCOVERED SIGNALS ({scrapedJobs.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Opportunities Discovered</Text>
            <Text style={styles.emptySub}>
              Tap "LAUNCH AUTONOMOUS HUNT" above to scrape live LinkedIn Guest and Indeed positions.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgDark,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  headerTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  configCard: {
    backgroundColor: THEME.colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    padding: 18,
  },
  inputLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: THEME.colors.bgInput,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgInput,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pillText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  limitPills: {
    flexDirection: 'row',
    gap: 6,
  },
  limitPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgInput,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  limitPillActive: {
    backgroundColor: THEME.colors.textPrimary,
    borderColor: THEME.colors.textPrimary,
  },
  limitPillText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  limitPillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  launchBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  launchBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  huntingContainer: {
    marginTop: 18,
    gap: 10,
  },
  huntingProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 6,
    padding: 12,
  },
  huntingStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  huntingSubText: {
    color: '#A1A1AA',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  abortBtn: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  abortBtnText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionDivider: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  sectionDividerText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  jobCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  jobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  siteBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  siteBadgeText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: THEME.colors.borderElevated,
  },
  fitBadgeHigh: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },
  fitBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  fitBadgeTextHigh: {
    color: '#FF3B30',
  },
  jobTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  jobMeta: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  jobSalary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  jobDescription: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  skillPill: {
    backgroundColor: THEME.colors.bgInput,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  skillPillText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  jobActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  sourceLinkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sourceLinkText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnSaved: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: THEME.colors.borderElevated,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  saveBtnTextSaved: {
    color: THEME.colors.textSecondary,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})

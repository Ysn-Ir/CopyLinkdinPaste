import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native'
import { THEME } from '../theme'
import { ApiService } from '../services/api'
import { ClipboardWatcher } from '../services/clipboardWatcher'
import { ScreenshotWatcher } from '../services/screenshotWatcher'
import * as ImagePicker from 'expo-image-picker'
import * as Clipboard from 'expo-clipboard'

const CONTENT_TYPES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'job_offer', label: 'Job Offers', icon: '💼' },
  { id: 'educational_video', label: 'Videos & Shorts', icon: '🎬' },
  { id: 'code_snippet', label: 'Code Snippets', icon: '💻' },
  { id: 'tech_article', label: 'Articles', icon: '📰' },
  { id: 'social_post', label: 'Social', icon: '💬' },
  { id: 'tool_or_repo', label: 'Tools & Repos', icon: '🔧' },
  { id: 'note', label: 'Notes', icon: '📝' },
  { id: 'contact', label: 'Contacts', icon: '👤' },
]

function getTypeColor(typeId) {
  const map = {
    job_offer: '#10b981',
    educational_video: '#f59e0b',
    code_snippet: '#cbd5e1',
    tech_article: '#f59e0b',
    social_post: '#14b8a6',
    tool_or_repo: '#10b981',
    note: '#a1a1aa',
    contact: '#f43f5e',
  }
  return map[typeId] || '#94a3b8'
}

function getChannelBadge(clip) {
  const channel = clip.channel || (clip.jobData && clip.jobData.channel)
  if (channel === 'email' || (clip.content && clip.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/))) {
    return { label: 'Email Channel', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
  }
  if (channel === 'direct_contact' || (clip.content && clip.content.match(/(?:wa\.me|\+?[0-9]{9,15})/i))) {
    return { label: 'Direct DM', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
  }
  if (clip.contentType === 'job_offer') {
    return { label: 'ATS Portal', color: '#ffffff', bg: 'rgba(255, 255, 255, 0.08)' }
  }
  return null
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function getDomainEmoji(domain) {
  if (!domain) return '🌐'
  const d = domain.toLowerCase()
  if (d.includes('linkedin')) return '🔗'
  if (d.includes('github')) return '🐙'
  if (d.includes('twitter') || d.includes('x.com')) return '🐦'
  if (d.includes('stackoverflow')) return '📚'
  if (d.includes('medium')) return '📖'
  if (d.includes('reddit')) return '🟠'
  if (d.includes('youtube') || d.includes('youtu.be')) return '🎬'
  if (d.includes('tiktok')) return '🎵'
  if (d.includes('instagram')) return '📸'
  return '🌐'
}

export function ClipVaultScreen({ onNavigateTab }) {
  const [allClips, setAllClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [autoCapture, setAutoCapture] = useState(true)
  const [ingestingClip, setIngestingClip] = useState(false)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [selectedClip, setSelectedClip] = useState(null)
  const [isEnriching, setIsEnriching] = useState(false)

  const handleEnrichClip = async (clipId) => {
    setIsEnriching(true)
    try {
      const res = await ApiService.enrichClip(clipId)
      if (res && res.success && res.clip) {
        setSelectedClip(res.clip)
        setAllClips((prev) => prev.map((c) => (c.id === clipId ? res.clip : c)))
        Alert.alert('AI Deep Enrichment Complete', 'Refetched metadata, updated key takeaways and tags.')
      } else {
        Alert.alert('Enrichment Notice', res?.error || 'Could not enrich clip.')
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to enrich clip.')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleCopyContent = async (text) => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    Alert.alert('Copied to Clipboard', 'Text copied successfully.')
  }

  const handlePickScreenshotOcr = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Media library permission is required to analyze screenshots.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: true,
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        if (!asset.base64) {
          Alert.alert('Error', 'Unable to retrieve screenshot image data.')
          return
        }

        setIsProcessingOcr(true)
        const res = await ApiService.ocrIngestClip({
          imageBase64: asset.base64,
          sourceDevice: 'mobile',
        })
        setIsProcessingOcr(false)

        if (res.success) {
          Alert.alert(
            res.isJobOffer ? 'Job Offer Extracted!' : 'Screenshot Ingested',
            res.isJobOffer
              ? `"${res.offer?.title || 'Offer'}" extracted and routed to application channels!`
              : 'Screenshot text extracted and organized into Clip Vault.'
          )
          await loadClips()
        } else {
          Alert.alert('OCR Failed', res.error || 'Failed to extract text from screenshot.')
        }
      }
    } catch (err) {
      setIsProcessingOcr(false)
      Alert.alert('OCR Error', err.message || 'Image selection error.')
    }
  }

  // Load clips
  const loadClips = useCallback(async () => {
    const res = await ApiService.getClips()
    if (res.success) {
      setAllClips(res.clips || [])
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadClips()
  }, [loadClips])

  // Centralized single ClipboardWatcher subscription (eliminates phone repeated clips bug)
  useEffect(() => {
    const unsubscribe = ClipboardWatcher.subscribe(() => {
      loadClips()
    })
    return () => unsubscribe()
  }, [loadClips])

  // Live ScreenshotWatcher subscription: auto-refreshes vault when a screenshot is auto-ingested
  useEffect(() => {
    const unsubscribe = ScreenshotWatcher.subscribe(() => {
      loadClips()
    })
    return () => unsubscribe()
  }, [loadClips])

  // Real-time counts across all categories
  const typeCounts = useMemo(() => {
    const counts = { all: allClips.length }
    allClips.forEach((c) => {
      const type = c.contentType || 'note'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [allClips])

  // Responsive client filtering
  const filteredClips = useMemo(() => {
    let result = allClips
    if (activeType !== 'all') {
      result = result.filter((c) => c.contentType === activeType)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.content || '').toLowerCase().includes(q) ||
          (c.summary || '').toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [allClips, activeType, search])

  const handleManualCapture = async () => {
    setIngestingClip(true)
    await ClipboardWatcher.checkAndIngest()
    await loadClips()
    setIngestingClip(false)
  }

  const handleToggleAutoCapture = () => {
    if (autoCapture) {
      ClipboardWatcher.stop()
      setAutoCapture(false)
    } else {
      ClipboardWatcher.start(2500)
      setAutoCapture(true)
    }
  }

  const handleSyncAllClipsToOffers = async () => {
    setIsSyncingAll(true)
    const res = await ApiService.syncAllClips()
    setIsSyncingAll(false)
    if (res.success) {
      Alert.alert(
        'Channels Synchronized',
        res.count > 0
          ? `Successfully routed ${res.count} unrouted vault clips into target offer channels!`
          : 'All eligible clips are already synchronized to offer channels.'
      )
      await loadClips()
    } else {
      Alert.alert('Notice', res.error || 'Failed to sync vault clips.')
    }
  }

  const handleStar = async (clipId) => {
    const res = await ApiService.starClip(clipId)
    if (res.success) {
      setAllClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, isStarred: res.isStarred } : c))
      )
    }
  }

  const handleDelete = (clipId) => {
    Alert.alert('Delete Clip', 'Are you sure you want to delete this clip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await ApiService.deleteClip(clipId)
          setAllClips((prev) => prev.filter((c) => c.id !== clipId))
        },
      },
    ])
  }

  const handleConvertToOffer = async (clipId) => {
    const res = await ApiService.convertClipToOffer(clipId)
    if (res.success) {
      Alert.alert('Offer Created', `"${res.offer?.title || 'Offer'}" routed to application pipeline.`)
      await loadClips()
    } else {
      Alert.alert('Notice', 'Failed to route clip to offer channel.')
    }
  }

  const renderClip = ({ item: clip }) => {
    const typeColor = getTypeColor(clip.contentType)
    const typeInfo = CONTENT_TYPES.find((t) => t.id === clip.contentType) || CONTENT_TYPES[0]
    const channelBadge = getChannelBadge(clip)

    return (
      <TouchableOpacity
        style={styles.clipCard}
        activeOpacity={0.88}
        onPress={() => setSelectedClip(clip)}
      >
        {/* Header */}
        <View style={styles.clipHeader}>
          <View style={styles.headerLeftBadges}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor + '40' }]}>
              <Text style={{ fontSize: 10 }}>{typeInfo.icon}</Text>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeInfo.label}</Text>
            </View>
            {channelBadge && (
              <View style={[styles.channelMiniBadge, { backgroundColor: channelBadge.bg, borderColor: channelBadge.color + '40' }]}>
                <Text style={[styles.channelMiniText, { color: channelBadge.color }]}>{channelBadge.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.clipTime}>{formatTime(clip.copiedAt || clip.createdAt)}</Text>
        </View>

        {/* Multi-Link Parent Reference Badge */}
        {clip.entities?.parentPost && (
          <View style={styles.parentPostMiniChip}>
            <Text style={styles.parentPostMiniText}>
              🔗 Link #{clip.entities.parentPost.linkIndex} of {clip.entities.parentPost.totalLinks} from multi-link post
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.clipTitle} numberOfLines={2}>{clip.title}</Text>

        {/* Summary */}
        <Text style={styles.clipSummary} numberOfLines={3}>
          {clip.summary || clip.content?.slice(0, 180)}
        </Text>

        {/* Educational Video Breakdown & Key Takeaways */}
        {(clip.contentType === 'educational_video' || clip.entities?.videoData) && (
          <View style={styles.eduBox}>
            <View style={styles.eduHeader}>
              <Text style={styles.eduHeaderTitle}>🎬 Video Key Takeaways</Text>
              {clip.entities?.videoData?.creator ? (
                <Text style={styles.eduCreator}>By {clip.entities.videoData.creator}</Text>
              ) : null}
            </View>
            {clip.entities?.videoData?.coreConcept ? (
              <Text style={styles.eduConcept}>Concept: {clip.entities.videoData.coreConcept}</Text>
            ) : null}
            {Array.isArray(clip.entities?.videoData?.keyTakeaways) && clip.entities.videoData.keyTakeaways.length > 0 ? (
              <View style={styles.takeawaysList}>
                {clip.entities.videoData.keyTakeaways.map((point, idx) => (
                  <Text key={idx} style={styles.takeawayItem}>• {point}</Text>
                ))}
              </View>
            ) : null}
            {Array.isArray(clip.entities?.videoData?.toolsMentioned) && clip.entities.videoData.toolsMentioned.length > 0 ? (
              <View style={styles.toolsRow}>
                <Text style={styles.toolsLabel}>Tools:</Text>
                {clip.entities.videoData.toolsMentioned.map((t, idx) => (
                  <View key={idx} style={styles.toolTag}>
                    <Text style={styles.toolTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* Tags */}
        {clip.tags && clip.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {clip.tags.slice(0, 5).map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Meta + Actions */}
        <View style={styles.clipFooter}>
          <View style={[styles.metaRow, { flex: 1, overflow: 'hidden', marginRight: 6 }]}>
            <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
              {getDomainEmoji(clip.sourceDomain)} {clip.sourceDomain || 'clipboard'}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {clip.sourceDevice === 'mobile' ? '📱' : '🖥️'} {clip.sourceDevice}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => handleStar(clip.id)} style={styles.iconBtn}>
              <Text style={{ fontSize: 16 }}>{clip.isStarred ? '⭐' : '☆'}</Text>
            </TouchableOpacity>

            {(clip.contentType === 'job_offer' || clip.isJobOffer) && !clip.convertedToOffer && (
              <TouchableOpacity onPress={() => handleConvertToOffer(clip.id)} style={[styles.actionBtn, styles.convertBtn]}>
                <Text style={styles.convertBtnText}>⚡ Route to Channel</Text>
              </TouchableOpacity>
            )}

            {clip.convertedToOffer && (
              <View style={styles.convertedBadge}>
                <Text style={styles.convertedText}>✓ Routed to Offers</Text>
              </View>
            )}

            {clip.sourceUrl ? (
              <TouchableOpacity onPress={() => Linking.openURL(clip.sourceUrl)} style={styles.iconBtn}>
                <Text style={{ fontSize: 14 }}>🔗</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={() => handleDelete(clip.id)} style={styles.iconBtn}>
              <Text style={{ fontSize: 14, color: THEME.colors.danger }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Clip Vault</Text>
          <Text style={styles.headerSubtitle}>Cross-device clipboard hub</Text>
        </View>
        <View style={styles.headerActions}>
          {ingestingClip && <ActivityIndicator size="small" color="#ffffff" />}
          <TouchableOpacity
            onPress={handleSyncAllClipsToOffers}
            style={styles.syncBtn}
            disabled={isSyncingAll}
          >
            {isSyncingAll ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.syncBtnText}>🔄 Sync Channels</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleAutoCapture}
            style={[styles.toggleBtn, autoCapture ? styles.toggleBtnOn : styles.toggleBtnOff]}
          >
            <Text style={[styles.toggleBtnText, { color: autoCapture ? THEME.colors.success : THEME.colors.danger }]}>
              {autoCapture ? '⚡ Auto ON' : '⚡ Auto OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + OCR row */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInputFlex}
          placeholder="Search vault clips..."
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          onPress={handlePickScreenshotOcr}
          disabled={isProcessingOcr}
          style={styles.ocrSearchBtn}
        >
          {isProcessingOcr ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Text style={styles.ocrSearchBtnText}>📸 OCR</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Type Filter Pills with Space & Real-Time Counts */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {CONTENT_TYPES.map((type) => {
            const count = typeCounts[type.id] || 0
            const isActive = activeType === type.id
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => setActiveType(type.id)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.7}
              >
                <Text style={styles.filterIcon}>{type.icon}</Text>
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {type.label}
                </Text>
                <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Clips List with Generous Bottom Padding */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <FlatList
          data={filteredClips}
          keyExtractor={(item) => item.id}
          renderItem={renderClip}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }} // safe bottom padding
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadClips()
              }}
              tintColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Vault is empty</Text>
              <Text style={styles.emptySubtitle}>
                Copy any text on mobile or PC — OmniHunt classifies and routes job offers automatically.
              </Text>
            </View>
          }
        />
      )}

      {/* Full Clip Inspector Modal */}
      <Modal
        visible={!!selectedClip}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedClip(null)}
      >
        {selectedClip && (
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(selectedClip.contentType) + '25', borderColor: getTypeColor(selectedClip.contentType) + '50' }]}>
                  <Text style={{ fontSize: 11 }}>{CONTENT_TYPES.find((t) => t.id === selectedClip.contentType)?.icon || '📋'}</Text>
                  <Text style={[styles.typeBadgeText, { color: getTypeColor(selectedClip.contentType) }]}>
                    {CONTENT_TYPES.find((t) => t.id === selectedClip.contentType)?.label || 'Clip'}
                  </Text>
                </View>
                {getChannelBadge(selectedClip) && (
                  <View style={[styles.channelMiniBadge, { backgroundColor: getChannelBadge(selectedClip).bg }]}>
                    <Text style={[styles.channelMiniText, { color: getChannelBadge(selectedClip).color }]}>
                      {getChannelBadge(selectedClip).label}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedClip(null)}
              >
                <Text style={styles.modalCloseBtnText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Full Title */}
              <Text style={styles.modalTitle}>{selectedClip.title}</Text>

              {/* Source Info Row */}
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMetaText}>
                  {getDomainEmoji(selectedClip.sourceDomain)} {selectedClip.sourceDomain || 'clipboard'}
                </Text>
                <Text style={styles.modalMetaText}>
                  {selectedClip.sourceDevice === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}
                </Text>
                <Text style={styles.modalMetaText}>
                  🕒 {formatTime(selectedClip.copiedAt || selectedClip.createdAt)}
                </Text>
              </View>

              {/* Action Buttons Bar */}
              <View style={styles.modalActionsBar}>
                <TouchableOpacity
                  style={styles.modalEnrichBtn}
                  onPress={() => handleEnrichClip(selectedClip.id)}
                  disabled={isEnriching}
                >
                  {isEnriching ? (
                    <ActivityIndicator size="small" color="#09090b" />
                  ) : (
                    <Text style={styles.modalEnrichBtnText}>⚡ Deep AI Enrich / Re-scrape</Text>
                  )}
                </TouchableOpacity>

                {selectedClip.sourceUrl ? (
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => Linking.openURL(selectedClip.sourceUrl)}
                  >
                    <Text style={styles.modalSecondaryBtnText}>🔗 Open Source Link</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => handleCopyContent(selectedClip.content || selectedClip.summary)}
                >
                  <Text style={styles.modalSecondaryBtnText}>📋 Copy Text</Text>
                </TouchableOpacity>

                {(selectedClip.contentType === 'job_offer' || selectedClip.isJobOffer) && !selectedClip.convertedToOffer && (
                  <TouchableOpacity
                    style={styles.modalRouteBtn}
                    onPress={async () => {
                      await handleConvertToOffer(selectedClip.id)
                      setSelectedClip((prev) => ({ ...prev, convertedToOffer: true }))
                    }}
                  >
                    <Text style={styles.modalRouteBtnText}>💼 Route to Job Pipeline</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Multi-Link Parent Post Context */}
              {selectedClip.entities?.parentPost && (
                <View style={styles.parentPostCard}>
                  <Text style={styles.parentPostHeader}>
                    🔗 Multi-Link Source Post (Link #{selectedClip.entities.parentPost.linkIndex} of {selectedClip.entities.parentPost.totalLinks})
                  </Text>
                  <Text style={styles.parentPostSnippet}>
                    "{selectedClip.entities.parentPost.sourceSnippet}"
                  </Text>
                </View>
              )}

              {/* Executive Summary */}
              {selectedClip.summary ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>
                  <Text style={styles.summaryText}>{selectedClip.summary}</Text>
                </View>
              ) : null}

              {/* Educational Video Breakdown & Key Takeaways */}
              {(selectedClip.contentType === 'educational_video' || selectedClip.entities?.videoData) && (
                <View style={styles.eduDetailCard}>
                  <Text style={styles.eduDetailHeader}>🎬 Video Breakdown & Key Takeaways</Text>
                  {selectedClip.entities?.videoData?.creator ? (
                    <Text style={styles.eduCreatorDetail}>Creator: {selectedClip.entities.videoData.creator}</Text>
                  ) : null}
                  {selectedClip.entities?.videoData?.coreConcept ? (
                    <Text style={styles.eduConceptDetail}>Core Concept: {selectedClip.entities.videoData.coreConcept}</Text>
                  ) : null}

                  {Array.isArray(selectedClip.entities?.videoData?.keyTakeaways) && selectedClip.entities.videoData.keyTakeaways.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', marginBottom: 4 }}>KEY POINTS:</Text>
                      {selectedClip.entities.videoData.keyTakeaways.map((pt, idx) => (
                        <Text key={idx} style={styles.eduTakeawayDetailItem}>• {pt}</Text>
                      ))}
                    </View>
                  )}

                  {Array.isArray(selectedClip.entities?.videoData?.toolsMentioned) && selectedClip.entities.videoData.toolsMentioned.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', marginBottom: 4 }}>TOOLS & FRAMEWORKS:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {selectedClip.entities.videoData.toolsMentioned.map((tool, idx) => (
                          <View key={idx} style={styles.toolTagDetail}>
                            <Text style={styles.toolTagDetailText}>{tool}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Full Content / Transcript / Page Text */}
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.sectionLabel}>FULL SCRAPED CONTENT & TRANSCRIPT</Text>
                  <TouchableOpacity onPress={() => handleCopyContent(selectedClip.content)}>
                    <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '700' }}>Copy Full Text</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.fullContentBox}>
                  <Text style={styles.fullContentText} selectable>
                    {selectedClip.content}
                  </Text>
                </View>
              </View>

              {/* Tags */}
              {Array.isArray(selectedClip.tags) && selectedClip.tags.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionLabel}>SEMANTIC TAGS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {selectedClip.tags.map((t, idx) => (
                      <View key={idx} style={styles.tagChipDetail}>
                        <Text style={styles.tagTextDetail}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090b',
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toggleBtnOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  filterWrapper: {
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.bgSurface,
    minHeight: 38,
    gap: 7,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterIcon: {
    fontSize: 13,
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterTextActive: {
    color: '#09090b',
  },
  filterCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 2,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  filterCountTextActive: {
    color: '#09090b',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  clipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  channelMiniBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  channelMiniText: {
    fontSize: 9,
    fontWeight: '700',
  },
  clipTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  clipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  clipSummary: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  tagsRow: {
    marginBottom: 8,
    maxHeight: 28,
  },
  tagChip: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 5,
  },
  tagText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  clipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  convertBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  convertBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  convertedBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  convertedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInputFlex: {
    flex: 1,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  ocrSearchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  eduBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  eduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eduHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
  },
  eduCreator: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  eduConcept: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  takeawaysList: {
    marginBottom: 4,
  },
  takeawayItem: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 2,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  toolsLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginRight: 2,
  },
  toolTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  toolTagText: {
    fontSize: 9.5,
    color: THEME.colors.textPrimary,
  },

  // Multi-link Mini Badge on Card
  parentPostMiniChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  parentPostMiniText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },

  // Full Inspector Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.bgCard,
  },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 24,
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  modalMetaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  modalActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalEnrichBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEnrichBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#09090b',
  },
  modalSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSecondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalRouteBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalRouteBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10b981',
  },

  // Multi-link Parent Card
  parentPostCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  parentPostHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  parentPostSnippet: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    lineHeight: 19,
  },

  // Educational Detail Card
  eduDetailCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  eduDetailHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  eduCreatorDetail: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  eduConceptDetail: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  eduTakeawayDetailItem: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 3,
  },
  toolTagDetail: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  toolTagDetailText: {
    fontSize: 10.5,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Full Content Monospace Box
  fullContentBox: {
    backgroundColor: THEME.colors.bgElevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    maxHeight: 280,
  },
  fullContentText: {
    fontSize: 11.5,
    color: THEME.colors.textPrimary,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Tags
  tagChipDetail: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagTextDetail: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
})

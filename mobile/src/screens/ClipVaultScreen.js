import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  Linking,
  RefreshControl,
} from 'react-native'
import * as ExpoClipboard from 'expo-clipboard'
import { THEME } from '../theme'
import { ApiService } from '../services/api'

const CONTENT_TYPES = [
  { id: 'all', label: 'Tout', icon: '📋' },
  { id: 'job_offer', label: 'Offres', icon: '💼' },
  { id: 'code_snippet', label: 'Code', icon: '💻' },
  { id: 'tech_article', label: 'Articles', icon: '📰' },
  { id: 'social_post', label: 'Social', icon: '💬' },
  { id: 'tool_or_repo', label: 'Repos', icon: '🔧' },
  { id: 'note', label: 'Notes', icon: '📝' },
  { id: 'contact', label: 'Contacts', icon: '👤' },
]

function getTypeColor(typeId) {
  const map = {
    job_offer: '#a855f7',
    code_snippet: '#22d3ee',
    tech_article: '#3b82f6',
    social_post: '#f59e0b',
    tool_or_repo: '#10b981',
    note: '#8b5cf6',
    contact: '#f43f5e',
  }
  return map[typeId] || '#94a3b8'
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
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
  return '🌐'
}

export function ClipVaultScreen({ onNavigateTab }) {
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [autoCapture, setAutoCapture] = useState(true)
  const [lastClipHash, setLastClipHash] = useState('')
  const [ingestingClip, setIngestingClip] = useState(false)
  const appState = useRef(AppState.currentState)

  // Load clips
  const loadClips = useCallback(async () => {
    const res = await ApiService.getClips({
      contentType: activeType !== 'all' ? activeType : undefined,
      search: search || undefined,
    })
    if (res.success) {
      setClips(res.clips)
    }
    setLoading(false)
    setRefreshing(false)
  }, [activeType, search])

  useEffect(() => {
    loadClips()
  }, [loadClips])

  // Auto-clipboard detection on app resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        autoCapture
      ) {
        await checkClipboard()
      }
      appState.current = nextState
    })
    return () => subscription?.remove()
  }, [autoCapture, lastClipHash])

  const simpleHash = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + ch
      hash |= 0
    }
    return hash.toString(36)
  }

  const checkClipboard = async () => {
    try {
      const hasString = await ExpoClipboard.hasStringAsync()
      if (!hasString) return

      const text = await ExpoClipboard.getStringAsync()
      if (!text || text.trim().length < 5) return

      const hash = simpleHash(text.trim())
      if (hash === lastClipHash) return
      setLastClipHash(hash)

      // Detect source domain from text
      let sourceDomain = 'clipboard'
      const urlMatch = text.match(/https?:\/\/([^\s/]+)/)
      if (urlMatch) sourceDomain = urlMatch[1].replace('www.', '')

      setIngestingClip(true)
      const res = await ApiService.ingestClip({
        content: text.trim(),
        sourceDomain,
        sourceDevice: 'mobile',
        sourceUrl: /^https?:\/\/\S+$/i.test(text.trim()) ? text.trim() : '',
      })

      if (res.success) {
        await loadClips()
        // Show brief notification
        Alert.alert(
          '📋 Clip capturé !',
          `${res.clip?.title || 'Nouveau clip'}\n${res.isJobOffer ? '💼 Offre d\'emploi détectée — créée automatiquement !' : ''}`,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        )
      }
      setIngestingClip(false)
    } catch (err) {
      setIngestingClip(false)
    }
  }

  const handleManualCapture = async () => {
    await checkClipboard()
  }

  const handleStar = async (clipId) => {
    const res = await ApiService.starClip(clipId)
    if (res.success) {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, isStarred: res.isStarred } : c))
      )
    }
  }

  const handleDelete = (clipId) => {
    Alert.alert('Supprimer ce clip ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await ApiService.deleteClip(clipId)
          setClips((prev) => prev.filter((c) => c.id !== clipId))
        },
      },
    ])
  }

  const handleConvertToOffer = async (clipId) => {
    const res = await ApiService.convertClipToOffer(clipId)
    if (res.success) {
      Alert.alert('✅ Offre créée !', `"${res.offer?.title}" a été ajouté au pipeline.`)
      await loadClips()
    } else {
      Alert.alert('Erreur', 'Conversion échouée.')
    }
  }

  const renderClip = ({ item: clip }) => {
    const typeColor = getTypeColor(clip.contentType)
    const typeInfo = CONTENT_TYPES.find((t) => t.id === clip.contentType) || CONTENT_TYPES[0]

    return (
      <View style={styles.clipCard}>
        {/* Header */}
        <View style={styles.clipHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor + '40' }]}>
            <Text style={{ fontSize: 10 }}>{typeInfo.icon}</Text>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeInfo.label}</Text>
          </View>
          <Text style={styles.clipTime}>{formatTime(clip.copiedAt || clip.createdAt)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.clipTitle} numberOfLines={2}>{clip.title}</Text>

        {/* Summary */}
        <Text style={styles.clipSummary} numberOfLines={3}>
          {clip.summary || clip.content?.slice(0, 180)}
        </Text>

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
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {getDomainEmoji(clip.sourceDomain)} {clip.sourceDomain || 'clipboard'}
            </Text>
            <Text style={styles.metaText}>
              {clip.sourceDevice === 'mobile' ? '📱' : '🖥️'} {clip.sourceDevice}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => handleStar(clip.id)} style={styles.iconBtn}>
              <Text style={{ fontSize: 16 }}>{clip.isStarred ? '⭐' : '☆'}</Text>
            </TouchableOpacity>

            {clip.contentType === 'job_offer' && !clip.convertedToOffer && (
              <TouchableOpacity onPress={() => handleConvertToOffer(clip.id)} style={[styles.actionBtn, styles.convertBtn]}>
                <Text style={styles.convertBtnText}>💼 → Offre</Text>
              </TouchableOpacity>
            )}

            {clip.convertedToOffer && (
              <View style={styles.convertedBadge}>
                <Text style={styles.convertedText}>✓ Offre</Text>
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
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>📋 Clip Vault</Text>
        <View style={styles.headerActions}>
          {ingestingClip && <ActivityIndicator size="small" color={THEME.colors.accent} />}
          <TouchableOpacity
            onPress={() => setAutoCapture(!autoCapture)}
            style={[styles.toggleBtn, autoCapture ? styles.toggleBtnOn : styles.toggleBtnOff]}
          >
            <Text style={[styles.toggleBtnText, { color: autoCapture ? THEME.colors.success : THEME.colors.danger }]}>
              {autoCapture ? '⚡ Auto ON' : '⚡ Auto OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleManualCapture} style={styles.captureBtn}>
            <Text style={styles.captureBtnText}>📋 Capturer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher clips..."
          placeholderTextColor={THEME.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onEndEditing={loadClips}
        />
      </View>

      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {CONTENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            onPress={() => setActiveType(type.id)}
            style={[styles.filterPill, activeType === type.id && styles.filterPillActive]}
          >
            <Text style={{ fontSize: 12 }}>{type.icon}</Text>
            <Text style={[styles.filterText, activeType === type.id && styles.filterTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Clips List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={THEME.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          renderItem={renderClip}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadClips()
              }}
              tintColor={THEME.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Aucun clip</Text>
              <Text style={styles.emptySubtitle}>
                Copiez n'importe quel texte — il sera automatiquement classifié.
              </Text>
            </View>
          }
        />
      )}
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
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
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
    fontSize: 11,
    fontWeight: '600',
  },
  captureBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: THEME.colors.accentLight,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
  },
  captureBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accent,
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
  filterRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    maxHeight: 40,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: THEME.colors.accentLight,
    borderColor: THEME.colors.accentBorder,
  },
  filterText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  filterTextActive: {
    color: THEME.colors.accent,
    fontWeight: '600',
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
  clipTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  clipTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  convertBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  convertBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a855f7',
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
})

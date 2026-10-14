import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME, getStageMeta } from '../theme'

export function OffersListScreen({ onSelectOffer, onOpenCapture }) {
  const [offers, setOffers] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedChannel, setSelectedChannel] = useState('all') // 'all' | 'email' | 'direct_contact' | 'external'
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedCategory, selectedStage])

  const loadData = async () => {
    setIsLoading(true)
    const [offersRes, catsRes] = await Promise.all([
      ApiService.getOffers({
        category: selectedCategory,
        status: selectedStage,
        search: searchQuery,
      }),
      ApiService.getCategories(),
    ])

    if (offersRes.success) {
      setOffers(offersRes.offers || [])
    }
    if (catsRes.success) {
      setCategories(catsRes.categories || [])
    }
    setIsLoading(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const handleSearchSubmit = () => {
    loadData()
  }

  const handleExportCsv = async () => {
    try {
      const serverUrl = ApiService.getServerUrl()
      const exportUrl = `${serverUrl}/api/offers/export/csv`
      await Linking.openURL(exportUrl)
    } catch (err) {
      Alert.alert('Export Error', err.message || 'Could not download CSV file.')
    }
  }

  const handleQuickAdvance = async (offer) => {
    const stageOrder = ['saved', 'ready', 'applied', 'interview', 'offer']
    const currentIndex = stageOrder.indexOf(offer.status)
    if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1]
      const res = await ApiService.updateOfferStatus(offer.id, nextStage)
      if (res.success) {
        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, status: nextStage } : o))
        )
      } else {
        Alert.alert('Error', res.error || 'Unable to update status.')
      }
    }
  }

  const displayedOffers = selectedChannel === 'all'
    ? offers
    : offers.filter((o) => o.channel === selectedChannel)

  const getCompanyInitial = (company) => {
    if (!company) return '🏢'
    return company.trim().charAt(0).toUpperCase()
  }

  const renderOfferItem = ({ item }) => {
    const stageMeta = getStageMeta(item.status)
    const cat = categories.find((c) => c.id === item.category)
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        })
      : ''
    const matchScore = Math.round((item.confidence || 0.92) * 100)

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelectOffer(item)}
      >
        {/* Top Header: Domain + Confidence + Date + Stage */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.companyAvatar}>
              <Text style={styles.companyAvatarText}>{getCompanyInitial(item.company)}</Text>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Text style={styles.domainText} numberOfLines={1} ellipsizeMode="tail">
                {cat?.label || item.category?.toUpperCase() || 'GENERAL'}
              </Text>
              <Text style={styles.matchText}>{matchScore}% Match</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {createdDate ? (
              <Text style={styles.dateText} numberOfLines={1}>{createdDate}</Text>
            ) : null}
            <View
              style={[
                styles.stageBadge,
                { backgroundColor: stageMeta.bg, borderColor: stageMeta.color + '60' },
              ]}
            >
              <Text style={[styles.stageText, { color: stageMeta.color }]} numberOfLines={1}>
                {stageMeta.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Title & Company (Overflow Protected) */}
        <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>

        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {item.company || 'Direct Organization'} • 📍 {item.location || 'Remote / Hybrid'}
        </Text>

        {/* Recruiter info if available */}
        {(item.recruiterName || item.sharer?.name) && (
          <View style={styles.recruiterRow}>
            <Text style={styles.recruiterText} numberOfLines={1} ellipsizeMode="tail">
              👤 {item.recruiterName || item.sharer?.name}
              {item.recruiterEmail ? ` • ${item.recruiterEmail}` : ''}
            </Text>
          </View>
        )}

        {/* Tech Stack / Skills Pills */}
        {item.skills && item.skills.length > 0 ? (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 4).map((s, idx) => (
              <View key={idx} style={styles.skillChip}>
                <Text style={styles.skillText} numberOfLines={1}>{s}</Text>
              </View>
            ))}
            {item.skills.length > 4 && (
              <Text style={styles.moreSkills}>+{item.skills.length - 4}</Text>
            )}
          </View>
        ) : null}

        {/* Card Footer: Channel Badge & Non-Squished Advance Action */}
        <View style={styles.cardFooter}>
          <View style={[styles.channelBadge, { flexShrink: 1, overflow: 'hidden' }]}>
            <Text style={styles.channelLabel} numberOfLines={1} ellipsizeMode="tail">
              {item.channel === 'email'
                ? '✉️ Email Outreach'
                : item.channel === 'direct_contact'
                ? '💬 Direct DM / WA'
                : '🌐 ATS Portal'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.advanceButton}
            onPress={() => handleQuickAdvance(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.advanceButtonText}>Advance →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  const CHANNELS = [
    { id: 'all', label: 'All Channels' },
    { id: 'email', label: '✉️ Email' },
    { id: 'direct_contact', label: '💬 Direct DM' },
    { id: 'external', label: '🌐 ATS' },
  ]

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.searchBar, { flex: 1 }]}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search offers, skills, company..."
              placeholderTextColor={THEME.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.exportCsvBtn}
            onPress={handleExportCsv}
            activeOpacity={0.7}
          >
            <Text style={styles.exportCsvText}>📥 CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Channel Filter Tabs */}
        <View style={styles.channelFilterRow}>
          {CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch.id}
              style={[
                styles.channelChip,
                selectedChannel === ch.id && styles.channelChipActive,
              ]}
              onPress={() => setSelectedChannel(ch.id)}
            >
              <Text
                style={[
                  styles.channelChipText,
                  selectedChannel === ch.id && styles.channelChipTextActive,
                ]}
              >
                {ch.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Domain Filter Pills */}
        {categories.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', label: 'All Roles' }, ...categories]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filtersScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedCategory === item.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === item.id && styles.filterChipTextActive,
                  ]}
                >
                  {item.short_label || item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Offer List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedOffers}
          keyExtractor={(item) => item.id}
          renderItem={renderOfferItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#ffffff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💼</Text>
              <Text style={styles.emptyTitle}>No applications found</Text>
              <Text style={styles.emptyText}>
                Capture an offer from LinkedIn or browser to begin tracking.
              </Text>
              {onOpenCapture && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={onOpenCapture}
                >
                  <Text style={styles.emptyButtonText}>+ Capture First Offer</Text>
                </TouchableOpacity>
              )}
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
  header: {
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  searchBar: {
    marginBottom: 8,
  },
  exportCsvBtn: {
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exportCsvText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0095f6',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#262626',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#363636',
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 13,
  },
  channelFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  channelChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  channelChipText: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  channelChipTextActive: {
    color: '#09090b',
    fontWeight: '700',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  filterChipTextActive: {
    color: '#09090b',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 160, // generous bottom padding to prevent buttons from being eaten out
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  domainText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  matchText: {
    fontSize: 9.5,
    color: '#10b981',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 3,
  },
  companyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  recruiterRow: {
    backgroundColor: THEME.colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  recruiterText: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  skillText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  moreSkills: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexShrink: 1,
  },
  channelLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  advanceButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    flexShrink: 0,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceButtonText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  emptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  emptyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
})

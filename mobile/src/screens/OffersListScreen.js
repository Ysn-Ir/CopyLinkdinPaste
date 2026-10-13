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

  // Filter offers by channel locally if selected
  const displayedOffers = selectedChannel === 'all'
    ? offers
    : offers.filter((o) => o.channel === selectedChannel)

  const renderOfferItem = ({ item }) => {
    const stageMeta = getStageMeta(item.status)
    const cat = categories.find((c) => c.id === item.category)
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
        })
      : ''

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelectOffer(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.domainBadge}>
            <View
              style={[
                styles.domainDot,
                { backgroundColor: cat?.color || '#818cf8' },
              ]}
            />
            <Text
              style={[
                styles.domainText,
                { color: cat?.color || '#818cf8' },
              ]}
            >
              {cat?.short_label || cat?.label || item.category || 'General'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {createdDate ? (
              <Text style={styles.dateText}>{createdDate}</Text>
            ) : null}
            <View
              style={[
                styles.stageBadge,
                { backgroundColor: stageMeta.bg, borderColor: stageMeta.color },
              ]}
            >
              <Text style={[styles.stageText, { color: stageMeta.color }]}>
                {stageMeta.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.companyText}>
          🏢 {item.company || 'Company'} • 📍 {item.location || 'Remote / Hybrid'}
        </Text>

        {item.skills && item.skills.length > 0 ? (
          <View style={styles.skillsRow}>
            {item.skills.slice(0, 3).map((s, idx) => (
              <View key={idx} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
            {item.skills.length > 3 && (
              <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
            )}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.channelPill}>
            <Text style={styles.channelLabel}>
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
          >
            <Text style={styles.advanceButtonText}>Advance Stage →</Text>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search offers, company, skills..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      {/* Channel Filters */}
      <View style={styles.channelFilterRow}>
        {CHANNELS.map((ch) => {
          const isSelected = selectedChannel === ch.id
          return (
            <TouchableOpacity
              key={ch.id}
              style={[styles.channelChip, isSelected && styles.channelChipActive]}
              onPress={() => setSelectedChannel(ch.id)}
            >
              <Text style={[styles.channelChipText, isSelected && styles.channelChipTextActive]}>
                {ch.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Domain Category Filters */}
      <View style={styles.filtersScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', label: 'All Domains' }, ...categories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item.short_label || item.label}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* Main Stream List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={THEME.colors.accent} size="large" />
          <Text style={styles.loadingText}>Syncing offers stream...</Text>
        </View>
      ) : displayedOffers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No offers found</Text>
          <Text style={styles.emptyText}>
            Capture a job link from your phone or change your filter above.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onOpenCapture}
          >
            <Text style={styles.emptyButtonText}>+ Capture New Offer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedOffers}
          keyExtractor={(item) => item.id}
          renderItem={renderOfferItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={THEME.colors.accent}
            />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 42,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    color: THEME.colors.textPrimary,
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
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  channelChipText: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  channelChipTextActive: {
    color: '#c7d2fe',
    fontWeight: '700',
  },
  filtersScroll: {
    marginBottom: 10,
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
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  filterChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 70,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
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
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  domainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  companyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
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
  },
  channelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  channelLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  advanceButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  advanceButtonText: {
    fontSize: 11,
    color: '#c7d2fe',
    fontWeight: '600',
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
    backgroundColor: THEME.colors.accent,
  },
  emptyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
})

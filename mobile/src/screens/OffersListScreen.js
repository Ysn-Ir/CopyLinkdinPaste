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
import { RadarLogo } from '../components/RadarLogo'

export function OffersListScreen({ onSelectOffer, onOpenCapture, categoryFilter, onBackCategory }) {
  const [offers, setOffers] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedChannel, setSelectedChannel] = useState('all') // 'all' | 'email' | 'direct_contact' | 'external'
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter?.id || 'all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (categoryFilter?.id) {
      setSelectedCategory(categoryFilter.id)
    }
  }, [categoryFilter])

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
        Alert.alert('Update Notice', res.error || 'Unable to update status.')
      }
    }
  }

  const displayedOffers = selectedChannel === 'all'
    ? offers
    : offers.filter((o) => o.channel === selectedChannel)

  const getCompanyInitial = (company) => {
    if (!company) return '•'
    return company.trim().charAt(0).toUpperCase()
  }

  const renderOfferItem = ({ item }) => {
    const stageMeta = getStageMeta(item.status)
    const matchScore = Math.round((item.confidence || 0.92) * 100)

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelectOffer(item)}
      >
        {/* Card Header: Company Icon + Title & Company + Match Score */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.companyAvatar}>
              <Text style={styles.companyAvatarText}>{getCompanyInitial(item.company)}</Text>
            </View>
            <View style={styles.headerTitleBox}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.domainText} numberOfLines={1}>
                {item.company || 'Direct Organization'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.matchScoreBadge}>
              <Text style={styles.matchScoreText}>{matchScore}% FIT</Text>
            </View>
          </View>
        </View>

        {/* Details Inset Box matching Screen 4 of reference template */}
        <View style={styles.insetBox}>
          {/* Location row */}
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location || 'Remote'}
              {item.salary ? `  •  ${item.salary}` : ''}
            </Text>
          </View>

          {/* Skills tags matching template preview */}
          {item.skills && item.skills.length > 0 && (
            <View style={styles.skillsRow}>
              {item.skills.slice(0, 4).map((skill, idx) => (
                <View key={idx} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
              {item.skills.length > 4 && (
                <Text style={styles.moreSkills}>+{item.skills.length - 4}</Text>
              )}
            </View>
          )}

          {/* Recruiter Lead if present */}
          {(item.recruiterEmail || item.contactName) && (
            <View style={styles.recruiterRow}>
              <Text style={styles.recruiterText} numberOfLines={1}>
                Lead: {item.contactName || ''} {item.recruiterEmail ? `<${item.recruiterEmail}>` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Card Action Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.stageBadge, { backgroundColor: stageMeta.bg, borderColor: stageMeta.border }]}>
            <Text style={[styles.stageText, { color: stageMeta.color }]}>
              {stageMeta.label}
            </Text>
          </View>
          <View style={styles.channelBadge}>
            <Text style={styles.channelLabel}>
              {item.channel === 'email' ? 'Direct Email' : item.channel === 'direct_contact' ? 'WhatsApp/DM' : 'ATS Portal'}
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

  return (
    <View style={styles.container}>
      {/* Top Header with RADAR Logo or Category Navigation */}
      {categoryFilter ? (
        <View style={styles.categoryTopBar}>
          <TouchableOpacity onPress={onBackCategory} style={styles.categoryBackRow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.categoryBackIcon}>‹</Text>
            <Text style={styles.categoryBackTitle} numberOfLines={1}>
              {categoryFilter.title || 'Category'}
            </Text>
          </TouchableOpacity>
          <View style={styles.categoryRightBox}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{displayedOffers.length}</Text>
            </View>
            <View style={styles.categoryAvatarCircle}>
              <Text style={styles.categoryAvatarText}>KP</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.brandTopBar}>
          <RadarLogo size={26} showWordmark={true} subtitle="PIPELINE JOBS" />
          <View style={styles.categoryRightBox}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{displayedOffers.length} offers</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sticky Technical Filter & Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search opportunities or skills..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportCsv}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Channel Control */}
        <View style={styles.channelFilterRow}>
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'email', label: 'Email' },
            { id: 'direct_contact', label: 'Direct' },
            { id: 'external', label: 'Portals' },
          ].map((ch) => (
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
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={THEME.colors.textPrimary} size="small" />
          <Text style={styles.loadingText}>Loading career signals...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedOffers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOfferItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={THEME.colors.textPrimary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Opportunities Tracked</Text>
              <Text style={styles.emptyText}>
                Use 1-tap capture, paste clipboard links, or scan screenshots to track positions.
              </Text>
              {onOpenCapture && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={onOpenCapture}
                >
                  <Text style={styles.emptyButtonText}>+ Capture New Signal</Text>
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
  categoryTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  brandTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  categoryBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBackIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 22,
  },
  categoryBackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  categoryRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textInverse,
  },
  categoryAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.brandBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.bgCard,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: THEME.colors.bgApp,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    color: THEME.colors.textPrimary,
    fontSize: 12.5,
  },
  exportBtn: {
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.bgApp,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  channelFilterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  channelChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: THEME.colors.bgApp,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelChipActive: {
    backgroundColor: THEME.colors.textPrimary,
    borderColor: THEME.colors.textPrimary,
  },
  channelChipText: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  channelChipTextActive: {
    color: THEME.colors.textInverse,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitleBox: {
    flex: 1,
  },
  companyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  domainText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.colors.accentGreenLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  matchScoreText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.accentGreen,
    letterSpacing: 0.3,
  },
  insetBox: {
    backgroundColor: THEME.colors.bgApp,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  locationPin: {
    fontSize: 11,
  },
  locationText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  skillText: {
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  moreSkills: {
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  recruiterRow: {
    backgroundColor: THEME.colors.bgCard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  recruiterText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    gap: 6,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgApp,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelLabel: {
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  advanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.colors.brandBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceButtonText: {
    fontSize: 10.5,
    color: THEME.colors.textInverse,
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
    fontSize: 36,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  emptyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: THEME.colors.textPrimary,
  },
  emptyButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },
})

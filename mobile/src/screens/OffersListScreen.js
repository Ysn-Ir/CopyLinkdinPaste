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
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        })
      : ''

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => onSelectOffer(item)}
      >
        {/* Card Header: Company Glyph + Category + Match Score + Stage Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.companyAvatar}>
              <Text style={styles.companyAvatarText}>{getCompanyInitial(item.company)}</Text>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Text style={styles.domainText} numberOfLines={1} ellipsizeMode="tail">
                {item.company || 'Direct Organization'}
              </Text>
              <Text style={styles.categorySubText} numberOfLines={1}>
                {item.category?.toUpperCase() || 'GENERAL'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.matchScoreBadge}>
              <Text style={styles.matchScoreText}>{matchScore}% FIT</Text>
            </View>
            <View style={[styles.stageBadge, { backgroundColor: stageMeta.bg, borderColor: stageMeta.border }]}>
              <Text style={[styles.stageText, { color: stageMeta.color }]}>
                {stageMeta.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Salary & Location */}
        {(item.salary || item.location) && (
          <Text style={styles.metaRowText} numberOfLines={1}>
            {item.salary ? `${item.salary} ` : ''}
            {item.salary && item.location ? '• ' : ''}
            {item.location || ''}
          </Text>
        )}

        {/* Recruiter Lead if present */}
        {(item.recruiterEmail || item.contactName) && (
          <View style={styles.recruiterRow}>
            <Text style={styles.recruiterText} numberOfLines={1}>
              Lead: {item.contactName || ''} {item.recruiterEmail ? `<${item.recruiterEmail}>` : ''}
            </Text>
          </View>
        )}

        {/* Skills Tags */}
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

        {/* Card Action Footer */}
        <View style={styles.cardFooter}>
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
              <Text style={styles.emptyIcon}>💼</Text>
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
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.bgDark,
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
    backgroundColor: THEME.colors.bgInput,
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
    backgroundColor: THEME.colors.bgCard,
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
    backgroundColor: THEME.colors.bgCard,
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
    gap: 10,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
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
    flex: 1,
  },
  companyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  domainText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  categorySubText: {
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  matchScoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  stageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  metaRowText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  recruiterRow: {
    backgroundColor: THEME.colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  recruiterText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  skillText: {
    fontSize: 9.5,
    color: THEME.colors.textSecondary,
  },
  moreSkills: {
    fontSize: 9.5,
    color: THEME.colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    gap: 8,
  },
  channelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
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
    borderRadius: 4,
    backgroundColor: THEME.colors.textPrimary,
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

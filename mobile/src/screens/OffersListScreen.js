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

  const handleQuickAdvance = async (offer, e) => {
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
        Alert.alert('Erreur', res.error || 'Impossible de mettre à jour le statut.')
      }
    }
  }

  const renderOfferItem = ({ item }) => {
    const stageMeta = getStageMeta(item.status)
    const cat = categories.find((c) => c.id === item.category)
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('fr-FR', {
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
                { backgroundColor: cat?.color || THEME.colors.accent },
              ]}
            />
            <Text
              style={[
                styles.domainText,
                { color: cat?.color || THEME.colors.accent },
              ]}
            >
              {cat?.short_label || cat?.label || item.category || 'Général'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {createdDate ? (
              <Text style={styles.dateText}>📅 {createdDate}</Text>
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
          🏢 {item.company || 'Entreprise PFE'} • 📍 {item.location || 'France'}
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
          <Text style={styles.channelLabel}>
            {item.channel === 'email'
              ? '✉️ Email Studio'
              : item.channel === 'direct_contact'
              ? '💬 DM / WhatsApp'
              : '🌐 ATS / Portail'}
          </Text>

          <TouchableOpacity
            style={styles.advanceButton}
            onPress={() => handleQuickAdvance(item)}
          >
            <Text style={styles.advanceButtonText}>Avancer étape →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par titre, boîte, compétence..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      {/* Domain Category Filters */}
      <View style={styles.filtersScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', label: 'Tous les domaines' }, ...categories]}
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
          <Text style={styles.loadingText}>Synchronisation du flux...</Text>
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Aucune offre trouvée</Text>
          <Text style={styles.emptyText}>
            Capturez un post LinkedIn ou modifiez vos filtres de recherche.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onOpenCapture}
          >
            <Text style={styles.emptyButtonText}>+ Capturer un Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    color: THEME.colors.textPrimary,
    fontSize: 13,
  },
  filtersScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.accentLight,
    borderColor: THEME.colors.accentBorder,
  },
  filterChipText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
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
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  domainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  domainText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  stageBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  companyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillChip: {
    backgroundColor: THEME.colors.bgElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  moreSkills: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    alignSelf: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  channelLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  advanceButton: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  advanceButtonText: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
})

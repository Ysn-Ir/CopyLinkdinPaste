import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'
import { RadarLogo } from '../components/RadarLogo'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

const CATEGORIES_DATA = [
  {
    id: 'ai-ml',
    title: 'AI & Machine Learning',
    shortTitle: 'AI / ML',
    count: '4000+ jobs',
    iconText: 'AI',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    accentBorder: '#C7D2FE',
  },
  {
    id: 'dev-fullstack',
    title: 'Software & Fullstack',
    shortTitle: 'Engineering',
    count: '8000+ jobs',
    iconText: 'DEV',
    iconColor: '#3B82F6',
    iconBg: '#EFF6FF',
    accentBorder: '#BFDBFE',
  },
  {
    id: 'data',
    title: 'Data & Analytics',
    shortTitle: 'Data',
    count: '3500+ jobs',
    iconText: 'DATA',
    iconColor: '#F59E0B',
    iconBg: '#FFFBEB',
    accentBorder: '#FDE68A',
  },
  {
    id: 'devops-cloud',
    title: 'DevOps & Cloud',
    shortTitle: 'Cloud',
    count: '5000+ jobs',
    iconText: 'OPS',
    iconColor: '#10B981',
    iconBg: '#ECFDF5',
    accentBorder: '#A7F3D0',
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    shortTitle: 'Security',
    count: '2400+ jobs',
    iconText: 'SEC',
    iconColor: '#EC4899',
    iconBg: '#FDF2F8',
    accentBorder: '#FBCFE8',
  },
  {
    id: 'embedded-iot',
    title: 'Embedded & IoT',
    shortTitle: 'Hardware',
    count: '1800+ jobs',
    iconText: 'IOT',
    iconColor: '#8B5CF6',
    iconBg: '#F5F3FF',
    accentBorder: '#DDD6FE',
  },
  {
    id: 'email',
    title: 'Direct Recruiter Leads',
    shortTitle: 'Direct',
    count: '1200+ leads',
    iconText: 'LEAD',
    iconColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    accentBorder: '#BAE6FD',
  },
  {
    id: 'other',
    title: 'All Opportunities',
    shortTitle: 'Global',
    count: '12000+ jobs',
    iconText: 'ALL',
    iconColor: '#64748B',
    iconBg: '#F1F5F9',
    accentBorder: '#E2E8F0',
  },
]

export function CategoriesScreen({ onSelectCategory, onNavigateTab }) {
  const [categoryCounts, setCategoryCounts] = useState({})
  const [totalOffers, setTotalOffers] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadCounts()
  }, [])

  const loadCounts = async () => {
    try {
      const res = await ApiService.getOffers()
      if (res && res.success) {
        const offers = res.offers || []
        setTotalOffers(offers.length)
        const counts = {}
        offers.forEach((o) => {
          const cat = o.category || 'other'
          counts[cat] = (counts[cat] || 0) + 1
        })
        setCategoryCounts(counts)
      }
    } catch (e) {}
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadCounts()
    setIsRefreshing(false)
  }

  const handleCardPress = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat.id, cat.title)
    } else if (onNavigateTab) {
      onNavigateTab('offers')
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={THEME.colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header matching Reference Screen 1 with RADAR Logo */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <RadarLogo size={26} showWordmark={false} />
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>
              {totalOffers > 99 ? '99+' : String(totalOffers).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => onNavigateTab && onNavigateTab('settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarInitials}>KP</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.headerSubtitle}>
        Explore engineering domains and matched candidate signals
      </Text>

      {/* 2. Grid of Category Cards (2 columns, rounded, soft elevation) */}
      <View style={styles.gridContainer}>
        {CATEGORIES_DATA.map((cat) => {
          const realCount = categoryCounts[cat.id]
          const displayCount = realCount !== undefined ? `${realCount} active signals` : cat.count

          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => handleCardPress(cat)}
              activeOpacity={0.85}
            >
              {/* Top Icon Box */}
              <View style={[styles.iconBox, { backgroundColor: cat.iconBg, borderColor: cat.accentBorder }]}>
                <Text style={[styles.iconText, { color: cat.iconColor }]}>{cat.iconText}</Text>
              </View>

              {/* Title & Count */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {cat.shortTitle}
              </Text>
              <Text style={styles.cardCount} numberOfLines={1}>
                {displayCount}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E2022',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  iconText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E2022',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
})

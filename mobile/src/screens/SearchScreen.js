import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

const LOCATIONS = ['REMOTE', 'PARIS', 'LONDON', 'NEW YORK', 'SAN FRANCISCO', 'DUBAI']

export function SearchScreen({ onSelectOffer, onNavigateTab }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('REMOTE')
  const [offers, setOffers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Interactive Pillars State (matching Screen 3 of reference design)
  const [activePillar, setActivePillar] = useState('fit') // 'fit' | 'exp' | 'freshness'

  useEffect(() => {
    loadAllOffers()
  }, [])

  const loadAllOffers = async () => {
    setIsLoading(true)
    try {
      const res = await ApiService.getOffers()
      if (res && res.success) {
        setOffers(res.offers || [])
      }
    } catch (e) {
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered jobs based on search term & location
  const filteredOffers = offers.filter((o) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      o.title?.toLowerCase().includes(q) ||
      o.company?.toLowerCase().includes(q) ||
      o.skills?.some((s) => s.toLowerCase().includes(q)) ||
      o.description?.toLowerCase().includes(q)

    const matchesLoc =
      !selectedLocation ||
      selectedLocation === 'ALL' ||
      (o.location || '').toUpperCase().includes(selectedLocation) ||
      (selectedLocation === 'REMOTE' && (o.location?.toLowerCase().includes('remote') || !o.location))

    return matchesQuery && (matchesLoc || !q)
  })

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity
          style={styles.huntPillBtn}
          onPress={() => onNavigateTab && onNavigateTab('scraper')}
          activeOpacity={0.8}
        >
          <Text style={styles.huntPillText}>+ Live Hunt</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Search Input matching Screen 3 placeholder */}
      <View style={styles.searchBox}>
        <View style={styles.searchIconBox}>
          <Text style={styles.searchIconText}>Q</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Keyskills, Designations, Companies"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Location Horizontal Filter Pills */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Location</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locScroll}>
        {LOCATIONS.map((loc) => {
          const isSelected = selectedLocation === loc
          return (
            <TouchableOpacity
              key={loc}
              style={[styles.locPill, isSelected && styles.locPillActive]}
              onPress={() => setSelectedLocation(isSelected ? '' : loc)}
              activeOpacity={0.8}
            >
              <Text style={[styles.locPillText, isSelected && styles.locPillTextActive]}>
                {loc}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* 4. Three Vertical Range Pillars (Exact replica of Screen 3) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Match Criteria</Text>
      </View>
      <View style={styles.pillarsContainer}>
        {/* Pillar 1: Salary / Match Expectations (Purple) */}
        <TouchableOpacity
          style={[styles.pillarCard, activePillar === 'fit' && styles.pillarCardActive]}
          onPress={() => setActivePillar('fit')}
          activeOpacity={0.85}
        >
          <View style={styles.pillarBarTrack}>
            <View style={[styles.pillarBarFill, { height: '85%', backgroundColor: '#6366F1' }]} />
            <Text style={styles.pillarVerticalText}>ATS Fit Score</Text>
          </View>
          <Text style={styles.pillarValue}>85%+</Text>
          <Text style={styles.pillarSub}>Target Fit</Text>
        </TouchableOpacity>

        {/* Pillar 2: Work Experience (Pink) */}
        <TouchableOpacity
          style={[styles.pillarCard, activePillar === 'exp' && styles.pillarCardActive]}
          onPress={() => setActivePillar('exp')}
          activeOpacity={0.85}
        >
          <View style={styles.pillarBarTrack}>
            <View style={[styles.pillarBarFill, { height: '60%', backgroundColor: '#EC4899' }]} />
            <Text style={styles.pillarVerticalText}>Experience</Text>
          </View>
          <Text style={styles.pillarValue}>Mid/Sr</Text>
          <Text style={styles.pillarSub}>3-5 yr Exp.</Text>
        </TouchableOpacity>

        {/* Pillar 3: Freshness / Recency (Mint Green) */}
        <TouchableOpacity
          style={[styles.pillarCard, activePillar === 'freshness' && styles.pillarCardActive]}
          onPress={() => setActivePillar('freshness')}
          activeOpacity={0.85}
        >
          <View style={styles.pillarBarTrack}>
            <View style={[styles.pillarBarFill, { height: '95%', backgroundColor: '#10B981' }]} />
            <Text style={styles.pillarVerticalText}>Freshness</Text>
          </View>
          <Text style={styles.pillarValue}>24h</Text>
          <Text style={styles.pillarSub}>Recent Posts</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Results Stream */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>Matched Signals ({filteredOffers.length})</Text>
        <Text style={styles.resultsBadge}>{filteredOffers.length} available</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
      ) : filteredOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching positions</Text>
          <Text style={styles.emptySub}>
            Try clearing search keywords or run the autonomous scraper.
          </Text>
        </View>
      ) : (
        filteredOffers.map((offer) => (
          <TouchableOpacity
            key={offer.id}
            style={styles.jobCard}
            onPress={() => onSelectOffer && onSelectOffer(offer)}
            activeOpacity={0.85}
          >
            <View style={styles.jobTopRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>
                  {(offer.company || 'C')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {offer.title}
                </Text>
                <Text style={styles.jobCompany} numberOfLines={1}>
                  {offer.company || 'Direct Organization'} · {offer.location || 'Remote'}
                </Text>
              </View>
              <View style={styles.channelBadge}>
                <Text style={styles.channelBadgeText}>
                  {(offer.channel || 'ATS').toUpperCase()}
                </Text>
              </View>
            </View>

            {offer.skills && offer.skills.length > 0 && (
              <View style={styles.skillsRow}>
                {offer.skills.slice(0, 3).map((s, idx) => (
                  <View key={idx} style={styles.skillPill}>
                    <Text style={styles.skillPillText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
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
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E2022',
    letterSpacing: -0.5,
  },
  huntPillBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  huntPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  searchIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchIconText: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E2022',
  },
  clearText: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2022',
  },
  resultsBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  locScroll: {
    marginBottom: 18,
  },
  locPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  locPillActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  locPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  locPillTextActive: {
    color: '#FFFFFF',
  },
  pillarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pillarCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pillarCardActive: {
    borderColor: '#FF3B30',
  },
  pillarBarTrack: {
    width: 32,
    height: 110,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  pillarBarFill: {
    width: '100%',
    borderRadius: 16,
  },
  pillarVerticalText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    transform: [{ rotate: '-90deg' }],
    width: 90,
    textAlign: 'center',
    bottom: 45,
  },
  pillarValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E2022',
    marginTop: 2,
  },
  pillarSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  jobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  logoBadgeText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '800',
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2022',
  },
  jobCompany: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  channelBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  skillPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skillPillText: {
    fontSize: 11,
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E2022',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
})

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

export function DashboardScreen({ onNavigateTab, onSelectOffer }) {
  const [stats, setStats] = useState({
    total: 0,
    saved: 0,
    ready: 0,
    applied: 0,
    interview: 0,
    offer: 0,
  })
  const [recentOffers, setRecentOffers] = useState([])
  const [serverInfo, setServerInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    const [offersRes, pingRes] = await Promise.all([
      ApiService.getOffers(),
      ApiService.testConnection(),
    ])

    if (offersRes.success) {
      const all = offersRes.offers || []
      setRecentOffers(all.slice(0, 4))
      setStats({
        total: all.length,
        saved: all.filter((o) => o.status === 'saved').length,
        ready: all.filter((o) => o.status === 'ready').length,
        applied: all.filter((o) => o.status === 'applied').length,
        interview: all.filter((o) => o.status === 'interview').length,
        offer: all.filter((o) => o.status === 'offer').length,
      })
    }

    if (pingRes.success) {
      setServerInfo(pingRes.data)
    }

    setIsLoading(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={THEME.colors.accent}
        />
      }
    >
      {/* Top Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Command Center Mobile</Text>
        <Text style={styles.subtitle}>
          PFE Hunter synchronisé en temps réel avec votre PC.
        </Text>
      </View>

      {/* Network Server Status Badge */}
      <TouchableOpacity
        style={styles.serverCard}
        onPress={() => onNavigateTab('connect')}
      >
        <View style={styles.serverStatusDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.serverTitle}>
            {serverInfo ? `Connecté à ${serverInfo.hostname || 'PC'}` : 'Vérification Réseau...'}
          </Text>
          <Text style={styles.serverUrl}>{ApiService.getServerUrl()}</Text>
        </View>
        <Text style={styles.serverAction}>Paramètres →</Text>
      </TouchableOpacity>

      {/* Primary KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderColor: THEME.colors.accentBorder }]}>
          <Text style={[styles.kpiNumber, { color: THEME.colors.accent }]}>
            {stats.total}
          </Text>
          <Text style={styles.kpiLabel}>Total Offres PFE</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#60a5fa' }]}>
            {stats.ready}
          </Text>
          <Text style={styles.kpiLabel}>Prêt à Postuler</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#c084fc' }]}>
            {stats.applied}
          </Text>
          <Text style={styles.kpiLabel}>Candidaté</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiNumber, { color: '#f59e0b' }]}>
            {stats.interview}
          </Text>
          <Text style={styles.kpiLabel}>Entretiens</Text>
        </View>
      </View>

      {/* Fast Ingestion CTA Banner */}
      <TouchableOpacity
        style={styles.ctaBanner}
        onPress={() => onNavigateTab('capture')}
      >
        <View style={styles.ctaIconBox}>
          <Text style={styles.ctaIcon}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Capturer depuis le Presse-papiers</Text>
          <Text style={styles.ctaSubtitle}>
            Copiez un post LinkedIn sur votre téléphone pour l'ingérer instantanément.
          </Text>
        </View>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>

      {/* Recent Offers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dernières Offres Ajoutées</Text>
        <TouchableOpacity onPress={() => onNavigateTab('offers')}>
          <Text style={styles.viewAllText}>Voir tout ({stats.total}) →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.accent} style={{ marginTop: 20 }} />
      ) : recentOffers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucune offre synchronisée pour le moment.</Text>
        </View>
      ) : (
        <View style={styles.recentList}>
          {recentOffers.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={styles.recentItem}
              onPress={() => onSelectOffer(o)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {o.title}
                </Text>
                <Text style={styles.recentMeta}>
                  {o.company || 'Entreprise'} • {o.category || 'Général'}
                </Text>
              </View>
              <Text style={styles.recentStatus}>{o.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  content: {
    padding: 16,
    paddingTop: 30,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
  },
  serverTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  serverUrl: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  serverAction: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  ctaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIcon: {
    fontSize: 20,
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  ctaSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  ctaArrow: {
    fontSize: 18,
    color: THEME.colors.accent,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  viewAllText: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  recentMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  recentStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent,
    backgroundColor: THEME.colors.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: THEME.colors.bgCard,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
})

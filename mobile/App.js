import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'

import { ApiService } from './src/services/api'
import { THEME } from './src/theme'

import { DashboardScreen } from './src/screens/DashboardScreen'
import { CaptureScreen } from './src/screens/CaptureScreen'
import { OffersListScreen } from './src/screens/OffersListScreen'
import { OfferDetailScreen } from './src/screens/OfferDetailScreen'
import { ConnectScreen } from './src/screens/ConnectScreen'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'capture' | 'offers' | 'connect'
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    await ApiService.init()
    setIsReady(true)
  }

  const handleSelectOffer = (offer) => {
    setSelectedOffer(offer)
  }

  const handleBackFromDetail = () => {
    setSelectedOffer(null)
  }

  const handleOfferCreated = (newOffer) => {
    // Optionally open details or switch to offers tab
    setSelectedOffer(newOffer)
  }

  const handleStatusUpdated = (offerId, newStatus) => {
    // Keep local state in sync
    if (selectedOffer && selectedOffer.id === offerId) {
      setSelectedOffer((prev) => ({ ...prev, status: newStatus }))
    }
  }

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>PFE Hunter Mobile</Text>
      </View>
    )
  }

  // Render Offer Details Screen if an offer is selected
  if (selectedOffer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="light" />
        <OfferDetailScreen
          offer={selectedOffer}
          onBack={handleBackFromDetail}
          onStatusUpdated={handleStatusUpdated}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />

      {/* Screen Body */}
      <View style={styles.mainContainer}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            onNavigateTab={setActiveTab}
            onSelectOffer={handleSelectOffer}
          />
        )}

        {activeTab === 'capture' && (
          <CaptureScreen
            onOfferCreated={handleOfferCreated}
            onNavigateOffers={() => setActiveTab('offers')}
          />
        )}

        {activeTab === 'offers' && (
          <OffersListScreen
            onSelectOffer={handleSelectOffer}
            onOpenCapture={() => setActiveTab('capture')}
          />
        )}

        {activeTab === 'connect' && (
          <ConnectScreen
            onConnected={() => setActiveTab('dashboard')}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}
      </View>

      {/* Modern Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navIcon, activeTab === 'dashboard' && styles.navIconActive]}>
            📊
          </Text>
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
            Aperçu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'capture' && styles.navItemActive]}
          onPress={() => setActiveTab('capture')}
        >
          <View style={styles.captureIconWrapper}>
            <Text style={styles.captureIcon}>⚡</Text>
          </View>
          <Text style={[styles.navLabel, activeTab === 'capture' && styles.navLabelActive]}>
            Capture
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'offers' && styles.navItemActive]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.navIcon, activeTab === 'offers' && styles.navIconActive]}>
            📋
          </Text>
          <Text style={[styles.navLabel, activeTab === 'offers' && styles.navLabelActive]}>
            Flux PFE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'connect' && styles.navItemActive]}
          onPress={() => setActiveTab('connect')}
        >
          <Text style={[styles.navIcon, activeTab === 'connect' && styles.navIconActive]}>
            📡
          </Text>
          <Text style={[styles.navLabel, activeTab === 'connect' && styles.navLabelActive]}>
            Réseau
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
    paddingTop: StatusBar.currentHeight || 0,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: THEME.colors.accent,
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: THEME.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  navItemActive: {
    // subtle active indicator
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  captureIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  captureIcon: {
    fontSize: 14,
  },
  navLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    color: THEME.colors.accent,
    fontWeight: '700',
  },
})

import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  AppState,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'

import { ApiService } from './src/services/api'
import { THEME } from './src/theme'

import { DashboardScreen } from './src/screens/DashboardScreen'
import { CaptureScreen } from './src/screens/CaptureScreen'
import { OffersListScreen } from './src/screens/OffersListScreen'
import { OfferDetailScreen } from './src/screens/OfferDetailScreen'
import { ConnectScreen } from './src/screens/ConnectScreen'
import { ClipVaultScreen } from './src/screens/ClipVaultScreen'
import { ClipboardWatcher } from './src/services/clipboardWatcher'
import { ScreenshotWatcher } from './src/services/screenshotWatcher'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [isReady, setIsReady] = useState(false)

  // Floating Toast State for Automatic Clipboard & Screenshot Capture
  const [capturedEvent, setCapturedEvent] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const bannerAnim = useRef(new Animated.Value(-120)).current
  const bannerTimerRef = useRef(null)

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    await ApiService.init()
    await ClipboardWatcher.init()
    ClipboardWatcher.start(2500)
    await ScreenshotWatcher.init()
    ScreenshotWatcher.start(3000)
    setIsReady(true)
  }

  // Handle incoming Android share intents (both URLs/Text and Shared Screenshot Images)
  useEffect(() => {
    const handleIncomingUrl = async (url) => {
      if (!url) return
      try {
        // Direct image content URI from Android Share Sheet
        if (url.startsWith('content://') || url.startsWith('file://')) {
          const res = await ScreenshotWatcher.processImageUri(url)
          if (res && res.success) {
            showAutoCapturedToast({ ...res, isScreenshot: true })
          }
          return
        }

        const parsed = Linking.parse(url)
        const rawContent = parsed.queryParams?.text || parsed.queryParams?.url || (url.startsWith('http') ? url : null)
        if (rawContent && rawContent.length > 5) {
          const res = await ApiService.ingestClip({
            content: rawContent,
            sourceUrl: rawContent.startsWith('http') ? rawContent : '',
            sourceDevice: 'mobile',
          })
          if (res && res.success) {
            showAutoCapturedToast(res)
          }
        }
      } catch (err) {
        console.warn('Failed handling incoming shared URL:', err)
      }
    }

    Linking.getInitialURL().then(handleIncomingUrl)
    const subscription = Linking.addEventListener('url', (e) => handleIncomingUrl(e.url))
    return () => subscription.remove()
  }, [])

  // Subscribe to automatic clipboard ingestion events
  useEffect(() => {
    const unsubscribe = ClipboardWatcher.subscribe((event) => {
      if (event && event.success && !event.isDuplicate) {
        showAutoCapturedToast(event)
      }
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to automatic screenshot detection events (0 manual steps)
  useEffect(() => {
    const unsubscribe = ScreenshotWatcher.subscribe((event) => {
      if (event && event.success) {
        showAutoCapturedToast({
          ...event,
          isScreenshot: true,
        })
      }
    })
    return () => unsubscribe()
  }, [])

  const showAutoCapturedToast = (event) => {
    setCapturedEvent(event)
    setBannerVisible(true)
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)

    Animated.spring(bannerAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start()

    // Smoothly auto-dismiss after 4 seconds
    bannerTimerRef.current = setTimeout(() => {
      hideClipboardBanner()
    }, 4000)
  }

  const hideClipboardBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setBannerVisible(false)
      setCapturedEvent(null)
    })
  }

  const handleSelectOffer = (offer) => {
    setSelectedOffer(offer)
  }

  const handleBackFromDetail = () => {
    setSelectedOffer(null)
  }

  const handleOfferCreated = (newOffer) => {
    setSelectedOffer(newOffer)
  }

  const handleStatusUpdated = (offerId, newStatus) => {
    if (selectedOffer && selectedOffer.id === offerId) {
      setSelectedOffer((prev) => ({ ...prev, status: newStatus }))
    }
  }

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.splashText}>OmniHunt</Text>
        <Text style={styles.splashSub}>Executive Career Command</Text>
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

      {/* Non-intrusive Auto-Capture Floating Notification Toast */}
      {bannerVisible && capturedEvent && (
        <Animated.View
          style={[
            styles.clipboardBanner,
            { transform: [{ translateY: bannerAnim }] },
          ]}
        >
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconBox}>
              <Text style={{ fontSize: 13 }}>
                {capturedEvent.isScreenshot ? '📸' : (capturedEvent.isJobOffer ? '🎯' : '📋')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {capturedEvent.isScreenshot
                  ? (capturedEvent.isJobOffer ? 'Screenshot Job Offer Detected!' : 'Screenshot OCR Auto-Ingested!')
                  : (capturedEvent.isJobOffer ? 'Job Offer Auto-Captured!' : 'Clip Auto-Captured to Vault')}
              </Text>
              <Text style={styles.bannerSnippet} numberOfLines={1}>
                {capturedEvent.clip?.title || (capturedEvent.rawText?.slice(0, 45) + '...') || 'Processed via Groq Vision OCR'}
              </Text>
            </View>
          </View>
          <View style={styles.bannerActions}>
            {capturedEvent.isJobOffer && capturedEvent.offer && (
              <TouchableOpacity
                style={styles.bannerActionBtn}
                onPress={() => {
                  hideClipboardBanner()
                  setSelectedOffer(capturedEvent.offer)
                }}
              >
                <Text style={styles.bannerActionText}>View</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.bannerCloseBtn}
              onPress={hideClipboardBanner}
            >
              <Text style={styles.bannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

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
            onNavigateClips={() => setActiveTab('clipvault')}
          />
        )}

        {activeTab === 'offers' && (
          <OffersListScreen
            onSelectOffer={handleSelectOffer}
            onOpenCapture={() => setActiveTab('capture')}
          />
        )}

        {activeTab === 'clipvault' && (
          <ClipVaultScreen
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'connect' && (
          <ConnectScreen
            onConnected={() => setActiveTab('dashboard')}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}
      </View>

      {/* Modern High-End Bottom Navigation Bar with Safe Android Padding */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navIcon, activeTab === 'dashboard' && styles.navIconActive]}>
            📊
          </Text>
          <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'capture' && styles.navItemActive]}
          onPress={() => setActiveTab('capture')}
        >
          <View style={[styles.captureIconWrapper, activeTab === 'capture' && styles.captureIconWrapperActive]}>
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
            💼
          </Text>
          <Text style={[styles.navLabel, activeTab === 'offers' && styles.navLabelActive]}>
            Offers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'clipvault' && styles.navItemActive]}
          onPress={() => setActiveTab('clipvault')}
        >
          <Text style={[styles.navIcon, activeTab === 'clipvault' && styles.navIconActive]}>
            📋
          </Text>
          <Text style={[styles.navLabel, activeTab === 'clipvault' && styles.navLabelActive]}>
            Vault
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
            Network
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
    gap: 8,
  },
  splashText: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  splashSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  mainContainer: {
    flex: 1,
  },

  // Floating Real-Time Clipboard Banner
  clipboardBanner: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 0) + 8,
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: '#131826',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  bannerIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  bannerSnippet: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerActionBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  bannerActionText: {
    color: '#09090b',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerCloseBtn: {
    padding: 6,
  },
  bannerCloseText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },

  // Navigation Bar with Safe Android Padding
  navBar: {
    flexDirection: 'row',
    height: Platform.OS === 'android' ? 74 : 66,
    backgroundColor: THEME.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'android' ? 14 : 4,
    paddingHorizontal: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navItemActive: {},
  navIcon: {
    fontSize: 17,
    marginBottom: 2,
    opacity: 0.45,
  },
  navIconActive: {
    opacity: 1,
  },
  captureIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  captureIconWrapperActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  captureIcon: {
    fontSize: 12,
  },
  navLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
})

import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  ActivityIndicator,
  Vibration,
  PermissionsAndroid,
} from 'react-native'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'

import { ApiService } from './src/services/api'
import { THEME } from './src/theme'

import { DashboardScreen } from './src/screens/DashboardScreen'
import { CategoriesScreen } from './src/screens/CategoriesScreen'
import { SearchScreen } from './src/screens/SearchScreen'
import { ScraperScreen } from './src/screens/ScraperScreen'
import { CaptureScreen } from './src/screens/CaptureScreen'
import { OffersListScreen } from './src/screens/OffersListScreen'
import { OfferDetailScreen } from './src/screens/OfferDetailScreen'
import { ConnectScreen } from './src/screens/ConnectScreen'
import { ClipVaultScreen } from './src/screens/ClipVaultScreen'
import { AgentScreen } from './src/screens/AgentScreen'
import { ClipboardWatcher } from './src/services/clipboardWatcher'
import { ScreenshotWatcher } from './src/services/screenshotWatcher'
import { NotificationService } from './src/services/notificationService'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [notificationsBlocked, setNotificationsBlocked] = useState(false)

  // Floating Toast State for Automatic Clipboard & Screenshot Capture
  const [capturedEvent, setCapturedEvent] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const bannerAnim = useRef(new Animated.Value(-120)).current
  const bannerTimerRef = useRef(null)

  useEffect(() => {
    initApp()
  }, [])

  // Listen for native notification clicks from the Android status bar / lockscreen
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data
        if (data?.offerId) {
          ApiService.getOffer(data.offerId).then((res) => {
            if (res?.success && res.offer) {
              setSelectedOffer(res.offer)
            } else {
              setActiveTab('offers')
            }
          }).catch(() => setActiveTab('offers'))
        } else if (data?.clipId) {
          setActiveTab('clipvault')
        }
      } catch (err) {
        console.warn('Notification click handling notice:', err)
      }
    })
    return () => subscription.remove()
  }, [])

  const checkNotificationPermission = async () => {
    await NotificationService.init()
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        )
        if (!hasPermission) {
          const res = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          )
          setNotificationsBlocked(res !== PermissionsAndroid.RESULTS.GRANTED)
        } else {
          setNotificationsBlocked(false)
        }
      } catch (err) {
        console.warn('POST_NOTIFICATIONS request failed:', err)
      }
    }
  }

  const initApp = async () => {
    await ApiService.init()
    await checkNotificationPermission()
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

  // Subscribe to automatic screenshot detection events
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
    try {
      Vibration.vibrate([0, 100, 50, 150])
    } catch {}
    setCapturedEvent(event)
    setBannerVisible(true)
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)

    Animated.spring(bannerAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start()

    bannerTimerRef.current = setTimeout(() => {
      hideClipboardBanner()
    }, 4500)
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
        <ActivityIndicator size="large" color={THEME.colors.accent} />
        <Text style={styles.splashText}>RADAR</Text>
        <Text style={styles.splashSub}>Signal Intelligence & Career Engine</Text>
      </View>
    )
  }

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

      {/* Real-Time Auto-Capture Floating Notification Banner */}
      {bannerVisible && capturedEvent && (
        <Animated.View
          style={[
            styles.clipboardBanner,
            { transform: [{ translateY: bannerAnim }] },
          ]}
        >
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconBox}>
              <Text style={styles.bannerIconBadgeText}>
                {capturedEvent.isScreenshot ? 'OCR' : (capturedEvent.isJobOffer ? 'JOB' : 'CLIP')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {capturedEvent.isScreenshot
                  ? (capturedEvent.isJobOffer ? 'Screenshot Job Offer Detected' : 'Screenshot OCR Ingested')
                  : (capturedEvent.isJobOffer ? 'Job Offer Captured' : 'Clip Saved to Vault')}
              </Text>
              <Text style={styles.bannerSnippet} numberOfLines={1}>
                {capturedEvent.clip?.title || (capturedEvent.rawText?.slice(0, 45) + '...') || 'Processed via Local OCR'}
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

      {/* System Notifications Blocked Banner */}
      {notificationsBlocked && (
        <TouchableOpacity
          style={styles.blockedAlertBar}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.8}
        >
          <View style={styles.blockedAlertLeft}>
            <View style={styles.blockedIconBadge}>
              <Text style={styles.blockedIconText}>!</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockedAlertTitle}>
                Notifications are blocked
              </Text>
              <Text style={styles.blockedAlertSubtitle}>
                Enable notifications in Android Settings for background screenshot & clip alerts.
              </Text>
            </View>
          </View>
          <View style={styles.blockedAlertBtn}>
            <Text style={styles.blockedAlertBtnText}>Enable →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Screen Body */}
      <View style={styles.mainContainer}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            onNavigateTab={setActiveTab}
            onSelectOffer={handleSelectOffer}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesScreen
            onSelectCategory={(catId, catTitle) => {
              setSelectedCategory({ id: catId, title: catTitle })
              setActiveTab('offers')
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'search' && (
          <SearchScreen
            onSelectOffer={handleSelectOffer}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'scraper' && (
          <ScraperScreen
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
            categoryFilter={selectedCategory}
            onBackCategory={() => {
              setSelectedCategory(null)
              setActiveTab('categories')
            }}
          />
        )}

        {activeTab === 'clipvault' && (
          <ClipVaultScreen
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'agent' && (
          <AgentScreen
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

      {/* Modern Floating Dock Navigation matching Reference Template & RADAR Logo */}
      <View style={styles.floatingDockContainer}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
              HOME
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'categories' && styles.navItemActive]}
            onPress={() => setActiveTab('categories')}
            activeOpacity={0.8}
          >
            <Text style={[styles.navLabel, activeTab === 'categories' && styles.navLabelActive]}>
              DOMAINS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'offers' && styles.navItemActive]}
            onPress={() => {
              setSelectedCategory(null)
              setActiveTab('offers')
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.navLabel, activeTab === 'offers' && styles.navLabelActive]}>
              JOBS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'scraper' && styles.navItemActive]}
            onPress={() => setActiveTab('scraper')}
            activeOpacity={0.8}
          >
            <Text style={[styles.navLabel, activeTab === 'scraper' && styles.navLabelActive]}>
              HUNT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'clipvault' && styles.navItemActive]}
            onPress={() => setActiveTab('clipvault')}
            activeOpacity={0.8}
          >
            <Text style={[styles.navLabel, activeTab === 'clipvault' && styles.navLabelActive]}>
              VAULT
            </Text>
          </TouchableOpacity>

          {/* Prominent Circular Action Button in Signature RADAR Crimson Red */}
          <TouchableOpacity
            style={[styles.navActionBtn, activeTab === 'search' && styles.navActionBtnActive]}
            onPress={() => setActiveTab('search')}
            activeOpacity={0.85}
          >
            <Text style={styles.navActionBtnText}>Q</Text>
          </TouchableOpacity>
        </View>
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
    gap: 12,
  },
  splashText: {
    color: THEME.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
  },
  splashSub: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
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
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 14,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  bannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  bannerSnippet: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerActionBtn: {
    backgroundColor: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerActionText: {
    color: THEME.colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerCloseBtn: {
    padding: 6,
  },
  bannerCloseText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modern Pill Dock matching Reference Template & RADAR Logo
  floatingDockContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 14 : 26,
    left: 14,
    right: 14,
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    height: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingRight: 6,
    elevation: 8,
    shadowColor: '#09090B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    height: 38,
    borderRadius: 19,
  },
  navItemActive: {
    backgroundColor: '#FFF1F0',
  },
  navLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  navLabelActive: {
    color: '#FF3B30',
    fontWeight: '900',
  },
  navActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  navActionBtnActive: {
    backgroundColor: '#09090B',
  },
  navActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  // Notifications Blocked Alert
  blockedAlertBar: {
    backgroundColor: THEME.colors.accentLight,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.accentBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockedAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  blockedAlertIcon: {
    fontSize: 18,
  },
  blockedAlertTitle: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  blockedAlertSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  blockedAlertBtn: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  blockedAlertBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
})

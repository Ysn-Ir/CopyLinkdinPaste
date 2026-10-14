import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

/**
 * Mobile System Notification Service
 * Manages native OS status bar alerts, sounds, vibrations, and notification channels.
 */

// Configure default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

class MobileNotificationService {
  constructor() {
    this.isInitialized = false
    this.hasPermission = false
  }

  async init() {
    if (this.isInitialized) return
    try {
      if (Platform.OS === 'android') {
        // High-priority channel for captures and opportunities (heads-up notification)
        await Notifications.setNotificationChannelAsync('radar-captures', {
          name: 'RADAR Opportunities & Captures',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 100, 250],
          lightColor: '#E1306C',
          sound: 'default',
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        })

        // Low-priority channel for ongoing background scanner status
        await Notifications.setNotificationChannelAsync('radar-background', {
          name: 'RADAR Background Service',
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
          enableVibrate: false,
          showBadge: false,
        })
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      })
      this.hasPermission = status === 'granted'
      this.isInitialized = true
    } catch (err) {
      console.warn('MobileNotificationService init error:', err)
    }
  }

  /**
   * Fires an immediate native Android/iOS system notification
   * Visible in the system notification shade even if app is backgrounded or device is locked.
   */
  async sendCaptureNotification({ title, body, data = {}, isOffer = false }) {
    try {
      if (!this.isInitialized) {
        await this.init()
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || (isOffer ? '🎯 RADAR: Opportunity Detected!' : '⚡ RADAR: New Clip Captured'),
          body: body || 'Saved to your RADAR Vault.',
          data: {
            ...data,
            timestamp: Date.now(),
          },
          sound: true,
          badge: 1,
          channelId: 'radar-captures',
        },
        trigger: null, // null means trigger immediately
      })
    } catch (err) {
      console.warn('Failed to schedule native notification:', err)
    }
  }
}

export const NotificationService = new MobileNotificationService()

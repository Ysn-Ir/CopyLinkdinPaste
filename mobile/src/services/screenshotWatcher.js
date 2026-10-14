import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { ApiService } from './api'

const STORAGE_KEY = '@omnihunt_processed_screenshot_ids'
const MAX_PROCESSED_IDS = 150

class ScreenshotWatcherService {
  constructor() {
    this.processedIds = new Set()
    this.listeners = new Set()
    this.intervalId = null
    this.appStateSubscription = null
    this.isProcessing = false
    this.isInitialized = false
    this.hasPermission = false
    this.appState = AppState.currentState
    this.startupTimestamp = Date.now()
  }

  async init() {
    if (this.isInitialized) return
    try {
      // Load previously processed IDs from storage
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => this.processedIds.add(id))
        }
      }

      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync()
      this.hasPermission = status === 'granted'

      if (this.hasPermission) {
        // Record only screenshots older than 6 minutes at startup
        const { assets } = await this.getScreenshotAssets(5)
        if (assets && assets.length > 0) {
          const now = Date.now()
          assets.forEach((a) => {
            const timeMs = this.getAssetTimestampMs(a)
            // If it was taken more than 6 minutes before app start, mark as seen
            if (now - timeMs > 6 * 60 * 1000) {
              this.processedIds.add(a.id)
            }
          })
        }
      }
    } catch (e) {
      console.warn('ScreenshotWatcher init notice:', e)
    }
    this.isInitialized = true
  }

  getAssetTimestampMs(asset) {
    if (!asset || !asset.creationTime) return Date.now()
    let time = asset.creationTime
    // On Android, MediaStore DATE_ADDED is in seconds (e.g. 1.74e9)
    // Date.now() is in milliseconds (e.g. 1.74e12)
    if (time < 1e11) {
      time = time * 1000
    }
    return time
  }

  async persistProcessedIds() {
    try {
      const arr = Array.from(this.processedIds).slice(-MAX_PROCESSED_IDS)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    } catch {}
  }

  start(intervalMs = 2500) {
    if (this.intervalId) return

    this.appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      // Whenever app is brought to foreground (e.g. user took screenshot in another app and switched back)
      if (this.appState.match(/inactive|background/) && nextState === 'active') {
        await this.checkAndProcessScreenshot()
      }
      this.appState = nextState
    })

    this.intervalId = setInterval(() => {
      if (this.appState === 'active') {
        this.checkAndProcessScreenshot()
      }
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove()
      this.appStateSubscription = null
    }
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify(event) {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('ScreenshotWatcher listener error:', err)
      }
    })
  }

  isScreenshotAsset(asset) {
    if (!asset) return false
    const filename = (asset.filename || '').toLowerCase()
    const uri = (asset.uri || '').toLowerCase()

    return (
      filename.includes('screenshot') ||
      filename.includes('screen_shot') ||
      filename.includes('capture') ||
      uri.includes('screenshot') ||
      uri.includes('dcim/screenshots') ||
      uri.includes('pictures/screenshots')
    )
  }

  async getScreenshotAssets(limit = 6) {
    try {
      // 1. Try finding dedicated Screenshots album on Android / iOS
      const albums = await MediaLibrary.getAlbumsAsync()
      const screenshotAlbum = albums.find(
        (a) => /screenshot/i.test(a.title) || /capture/i.test(a.title) || a.title === 'Screenshots'
      )

      if (screenshotAlbum) {
        const res = await MediaLibrary.getAssetsAsync({
          album: screenshotAlbum,
          sortBy: ['creationTime'],
          first: limit,
        })
        if (res?.assets && res.assets.length > 0) {
          return { assets: res.assets, isFromScreenshotAlbum: true }
        }
      }

      // 2. Fallback to newest photos across device gallery
      const general = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: limit,
      })
      return { assets: general?.assets || [], isFromScreenshotAlbum: false }
    } catch (e) {
      console.warn('getScreenshotAssets notice:', e)
      return { assets: [], isFromScreenshotAlbum: false }
    }
  }

  async checkAndProcessScreenshot() {
    if (this.isProcessing || !this.hasPermission) return

    this.isProcessing = true
    try {
      const { assets, isFromScreenshotAlbum } = await this.getScreenshotAssets(4)
      if (!assets || assets.length === 0) return

      for (const asset of assets) {
        if (this.processedIds.has(asset.id)) continue

        const timeMs = this.getAssetTimestampMs(asset)
        const ageMs = Date.now() - timeMs
        // Check if taken within the last 5 minutes
        const isRecent = ageMs >= -30000 && ageMs < 5 * 60 * 1000
        const isScreenshot = isFromScreenshotAlbum || this.isScreenshotAsset(asset)

        if (isRecent && isScreenshot) {
          this.processedIds.add(asset.id)
          await this.persistProcessedIds()

          await this.processAsset(asset)
          break // Process one screenshot at a time
        } else if (!isScreenshot) {
          this.processedIds.add(asset.id)
        }
      }
    } catch (err) {
      console.warn('ScreenshotWatcher check error:', err)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 1-Tap instant scanner: scans the newest screenshot in the device gallery with zero manual file picking
   */
  async scanLatestScreenshot({ force = false } = {}) {
    if (!this.hasPermission) {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      this.hasPermission = status === 'granted'
      if (!this.hasPermission) {
        return { success: false, error: 'Photo library permission required' }
      }
    }

    try {
      const { assets } = await this.getScreenshotAssets(3)
      if (!assets || assets.length === 0) {
        return { success: false, error: 'No screenshots found in your photo gallery' }
      }

      const newest = assets[0]
      if (!force && this.processedIds.has(newest.id)) {
        return { success: false, isAlreadyProcessed: true, error: 'Newest screenshot was already analyzed' }
      }

      this.processedIds.add(newest.id)
      await this.persistProcessedIds()

      return await this.processAsset(newest)
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async processAsset(asset) {
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (!base64 || base64.length < 50) {
        return { success: false, error: 'Could not read image file' }
      }

      const ingestRes = await ApiService.ocrIngestClip({
        imageBase64: base64,
        sourceDevice: 'mobile',
      })

      if (ingestRes && ingestRes.success) {
        this.notify({
          success: true,
          isScreenshot: true,
          clip: ingestRes.clip,
          isJobOffer: ingestRes.isJobOffer,
          offer: ingestRes.offer,
          assetUri: asset.uri,
        })
      }
      return ingestRes
    } catch (err) {
      console.error('Error processing asset:', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Directly processes a shared screenshot image URI (e.g. from Android Share Sheet)
   */
  async processImageUri(uri) {
    if (!uri) return { success: false, error: 'Empty URI' }
    return await this.processAsset({ uri })
  }
}

export const ScreenshotWatcher = new ScreenshotWatcherService()


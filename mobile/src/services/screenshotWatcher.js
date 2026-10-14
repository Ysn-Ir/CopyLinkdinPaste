import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { ApiService } from './api'

const STORAGE_KEY = '@omnihunt_processed_screenshot_ids'
const MAX_PROCESSED_IDS = 100

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
        // Record newest asset at startup so we don't process historical photos
        const initial = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          sortBy: ['creationTime'],
          first: 3,
        })
        if (initial?.assets) {
          initial.assets.forEach((a) => this.processedIds.add(a.id))
        }
      }
    } catch (e) {
      console.warn('ScreenshotWatcher init notice:', e)
    }
    this.isInitialized = true
  }

  async persistProcessedIds() {
    try {
      const arr = Array.from(this.processedIds).slice(-MAX_PROCESSED_IDS)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    } catch {}
  }

  start(intervalMs = 3000) {
    if (this.intervalId) return

    this.appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      // Whenever app is brought to foreground, immediately check for new screenshots taken outside the app
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

    // Standard Android and iOS screenshot indicators
    return (
      filename.includes('screenshot') ||
      filename.includes('screen_shot') ||
      filename.includes('capture') ||
      uri.includes('screenshot') ||
      uri.includes('dcim/screenshots') ||
      uri.includes('pictures/screenshots')
    )
  }

  async checkAndProcessScreenshot() {
    if (this.isProcessing || !this.hasPermission) return

    this.isProcessing = true
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: 3,
      })

      if (!result?.assets || result.assets.length === 0) {
        this.isProcessing = false
        return
      }

      for (const asset of result.assets) {
        // Skip already processed assets
        if (this.processedIds.has(asset.id)) continue

        // Check if taken after startup or within the last 3 minutes
        const assetAge = Date.now() - (asset.creationTime || Date.now())
        const isRecent = assetAge < 3 * 60 * 1000

        if (isRecent && this.isScreenshotAsset(asset)) {
          // Immediately mark ID to prevent duplicate concurrent OCR runs
          this.processedIds.add(asset.id)
          await this.persistProcessedIds()

          // Read image as base64
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          if (base64 && base64.length > 50) {
            const ingestRes = await ApiService.ocrIngestClip({
              imageBase64: base64,
              sourceDevice: 'mobile',
            })

            if (ingestRes.success) {
              this.notify({
                success: true,
                isScreenshot: true,
                clip: ingestRes.clip,
                isJobOffer: ingestRes.isJobOffer,
                offer: ingestRes.offer,
                assetUri: asset.uri,
              })
            }
          }
        } else {
          // Mark as seen so we don't re-examine normal camera photos
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
   * Directly processes a shared screenshot image URI (e.g. from Android Share Sheet)
   */
  async processImageUri(uri) {
    if (!uri) return { success: false, error: 'Empty URI' }

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (!base64) return { success: false, error: 'Could not read image file' }

      const res = await ApiService.ocrIngestClip({
        imageBase64: base64,
        sourceDevice: 'mobile',
      })

      if (res.success) {
        this.notify({
          success: true,
          isScreenshot: true,
          clip: res.clip,
          isJobOffer: res.isJobOffer,
          offer: res.offer,
          assetUri: uri,
        })
      }
      return res
    } catch (err) {
      console.error('Error processing shared screenshot URI:', err)
      return { success: false, error: err.message }
    }
  }
}

export const ScreenshotWatcher = new ScreenshotWatcherService()

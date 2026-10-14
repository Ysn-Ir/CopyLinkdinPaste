import * as Clipboard from 'expo-clipboard'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { ApiService } from './api'
import { NotificationService } from './notificationService'

const STORAGE_KEY = '@radar_ingested_hashes'
const MAX_STORED_HASHES = 150

class ClipboardWatcherService {
  constructor() {
    this.ingestedHashes = new Set()
    this.listeners = new Set()
    this.intervalId = null
    this.appStateSubscription = null
    this.isProcessing = false
    this.isInitialized = false
    this.appState = AppState.currentState
  }

  computeHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return hash.toString(36)
  }

  async init() {
    if (this.isInitialized) return
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          parsed.forEach((h) => this.ingestedHashes.add(h))
        }
      }

      // Also hash whatever is CURRENTLY in the clipboard at startup
      // so opening the app doesn't accidentally re-ingest whatever was already there
      const hasStr = await Clipboard.hasStringAsync()
      if (hasStr) {
        const text = await Clipboard.getStringAsync()
        if (text && text.trim().length >= 6) {
          const startupHash = this.computeHash(text.trim())
          this.ingestedHashes.add(startupHash)
        }
      }
    } catch {
      // ignore storage errors
    }
    this.isInitialized = true
  }

  async persistHashes() {
    try {
      const arr = Array.from(this.ingestedHashes).slice(-MAX_STORED_HASHES)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    } catch {
      // ignore
    }
  }

  start(intervalMs = 2000) {
    if (this.intervalId) return

    this.appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (this.appState.match(/inactive|background/) && nextState === 'active') {
        await this.checkAndIngest()
      }
      this.appState = nextState
    })

    this.intervalId = setInterval(() => {
      if (this.appState === 'active') {
        this.checkAndIngest()
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
      } catch (e) {
        console.warn('[ClipboardWatcher] listener error:', e)
      }
    })
  }

  async checkAndIngest() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const hasString = await Clipboard.hasStringAsync()
      if (!hasString) return

      const text = await Clipboard.getStringAsync()
      if (!text || text.trim().length < 6) return

      const trimmed = text.trim()
      const hash = this.computeHash(trimmed)

      // Strict Deduplication Check: NEVER re-ingest an already seen hash
      if (this.ingestedHashes.has(hash)) {
        return
      }

      // Mark hash immediately before network request to prevent concurrent runs
      this.ingestedHashes.add(hash)
      await this.persistHashes()

      // Determine source domain
      let sourceDomain = 'clipboard'
      const urlMatch = trimmed.match(/https?:\/\/([^\s/]+)/)
      if (urlMatch) sourceDomain = urlMatch[1].replace('www.', '')

      // Automatically ingest to backend
      const res = await ApiService.ingestClip({
        content: trimmed,
        sourceDomain,
        sourceDevice: 'mobile',
        sourceUrl: /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : '',
      })

      if (res && res.success) {
        const isJobOffer = Boolean(res.isJobOffer && res.offer)

        // Fire native Android/iOS system notification
        NotificationService.sendCaptureNotification({
          title: isJobOffer
            ? `🎯 RADAR: ${res.offer.title} @ ${res.offer.company || 'Company'}`
            : '📋 RADAR: Copied Link Captured',
          body: isJobOffer
            ? `Match: ${Math.round((res.offer.confidence || 0.92) * 100)}% • ${res.offer.location || 'Remote'}`
            : (res.clip?.title || 'Saved to your RADAR Vault.'),
          data: {
            clipId: res.clip?.id,
            offerId: res.offer?.id,
            isJobOffer,
          },
          isOffer: isJobOffer,
        })

        this.notify({
          success: true,
          clip: res.clip,
          isJobOffer,
          offer: res.offer,
          channel: res.channel,
          isDuplicate: Boolean(res.isDuplicate),
          rawText: trimmed,
        })
      }
    } catch (err) {
      console.warn('[ClipboardWatcher] auto ingest error:', err)
    } finally {
      this.isProcessing = false
    }
  }

  /** Reset all stored hashes if user wants to clear memory */
  async clearHistory() {
    this.ingestedHashes.clear()
    await AsyncStorage.removeItem(STORAGE_KEY)
  }
}

export const ClipboardWatcher = new ClipboardWatcherService()

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY_SERVER_URL = '@pfe_hunter_server_url'
const STORAGE_KEY_CACHED_OFFERS = '@pfe_hunter_cached_offers'
const DEFAULT_SERVER_URL = 'http://192.168.1.12:8003'

let currentServerUrl = DEFAULT_SERVER_URL

export const ApiService = {
  /**
   * Initializes and loads the stored server URL from device storage
   */
  async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL)
      if (saved && saved.startsWith('http')) {
        currentServerUrl = saved.replace(/\/+$/, '')
      } else {
        currentServerUrl = DEFAULT_SERVER_URL
      }
    } catch {
      currentServerUrl = DEFAULT_SERVER_URL
    }
    return currentServerUrl
  },

  getServerUrl() {
    return currentServerUrl
  },

  async setServerUrl(url) {
    if (!url) return
    let clean = url.trim().replace(/\/+$/, '')
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`
    }
    currentServerUrl = clean
    await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, clean)
    return clean
  },

  /**
   * Tests network ping and returns pairing metadata
   */
  async testConnection(targetUrl = null) {
    const base = (targetUrl || currentServerUrl).replace(/\/+$/, '')
    const url = `${base}/api/mobile/pairing`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      })
      clearTimeout(timer)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      return { success: true, data }
    } catch (err) {
      clearTimeout(timer)
      return { success: false, error: err.message || 'Server unreachable on this network' }
    }
  },

  /**
   * Fetches the current list of job offers
   */
  async getOffers({ category = 'all', status = 'all', search = '' } = {}) {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.append('category', category)
    if (status && status !== 'all') params.append('status', status)
    if (search) params.append('search', search)

    const url = `${currentServerUrl}/api/offers?${params.toString()}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const offers = await res.json()
      // Cache offers offline
      AsyncStorage.setItem(STORAGE_KEY_CACHED_OFFERS, JSON.stringify(offers)).catch(() => {})
      return { success: true, offers }
    } catch (err) {
      // Return cached offers if offline
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_OFFERS)
        if (cached) {
          return { success: true, offers: JSON.parse(cached), isOffline: true }
        }
      } catch {}
      return { success: false, error: err.message, offers: [] }
    }
  },

  /**
   * 1-Tap status update (pipeline stage progression)
   */
  async updateOfferStatus(offerId, newStatus) {
    const url = `${currentServerUrl}/api/offers/${offerId}/status`
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, offer: data.offer }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Captures clipboard post / URL and extracts entities via PC backend Groq LLM
   */
  async ingestPost({ rawText = '', sourceUrl = '' }) {
    const url = `${currentServerUrl}/api/mobile/ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sourceUrl }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, offer: data.offer, message: data.message }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Fetches active categories/domains
   */
  async getCategories() {
    const url = `${currentServerUrl}/api/categories`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const categories = await res.json()
      return { success: true, categories }
    } catch (err) {
      return { success: false, categories: [] }
    }
  },

  /**
   * Fetches user profile for contact information
   */
  async getProfile() {
    const url = `${currentServerUrl}/api/profile`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const profile = await res.json()
      return { success: true, profile }
    } catch (err) {
      return { success: false, profile: null }
    }
  },
}

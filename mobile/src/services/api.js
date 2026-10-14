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
   * Tests network ping and returns pairing metadata.
   * If target is unreachable and none specified, attempts local candidates.
   */
  async testConnection(targetUrl = null) {
    const candidates = targetUrl
      ? [targetUrl]
      : [currentServerUrl, 'http://192.168.1.12:8003', 'http://100.89.108.117:8003', 'http://10.0.2.2:8003']

    for (const cand of candidates) {
      const base = cand.replace(/\/+$/, '')
      const url = `${base}/api/mobile/pairing`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timer)
        if (res.ok) {
          const data = await res.json()
          currentServerUrl = base
          await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, base)
          return { success: true, data, url: base }
        }
      } catch (err) {
        clearTimeout(timer)
      }
    }

    return {
      success: false,
      error: `Could not connect to PC at ${targetUrl || currentServerUrl}. Ensure phone is connected to the same Wi-Fi and FastAPI server is running.`,
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

  // ==================================================================
  // UNIVERSAL CLIP VAULT
  // ==================================================================

  /**
   * Fetches clips from the universal clipboard vault
   */
  async getClips({ contentType, domain, search, starred } = {}) {
    const params = new URLSearchParams()
    if (contentType && contentType !== 'all') params.append('content_type', contentType)
    if (domain && domain !== 'all') params.append('domain', domain)
    if (search) params.append('search', search)
    if (starred) params.append('starred', 'true')

    const url = `${currentServerUrl}/api/clips?${params.toString()}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const clips = await res.json()
      return { success: true, clips }
    } catch (err) {
      return { success: false, clips: [], error: err.message }
    }
  },

  /**
   * Ingests a new clipboard clip for AI classification
   */
  async ingestClip({ content, sourceUrl = '', sourceDomain = '', sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          sourceUrl,
          sourceDomain,
          sourceDevice,
          copiedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, clip: data.clip, isJobOffer: data.isJobOffer, offer: data.offer }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Toggles star status on a clip
   */
  async starClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/star`
    try {
      const res = await fetch(url, { method: 'PATCH' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, isStarred: data.isStarred }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Deletes a clip
   */
  async deleteClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}`
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Converts a generic clip into a full PFE Hunter job offer
   */
  async convertClipToOffer(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/convert-to-offer`
    try {
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, offer: data.offer }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Syncs all job clips from vault into the offers pipeline
   */
  async syncAllClips() {
    const url = `${currentServerUrl}/api/clips/sync-all`
    try {
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message, syncedCount: 0 }
    }
  },

  /**
   * Ingests a screenshot via Groq Vision OCR
   */
  async ocrIngestClip({ imageBase64, sourceUrl = '', sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/ocr-ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          sourceUrl,
          sourceDevice,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, clip: data.clip, isJobOffer: data.isJobOffer, offer: data.offer }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Bulk ingest messy text / list of links independently
   */
  async bulkIngestClips({ rawText = '', urls = [], sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/bulk-ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, urls, sourceDevice }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message, count: 0, clips: [] }
    }
  },

  /**
   * Deep enrich clip: re-fetches metadata and generates rich takeaways via Groq
   */
  async enrichClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/enrich`
    try {
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Conversational AI Agent powered by Groq LLM
   */
  async chatAgent(messages) {
    const url = `${currentServerUrl}/api/ai/chat`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}


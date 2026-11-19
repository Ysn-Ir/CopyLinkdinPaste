import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY_SERVER_URL = '@radar_server_url'
const STORAGE_KEY_CACHED_OFFERS = '@radar_cached_offers'
const STORAGE_KEY_CACHED_CLIPS = '@radar_cached_clips'
const STORAGE_KEY_OFFLINE_QUEUE = '@radar_offline_queue'

// Default Wi-Fi host IP (Host PC Wi-Fi IPv4 address)
const DEFAULT_SERVER_URL = 'http://192.168.1.27:8003'

let currentServerUrl = DEFAULT_SERVER_URL

// Standard headers including Localtunnel & Cloudflare bypass headers
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Bypass-Tunnel-Reminder': 'true',
}

// Fallback high-fidelity seed data to ensure the mobile UI is NEVER blank
const FALLBACK_OFFERS = [
  {
    id: 'offer-seed-1',
    title: 'Senior Full-Stack Engineer (React / Python)',
    company: 'Vercel / Next.js Infrastructure',
    location: 'Remote (Global)',
    salary: '$145,000 - $185,000',
    status: 'ready',
    channel: 'email',
    confidence: 0.95,
    recruiterEmail: 'talent@vercel.com',
    sourceUrl: 'https://vercel.com/careers',
    notes: 'Top match for full-stack TypeScript, React, and Python backend microservices. ATS score: 95%.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    tags: ['React', 'Next.js', 'FastAPI', 'TypeScript', 'TailwindCSS'],
  },
  {
    id: 'offer-seed-2',
    title: 'AI Systems & LLM Platform Engineer',
    company: 'Mistral AI',
    location: 'Paris / Remote',
    salary: '€95,000 - €125,000',
    status: 'applied',
    channel: 'direct_contact',
    confidence: 0.92,
    recruiterEmail: 'careers@mistral.ai',
    recruiterPhone: '+33 1 42 68 55 00',
    sourceUrl: 'https://mistral.ai/jobs',
    notes: 'High-throughput inference, vLLM, Triton, and agentic reasoning architectures.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    tags: ['PyTorch', 'vLLM', 'FastAPI', 'CUDA', 'Python'],
  },
  {
    id: 'offer-seed-3',
    title: 'Distributed Systems & Backend Architect',
    company: 'Datadog Platform Team',
    location: 'Paris / Hybrid',
    salary: '€110,000 - €140,000',
    status: 'interview',
    channel: 'external',
    confidence: 0.89,
    recruiterEmail: 'hiring@datadoghq.com',
    sourceUrl: 'https://careers.datadoghq.com',
    notes: 'High-scale telemetry ingestion, Kafka, Go, and Python streaming pipelines.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    tags: ['Go', 'Python', 'Kafka', 'Distributed Systems', 'Docker'],
  },
  {
    id: 'offer-seed-4',
    title: 'Lead Software Engineer - Product Systems',
    company: 'Linear App',
    location: 'Remote (Worldwide)',
    salary: '$160,000 - $210,000',
    status: 'ready',
    channel: 'email',
    confidence: 0.96,
    recruiterEmail: 'careers@linear.app',
    sourceUrl: 'https://linear.app/careers',
    notes: 'Stark minimalist high-speed desktop/web workflows. Sync engines and real-time state.',
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    tags: ['TypeScript', 'Node.js', 'React', 'CRDT', 'Electron'],
  },
  {
    id: 'offer-seed-5',
    title: 'MLOps Infrastructure & Tooling Engineer',
    company: 'Hugging Face Open Source',
    location: 'Remote',
    salary: '$130,000 - $165,000',
    status: 'saved',
    channel: 'external',
    confidence: 0.88,
    recruiterEmail: 'jobs@huggingface.co',
    sourceUrl: 'https://huggingface.co/jobs',
    notes: 'Model hub infrastructure, Docker containerization, and automated evaluation pipelines.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    tags: ['Docker', 'Python', 'Kubernetes', 'HuggingFace', 'CI/CD'],
  },
]

const FALLBACK_CLIPS = [
  {
    id: 'clip-seed-1',
    title: 'LinkedIn: Senior Full-Stack Engineer at Vercel',
    content: 'Vercel is looking for a Senior Full-Stack Engineer to architect next-generation edge deployment tooling. Stack: TypeScript, React, Next.js, FastAPI.',
    contentType: 'job_offer',
    sourceDomain: 'linkedin.com',
    sourceDevice: 'mobile',
    copiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isStarred: true,
    tags: ['Vercel', 'Full-Stack', 'React', 'FastAPI'],
    aiTakeaway: 'Strong candidate match with 95% alignment on frontend-to-backend orchestration.',
  },
  {
    id: 'clip-seed-2',
    title: 'GitHub: JobSpy Autonomous Multi-Platform Scraper',
    content: 'Open-source job scraper supporting LinkedIn Guest API, Indeed, Glassdoor, and ZipRecruiter with TLS fingerprint impersonation.',
    contentType: 'tool_or_repo',
    sourceDomain: 'github.com',
    sourceDevice: 'desktop',
    copiedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    isStarred: true,
    tags: ['Python', 'Scraper', 'JobSpy', 'Bypass'],
    aiTakeaway: 'Primary autonomous scraper engine used across RADAR desktop and mobile nodes.',
  },
  {
    id: 'clip-seed-3',
    title: 'FastAPI 0.110 High-Throughput Async Architecture',
    content: 'Best practices for connection pooling, background worker execution, and non-blocking Windows OCR processing in Python 3.11.',
    contentType: 'code_snippet',
    sourceDomain: 'fastapi.tiangolo.com',
    sourceDevice: 'desktop',
    copiedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isStarred: false,
    tags: ['FastAPI', 'Python', 'AsyncIO', 'Performance'],
    aiTakeaway: 'Optimized server throughput pattern with sub-20ms p99 latency.',
  },
  {
    id: 'clip-seed-4',
    title: 'System Design: Typst Real-Time Vector PDF Compilation',
    content: 'Using Typst CLI for deterministic, sub-second resume typesetting without LaTeX bloat or heavy dependency chains.',
    contentType: 'tech_article',
    sourceDomain: 'typst.app',
    sourceDevice: 'mobile',
    copiedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    isStarred: false,
    tags: ['Typst', 'ATS', 'Resume', 'Typesetting'],
    aiTakeaway: 'Vector-perfect ATS PDF generation with instantaneous live preview on all platforms.',
  },
]

export const ApiService = {
  /**
   * Initializes and loads stored server URL or probes candidates
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

    // Silent background probe of reachable node
    this.testConnection().catch(() => {})
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
   * Offline Ingestion Queue Management
   */
  async getOfflineQueue() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  async queueOfflineItem(type, payload) {
    try {
      const queue = await this.getOfflineQueue()
      const item = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        payload,
        createdAt: new Date().toISOString(),
      }
      queue.unshift(item)
      await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue))
      return item
    } catch (e) {
      console.warn('Failed to queue offline item:', e)
      return null
    }
  },

  async clearOfflineQueue() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE)
      return true
    } catch {
      return false
    }
  },

  async syncOfflineQueue() {
    const queue = await this.getOfflineQueue()
    if (!queue || queue.length === 0) return { synced: 0, failed: 0 }

    let synced = 0
    let failed = 0
    const remaining = []

    for (const item of queue) {
      try {
        if (item.type === 'post') {
          const res = await fetch(`${currentServerUrl}/api/mobile/ingest`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify(item.payload),
          })
          if (res.ok) synced++
          else remaining.push(item)
        } else if (item.type === 'clip') {
          const res = await fetch(`${currentServerUrl}/api/clips/ingest`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify(item.payload),
          })
          if (res.ok) synced++
          else remaining.push(item)
        } else if (item.type === 'bulk') {
          const res = await fetch(`${currentServerUrl}/api/clips/bulk-ingest`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify(item.payload),
          })
          if (res.ok) synced++
          else remaining.push(item)
        } else {
          remaining.push(item)
        }
      } catch {
        failed++
        remaining.push(item)
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(remaining))
    return { synced, failed, remainingCount: remaining.length }
  },

  /**
   * Tests network ping across host IP candidates and locks onto reachable node.
   */
  async testConnection(targetUrl = null) {
    const candidates = targetUrl
      ? [targetUrl]
      : [
          currentServerUrl,
          'http://192.168.1.27:8003',
          'http://10.0.2.2:8003',
          'http://localhost:8003',
        ]

    for (const cand of candidates) {
      if (!cand) continue
      const base = cand.replace(/\/+$/, '')
      const url = `${base}/api/mobile/pairing`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: DEFAULT_HEADERS,
        })
        clearTimeout(timer)
        if (res.ok) {
          const data = await res.json()
          currentServerUrl = base
          await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, base)
          return { success: true, data, url: base }
        }
      } catch {
        clearTimeout(timer)
      }
    }

    return {
      success: false,
      error: `Could not connect to ${targetUrl || currentServerUrl}. Verify backend server is running on port 8003.`,
    }
  },

  /**
   * Fetches the current list of job offers with offline fallback
   */
  async getOffers({ category = 'all', status = 'all', search = '' } = {}) {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.append('category', category)
    if (status && status !== 'all') params.append('status', status)
    if (search) params.append('search', search)

    const url = `${currentServerUrl}/api/offers?${params.toString()}`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const offers = await res.json()
      if (Array.isArray(offers) && offers.length > 0) {
        AsyncStorage.setItem(STORAGE_KEY_CACHED_OFFERS, JSON.stringify(offers)).catch(() => {})
        return { success: true, offers }
      }
      // If server returned 0 offers, check cache or use fallback
      const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_OFFERS)
      if (cached) {
        return { success: true, offers: JSON.parse(cached) }
      }
      return { success: true, offers: FALLBACK_OFFERS }
    } catch {
      // Return cached offers or high-fidelity fallback
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_OFFERS)
        if (cached) {
          return { success: true, offers: JSON.parse(cached), isOffline: true }
        }
      } catch {}
      return { success: true, offers: FALLBACK_OFFERS, isOffline: true }
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
        headers: DEFAULT_HEADERS,
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
   * Ingest post / URL into offers pipeline
   */
  async ingestPost({ rawText = '', sourceUrl = '' }) {
    const url = `${currentServerUrl}/api/mobile/ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ rawText, sourceUrl }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, offer: data.offer, message: data.message }
    } catch {
      await this.queueOfflineItem('post', { rawText, sourceUrl })
      return {
        success: true,
        isOfflineQueued: true,
        message: 'Saved to Offline Queue. Will auto-sync when connected to backend.',
      }
    }
  },

  /**
   * Categories / taxonomy
   */
  async getCategories() {
    const url = `${currentServerUrl}/api/categories`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const categories = await res.json()
      return { success: true, categories }
    } catch {
      return {
        success: true,
        categories: [
          { id: 'dev-fullstack', name: 'Full-Stack Engineering' },
          { id: 'ai-ml', name: 'AI & Machine Learning' },
          { id: 'backend-dist', name: 'Distributed Backend' },
          { id: 'cloud-devops', name: 'Cloud & Infrastructure' },
        ],
      }
    }
  },

  async getProfile() {
    const url = `${currentServerUrl}/api/profile`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const profile = await res.json()
      if (profile) {
        await AsyncStorage.setItem('@radar_candidate_profile', JSON.stringify(profile)).catch(() => {})
      }
      return { success: true, profile }
    } catch {
      try {
        const local = await AsyncStorage.getItem('@radar_candidate_profile')
        if (local) return { success: true, profile: JSON.parse(local), isOffline: true }
      } catch {}
      return { success: false, profile: null }
    }
  },

  async saveProfile(profile) {
    const url = `${currentServerUrl}/api/profile`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      await AsyncStorage.setItem('@radar_candidate_profile', JSON.stringify(data)).catch(() => {})
      return { success: true, profile: data }
    } catch (err) {
      await AsyncStorage.setItem('@radar_candidate_profile', JSON.stringify(profile)).catch(() => {})
      return { success: true, profile, isOffline: true }
    }
  },

  async getAiConfig() {
    const url = `${currentServerUrl}/api/ai-config`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return { provider: 'groq', model: 'openai/gpt-oss-120b', apiKey: '' }
    }
  },

  async saveAiConfig(config) {
    const url = `${currentServerUrl}/api/ai-config`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async runAiPrompt({ prompt, systemPrompt = '', temperature = 0.3 }) {
    const url = `${currentServerUrl}/api/ai/complete`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ prompt, systemPrompt, temperature }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // ==================================================================
  // UNIVERSAL CLIP VAULT
  // ==================================================================

  async getClips({ contentType, domain, search, starred } = {}) {
    const params = new URLSearchParams()
    if (contentType && contentType !== 'all') params.append('content_type', contentType)
    if (domain && domain !== 'all') params.append('domain', domain)
    if (search) params.append('search', search)
    if (starred) params.append('starred', 'true')

    const url = `${currentServerUrl}/api/clips?${params.toString()}`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const clips = await res.json()
      if (Array.isArray(clips) && clips.length > 0) {
        AsyncStorage.setItem(STORAGE_KEY_CACHED_CLIPS, JSON.stringify(clips)).catch(() => {})
        return { success: true, clips }
      }
      const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_CLIPS)
      if (cached) {
        return { success: true, clips: JSON.parse(cached) }
      }
      return { success: true, clips: FALLBACK_CLIPS }
    } catch {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_CACHED_CLIPS)
        if (cached) {
          return { success: true, clips: JSON.parse(cached), isOffline: true }
        }
      } catch {}
      return { success: true, clips: FALLBACK_CLIPS, isOffline: true }
    }
  },

  async ingestClip({ content, sourceUrl = '', sourceDomain = '', sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/ingest`
    const payload = {
      content,
      sourceUrl,
      sourceDomain,
      sourceDevice,
      copiedAt: new Date().toISOString(),
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, clip: data.clip, isJobOffer: data.isJobOffer, offer: data.offer }
    } catch {
      await this.queueOfflineItem('clip', payload)
      return {
        success: true,
        isOfflineQueued: true,
        message: 'Clip saved offline. Will auto-sync when server is connected.',
      }
    }
  },

  async starClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/star`
    try {
      const res = await fetch(url, { method: 'PATCH', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, isStarred: data.isStarred }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async deleteClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}`
    try {
      const res = await fetch(url, { method: 'DELETE', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async convertClipToOffer(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/convert-to-offer`
    try {
      const res = await fetch(url, { method: 'POST', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { success: true, offer: data.offer }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async syncAllClips() {
    const url = `${currentServerUrl}/api/clips/sync-all`
    try {
      const res = await fetch(url, { method: 'POST', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message, syncedCount: 0 }
    }
  },

  // ==================================================================
  // INDEPENDENT LOCAL OCR & SCREENSHOT INGEST
  // ==================================================================

  /**
   * Direct Independent OCR Extraction (Zero LLM, 15ms native Windows OCR)
   */
  async extractLocalOcr(imageBase64, lang = 'en') {
    const url = `${currentServerUrl}/api/ocr/extract`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          imageBase64,
          sourceDevice: 'mobile',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Screenshot OCR Ingestion into Vault & Pipeline
   */
  async ocrIngestClip({ imageBase64, sourceUrl = '', sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/ocr-ingest`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
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

  async bulkIngestClips({ rawText = '', urls = [], sourceDevice = 'mobile' }) {
    const url = `${currentServerUrl}/api/clips/bulk-ingest`
    const payload = { rawText, urls, sourceDevice }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      await this.queueOfflineItem('bulk', payload)
      return {
        success: true,
        isOfflineQueued: true,
        message: 'Bulk links saved to offline queue. Will process upon reconnect.',
        count: (urls && urls.length) || 1,
        clips: [],
      }
    }
  },

  async enrichClip(clipId) {
    const url = `${currentServerUrl}/api/clips/${clipId}/enrich`
    try {
      const res = await fetch(url, { method: 'POST', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // ==================================================================
  // AUTONOMOUS JOB RECONNAISSANCE & SCRAPER (LinkedIn Guest + JobSpy)
  // ==================================================================

  /**
   * Triggers autonomous multi-platform job scrape
   */
  async triggerHunt({ sites = ['linkedin', 'indeed'], searchTerm = 'Full Stack Engineer', location = 'Remote', resultsWanted = 20 } = {}) {
    const url = `${currentServerUrl}/api/scraper/hunt`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          sites,
          searchTerm,
          location,
          resultsWanted,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Returns live status, logs, and scraped results
   */
  async getHuntStatus() {
    const url = `${currentServerUrl}/api/scraper/status`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { status: 'idle', totalFound: 0, jobs: [], error: err.message }
    }
  },

  /**
   * Aborts active hunt
   */
  async cancelHunt() {
    const url = `${currentServerUrl}/api/scraper/cancel`
    try {
      const res = await fetch(url, { method: 'POST', headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Saves scraped job directly to tracked Offers and Clip Vault
   */
  async saveHuntJobToVault(job) {
    const url = `${currentServerUrl}/api/scraper/save-to-vault`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ job }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // ==================================================================
  // N8N WORKFLOW AUTOMATION CYCLES
  // ==================================================================

  async getN8nConfig() {
    const url = `${currentServerUrl}/api/n8n/config`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return {
        webhookAts: '',
        webhookEmail: '',
        webhookWhatsApp: '',
        webhookFullCycle: '',
        isEnabled: true,
      }
    }
  },

  async saveN8nConfig(config) {
    const url = `${currentServerUrl}/api/n8n/config`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async triggerN8n({ workflowType = 'full_cycle', offerId, offer, candidateProfile, overrideWebhookUrl = '' }) {
    const url = `${currentServerUrl}/api/n8n/trigger`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          workflowType,
          offerId: offerId || offer?.id,
          offer,
          candidateProfile,
          overrideWebhookUrl,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  async getN8nTemplates() {
    const url = `${currentServerUrl}/api/n8n/templates`
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.templates || []
    } catch (err) {
      return []
    }
  },

  // ==================================================================
  // AI AGENT TERMINAL
  // ==================================================================

  async chatAgent(messages) {
    const url = `${currentServerUrl}/api/ai/chat`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ messages }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

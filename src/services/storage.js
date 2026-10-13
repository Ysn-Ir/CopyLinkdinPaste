import { get, set } from 'idb-keyval'
import { INITIAL_OFFERS } from '../data/initialOffers.js'
import { EMAIL_TEMPLATES, COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories.js'

const KEYS = {
  OFFERS: 'pfe_offers_v1',
  CVS: 'pfe_cv_vault_v1',
  USER_PROFILE: 'pfe_user_profile_v1',
  CATEGORIES: 'pfe_categories_v1',
  EMAIL_TEMPLATES: 'pfe_email_templates_v1',
  COVER_TEMPLATES: 'pfe_cover_templates_v1',
  AI_CONFIG: 'pfe_ai_config_v1',
}

const DEFAULT_PROFILE = {
  fullName: 'Khalil Ingénieur PFE',
  headline: 'Élève Ingénieur en Génie Logiciel & IA',
  email: 'khalil.pfe@gmail.com',
  phone: '+33 6 12 34 56 78',
  whatsapp: '+33 6 12 34 56 78',
  linkedIn: 'https://linkedin.com/in/khalil-pfe',
  github: 'https://github.com/khalil-dev',
  portfolio: 'https://khalil.dev',
  degree: 'Master 2 / Diplôme d\'Ingénieur en Génie Logiciel & IA',
  city: 'Paris, France / Télétravail',
  skills: 'Python, PyTorch, LLMs, NLP, React, Node.js, Docker, FastAPI',
  projects: 'Agentic AI Workflows, NLP Semantic Search, PFE Application Command Center',
  tonePreference: 'Direct, confident, technical, and high-impact',
  customInstructions: 'Give maximum freedom. Prioritize NLP, Generative AI, and software engineering applications.',
  bio: 'Futur ingénieur passionné par le traitement du langage naturel, les architectures d\'agents autonomes et l\'ingénierie logicielle.',
  customLinks: [],
}

const DEFAULT_AI_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || '',
  model: 'openai/gpt-oss-120b',
  provider: 'groq',
  temperature: 0.2,
  customSystemPrompt: '',
}

const DEFAULT_CVS = [
  {
    id: 'cv-1',
    name: 'CV - AI & Machine Learning',
    category: 'ai-ml',
    fileName: 'CV_AI_ML.pdf',
    fileSize: '184 KB',
    isDefault: true,
  },
  {
    id: 'cv-2',
    name: 'CV - Software & Fullstack Dev',
    category: 'dev-fullstack',
    fileName: 'CV_Fullstack.pdf',
    fileSize: '192 KB',
    isDefault: true,
  },
  {
    id: 'cv-3',
    name: 'CV - Data Science & Analytics',
    category: 'data',
    fileName: 'CV_Data.pdf',
    fileSize: '175 KB',
    isDefault: true,
  },
  {
    id: 'cv-4',
    name: 'CV - Cloud & DevOps',
    category: 'devops-cloud',
    fileName: 'CV_Cloud.pdf',
    fileSize: '180 KB',
    isDefault: true,
  },
  {
    id: 'cv-5',
    name: 'CV - Cybersecurity',
    category: 'cybersecurity',
    fileName: 'CV_Cyber.pdf',
    fileSize: '168 KB',
    isDefault: true,
  },
]

export const StorageService = {
  /**
   * Fetches offers from SQLite backend, with IndexedDB fallback
   */
  async getOffers() {
    try {
      const res = await fetch('/api/offers', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          await set(KEYS.OFFERS, data)
          return data
        }
      }
    } catch (e) {
      // Backend unavailable, fallback to IndexedDB
    }

    try {
      const stored = await get(KEYS.OFFERS)
      if (stored && Array.isArray(stored) && stored.length > 0) return stored
      await set(KEYS.OFFERS, INITIAL_OFFERS)
      return INITIAL_OFFERS
    } catch (e) {
      return INITIAL_OFFERS
    }
  },

  /**
   * Saves all offers to SQLite backend via atomic batch endpoint + IndexedDB
   */
  async saveOffers(offers) {
    // 1. Save to IndexedDB cache
    await set(KEYS.OFFERS, offers)

    // 2. Atomic batch sync to SQLite database
    try {
      const res = await fetch('/api/offers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers }),
      })
      if (!res.ok) {
        console.warn('Backend SQLite sync response not ok:', res.status)
      }
    } catch (e) {
      console.warn('Backend SQLite sync offline fallback:', e)
    }
  },

  async saveSingleOffer(offer) {
    try {
      await fetch(`/api/offers/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer),
      })
    } catch (e) {
      // offline
    }
  },

  async deleteOffer(id) {
    try {
      await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    } catch (e) {
      // offline
    }
  },

  async getProfile() {
    try {
      const res = await fetch('/api/profile', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        if (data && data.fullName) {
          await set(KEYS.USER_PROFILE, data)
          return data
        }
      }
    } catch (e) {}

    try {
      const stored = await get(KEYS.USER_PROFILE)
      return stored || DEFAULT_PROFILE
    } catch (e) {
      return DEFAULT_PROFILE
    }
  },

  async saveProfile(profile) {
    await set(KEYS.USER_PROFILE, profile)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
    } catch (e) {}
  },

  async getCvs() {
    try {
      const res = await fetch('/api/cvs', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          await set(KEYS.CVS, data)
          return data
        }
      }
    } catch (e) {}

    try {
      const stored = await get(KEYS.CVS)
      return stored || DEFAULT_CVS
    } catch (e) {
      return DEFAULT_CVS
    }
  },

  async saveCvs(cvs) {
    await set(KEYS.CVS, cvs)
    try {
      await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cvs),
      })
    } catch (e) {}
  },

  async getAiConfig() {
    try {
      const res = await fetch('/api/ai-config', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data.apiKey === 'string') {
          await set(KEYS.AI_CONFIG, data)
          return data
        }
      }
    } catch (e) {}

    try {
      const stored = await get(KEYS.AI_CONFIG)
      return stored || DEFAULT_AI_CONFIG
    } catch (e) {
      return DEFAULT_AI_CONFIG
    }
  },

  async saveAiConfig(config) {
    await set(KEYS.AI_CONFIG, config)
    try {
      await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch (e) {}
  },

  async getCategories() {
    try {
      const res = await fetch('/api/categories', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          // Prepend 'all' pseudo-category for UI filtering
          const allOption = DEFAULT_CATEGORIES.find((c) => c.id === 'all') || {
            id: 'all',
            label: 'All Categories',
            shortLabel: 'All',
            color: '#94a3b8',
            bgColor: 'rgba(148, 163, 184, 0.1)',
            borderColor: 'rgba(148, 163, 184, 0.25)',
          }
          const fullList = [allOption, ...data.filter((c) => c.id !== 'all')]
          await set(KEYS.CATEGORIES, fullList)
          return fullList
        }
      }
    } catch (e) {}

    try {
      const stored = await get(KEYS.CATEGORIES)
      if (stored && Array.isArray(stored) && stored.length > 0) return stored
      return DEFAULT_CATEGORIES
    } catch (e) {
      return DEFAULT_CATEGORIES
    }
  },

  async saveCategory(cat) {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      })
      if (res.ok) {
        const saved = await res.json()
        return saved
      }
    } catch (e) {
      console.warn('Backend category save offline:', e)
    }
    return cat
  },

  async saveCategories(categoriesList) {
    await set(KEYS.CATEGORIES, categoriesList)
  },

  async deleteCategory(id) {
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    } catch (e) {
      console.warn('Backend category delete offline:', e)
    }
  },

  async getEmailTemplates() {
    try {
      const stored = await get(KEYS.EMAIL_TEMPLATES)
      return stored || EMAIL_TEMPLATES
    } catch (e) {
      return EMAIL_TEMPLATES
    }
  },

  async saveEmailTemplates(templates) {
    await set(KEYS.EMAIL_TEMPLATES, templates)
  },

  async getCoverTemplates() {
    try {
      const stored = await get(KEYS.COVER_TEMPLATES)
      return stored || COVER_LETTER_TEMPLATES
    } catch (e) {
      return COVER_LETTER_TEMPLATES
    }
  },

  async getDbStats() {
    try {
      const res = await fetch('/api/db/stats')
      if (res.ok) return await res.json()
    } catch (e) {}
    return {
      engine: 'postgresql',
      dbPath: 'PostgreSQL (localhost:5432/pfe_hunter)',
      fileSizeKb: 0,
      counts: { offers: 0, cvs: 0, hasProfile: false },
      connected: true,
    }
  },

  async getNetworkInfo() {
    try {
      const res = await fetch('/api/network-info')
      if (res.ok) return await res.json()
    } catch (e) {}
    return null
  },

  async exportBackup() {
    const offers = await this.getOffers()
    const cvs = await this.getCvs()
    const profile = await this.getProfile()
    const emailTemplates = await this.getEmailTemplates()
    const aiConfig = await this.getAiConfig()

    const backup = {
      version: '2.0',
      database: 'sqlite-synced',
      exportedAt: new Date().toISOString(),
      offers,
      cvs,
      profile,
      emailTemplates,
      aiConfig,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pfe_hunter_database_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  async importBackup(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      if (data.offers) await this.saveOffers(data.offers)
      if (data.cvs) await this.saveCvs(data.cvs)
      if (data.profile) await this.saveProfile(data.profile)
      if (data.aiConfig) await this.saveAiConfig(data.aiConfig)
      return true
    } catch (e) {
      console.error('Import failed', e)
      throw new Error('Invalid backup file format')
    }
  },
}

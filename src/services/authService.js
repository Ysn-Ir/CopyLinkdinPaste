/**
 * RADAR Authentication & Local-First Identity Service
 * Provides seamless 1-click Offline Master Operator sessions,
 * multi-account switching, and persistent one-time login across Web and Desktop.
 */

const TOKEN_KEY = 'radar_auth_token'
const USER_KEY = 'radar_user'
const MODE_KEY = 'radar_auth_mode'

const DEFAULT_LOCAL_OPERATOR = {
  id: 'usr_local_operator',
  username: 'operator',
  email: 'operator@radar.local',
  fullName: 'Local Master Operator',
  role: 'admin',
  isOffline: true,
  headline: 'Lead Autonomous Systems & AI Operator',
  avatarUrl: '',
}

class AuthService {
  constructor() {
    this.currentUser = null
    this.token = null
    this.mode = 'offline'
    this.listeners = new Set()
  }

  getToken() {
    if (!this.token) {
      try {
        this.token = localStorage.getItem(TOKEN_KEY)
      } catch (e) {
        this.token = null
      }
    }
    return this.token
  }

  getUser() {
    if (!this.currentUser) {
      try {
        const raw = localStorage.getItem(USER_KEY)
        if (raw) {
          this.currentUser = JSON.parse(raw)
        }
      } catch (e) {
        this.currentUser = null
      }
    }
    return this.currentUser || DEFAULT_LOCAL_OPERATOR
  }

  getMode() {
    try {
      return localStorage.getItem(MODE_KEY) || 'offline'
    } catch {
      return 'offline'
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken() || this.getUser())
  }

  isOfflineMode() {
    const user = this.getUser()
    return Boolean(user?.isOffline || this.getMode() === 'offline')
  }

  notify() {
    const user = this.getUser()
    for (const cb of this.listeners) {
      try {
        cb(user, this.getToken())
      } catch (err) {
        console.error('Auth listener error:', err)
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('radar:auth-changed', { detail: { user } }))
    }
  }

  subscribe(cb) {
    this.listeners.add(cb)
    cb(this.getUser(), this.getToken())
    return () => this.listeners.delete(cb)
  }

  saveSession(token, user, mode = 'authenticated') {
    this.token = token
    this.currentUser = user
    this.mode = mode
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(MODE_KEY, mode)
    } catch (e) {
      console.warn('LocalStorage save failed:', e)
    }
    this.notify()
  }

  /**
   * Initialize session on app boot.
   * Restores stored token, validates with /api/auth/me,
   * or auto-establishes an offline master session so the user is never blocked.
   */
  async init() {
    const storedToken = this.getToken()
    const storedUser = this.getUser()

    if (storedToken) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            this.saveSession(storedToken, data.user, data.mode || 'authenticated')
            return data.user
          }
        }
      } catch (err) {
        // Backend offline or unreachable: gracefully preserve stored user in offline mode
        console.warn('Auth validation unreachable, operating in local offline mode:', err)
        if (storedUser) {
          this.currentUser = storedUser
          this.mode = 'offline'
          this.notify()
          return storedUser
        }
      }
    }

    // If no token or validation failed, establish instant offline master session
    return await this.activateOfflineSession()
  }

  /**
   * 1-Click Instant Offline Master Operator.
   * Completely offline-friendly, zero login prompts required.
   */
  async activateOfflineSession() {
    try {
      const res = await fetch('/api/auth/offline-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        this.saveSession(data.token, data.user, 'offline')
        return data.user
      }
    } catch (err) {
      console.warn('Backend offline, using local client master session:', err)
    }

    // Direct client fallback
    this.saveSession('radar_offline_master_token', DEFAULT_LOCAL_OPERATOR, 'offline')
    return DEFAULT_LOCAL_OPERATOR
  }

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed')
    }
    this.saveSession(data.token, data.user, 'authenticated')
    return data.user
  }

  async register({ username, email, password, fullName }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, fullName }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed')
    }
    this.saveSession(data.token, data.user, 'authenticated')
    return data.user
  }

  async updateProfile(updates) {
    const token = this.getToken()
    const res = await fetch('/api/auth/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || 'radar_offline_master_token'}`,
      },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to update profile')
    }
    this.saveSession(token, data.user, this.mode)
    return data.user
  }

  async listAvailableUsers() {
    try {
      const res = await fetch('/api/auth/users')
      if (res.ok) {
        const data = await res.json()
        return data.users || []
      }
    } catch (e) {
      console.warn('Could not list users:', e)
    }
    return [DEFAULT_LOCAL_OPERATOR]
  }

  logout() {
    const token = this.getToken()
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    // Return to local offline operator
    return this.activateOfflineSession()
  }
}

export const authService = new AuthService()

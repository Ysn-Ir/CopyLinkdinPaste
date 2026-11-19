import AsyncStorage from '@react-native-async-storage/async-storage'
import { ApiService } from './api'

const TOKEN_KEY = '@radar_auth_token'
const USER_KEY = '@radar_user'
const MODE_KEY = '@radar_auth_mode'

const DEFAULT_LOCAL_OPERATOR = {
  id: 'usr_local_operator',
  username: 'operator',
  email: 'operator@radar.local',
  fullName: 'Local Master Operator',
  role: 'admin',
  isOffline: true,
  headline: 'Lead Autonomous Systems & AI Operator',
}

class MobileAuthService {
  constructor() {
    this.currentUser = DEFAULT_LOCAL_OPERATOR
    this.token = null
    this.mode = 'offline'
    this.listeners = new Set()
  }

  async getToken() {
    if (!this.token) {
      try {
        this.token = await AsyncStorage.getItem(TOKEN_KEY)
      } catch (e) {}
    }
    return this.token
  }

  getUser() {
    return this.currentUser || DEFAULT_LOCAL_OPERATOR
  }

  isOfflineMode() {
    return Boolean(this.currentUser?.isOffline || this.mode === 'offline')
  }

  subscribe(cb) {
    this.listeners.add(cb)
    cb(this.getUser(), this.token)
    return () => this.listeners.delete(cb)
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.getUser(), this.token)
      } catch (e) {}
    }
  }

  async saveSession(token, user, mode = 'authenticated') {
    this.token = token
    this.currentUser = user
    this.mode = mode
    try {
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token)
      if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
      await AsyncStorage.setItem(MODE_KEY, mode)
    } catch (e) {}
    this.notify()
  }

  async init() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY)
      const storedUserRaw = await AsyncStorage.getItem(USER_KEY)
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null

      if (storedToken && storedUser) {
        this.token = storedToken
        this.currentUser = storedUser
        this.mode = storedUser.isOffline ? 'offline' : 'authenticated'
        this.notify()
        return storedUser
      }
    } catch (e) {
      console.warn('AsyncStorage load failed:', e)
    }

    // Default to offline master operator immediately
    return await this.activateOfflineSession()
  }

  async activateOfflineSession() {
    try {
      const baseUrl = await ApiService.getBaseUrl()
      const res = await fetch(`${baseUrl}/api/auth/offline-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        await this.saveSession(data.token, data.user, 'offline')
        return data.user
      }
    } catch (e) {
      console.warn('Backend unreachable for offline session, local fallback:', e)
    }

    await this.saveSession('radar_offline_master_token', DEFAULT_LOCAL_OPERATOR, 'offline')
    return DEFAULT_LOCAL_OPERATOR
  }

  async login(username, password) {
    const baseUrl = await ApiService.getBaseUrl()
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed')
    }
    await this.saveSession(data.token, data.user, 'authenticated')
    return data.user
  }

  async register({ username, email, password, fullName }) {
    const baseUrl = await ApiService.getBaseUrl()
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, fullName }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed')
    }
    await this.saveSession(data.token, data.user, 'authenticated')
    return data.user
  }

  async logout() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY)
      await AsyncStorage.removeItem(USER_KEY)
    } catch (e) {}
    return await this.activateOfflineSession()
  }
}

export const MobileAuth = new MobileAuthService()

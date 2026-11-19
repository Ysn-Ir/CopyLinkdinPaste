/**
 * Notification Service for RADAR Command Center
 * Handles:
 * 1. Native Desktop Notifications (via Electron window.radarNative.showNotification)
 * 2. Browser Notifications (when supported and granted)
 * 3. In-App Floating Toast Banners (fallback when permissions blocked or on HTTP)
 * 4. Synthesized High-Agency Audio Chimes (Web Audio API)
 */

class NotificationService {
  constructor() {
    this.audioContext = null
    this.toastListeners = new Set()
  }

  isSupported() {
    return typeof window !== 'undefined' && ('Notification' in window || Boolean(window.radarNative?.showNotification))
  }

  getPermission() {
    if (typeof window !== 'undefined' && window.radarNative?.showNotification) {
      return 'granted' // Electron native always granted
    }
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission // 'granted' | 'denied' | 'default'
  }

  async requestPermission() {
    if (typeof window !== 'undefined' && window.radarNative?.showNotification) {
      return 'granted'
    }
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    try {
      const res = await Notification.requestPermission()
      return res
    } catch (err) {
      console.warn('Notification permission request failed:', err)
      return Notification.permission
    }
  }

  playChime() {
    try {
      if (!this.audioContext && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) this.audioContext = new AudioCtx()
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      if (this.audioContext) {
        const osc = this.audioContext.createOscillator()
        const gain = this.audioContext.createGain()
        osc.connect(gain)
        gain.connect(this.audioContext.destination)
        osc.type = 'sine'
        // Subtle dual harmonic beacon chime
        osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime) // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.12) // A5
        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25)
        osc.start()
        osc.stop(this.audioContext.currentTime + 0.25)
      }
    } catch {
      // Audio playback silently bypassed if blocked by autoplay policy
    }
  }

  onToast(callback) {
    this.toastListeners.add(callback)
    return () => this.toastListeners.delete(callback)
  }

  emitInAppToast(data) {
    for (const listener of this.toastListeners) {
      try {
        listener(data)
      } catch (e) {
        console.error('Toast listener error:', e)
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('radar:in-app-toast', { detail: data }))
    }
  }

  notify({ title, body, icon = '/favicon.svg', tag = 'radar-capture', onClick }) {
    this.playChime()

    // 1. Electron Native Desktop Notification (always works, highest reliability)
    if (typeof window !== 'undefined' && window.radarNative?.showNotification) {
      try {
        window.radarNative.showNotification(title, body)
      } catch (err) {
        console.warn('Electron showNotification error:', err)
      }
    }

    // 2. Always fire In-App Toast Alert so the user is immediately aware within the viewport
    this.emitInAppToast({ title, body, icon, tag, onClick })

    // 3. Browser Notification if supported and granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon,
          tag,
          silent: true, // We already play our bespoke subtle chime
        })

        if (onClick) {
          notif.onclick = () => {
            window.focus()
            onClick()
            notif.close()
          }
        } else {
          notif.onclick = () => {
            window.focus()
            notif.close()
          }
        }

        return notif
      } catch (err) {
        console.warn('Native notification failed:', err)
      }
    }

    return null
  }
}

export const notificationService = new NotificationService()

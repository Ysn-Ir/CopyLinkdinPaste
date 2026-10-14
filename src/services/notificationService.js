/**
 * Notification Service for OmniHunt Web Command Center
 * Handles browser desktop notifications, permission states, and audio alerts.
 */

class NotificationService {
  constructor() {
    this.audioContext = null
  }

  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  getPermission() {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission // 'granted' | 'denied' | 'default'
  }

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported'
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
      if (!this.audioContext) {
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

  notify({ title, body, icon = '/favicon.ico', tag = 'omnihunt-capture', onClick }) {
    this.playChime()
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return null
    }

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
      return null
    }
  }
}

export const notificationService = new NotificationService()

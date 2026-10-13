/**
 * ClipboardMonitorService
 * 
 * Automatically polls the system clipboard every ~2.5 seconds.
 * When new content is detected, it sends it to the backend for AI classification,
 * then notifies the UI through a callback.
 * 
 * On the desktop (browser), this requires the page to be focused and clipboard
 * permissions to be granted.
 */

let lastHash = ''
let intervalId = null
let isRunning = false
let onClipCallback = null
let isPaused = false

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return hash.toString(36)
}

async function detectAndIngest() {
  if (isPaused) return
  if (!document.hasFocus()) return

  try {
    const text = await navigator.clipboard.readText()
    if (!text || text.trim().length < 5) return

    const hash = simpleHash(text.trim())
    if (hash === lastHash) return
    lastHash = hash

    // Determine source domain from URL patterns in clipboard
    let sourceDomain = 'clipboard'
    let sourceUrl = ''
    const urlMatch = text.match(/https?:\/\/([^\s/]+)/)
    if (urlMatch) {
      sourceDomain = urlMatch[1].replace('www.', '')
      // If the entire text is a URL, use it as sourceUrl
      if (/^https?:\/\/\S+$/i.test(text.trim())) {
        sourceUrl = text.trim()
      }
    }
    // Check for known domain patterns inside text
    const domainPatterns = [
      { pattern: /linkedin\.com/i, domain: 'linkedin.com' },
      { pattern: /github\.com/i, domain: 'github.com' },
      { pattern: /twitter\.com|x\.com/i, domain: 'x.com' },
      { pattern: /stackoverflow\.com/i, domain: 'stackoverflow.com' },
      { pattern: /medium\.com/i, domain: 'medium.com' },
      { pattern: /reddit\.com/i, domain: 'reddit.com' },
      { pattern: /youtube\.com/i, domain: 'youtube.com' },
      { pattern: /indeed\.com/i, domain: 'indeed.com' },
      { pattern: /glassdoor\.com/i, domain: 'glassdoor.com' },
    ]
    for (const { pattern, domain } of domainPatterns) {
      if (pattern.test(text)) {
        sourceDomain = domain
        break
      }
    }

    // Send to backend
    const payload = {
      content: text.trim(),
      sourceUrl,
      sourceDomain,
      sourceDevice: 'desktop',
      copiedAt: new Date().toISOString(),
    }

    const res = await fetch('/api/clips/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      if (onClipCallback) {
        onClipCallback({
          clip: data.clip,
          isJobOffer: data.isJobOffer,
          offer: data.offer,
        })
      }
    }
  } catch (err) {
    // Clipboard read can fail if user hasn't granted permission or tab isn't focused
    // This is expected — silently ignore
  }
}

export const ClipboardMonitorService = {
  /**
   * Start monitoring clipboard for changes.
   * @param {Function} callback - Called with { clip, isJobOffer, offer } when new clip is captured
   * @param {number} intervalMs - Poll interval in milliseconds (default: 2500)
   */
  start(callback, intervalMs = 2500) {
    if (isRunning) return
    onClipCallback = callback
    isRunning = true
    isPaused = false

    // Initialize hash with current clipboard to avoid immediate capture
    navigator.clipboard.readText().then((text) => {
      if (text && text.trim().length >= 5) {
        lastHash = simpleHash(text.trim())
      }
    }).catch(() => {})

    intervalId = setInterval(detectAndIngest, intervalMs)
    console.log('[ClipboardMonitor] Started monitoring clipboard every', intervalMs, 'ms')
  },

  stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    isRunning = false
    isPaused = false
    onClipCallback = null
    console.log('[ClipboardMonitor] Stopped')
  },

  pause() {
    isPaused = true
  },

  resume() {
    isPaused = false
  },

  isActive() {
    return isRunning && !isPaused
  },

  /** Manually trigger a clipboard check (e.g., from the command palette) */
  async manualCapture() {
    isPaused = false
    await detectAndIngest()
  },

  /** Reset the hash so the current clipboard will be re-captured */
  resetHash() {
    lastHash = ''
  },
}

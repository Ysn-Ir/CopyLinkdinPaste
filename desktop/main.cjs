const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard, Notification, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')

let mainWindow = null
let tray = null
let backendProcess = null
const BACKEND_URL = process.env.RADAR_BACKEND_URL || 'http://127.0.0.1:8003'

function checkBackendHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function ensureBackendRunning() {
  const isHealthy = await checkBackendHealth()
  if (isHealthy) {
    console.log('[RADAR Electron] Local FastAPI backend is already running.')
    return true
  }

  console.log('[RADAR Electron] Spawning local FastAPI backend...')
  const pyCmd = process.platform === 'win32' ? 'python' : 'python3'
  backendProcess = spawn(pyCmd, ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8003'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore',
    detached: false
  })

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400))
    if (await checkBackendHealth()) {
      console.log('[RADAR Electron] FastAPI backend is ready.')
      return true
    }
  }
  return false
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#09090B',
    title: 'RADAR // Signal Intelligence & Career Workstation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true,
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Load backend URL with retry loop
  const loadUrlWithRetry = async () => {
    const isUp = await ensureBackendRunning()
    if (isUp) {
      mainWindow.loadURL(BACKEND_URL)
    } else {
      setTimeout(loadUrlWithRetry, 1000)
    }
  }
  loadUrlWithRetry()

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

function setupTray() {
  try {
    const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg')
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open RADAR Workstation [Alt+R]',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          }
        }
      },
      {
        label: '📥 Dump Clipboard & Ingest',
        click: () => handleDumpClipboard()
      },
      {
        label: '✂️ Screen Snip OCR [Alt+S]',
        click: () => triggerScreenSnip()
      },
      { type: 'separator' },
      {
        label: 'Quit RADAR',
        click: () => {
          app.quit()
        }
      }
    ])
    tray.setToolTip('RADAR // Career Signal Intelligence')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (err) {
    console.warn('[RADAR Electron] System tray warning:', err.message)
  }
}

function setupGlobalShortcuts() {
  // Alt+R: Focus window
  globalShortcut.register('Alt+R', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Alt+S: Screen Snip WinOCR
  globalShortcut.register('Alt+S', () => {
    triggerScreenSnip()
  })

  // Alt+V: Dump Clipboard
  globalShortcut.register('Alt+V', () => {
    handleDumpClipboard()
  })
}

function triggerScreenSnip() {
  const pyCmd = process.platform === 'win32' ? 'python' : 'python3'
  const scriptPath = path.join(__dirname, '..', 'radar_desktop.py')
  spawn(pyCmd, ['-c', 'from radar_desktop import SnippingTool, handle_snip_completed; s = SnippingTool(on_snip_completed=handle_snip_completed); s._run_snip()'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore',
    detached: true
  })
}

async function handleDumpClipboard() {
  const text = clipboard.readText()
  if (!text || !text.trim()) {
    new Notification({
      title: 'RADAR: Clipboard Empty',
      body: 'No text found on clipboard. Copy a LinkedIn job URL or recruiter post first.'
    }).show()
    return { success: false, message: 'Clipboard empty' }
  }

  const trimmed = text.trim()
  try {
    const payload = JSON.stringify({ text: trimmed })
    const req = http.request(`${BACKEND_URL}/api/mobile/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          if (data.success && mainWindow) {
            mainWindow.webContents.send('radar:clipboard-dumped', data)
            new Notification({
              title: data.isJobOffer ? '🎯 Opportunity Detected!' : '📋 Signal Archived to Vault',
              body: data.offer ? `${data.offer.title} at ${data.offer.company}` : 'Saved into RADAR Vault.'
            }).show()
          }
        } catch (e) {}
      })
    })
    req.write(payload)
    req.end()
    return { success: true, text: trimmed }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// IPC Handlers
ipcMain.handle('desktop:dump-clipboard', async () => {
  return await handleDumpClipboard()
})

ipcMain.handle('desktop:snip-screen', () => {
  triggerScreenSnip()
  return { success: true }
})

ipcMain.handle('desktop:show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
  return { success: true }
})

ipcMain.handle('desktop:open-external', (_event, url) => {
  if (url) shell.openExternal(url)
  return { success: true }
})

ipcMain.handle('desktop:launch-eml', (_event, { subject, to, body }) => {
  try {
    const emlContent = `To: ${to || ''}\nSubject: ${subject || 'Application'}\nX-Unsent: 1\nContent-Type: text/plain; charset=utf-8\n\n${body || ''}`
    const tmpFile = path.join(os.tmpdir(), `radar_outreach_${Date.now()}.eml`)
    fs.writeFileSync(tmpFile, emlContent, 'utf-8')
    shell.openPath(tmpFile)
    return { success: true, path: tmpFile }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// App Lifecycle
app.whenReady().then(async () => {
  await ensureBackendRunning()
  createWindow()
  setupTray()
  setupGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (backendProcess) {
    try {
      backendProcess.kill()
    } catch (e) {}
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

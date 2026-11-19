const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('radarNative', {
  isDesktopNative: true,
  platform: process.platform,
  version: '2.5.0-Production',
  dumpClipboard: () => ipcRenderer.invoke('desktop:dump-clipboard'),
  snipScreen: () => ipcRenderer.invoke('desktop:snip-screen'),
  launchEml: (payload) => ipcRenderer.invoke('desktop:launch-eml', payload),
  showNotification: (title, body) => ipcRenderer.invoke('desktop:show-notification', { title, body }),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  onClipboardDumped: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('radar:clipboard-dumped', handler)
    return () => ipcRenderer.removeListener('radar:clipboard-dumped', handler)
  },
  onSnipCompleted: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('radar:snip-completed', handler)
    return () => ipcRenderer.removeListener('radar:snip-completed', handler)
  }
})

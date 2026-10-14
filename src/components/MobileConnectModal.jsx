import React, { useState, useEffect } from 'react'
import {
  X,
  Smartphone,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import QRCode from 'qrcode'

export function MobileConnectModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('lan') // 'lan' | 'tunnel' | 'render'
  const [pairingData, setPairingData] = useState(null)
  const [selectedIp, setSelectedIp] = useState('')
  const [tunnelUrl, setTunnelUrl] = useState('')
  const [renderUrl, setRenderUrl] = useState('https://omnihunt-backend.onrender.com')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchPairingInfo()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (activeTab === 'lan') {
      const ip = selectedIp || pairingData?.primaryIp || '192.168.1.12'
      generateQrForUrl(`http://${ip}:${pairingData?.backendPort || 8003}`)
    } else if (activeTab === 'tunnel') {
      const url = tunnelUrl.trim() || 'https://pfe-hunter.loca.lt'
      generateQrForUrl(url)
    } else if (activeTab === 'render') {
      const url = renderUrl.trim() || 'https://omnihunt-backend.onrender.com'
      generateQrForUrl(url)
    }
  }, [activeTab, selectedIp, tunnelUrl, renderUrl, pairingData])

  const fetchPairingInfo = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8003/api/mobile/pairing')
      if (res.ok) {
        const data = await res.json()
        setPairingData(data)
        const ip = data.primaryIp || (data.localIps && data.localIps[0]) || '192.168.1.12'
        setSelectedIp(ip)
      } else {
        fallbackPairing()
      }
    } catch {
      fallbackPairing()
    } finally {
      setIsLoading(false)
    }
  }

  const fallbackPairing = () => {
    const fallbackIp = window.location.hostname === 'localhost' ? '192.168.1.12' : window.location.hostname
    const data = {
      status: 'online',
      hostname: 'PC Host',
      primaryIp: fallbackIp,
      backendPort: 8003,
      localIps: [fallbackIp, '100.89.108.117'],
      counts: { offers: 3, categories: 8, cvs: 5 },
    }
    setPairingData(data)
    setSelectedIp(fallbackIp)
  }

  const generateQrForUrl = async (serverUrl) => {
    const cleanUrl = serverUrl.replace(/\/+$/, '')
    const payload = JSON.stringify({
      app: 'omnihunt',
      version: '2.0.0',
      serverUrl: cleanUrl,
      apiUrl: `${cleanUrl}/api`,
      timestamp: Date.now(),
    })

    try {
      const url = await QRCode.toDataURL(payload, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(url)
    } catch (err) {
      console.error('QR generation failed:', err)
    }
  }

  const currentDisplayUrl =
    activeTab === 'lan'
      ? `http://${selectedIp || '192.168.1.12'}:${pairingData?.backendPort || 8003}`
      : activeTab === 'tunnel'
      ? tunnelUrl || 'https://pfe-hunter.loca.lt'
      : renderUrl || 'https://omnihunt-backend.onrender.com'

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDisplayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#121215',
          border: '1px solid #27272a',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #27272a',
            background: '#18181b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#27272a',
                border: '1px solid #3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Smartphone size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Pair OmniHunt Mobile App
              </h3>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '2px 0 0 0' }}>
                Instant synchronization across Cloud, Local 4G Tunnel, or Home Wi-Fi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background: '#09090b',
            padding: '4px',
            borderBottom: '1px solid #27272a',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setActiveTab('lan')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'lan' ? '#18181b' : 'transparent',
              color: activeTab === 'lan' ? '#ffffff' : '#71717a',
              fontWeight: activeTab === 'lan' ? 700 : 500,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Wifi size={14} color={activeTab === 'lan' ? '#10b981' : '#71717a'} />
            <span>Local Wi-Fi</span>
          </button>

          <button
            onClick={() => setActiveTab('tunnel')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'tunnel' ? '#18181b' : 'transparent',
              color: activeTab === 'tunnel' ? '#ffffff' : '#71717a',
              fontWeight: activeTab === 'tunnel' ? 700 : 500,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Zap size={14} color={activeTab === 'tunnel' ? '#f59e0b' : '#71717a'} />
            <span>4G Remote Tunnel</span>
          </button>

          <button
            onClick={() => setActiveTab('render')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'render' ? '#18181b' : 'transparent',
              color: activeTab === 'render' ? '#ffffff' : '#71717a',
              fontWeight: activeTab === 'render' ? 700 : 500,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Globe size={14} color={activeTab === 'render' ? '#38bdf8' : '#71717a'} />
            <span>Render Cloud</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'center' }}>
            {/* Left: Dynamic QR Code */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  marginBottom: '10px',
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="OmniHunt Mobile Pairing QR"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={24} className="spin" color="#09090b" />
                  </div>
                )}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f4f4f5' }}>
                Scan with OmniHunt App
              </span>
              <span style={{ fontSize: '10px', color: '#71717a', marginTop: '2px' }}>
                {activeTab === 'lan'
                  ? 'Instant pairing over home Wi-Fi'
                  : activeTab === 'tunnel'
                  ? 'Connects over 4G via PC tunnel'
                  : 'Connects to 24/7 Render cloud'}
              </span>
            </div>

            {/* Right: Tab-specific Controls & Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Tab 1: LAN */}
              {activeTab === 'lan' && (
                <>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Local Wi-Fi Server Endpoint (Port 8003)
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        gap: '8px',
                      }}
                    >
                      <Wifi size={14} color="#10b981" />
                      <input
                        type="text"
                        readOnly
                        value={currentDisplayUrl}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f4f4f5',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          flex: 1,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          color: '#f4f4f5',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {pairingData?.localIps && pairingData.localIps.length > 0 && (
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Switch Interface IP:
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {pairingData.localIps.map((ip) => {
                          const isSelected = ip === selectedIp
                          return (
                            <button
                              key={ip}
                              onClick={() => setSelectedIp(ip)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                border: `1px solid ${isSelected ? '#ffffff' : '#27272a'}`,
                                background: isSelected ? '#ffffff' : '#18181b',
                                color: isSelected ? '#09090b' : '#a1a1aa',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {ip}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '10px 12px', background: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                      💡 Both phone and PC must be connected to the same Wi-Fi router. If on 4G outside home, switch to the <strong>4G Remote Tunnel</strong> tab above.
                    </span>
                  </div>
                </>
              )}

              {/* Tab 2: 4G Remote Tunnel */}
              {activeTab === 'tunnel' && (
                <>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Public HTTPS Tunnel URL (From start_tunnel.bat)
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        gap: '8px',
                      }}
                    >
                      <Zap size={14} color="#f59e0b" />
                      <input
                        type="text"
                        value={tunnelUrl}
                        onChange={(e) => setTunnelUrl(e.target.value)}
                        placeholder="https://pfe-hunter.loca.lt"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f4f4f5',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          flex: 1,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          color: '#f4f4f5',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: 600, marginBottom: '4px' }}>
                      ⚡ How to connect outside home on 4G/Cellular:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '10.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                      <li>Run <code style={{ color: '#38bdf8' }}>start_tunnel.bat</code> on your PC.</li>
                      <li>Copy the generated <code style={{ color: '#f59e0b' }}>https://...</code> link and paste it here.</li>
                      <li>The QR code updates instantly: scan it with your phone!</li>
                    </ol>
                  </div>
                </>
              )}

              {/* Tab 3: Render Cloud */}
              {activeTab === 'render' && (
                <>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Hosted Render Cloud Backend URL
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        gap: '8px',
                      }}
                    >
                      <Globe size={14} color="#38bdf8" />
                      <input
                        type="text"
                        value={renderUrl}
                        onChange={(e) => setRenderUrl(e.target.value)}
                        placeholder="https://omnihunt-backend.onrender.com"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f4f4f5',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          flex: 1,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          color: '#f4f4f5',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: 600, marginBottom: '4px' }}>
                      🌐 24/7 Cloud Deployment via Render:
                    </div>
                    <p style={{ margin: 0, fontSize: '10.5px', color: '#a1a1aa', lineHeight: 1.5 }}>
                      Deploy this repo with <code style={{ color: '#38bdf8' }}>render.yaml</code>. You get an always-on backend with hosted PostgreSQL. Both web and phone stay 100% in sync without needing your PC powered on.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  X,
  Smartphone,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import QRCode from 'qrcode'

export function MobileConnectModal({ isOpen, onClose }) {
  const [pairingData, setPairingData] = useState(null)
  const [selectedIp, setSelectedIp] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchPairingInfo()
    }
  }, [isOpen])

  const fetchPairingInfo = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8003/api/mobile/pairing')
      if (res.ok) {
        const data = await res.json()
        setPairingData(data)
        const ip = data.primaryIp || (data.localIps && data.localIps[0]) || '192.168.1.12'
        setSelectedIp(ip)
        generateQr(ip, data.backendPort || 8003)
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
    generateQr(fallbackIp, 8003)
  }

  const generateQr = async (ip, port = 8003) => {
    const serverUrl = `http://${ip}:${port}`
    const payload = JSON.stringify({
      app: 'omnihunt',
      version: '2.0.0',
      serverUrl: serverUrl,
      apiUrl: `${serverUrl}/api`,
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

  const handleSelectIp = (ip) => {
    setSelectedIp(ip)
    generateQr(ip, pairingData?.backendPort || 8003)
  }

  const currentServerUrl = selectedIp
    ? `http://${selectedIp}:${pairingData?.backendPort || 8003}`
    : 'http://192.168.1.12:8003'

  const handleCopy = () => {
    navigator.clipboard.writeText(currentServerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '640px',
          background: '#121215',
          border: '1px solid #27272a',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
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
                width: '34px',
                height: '34px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Pair OmniHunt Mobile App
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981' }} />
                  Local Wi-Fi / LAN
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '2px 0 0 0' }}>
                Sync clipboard clips and manage applications on your phone.
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

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'center' }}>
            {/* Left: QR Code */}
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
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={24} className="spin" color="#09090b" />
                  </div>
                )}
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f4f4f5' }}>
                Scan with OmniHunt App
              </span>
              <span style={{ fontSize: '10.5px', color: '#71717a', marginTop: '2px' }}>
                Instant zero-config pairing over Wi-Fi
              </span>
            </div>

            {/* Right: Manual Connection Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Local Server Endpoint (Port 8003)
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
                    value={currentServerUrl}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied ? (
                      <>
                        <Check size={12} color="#10b981" />
                        <span style={{ color: '#10b981' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* IP Selection Pills */}
              {pairingData?.localIps && pairingData.localIps.length > 0 && (
                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Select Network IP
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {pairingData.localIps.map((ip) => {
                      const isSelected = ip === selectedIp
                      return (
                        <button
                          key={ip}
                          onClick={() => handleSelectIp(ip)}
                          style={{
                            padding: '4px 8px',
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

              {/* Status Note */}
              <div
                style={{
                  padding: '10px 12px',
                  background: '#18181b',
                  borderRadius: '8px',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                  Ensure your phone is connected to the same Wi-Fi router or Tailscale mesh.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { X, BellOff, ExternalLink, ShieldAlert, Check } from 'lucide-react'

export function NotificationBlockedModal({ isOpen, onClose, onPermissionChanged }) {
  if (!isOpen) return null

  const handleTestOrRefresh = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (onPermissionChanged) onPermissionChanged(Notification.permission)
      if (Notification.permission === 'granted') {
        onClose()
      }
    }
  }

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
          maxWidth: '560px',
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
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <BellOff size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Browser Notifications Are Blocked
              </h3>
              <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '2px 0 0 0' }}>
                Your browser is currently preventing desktop alerts for new captures.
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

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#fbbf24',
              fontSize: '12px',
              lineHeight: 1.5,
              display: 'flex',
              gap: '10px',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              Because notifications were previously blocked in your browser settings, websites cannot show the prompt again automatically. You must enable it manually in your address bar.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How to Unblock in 3 Clicks:
            </h4>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#09090b',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #27272a',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#27272a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <span style={{ fontSize: '12px', color: '#e4e4e7', lineHeight: 1.4 }}>
                  Look at the <strong>left side of your browser address bar</strong> (where it says <code>http://127.0.0.1:5174</code> or <code>http://localhost:8003</code>).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#27272a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <span style={{ fontSize: '12px', color: '#e4e4e7', lineHeight: 1.4 }}>
                  Click the <strong>Site Information / Lock icon 🔒</strong> (or the tune settings icon ⚙️).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#27272a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  3
                </span>
                <span style={{ fontSize: '12px', color: '#e4e4e7', lineHeight: 1.4 }}>
                  Find <strong>Notifications</strong> and change it from <span style={{ color: '#ef4444', fontWeight: 600 }}>Block</span> to <span style={{ color: '#10b981', fontWeight: 600 }}>Allow</span>.
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={handleTestOrRefresh}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#10b981',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={14} />
              <span>I Have Allowed It (Verify)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

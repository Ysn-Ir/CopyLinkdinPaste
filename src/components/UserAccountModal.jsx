import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
  LogOut,
  Users,
  CheckCircle,
  AlertCircle,
  Laptop,
  ArrowRight,
  WifiOff,
} from 'lucide-react'
import { authService } from '../services/authService'

export function UserAccountModal({ isOpen, onClose, onUserChanged }) {
  const [tab, setTab] = useState('profile') // 'profile' | 'signin' | 'register'
  const [currentUser, setCurrentUser] = useState(authService.getUser())
  const [availableUsers, setAvailableUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Sign In form
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regFullName, setRegFullName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCurrentUser(authService.getUser())
      setErrorMsg('')
      setSuccessMsg('')
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    const list = await authService.listAvailableUsers()
    setAvailableUsers(list)
  }

  if (!isOpen) return null

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter both username/email and password.')
      return
    }
    setIsLoading(true)
    setErrorMsg('')
    try {
      const user = await authService.login(loginIdentifier, loginPassword)
      setCurrentUser(user)
      setSuccessMsg(`Welcome back, ${user.fullName || user.username}!`)
      setTab('profile')
      if (onUserChanged) onUserChanged(user)
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setErrorMsg(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('All fields are required.')
      return
    }
    setIsLoading(true)
    setErrorMsg('')
    try {
      const user = await authService.register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        fullName: regFullName.trim() || regUsername.trim(),
      })
      setCurrentUser(user)
      setSuccessMsg(`Account created! Logged in as ${user.username}.`)
      setTab('profile')
      loadUsers()
      if (onUserChanged) onUserChanged(user)
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateOffline = async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const user = await authService.activateOfflineSession()
      setCurrentUser(user)
      setSuccessMsg('Active session switched to Local Offline Master Operator!')
      setTab('profile')
      if (onUserChanged) onUserChanged(user)
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setErrorMsg(err.message || 'Could not activate offline session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await authService.logout()
    setCurrentUser(authService.getUser())
    setSuccessMsg('Logged out. Switched to Local Offline Operator.')
    if (onUserChanged) onUserChanged(authService.getUser())
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  const isOffline = authService.isOfflineMode()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0D0D11',
          borderRadius: '16px',
          border: '1px solid #27272A',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #1F1F24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#121217',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 59, 48, 0.15)',
                border: '1px solid rgba(255, 59, 48, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF3B30',
              }}
            >
              <User size={16} />
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Identity & Access Command
              </div>
              <div style={{ fontSize: '11px', color: '#71717A' }}>
                Local-first authentication, multi-tenant & offline accounts
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#71717A',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1F1F24',
            background: '#09090C',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('profile')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'profile' ? '2px solid #FF3B30' : '2px solid transparent',
              color: tab === 'profile' ? '#FFFFFF' : '#71717A',
              fontWeight: tab === 'profile' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Current Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('signin')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'signin' ? '2px solid #FF3B30' : '2px solid transparent',
              color: tab === 'signin' ? '#FFFFFF' : '#71717A',
              fontWeight: tab === 'signin' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'register' ? '2px solid #FF3B30' : '2px solid transparent',
              color: tab === 'register' ? '#FFFFFF' : '#71717A',
              fontWeight: tab === 'register' ? 700 : 500,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div
            style={{
              margin: '14px 20px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div
            style={{
              margin: '14px 20px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '20px 22px', flex: 1, overflowY: 'auto' }}>
          {/* TAB 1: CURRENT PROFILE */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#14141B',
                  border: '1px solid #23232A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isOffline ? '#1E1414' : '#14202B',
                    border: `1px solid ${isOffline ? '#FF3B30' : '#38BDF8'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOffline ? '#FF3B30' : '#38BDF8',
                    fontWeight: 800,
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {(currentUser?.fullName || currentUser?.username || 'O')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                      {currentUser?.fullName || currentUser?.username}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: isOffline ? 'rgba(255, 59, 48, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: isOffline ? '#FF3B30' : '#38BDF8',
                        border: `1px solid ${isOffline ? 'rgba(255, 59, 48, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                      }}
                    >
                      {isOffline ? 'OFFLINE MASTER' : 'AUTHENTICATED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#A1A1AA', marginTop: '2px' }}>
                    @{currentUser?.username} • {currentUser?.email}
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
                    Role: <strong style={{ color: '#E4E4E7' }}>{currentUser?.role || 'operator'}</strong>
                  </div>
                </div>
              </div>

              {/* 1-Click Offline Master Session Button */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#1A0E0E',
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF3B30', fontWeight: 700, fontSize: '12.5px' }}>
                    <WifiOff size={14} />
                    <span>Local Offline Master Operator</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '2px' }}>
                    Runs locally without any cloud dependency, zero external latency.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleActivateOffline}
                  disabled={isLoading}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#FF3B30',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚡ Switch to Offline
                </button>
              </div>

              {/* Available accounts in system */}
              {availableUsers.length > 1 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    Switch Account
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {availableUsers.map((u) => {
                      const isActive = u.id === currentUser?.id
                      return (
                        <div
                          key={u.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: isActive ? '#1B1718' : '#14141A',
                            border: `1px solid ${isActive ? '#FF3B30' : '#27272A'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                              {u.fullName || u.username} {isActive && '✓ (Active)'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717A' }}>
                              @{u.username} • {u.email}
                            </div>
                          </div>
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setTab('signin')
                                setLoginIdentifier(u.username)
                              }}
                              style={{
                                background: '#1F1F26',
                                border: '1px solid #32323B',
                                color: '#E4E4E7',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Sign in
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#1A1A22',
                    border: '1px solid #2E2E38',
                    color: '#A1A1AA',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={13} />
                  <span>Reset Session</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#FF3B30',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="operator or you@domain.com"
                    style={{
                      width: '100%',
                      height: '38px',
                      paddingLeft: '34px',
                      paddingRight: '12px',
                      background: '#14141A',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                    required
                  />
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter account password..."
                    style={{
                      width: '100%',
                      height: '38px',
                      paddingLeft: '34px',
                      paddingRight: '12px',
                      background: '#14141A',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                    required
                  />
                  <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: '#FF3B30',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
                <ArrowRight size={14} />
              </button>

              <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#71717A', marginTop: '8px' }}>
                Don't have an account?{' '}
                <span
                  style={{ color: '#FF3B30', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setTab('register')}
                >
                  Create one now
                </span>
              </div>
            </form>
          )}

          {/* TAB 3: REGISTER */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    background: '#14141A',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. alexm"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    background: '#14141A',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    background: '#14141A',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#A1A1AA', fontWeight: 600, marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    background: '#14141A',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: '#FF3B30',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{isLoading ? 'Creating Account...' : 'Register Account'}</span>
                <ArrowRight size={14} />
              </button>

              <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#71717A', marginTop: '8px' }}>
                Already have an account?{' '}
                <span
                  style={{ color: '#FF3B30', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setTab('signin')}
                >
                  Sign in
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

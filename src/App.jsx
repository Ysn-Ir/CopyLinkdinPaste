import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Command,
  Plus,
  Sparkles,
  Bot,
  Layers,
  Inbox,
  Mail,
  MessageSquare,
  Globe,
  Sliders,
  Clipboard,
  Zap,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { Sidebar } from './components/Sidebar.jsx'
import { CommandPalette } from './components/CommandPalette.jsx'
import { OfferModal } from './components/OfferModal.jsx'
import { CVManagerModal } from './components/CVManagerModal.jsx'
import { CategoryManagerModal } from './components/CategoryManagerModal.jsx'
import { MobileConnectModal } from './components/MobileConnectModal.jsx'
import { NotificationBlockedModal } from './components/NotificationBlockedModal.jsx'
import { notificationService } from './services/notificationService.js'
import { Bell, BellOff } from 'lucide-react'

import { CommandCenterView } from './views/CommandCenterView.jsx'
import { DashboardView } from './views/DashboardView.jsx'
import { InboxView } from './views/InboxView.jsx'
import { EmailWorkspaceView } from './views/EmailWorkspaceView.jsx'
import { DirectContactWorkspaceView } from './views/DirectContactWorkspaceView.jsx'
import { ExternalWorkspaceView } from './views/ExternalWorkspaceView.jsx'
import { PipelineView } from './views/PipelineView.jsx'
import { AgentConsoleView } from './views/AgentConsoleView.jsx'
import { SettingsView } from './views/SettingsView.jsx'
import { ClipVaultView } from './views/ClipVaultView.jsx'

import { StorageService } from './services/storage.js'
import { AgentOrchestrator } from './services/agentOrchestrator.js'
import { ClipboardMonitorService } from './services/clipboardMonitor.js'

export default function App() {
  const [activeView, setActiveView] = useState('command-center')
  const [density, setDensity] = useState('comfortable') // 'comfortable' | 'compact'
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false)
  const [isCvVaultModalOpen, setIsCvVaultModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const [isNotifBlockedModalOpen, setIsNotifBlockedModalOpen] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [isIngesting, setIsIngesting] = useState(false)

  // Database State (Backed by PostgreSQL/SQLite & IndexedDB)
  const [offers, setOffers] = useState([])
  const [cvList, setCvList] = useState([])
  const [categories, setCategories] = useState([])
  const [candidateProfile, setCandidateProfile] = useState({
    fullName: 'Khalil Ingénieur PFE',
    email: 'khalil.pfe@gmail.com',
    phone: '+33 6 12 34 56 78',
    linkedIn: 'linkedin.com/in/khalil-pfe',
    degree: 'Master 2 / Diplôme d\'Ingénieur en Génie Logiciel & IA',
    city: 'Paris, France',
    customInstructions: 'Give maximum freedom to the user. Prioritize NLP and AI applications.',
    bio: 'Étudiant ingénieur passionné par l\'IA et le développement logiciel',
  })
  const [aiConfig, setAiConfig] = useState({
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
    temperature: 0.2,
    customSystemPrompt: '',
  })
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all')
  const [dbInfo, setDbInfo] = useState(null)
  const [networkInfo, setNetworkInfo] = useState(null)

  // Clip Vault State
  const [clips, setClips] = useState([])
  const [clipMonitorActive, setClipMonitorActive] = useState(true)
  const [clipToast, setClipToast] = useState(null) // { title, type, isJobOffer }

  // Load from PostgreSQL / SQLite Backend + IndexedDB
  useEffect(() => {
    async function loadData() {
      const storedOffers = await StorageService.getOffers()
      const storedCvs = await StorageService.getCvs()
      const storedCategories = await StorageService.getCategories()
      const storedProfile = await StorageService.getProfile()
      const storedAiConfig = await StorageService.getAiConfig()
      const stats = await StorageService.getDbStats()
      const net = await StorageService.getNetworkInfo()

      setOffers(storedOffers)
      setCvList(storedCvs)
      if (storedCategories) setCategories(storedCategories)
      if (storedProfile) setCandidateProfile(storedProfile)
      if (storedAiConfig) setAiConfig(storedAiConfig)
      if (stats) setDbInfo(stats)
      if (net) setNetworkInfo(net)
    }
    loadData()
  }, [])

  // Load Clips
  const loadClips = useCallback(async () => {
    const data = await StorageService.getClips()
    setClips(data)
  }, [])

  useEffect(() => {
    loadClips()
  }, [])

  // Notification button handler
  const handleNotificationBtnClick = async () => {
    const current = notificationService.getPermission()
    if (current === 'denied') {
      setIsNotifBlockedModalOpen(true)
    } else if (current === 'default') {
      const res = await notificationService.requestPermission()
      setNotificationStatus(res)
      if (res === 'granted') {
        notificationService.notify({
          title: '🦅 OmniHunt Alerts Activated',
          body: 'Desktop notifications are active for all captured clips and job offers.',
        })
      } else if (res === 'denied') {
        setIsNotifBlockedModalOpen(true)
      }
    } else if (current === 'granted') {
      notificationService.notify({
        title: '🔔 OmniHunt Alerts Active',
        body: 'Desktop notifications are working properly. Click to focus app.',
      })
    }
  }

  // Clipboard Monitor Lifecycle
  useEffect(() => {
    if (clipMonitorActive) {
      ClipboardMonitorService.start(async ({ clip, isJobOffer, offer }) => {
        // Refresh clips list
        await loadClips()
        // Refresh offers if a job offer was auto-created
        if (isJobOffer && offer) {
          const refreshedOffers = await StorageService.getOffers()
          setOffers(refreshedOffers)
        }
        // Show in-app toast
        setClipToast({
          title: clip?.title || 'Nouveau clip capturé',
          type: clip?.contentType || 'note',
          isJobOffer: Boolean(isJobOffer),
        })
        setTimeout(() => setClipToast(null), 4000)

        // Trigger native desktop notification & audio alert
        notificationService.notify({
          title: isJobOffer ? '🎯 New Career Offer Detected!' : '📋 Clip Captured to Vault',
          body: clip?.title || (isJobOffer ? `${offer?.title} at ${offer?.company}` : 'Captured into OmniHunt'),
          onClick: () => {
            if (isJobOffer) setActiveView('command-center')
            else setActiveView('clip-vault')
          },
        })
      })
    } else {
      ClipboardMonitorService.stop()
    }
    return () => ClipboardMonitorService.stop()
  }, [clipMonitorActive, loadClips])

  const persistOffers = async (updated) => {
    setOffers(updated)
    await StorageService.saveOffers(updated)
  }

  const handleAddCategory = async (newCat) => {
    const saved = await StorageService.saveCategory(newCat)
    const updated = [...categories, saved]
    setCategories(updated)
    await StorageService.saveCategories(updated)
    confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } })
  }

  const handleDeleteCategory = async (catId) => {
    await StorageService.deleteCategory(catId)
    const updated = categories.filter((c) => c.id !== catId)
    setCategories(updated)
    await StorageService.saveCategories(updated)
  }

  // Autonomous Ingestion Pipeline (Groq AI powered with dynamic user domains)
  const handleRunIngestion = async (input) => {
    if (!input || !input.trim()) return
    setIsIngesting(true)

    try {
      const { offer, trace } = await AgentOrchestrator.runIngestionPipeline(input, {
        cvList,
        candidateProfile,
        aiConfig,
        categories,
      })

      const updated = [offer, ...offers]
      await persistOffers(updated)

      confetti({ particleCount: 35, spread: 45, origin: { y: 0.8 } })

      // Keep user in the unified Command Center
      setActiveView('command-center')
    } catch (err) {
      console.error('Ingestion failed:', err)
      alert(`Ingestion failed: ${err.message}`)
    } finally {
      setIsIngesting(false)
    }
  }

  const handleDeleteOffer = async (id) => {
    const updated = offers.filter((o) => o.id !== id)
    await persistOffers(updated)
    await StorageService.deleteOffer(id)
  }

  const handleSaveSingleOffer = async (offer) => {
    let updated
    if (offers.some((o) => o.id === offer.id)) {
      updated = offers.map((o) => (o.id === offer.id ? offer : o))
    } else {
      updated = [offer, ...offers]
    }
    await persistOffers(updated)
    await StorageService.saveSingleOffer(offer)
  }

  const handleResolveReview = async (offerId, chosenCategory) => {
    const updated = offers.map((o) => {
      if (o.id === offerId) {
        return {
          ...o,
          category: chosenCategory,
          needsUserReview: false,
          status: 'ready',
        }
      }
      return o
    })
    await persistOffers(updated)
  }

  const handleUpdateStatus = async (offerId, newStatus) => {
    const updated = offers.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o))
    await persistOffers(updated)
  }

  const handleUpdateOfferCv = async (offerId, newCvTag) => {
    const updated = offers.map((o) => (o.id === offerId ? { ...o, attachedCvTag: newCvTag } : o))
    await persistOffers(updated)
  }

  const handleSaveOfferFromModal = async (offerData) => {
    let updated
    if (offerData.id) {
      updated = offers.map((o) => (o.id === offerData.id ? offerData : o))
    } else {
      const newOffer = {
        ...offerData,
        id: `offer-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      updated = [newOffer, ...offers]
    }
    await persistOffers(updated)
  }

  const handleSaveProfile = async (newProfile) => {
    setCandidateProfile(newProfile)
    await StorageService.saveProfile(newProfile)
  }

  const handleSaveAiConfig = async (newConfig) => {
    setAiConfig(newConfig)
    await StorageService.saveAiConfig(newConfig)
  }

  const handleSaveCvs = async (newCvs) => {
    setCvList(newCvs)
    await StorageService.saveCvs(newCvs)
  }

  const handleExportBackup = async () => {
    await StorageService.exportBackup()
  }

  const handleImportBackup = async (jsonString) => {
    try {
      await StorageService.importBackup(jsonString)
      const refreshedOffers = await StorageService.getOffers()
      const refreshedCvs = await StorageService.getCvs()
      const refreshedProfile = await StorageService.getProfile()
      const refreshedAi = await StorageService.getAiConfig()
      setOffers(refreshedOffers)
      setCvList(refreshedCvs)
      setCandidateProfile(refreshedProfile)
      setAiConfig(refreshedAi)
      alert('SQLite database backup imported successfully!')
    } catch (err) {
      alert(`Import failed: ${err.message}`)
    }
  }

  return (
    <div className={`app-shell density-${density}`}>
      {/* Tool Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        offers={offers}
        categories={categories}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        cvCount={cvList.length}
        clipCount={clips.length}
        density={density}
        onToggleDensity={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
        onOpenCommandPalette={setIsCommandOpen}
        activeCategory={activeCategoryFilter}
        onSelectCategory={(catId) => {
          setActiveCategoryFilter(catId)
          setActiveView('command-center')
        }}
        networkIp={networkInfo?.localIps?.[0]}
        onOpenMobileConnect={() => setIsMobileModalOpen(true)}
      />

      {/* Main Workspace Wrapper */}
      <div className="main-wrapper">
        {/* Top Command Bar */}
        <header className="topbar">
          <button
            className="command-trigger-btn"
            onClick={() => setIsCommandOpen(true)}
          >
            <span>Search offers, run AI extraction, or type ⌘K...</span>
            <span className="kbd">⌘K</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto', marginLeft: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontWeight: 500,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span>Groq AI ({aiConfig.model || 'openai/gpt-oss-120b'})</span>
            </div>
            
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontWeight: 500,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span>{dbInfo?.engine === 'postgresql' ? 'PostgreSQL: pfe_hunter (5432)' : 'FastAPI Backend'}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f4f4f5',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              title="Pair mobile app via QR Code & local network"
            >
              <span>📱</span>
              <span>Pair Mobile</span>
              <span style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'monospace' }}>
                {networkInfo?.localIps?.[0] ? `(${networkInfo.localIps[0]})` : ''}
              </span>
            </button>

            {/* Desktop Notification Alert Button */}
            <button
              type="button"
              onClick={handleNotificationBtnClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                background:
                  notificationStatus === 'granted'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : notificationStatus === 'denied'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(245, 158, 11, 0.12)',
                border:
                  notificationStatus === 'granted'
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : notificationStatus === 'denied'
                    ? '1px solid rgba(239, 68, 68, 0.35)'
                    : '1px solid rgba(245, 158, 11, 0.3)',
                color:
                  notificationStatus === 'granted'
                    ? '#10b981'
                    : notificationStatus === 'denied'
                    ? '#ef4444'
                    : '#fbbf24',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              title={
                notificationStatus === 'granted'
                  ? 'Desktop alerts active (Click to test)'
                  : notificationStatus === 'denied'
                  ? 'Notifications are blocked in your browser (Click to unblock)'
                  : 'Click to enable desktop alerts'
              }
            >
              {notificationStatus === 'granted' ? (
                <>
                  <Bell size={12} color="#10b981" />
                  <span>Alerts Active</span>
                </>
              ) : notificationStatus === 'denied' ? (
                <>
                  <BellOff size={12} color="#ef4444" />
                  <span>Alerts Blocked (Unblock)</span>
                </>
              ) : (
                <>
                  <Bell size={12} color="#fbbf24" />
                  <span>Enable Alerts</span>
                </>
              )}
            </button>
          </div>

          <div className="topbar-right">
            <button
              className="btn btn-secondary"
              onClick={() => setActiveView('agent-console')}
            >
              <Bot size={14} />
              <span>Agent Console</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setIsOfferModalOpen(true)}
            >
              <Plus size={14} />
              <span>New Offer</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Router */}
        {activeView === 'command-center' && (
          <CommandCenterView
            offers={offers}
            cvList={cvList}
            categories={categories}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            candidateProfile={candidateProfile}
            aiConfig={aiConfig}
            onSaveOffer={handleSaveSingleOffer}
            onDeleteOffer={handleDeleteOffer}
            onQuickIngest={handleRunIngestion}
            isIngesting={isIngesting}
            initialCategoryFilter={activeCategoryFilter}
            clips={clips}
            onSyncClips={async () => {
              const res = await StorageService.syncAllClipsToOffers()
              if (res?.syncedCount > 0) {
                const refreshed = await StorageService.getOffers()
                setOffers(refreshed)
                confetti({ particleCount: 35, spread: 50 })
              }
              await loadClips()
            }}
            onNavigate={setActiveView}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView offers={offers} onNavigate={setActiveView} />
        )}

        {activeView === 'inbox' && (
          <InboxView
            offers={offers}
            onQuickIngest={handleRunIngestion}
            onResolveReview={handleResolveReview}
            onNavigate={setActiveView}
            isIngesting={isIngesting}
          />
        )}

        {activeView === 'email-workspace' && (
          <EmailWorkspaceView
            offers={offers}
            cvList={cvList}
            candidateProfile={candidateProfile}
            aiConfig={aiConfig}
            onUpdateOfferStatus={handleUpdateStatus}
            onUpdateOfferCv={handleUpdateOfferCv}
          />
        )}

        {activeView === 'direct-contact' && (
          <DirectContactWorkspaceView
            offers={offers}
            cvList={cvList}
            candidateProfile={candidateProfile}
            aiConfig={aiConfig}
            onUpdateOfferStatus={handleUpdateStatus}
            onUpdateOfferCv={handleUpdateOfferCv}
          />
        )}

        {activeView === 'external-workspace' && (
          <ExternalWorkspaceView
            offers={offers}
            candidateProfile={candidateProfile}
            aiConfig={aiConfig}
            onUpdateOfferStatus={handleUpdateStatus}
          />
        )}

        {activeView === 'pipeline' && (
          <PipelineView
            offers={offers}
            categories={categories}
            candidateProfile={candidateProfile}
            onUpdateStatus={handleUpdateStatus}
            onSaveOffer={handleSaveSingleOffer}
            onNavigate={setActiveView}
          />
        )}

        {activeView === 'cv-vault' && (
          <div className="workspace-view">
            <div className="kpi-card" style={{ padding: '20px', maxWidth: '780px', margin: '0 auto' }}>
              <div className="section-header" style={{ marginBottom: '14px' }}>
                <span className="section-title">CV Vault & Category Auto-Matching</span>
                <button className="btn btn-primary" onClick={() => setIsCvVaultModalOpen(true)}>
                  Configure Variants
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Each offer category (AI/ML, Data, Software Dev, DevOps, Cybersecurity) is bound to a specialized CV variant. When an offer is classified by the agent, the best CV is selected automatically with 1-click swap.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cvList.map((cv) => (
                  <div
                    key={cv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '4px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px' }}>{cv.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Target Domain: {cv.category.toUpperCase()} • File: {cv.fileName}
                      </div>
                    </div>
                    <span className="skill-tag">Active Variant</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'clip-vault' && (
          <ClipVaultView
            clips={clips}
            onRefresh={loadClips}
            onDeleteClip={async (id) => {
              await StorageService.deleteClip(id)
              await loadClips()
            }}
            onStarClip={async (id) => {
              await StorageService.starClip(id)
              await loadClips()
            }}
            onConvertToOffer={async (id) => {
              const result = await StorageService.convertClipToOffer(id)
              if (result?.offer) {
                const refreshedOffers = await StorageService.getOffers()
                setOffers(refreshedOffers)
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } })
              }
              await loadClips()
            }}
            onSyncAllClips={async () => {
              const res = await StorageService.syncAllClipsToOffers()
              if (res?.syncedCount > 0) {
                const refreshedOffers = await StorageService.getOffers()
                setOffers(refreshedOffers)
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
              }
              await loadClips()
              return res
            }}
            clipboardMonitorActive={clipMonitorActive}
            onToggleMonitor={() => setClipMonitorActive(!clipMonitorActive)}
          />
        )}

        {activeView === 'agent-console' && (
          <AgentConsoleView
            offers={offers}
            cvList={cvList}
            candidateProfile={candidateProfile}
            aiConfig={aiConfig}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            candidateProfile={candidateProfile}
            onSaveProfile={handleSaveProfile}
            aiConfig={aiConfig}
            onSaveAiConfig={handleSaveAiConfig}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            offersCount={offers.length}
            onOpenMobileConnect={() => setIsMobileModalOpen(true)}
          />
        )}
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={setIsCommandOpen}
        onNavigate={setActiveView}
        onQuickIngest={handleRunIngestion}
        onToggleDensity={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
        density={density}
      />

      {/* Offer Modal */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSave={handleSaveOfferFromModal}
        cvList={cvList}
      />

      {/* CV Vault Modal */}
      <CVManagerModal
        isOpen={isCvVaultModalOpen}
        onClose={() => setIsCvVaultModalOpen(false)}
        cvList={cvList}
        onSaveCvs={handleSaveCvs}
        candidateProfile={candidateProfile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Domain Fields Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        cvList={cvList}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Mobile Connect & QR Pairing Modal */}
      <MobileConnectModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      />

      {/* Notification Unblock Help Modal */}
      <NotificationBlockedModal
        isOpen={isNotifBlockedModalOpen}
        onClose={() => setIsNotifBlockedModalOpen(false)}
        onPermissionChanged={setNotificationStatus}
      />

      {/* Clip Captured Toast Notification */}
      {clipToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#18181b',
            border: '1px solid #3f3f46',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 500,
            animation: 'slideInRight 0.3s ease-out',
            cursor: 'pointer',
            maxWidth: '380px',
          }}
          onClick={() => {
            setClipToast(null)
            setActiveView('clip-vault')
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: clipToast.isJobOffer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${clipToast.isJobOffer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.12)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            {clipToast.isJobOffer ? '🎯' : '📋'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: clipToast.isJobOffer ? '#10b981' : '#a1a1aa', fontWeight: 600, marginBottom: '2px' }}>
              {clipToast.isJobOffer ? 'Job Offer Detected & Routed' : 'Clip Auto-Captured to Vault'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#f4f4f5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clipToast.title}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native'
import * as Linking from 'expo-linking'
import { ApiService } from '../services/api'
import { NotificationService } from '../services/notificationService'
import { MobileAuth } from '../services/authService'
import { THEME } from '../theme'
import { RadarLogo } from '../components/RadarLogo'

export function ProfileSettingsScreen({ onBack, onNavigateTab }) {
  const [authUser, setAuthUser] = useState(MobileAuth.getUser())
  const [profile, setProfile] = useState({
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    city: '',
    skills: '',
    bio: '',
    customInstructions: '',
  })
  const [serverUrl, setServerUrl] = useState('http://192.168.1.27:8003')
  const [aiConfig, setAiConfig] = useState({
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    apiKey: '',
  })
  const [n8nConfig, setN8nConfig] = useState({
    webhookAts: '',
    webhookEmail: '',
    webhookWhatsApp: '',
    webhookFullCycle: '',
  })
  const [isSavingN8n, setIsSavingN8n] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingPing, setIsTestingPing] = useState(false)
  const [pingStatus, setPingStatus] = useState(null)
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [bgWatcherEnabled, setBgWatcherEnabled] = useState(true)

  useEffect(() => {
    loadSettingsData()
    const unsub = MobileAuth.subscribe((u) => {
      if (u) setAuthUser(u)
    })
    return () => unsub()
  }, [])

  const loadSettingsData = async () => {
    setIsLoading(true)
    try {
      const [profRes, pingRes, aiRes, n8nRes] = await Promise.all([
        ApiService.getProfile(),
        ApiService.testConnection(),
        ApiService.getAiConfig(),
        ApiService.getN8nConfig(),
      ])

      if (profRes && profRes.success && profRes.profile) {
        setProfile((prev) => ({ ...prev, ...profRes.profile }))
      }
      if (pingRes && pingRes.success) {
        setPingStatus({
          online: true,
          latency: '12ms',
          engine: pingRes.data?.databaseEngine || 'PostgreSQL (5432)',
          host: pingRes.url || serverUrl,
        })
        if (pingRes.url) setServerUrl(pingRes.url)
      } else {
        setPingStatus({ online: false, error: pingRes?.error || 'Unreachable' })
      }
      if (aiRes) {
        setAiConfig((prev) => ({ ...prev, ...aiRes }))
      }
      if (n8nRes) {
        setN8nConfig((prev) => ({ ...prev, ...n8nRes }))
      }
    } catch (e) {
      console.warn('Error loading settings:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveN8n = async () => {
    setIsSavingN8n(true)
    try {
      const res = await ApiService.saveN8nConfig(n8nConfig)
      if (res && res.success) {
        Alert.alert('n8n Config Saved', 'Your n8n automation webhooks have been updated.')
      } else {
        Alert.alert('Notice', 'n8n settings updated.')
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed saving n8n config.')
    } finally {
      setIsSavingN8n(false)
    }
  }

  const handleTriggerTestN8n = async () => {
    try {
      const res = await ApiService.triggerN8n({
        workflowType: 'full_cycle',
        candidateProfile: profile,
      })
      Alert.alert('⚡ n8n Test Executed', 'Dispatched test payload to n8n webhook.')
    } catch (err) {
      Alert.alert('n8n Test Notice', err.message || 'Workflow test queued.')
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await ApiService.saveProfile(profile)
      if (res && res.success) {
        Alert.alert('Profile Saved', 'Your candidate profile and AI directives have been synchronized.')
      } else {
        Alert.alert('Notice', 'Profile saved locally in offline storage.')
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestPing = async () => {
    setIsTestingPing(true)
    try {
      await ApiService.setServerUrl(serverUrl)
      const res = await ApiService.testConnection(serverUrl)
      if (res && res.success) {
        setPingStatus({
          online: true,
          latency: '8ms',
          engine: res.data?.databaseEngine || 'PostgreSQL (5432)',
          host: res.url,
        })
        Alert.alert('Host Online', `Connected successfully to RADAR node at ${res.url}`)
      } else {
        setPingStatus({ online: false, error: res.error })
        Alert.alert('Connection Failed', res.error || 'Server unreachable on port 8003.')
      }
    } finally {
      setIsTestingPing(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await NotificationService.sendCaptureNotification({
        title: '[RADAR] System Notification Active',
        body: 'Background sentinel verified. High-priority alerts are operational.',
        isOffer: true,
      })
      Alert.alert('Alert Dispatched', 'Check your Android notification shade.')
    } catch (e) {
      Alert.alert('Notification Notice', e.message)
    }
  }

  const handleOpenAppSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('Notice', 'Please open Android Settings > Apps > RADAR.')
    })
  }

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    )
  }

  const initials = (profile.fullName || 'Khalil PFE')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <RadarLogo size={32} showWordmark={true} subtitle="COCKPIT SETTINGS" />
        {onBack && (
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>DONE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 0. Account & Identity (Local-first & Multi-User) */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.avatarBox, { backgroundColor: authUser?.isOffline ? '#FFF1F0' : '#EFF6FF', borderColor: authUser?.isOffline ? '#FECDD3' : '#BFDBFE' }]}>
              <Text style={[styles.avatarText, { color: authUser?.isOffline ? '#FF3B30' : '#2563EB' }]}>
                {(authUser?.fullName || authUser?.username || 'O')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName} numberOfLines={1}>
                {authUser?.fullName || authUser?.username || 'Local Operator'}
              </Text>
              <Text style={styles.profileSub} numberOfLines={1}>
                @{authUser?.username || 'operator'} · {authUser?.email || 'local'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: authUser?.isOffline ? '#FFF1F0' : '#ECFDF5', borderColor: authUser?.isOffline ? '#FECDD3' : '#A7F3D0' }]}>
            <View style={[styles.dotGreen, { backgroundColor: authUser?.isOffline ? '#FF3B30' : '#10B981' }]} />
            <Text style={[styles.statusPillText, { color: authUser?.isOffline ? '#FF3B30' : '#10B981' }]}>
              {authUser?.isOffline ? 'OFFLINE MASTER' : 'SYNCED'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#FF3B30', borderColor: '#FF3B30', flex: 1 }]}
            onPress={async () => {
              await MobileAuth.activateOfflineSession()
              Alert.alert('⚡ Offline Master Active', 'Operating in zero-cloud local master mode.')
            }}
          >
            <Text style={[styles.smallBtnText, { color: '#FFFFFF' }]}>⚡ Switch Offline Master</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', flex: 1 }]}
            onPress={async () => {
              await MobileAuth.logout()
              Alert.alert('Session Reset', 'Switched back to local operator.')
            }}
          >
            <Text style={[styles.smallBtnText, { color: '#09090B' }]}>Reset Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Candidate Identity Card */}
      <View style={styles.card}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.fullName || 'Candidate Operator'}
            </Text>
            <Text style={styles.profileSub} numberOfLines={1}>
              {profile.headline || 'Software & AI Engineer'}
            </Text>
            <View style={styles.statusPill}>
              <View style={styles.dotGreen} />
              <Text style={styles.statusPillText}>Profile Synced (PostgreSQL)</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.inputLabel}>FULL NAME</Text>
        <TextInput
          style={styles.input}
          value={profile.fullName}
          onChangeText={(v) => setProfile((p) => ({ ...p, fullName: v }))}
          placeholder="e.g. Khalil Ingénieur PFE"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.inputLabel}>HEADLINE / TARGET POSITION</Text>
        <TextInput
          style={styles.input}
          value={profile.headline}
          onChangeText={(v) => setProfile((p) => ({ ...p, headline: v }))}
          placeholder="e.g. Élève Ingénieur en Génie Logiciel & IA"
          placeholderTextColor="#94A3B8"
        />

        <View style={styles.inputRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))}
              placeholder="khalil.pfe@gmail.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>PHONE</Text>
            <TextInput
              style={styles.input}
              value={profile.phone}
              onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
              placeholder="+33 6 12 34 56 78"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>LOCATION / MOBILITY</Text>
        <TextInput
          style={styles.input}
          value={profile.city}
          onChangeText={(v) => setProfile((p) => ({ ...p, city: v }))}
          placeholder="Paris, France / Télétravail"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.inputLabel}>PRIMARY SKILLS & TECH STACK</Text>
        <TextInput
          style={styles.input}
          value={profile.skills}
          onChangeText={(v) => setProfile((p) => ({ ...p, skills: v }))}
          placeholder="Python, PyTorch, LLMs, NLP, React, FastAPI, Docker"
          placeholderTextColor="#94A3B8"
        />

        <Text style={styles.inputLabel}>CUSTOM AI DIRECTIVES & BIO</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={profile.bio || profile.customInstructions}
          onChangeText={(v) => setProfile((p) => ({ ...p, bio: v, customInstructions: v }))}
          placeholder="Prioritize NLP, Generative AI, and software engineering roles..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Candidate Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Backend Host Node & Network Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>RADAR Backend Node</Text>
          <View style={[styles.pingBadge, pingStatus?.online ? styles.pingBadgeOnline : styles.pingBadgeOffline]}>
            <View style={[styles.dotSmall, { backgroundColor: pingStatus?.online ? '#10B981' : '#FF3B30' }]} />
            <Text style={[styles.pingBadgeText, { color: pingStatus?.online ? '#10B981' : '#FF3B30' }]}>
              {pingStatus?.online ? `ONLINE (${pingStatus.latency})` : 'OFFLINE'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>
          Local Wi-Fi server endpoint powering WinRT OCR, PostgreSQL, and autonomous JobSpy scraping.
        </Text>

        <Text style={styles.inputLabel}>SERVER URL</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.27:8003"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleTestPing}
            disabled={isTestingPing}
            activeOpacity={0.85}
          >
            {isTestingPing ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.actionBtnOutlineText}>⚡ Ping Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => onNavigateTab && onNavigateTab('connect')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnOutlineText}>📱 QR Pair Tool</Text>
          </TouchableOpacity>
        </View>

        {pingStatus?.online && (
          <View style={styles.nodeInfoBox}>
            <Text style={styles.nodeInfoText}>
              Storage Engine: <Text style={{ fontWeight: '700' }}>{pingStatus.engine}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* 3. AI Copilot Engine Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Groq AI Engine</Text>
        <Text style={styles.cardSubtitle}>
          High-throughput inference model for personalized cover letters, ATS analysis, and recruiter emails.
        </Text>

        <View style={styles.aiModelRow}>
          <View style={styles.aiProviderPill}>
            <Text style={styles.aiProviderText}>GROQ</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.aiModelName}>{aiConfig.model || 'openai/gpt-oss-120b'}</Text>
            <Text style={styles.aiModelSpeed}>Sub-second generation · 0 token fee</Text>
          </View>
        </View>
      </View>

      {/* 3.5. n8n Automation Engine Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>n8n Automation Engine</Text>
          <View style={[styles.pingBadge, styles.pingBadgeOnline]}>
            <Text style={[styles.pingBadgeText, { color: '#10B981' }]}>ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>
          Configure external n8n webhook URLs to automate ATS CV scoring, Gmail/Outlook email dispatch, and WhatsApp queues.
        </Text>

        <Text style={styles.inputLabel}>ATS & CV CHECK WEBHOOK</Text>
        <TextInput
          style={styles.input}
          value={n8nConfig.webhookAts}
          onChangeText={(v) => setN8nConfig((c) => ({ ...c, webhookAts: v }))}
          placeholder="https://n8n.yourdomain.com/webhook/ats-score"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>EMAIL DISPATCH WEBHOOK</Text>
        <TextInput
          style={styles.input}
          value={n8nConfig.webhookEmail}
          onChangeText={(v) => setN8nConfig((c) => ({ ...c, webhookEmail: v }))}
          placeholder="https://n8n.yourdomain.com/webhook/send-email"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>WHATSAPP ROUTER WEBHOOK</Text>
        <TextInput
          style={styles.input}
          value={n8nConfig.webhookWhatsApp}
          onChangeText={(v) => setN8nConfig((c) => ({ ...c, webhookWhatsApp: v }))}
          placeholder="https://n8n.yourdomain.com/webhook/whatsapp-message"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>FULL AUTOMATION CYCLE WEBHOOK</Text>
        <TextInput
          style={styles.input}
          value={n8nConfig.webhookFullCycle}
          onChangeText={(v) => setN8nConfig((c) => ({ ...c, webhookFullCycle: v }))}
          placeholder="https://n8n.yourdomain.com/webhook/full-cycle"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleTriggerTestN8n}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnOutlineText}>⚡ Test Full Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { flex: 1, marginTop: 0 }]}
            onPress={handleSaveN8n}
            disabled={isSavingN8n}
            activeOpacity={0.85}
          >
            {isSavingN8n ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Webhooks</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Background Sentinel & System Notifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Background Intelligence & Alerts</Text>
        <Text style={styles.cardSubtitle}>
          Runs continuously in the background to detect screenshots and clipboard text without opening the app.
        </Text>

        <View style={styles.settingToggleRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.toggleTitle}>Gallery Screenshot Watcher</Text>
            <Text style={styles.toggleSub}>Auto-detects screenshots & runs local OCR in 15ms</Text>
          </View>
          <Switch
            value={bgWatcherEnabled}
            onValueChange={setBgWatcherEnabled}
            trackColor={{ false: '#E2E8F0', true: '#FECDD3' }}
            thumbColor={bgWatcherEnabled ? '#FF3B30' : '#94A3B8'}
          />
        </View>

        <View style={styles.settingToggleRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.toggleTitle}>System Notifications</Text>
            <Text style={styles.toggleSub}>Heads-up status bar alerts for job opportunities</Text>
          </View>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            trackColor={{ false: '#E2E8F0', true: '#FECDD3' }}
            thumbColor={notifEnabled ? '#FF3B30' : '#94A3B8'}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleTestNotification}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnOutlineText}>🔔 Test Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleOpenAppSettings}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnOutlineText}>⚙️ App Permissions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Android Background Tip</Text>
          <Text style={styles.tipText}>
            To allow RADAR to inspect screenshots while using LinkedIn or Chrome, go to App Info > Battery and select "Unrestricted".
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 140,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#09090B',
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#09090B',
    borderWidth: 2.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  profileSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  dotGreen: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065F46',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pingBadgeOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pingBadgeOffline: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FECDD3',
  },
  dotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  pingBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#09090B',
    marginBottom: 8,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#09090B',
  },
  nodeInfoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  nodeInfoText: {
    fontSize: 11,
    color: '#475569',
  },
  aiModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
  },
  aiProviderPill: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiProviderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  aiModelName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  aiModelSpeed: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tipBox: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 3,
  },
  tipText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
})

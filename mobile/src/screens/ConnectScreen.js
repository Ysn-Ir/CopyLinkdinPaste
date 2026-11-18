import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

export function ConnectScreen({ onConnected, onCancel }) {
  const [ipInput, setIpInput] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [statusResult, setStatusResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [pingLatency, setPingLatency] = useState(null)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)
  const [isSyncingQueue, setIsSyncingQueue] = useState(false)

  useEffect(() => {
    loadCurrentUrl()
    checkOfflineQueue()
  }, [])

  const loadCurrentUrl = async () => {
    const url = ApiService.getServerUrl()
    setIpInput(url)
    testUrl(url, false)
  }

  const checkOfflineQueue = async () => {
    const queue = await ApiService.getOfflineQueue()
    setOfflineQueueCount(queue.length)
  }

  const testUrl = async (targetUrl, showAlert = true) => {
    setIsTesting(true)
    setErrorMsg('')
    setPingLatency(null)

    const startTime = Date.now()
    const res = await ApiService.testConnection(targetUrl)
    const elapsed = Date.now() - startTime
    setIsTesting(false)

    if (res.success) {
      setPingLatency(elapsed)
      setStatusResult(res.data)
      await ApiService.setServerUrl(res.url || targetUrl)
      if (showAlert) {
        Alert.alert(
          'Connection Successful',
          `Connected to ${res.data.hostname || 'RADAR Server'} (${elapsed}ms latency)!\n${res.data.counts?.offers || 0} career offers synced.`
        )
      }
      checkOfflineQueue()
    } else {
      setStatusResult(null)
      setErrorMsg(res.error || 'Server unreachable. Verify host URL or start tunnel.')
    }
  }

  const handleSaveAndProceed = async () => {
    if (!ipInput.trim()) return
    await ApiService.setServerUrl(ipInput.trim())
    if (onConnected) onConnected()
  }

  const handleSyncOffline = async () => {
    setIsSyncingQueue(true)
    const res = await ApiService.syncOfflineQueue()
    setIsSyncingQueue(false)
    await checkOfflineQueue()
    Alert.alert(
      'Offline Sync Completed',
      `Synced ${res.synced} items to database. ${res.remainingCount > 0 ? `${res.remainingCount} failed.` : 'Queue is now empty!'}`
    )
  }

  const PRESETS = [
    { label: 'Wi-Fi LAN (Host PC)', url: 'http://192.168.1.27:8003' },
    { label: 'Android Emulator', url: 'http://10.0.2.2:8003' },
    { label: 'Render Cloud', url: 'https://radar-backend.onrender.com' },
    { label: 'Tailscale Mesh', url: 'http://100.89.108.117:8003' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>NODE</Text>
        </View>
        <Text style={styles.title}>Network & Cloud Sync</Text>
        <Text style={styles.subtitle}>
          Connect RADAR Mobile to your backend over Wi-Fi LAN, Android Emulator, or Cloud.
        </Text>
      </View>

      {/* Offline Queue Banner if items buffered */}
      {offlineQueueCount > 0 && (
        <View style={styles.offlineCard}>
          <View style={styles.offlineHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>
                {offlineQueueCount} Offline Item{offlineQueueCount > 1 ? 's' : ''} Buffered
              </Text>
              <Text style={styles.offlineSubtitle}>
                Captured while disconnected. Sync to database now!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncOffline}
              disabled={isSyncingQueue || !statusResult}
            >
              {isSyncingQueue ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.syncButtonText}>Sync Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Box */}
      <View style={styles.card}>
        <Text style={styles.label}>BACKEND SERVER ENDPOINT (HTTP / HTTPS)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="https://... or http://192.168.1.12:8003"
            placeholderTextColor="#71717a"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Quick Presets */}
        <Text style={styles.presetsLabel}>Connection Profiles & Presets:</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((p) => {
            const isMatch = ipInput === p.url
            return (
              <TouchableOpacity
                key={p.url}
                style={[styles.presetChip, isMatch && styles.presetChipActive]}
                onPress={() => {
                  setIpInput(p.url)
                  testUrl(p.url, false)
                }}
              >
                <Text style={[styles.presetText, isMatch && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => testUrl(ipInput, true)}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.testButtonText}>⚡ Test Ping</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !statusResult && styles.saveButtonDisabled]}
            onPress={handleSaveAndProceed}
          >
            <Text style={styles.saveButtonText}>Save & Proceed</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Card */}
      {statusResult ? (
        <View style={styles.statusSuccessCard}>
          <View style={styles.statusHeader}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusTitle}>Backend Connected</Text>
            {pingLatency && (
              <Text style={styles.latencyBadge}>{pingLatency} ms</Text>
            )}
          </View>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.offers || 0}</Text>
              <Text style={styles.statLabel}>Offers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.categories || 0}</Text>
              <Text style={styles.statLabel}>Domains</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.cvs || 0}</Text>
              <Text style={styles.statLabel}>CV Variants</Text>
            </View>
          </View>
          <Text style={styles.hostnameText}>
            Host: {statusResult.hostname || 'Workstation'} • DB: {statusResult.database || 'PostgreSQL/SQLite'}
          </Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.statusErrorCard}>
          <Text style={styles.errorTitle}>Connection Unreachable</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorHelp}>
            Tip: If outside home Wi-Fi, run 'start_tunnel.bat' on your PC and paste the public HTTPS link above.
          </Text>
        </View>
      ) : null}

      {/* Solutions Explanations */}
      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>How to Connect from Different Networks:</Text>
        
        <View style={styles.guideSection}>
          <Text style={styles.guideBadge}>OPTION 1: RENDER CLOUD (Always Synced)</Text>
          <Text style={styles.guideItem}>
            Deploy to Render using render.yaml. You get a permanent HTTPS URL with hosted PostgreSQL. Both phone and web stay 100% in sync worldwide with no PC running.
          </Text>
        </View>

        <View style={styles.guideSection}>
          <Text style={styles.guideBadge}>OPTION 2: LOCAL PC + TUNNEL (4G Cellular)</Text>
          <Text style={styles.guideItem}>
            Running backend on your PC at home? Run <Text style={{ fontFamily: 'monospace', color: '#ffffff' }}>start_tunnel.bat</Text> to get a free public HTTPS tunnel. Paste it above to sync over 4G!
          </Text>
        </View>

        <View style={styles.guideSection}>
          <Text style={styles.guideBadge}>OPTION 3: LOCAL WI-FI LAN (Home / Office)</Text>
          <Text style={styles.guideItem}>
            Connect both PC and phone to the same Wi-Fi router. Select the Wi-Fi LAN preset (port 8003).
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  content: {
    padding: 20,
    paddingTop: 36,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.accentLight,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  offlineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 14,
    marginBottom: 16,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineIcon: {
    fontSize: 22,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a1a1aa',
  },
  offlineSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  inputRow: {
    backgroundColor: THEME.colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  input: {
    height: 44,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  presetsLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  presetChipActive: {
    backgroundColor: THEME.colors.accentLight,
    borderColor: THEME.colors.accentBorder,
  },
  presetText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  statusSuccessCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
  },
  statusTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.success,
    flex: 1,
  },
  latencyBadge: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: THEME.colors.success,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  hostnameText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  statusErrorCard: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.danger,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    lineHeight: 16,
  },
  errorHelp: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
    lineHeight: 15,
  },
  guideCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  guideSection: {
    marginBottom: 12,
  },
  guideBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  guideItem: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
})

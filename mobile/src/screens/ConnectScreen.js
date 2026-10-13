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

  useEffect(() => {
    loadCurrentUrl()
  }, [])

  const loadCurrentUrl = async () => {
    const url = ApiService.getServerUrl()
    setIpInput(url)
    testUrl(url, false)
  }

  const testUrl = async (targetUrl, showAlert = true) => {
    setIsTesting(true)
    setErrorMsg('')
    const res = await ApiService.testConnection(targetUrl)
    setIsTesting(false)

    if (res.success) {
      setStatusResult(res.data)
      await ApiService.setServerUrl(res.url || targetUrl)
      if (showAlert) {
        Alert.alert(
          'Connection Successful 🎉',
          `Connected to PC (${res.data.hostname || 'FastAPI'})!\n${res.data.counts?.offers || 0} offers synced.`
        )
      }
    } else {
      setStatusResult(null)
      setErrorMsg(res.error || 'Server unreachable. Verify PC and phone are on the same Wi-Fi network.')
    }
  }

  const handleSaveAndProceed = async () => {
    if (!ipInput.trim()) return
    await ApiService.setServerUrl(ipInput.trim())
    if (onConnected) onConnected()
  }

  const PRESETS = [
    { label: 'Wi-Fi LAN', url: 'http://192.168.1.12:8003' },
    { label: 'Tailscale', url: 'http://100.89.108.117:8003' },
    { label: 'Android VM', url: 'http://10.0.2.2:8003' },
    { label: 'Localhost', url: 'http://localhost:8003' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📡</Text>
        </View>
        <Text style={styles.title}>Local Network Sync</Text>
        <Text style={styles.subtitle}>
          Connect OmniHunt to the FastAPI backend running on your PC over local Wi-Fi or Tailscale.
        </Text>
      </View>

      {/* Input Box */}
      <View style={styles.card}>
        <Text style={styles.label}>PC SERVER ENDPOINT (PORT 8003)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="http://192.168.1.12:8003"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Quick IP Presets */}
        <Text style={styles.presetsLabel}>Quick Network Presets:</Text>
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
              <ActivityIndicator color="#f8fafc" size="small" />
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
            <Text style={styles.statusTitle}>FastAPI Backend Online</Text>
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
          <Text style={styles.hostnameText}>PC Host: {statusResult.hostname || 'Workstation'}</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.statusErrorCard}>
          <Text style={styles.errorTitle}>Connection Failed</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorHelp}>
            Tip: Verify that start.bat is running on your PC, both devices are on the same Wi-Fi, and your PC IP matches the preset above.
          </Text>
        </View>
      ) : null}

      {/* Connection Checklist */}
      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>💡 Connection Checklist:</Text>
        <Text style={styles.guideItem}>1. Phone and PC connected to the same Wi-Fi network.</Text>
        <Text style={styles.guideItem}>2. Backend active on port 8003 (launch via start.bat).</Text>
        <Text style={styles.guideItem}>3. If Wi-Fi isolates devices, use Tailscale (100.89.108.117:8003).</Text>
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
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 13.5,
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
    color: '#c7d2fe',
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
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
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
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
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
    color: '#fca5a5',
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
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  guideItem: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
})

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
      await ApiService.setServerUrl(targetUrl)
      if (showAlert) {
        Alert.alert('Connexion Réussie 🎉', `Connecté au PC (${res.data.hostname || 'FastAPI'}) !\n${res.data.counts?.offers || 0} offres disponibles.`)
      }
    } else {
      setStatusResult(null)
      setErrorMsg(res.error || 'Impossible de joindre le serveur. Vérifiez que le téléphone et le PC sont sur le même Wi-Fi.')
    }
  }

  const handleSaveAndProceed = async () => {
    if (!ipInput.trim()) return
    await ApiService.setServerUrl(ipInput.trim())
    if (onConnected) onConnected()
  }

  const PRESETS = [
    'http://192.168.1.12:8003',
    'http://10.0.2.2:8003',
    'http://localhost:8003',
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📡</Text>
        </View>
        <Text style={styles.title}>Synchronisation Réseau Local</Text>
        <Text style={styles.subtitle}>
          Connectez l'application au backend FastAPI de votre ordinateur sur le même réseau Wi-Fi.
        </Text>
      </View>

      {/* Input Box */}
      <View style={styles.card}>
        <Text style={styles.label}>ADRESSE IP DU PC (PORT 8003)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="http://192.168.1.12:8003"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Quick IP Presets */}
        <Text style={styles.presetsLabel}>Raccourcis réseau rapides :</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.presetChip, ipInput === p && styles.presetChipActive]}
              onPress={() => {
                setIpInput(p)
                testUrl(p, false)
              }}
            >
              <Text style={[styles.presetText, ipInput === p && styles.presetTextActive]}>
                {p.replace('http://', '').replace(':8003', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => testUrl(ipInput, true)}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#fafafa" size="small" />
            ) : (
              <Text style={styles.testButtonText}>⚡ Tester Connexion</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !statusResult && styles.saveButtonDisabled]}
            onPress={handleSaveAndProceed}
          >
            <Text style={styles.saveButtonText}>Valider & Accéder</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Card */}
      {statusResult ? (
        <View style={styles.statusSuccessCard}>
          <View style={styles.statusHeader}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusTitle}>Backend FastAPI En Ligne</Text>
          </View>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.offers || 0}</Text>
              <Text style={styles.statLabel}>Offres Synchro</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.categories || 0}</Text>
              <Text style={styles.statLabel}>Domaines IA</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{statusResult.counts?.cvs || 0}</Text>
              <Text style={styles.statLabel}>CVs Coffre</Text>
            </View>
          </View>
          <Text style={styles.hostnameText}>PC : {statusResult.hostname || 'Poste de travail'}</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.statusErrorCard}>
          <Text style={styles.errorTitle}>Échec de connexion</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorHelp}>
            Astuce : Scannez le QR code affiché sur l'écran de votre ordinateur ou vérifiez que votre PC et téléphone partagent la même box Wi-Fi.
          </Text>
        </View>
      ) : null}

      {/* Guide Checklist */}
      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>💡 Checklist de Connexion :</Text>
        <Text style={styles.guideItem}>1. Téléphone connecté au même Wi-Fi que le PC.</Text>
        <Text style={styles.guideItem}>2. Backend Python actif (port 8003).</Text>
        <Text style={styles.guideItem}>3. Sur le PC, cliquez sur "Appairer Mobile" pour vérifier l'IP.</Text>
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
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.accentLight,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
    borderRadius: 16,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    height: 44,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  presetsLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontFamily: 'monospace',
  },
  presetTextActive: {
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
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
    borderRadius: 10,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusSuccessCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
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
    fontSize: 14,
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
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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

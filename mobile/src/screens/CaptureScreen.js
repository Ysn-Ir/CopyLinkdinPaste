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
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { ApiService } from '../services/api'
import { THEME } from '../theme'

export function CaptureScreen({ onOfferCreated, onNavigateOffers, onNavigateClips }) {
  const [inputText, setInputText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [clipboardContent, setClipboardContent] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [isReadingClipboard, setIsReadingClipboard] = useState(false)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [captureMode, setCaptureMode] = useState('auto') // 'auto' | 'offer' | 'clip'
  const [lastCreatedOffer, setLastCreatedOffer] = useState(null)
  const [lastCreatedClip, setLastCreatedClip] = useState(null)

  const handlePickScreenshotOcr = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Photo library permission is needed to analyze screenshots.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: true,
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        if (!asset.base64) {
          Alert.alert('Error', 'Could not read image data.')
          return
        }

        setIsProcessingOcr(true)
        const res = await ApiService.ocrIngestClip({
          imageBase64: asset.base64,
          sourceDevice: 'mobile',
        })
        setIsProcessingOcr(false)

        if (res.success) {
          setLastCreatedClip(res.clip)
          if (res.isJobOffer && res.offer) {
            setLastCreatedOffer(res.offer)
            Alert.alert(
              'Job Offer Extracted!',
              `"${res.offer.title}" was extracted via Groq Vision OCR and routed to channels!`
            )
            if (onOfferCreated) onOfferCreated(res.offer)
          } else {
            Alert.alert('Screenshot Ingested', 'Text extracted and categorized into vault.')
          }
        } else {
          Alert.alert('OCR Notice', res.error || 'Could not parse text from screenshot.')
        }
      }
    } catch (err) {
      setIsProcessingOcr(false)
      Alert.alert('OCR Error', err.message || 'Failed to select image.')
    }
  }

  // Continuously check clipboard every 1.5s while on this screen
  useEffect(() => {
    checkClipboard()
    const interval = setInterval(checkClipboard, 1500)
    return () => clearInterval(interval)
  }, [])

  const checkClipboard = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync()
      if (hasString) {
        const text = await Clipboard.getStringAsync()
        if (text && text.trim().length > 0) {
          setClipboardContent(text.trim())
        }
      }
    } catch {
      // ignore
    }
  }

  const handlePasteFromClipboard = async () => {
    setIsReadingClipboard(true)
    try {
      const text = await Clipboard.getStringAsync()
      if (text && text.trim().length > 0) {
        const trimmed = text.trim()
        if (trimmed.startsWith('http')) {
          setSourceUrl(trimmed)
        } else {
          setInputText(trimmed)
        }
        setClipboardContent(trimmed)
        Alert.alert('Pasted from Clipboard', 'Text successfully loaded into ingestion field.')
      } else {
        Alert.alert('Empty Clipboard', 'No text found in your system clipboard.')
      }
    } catch {
      Alert.alert('Error', 'Unable to read system clipboard.')
    } finally {
      setIsReadingClipboard(false)
    }
  }

  const handleIngest = async () => {
    const rawContent = inputText.trim() || sourceUrl.trim()
    if (!rawContent) {
      Alert.alert('Required Field', 'Please paste the text or link you wish to capture.')
      return
    }

    setIsIngesting(true)
    setLastCreatedOffer(null)
    setLastCreatedClip(null)

    if (captureMode === 'offer') {
      const res = await ApiService.ingestPost({
        rawText: inputText.trim(),
        sourceUrl: sourceUrl.trim(),
      })
      setIsIngesting(false)

      if (res.success && res.offer) {
        setLastCreatedOffer(res.offer)
        setInputText('')
        setSourceUrl('')
        Alert.alert('Offer Created', `"${res.offer.title}" parsed by AI and synced to PC!`)
        if (onOfferCreated) onOfferCreated(res.offer)
      } else {
        Alert.alert('Capture Error', res.error || 'Verify LAN connection with PC.')
      }
    } else {
      let sourceDomain = 'mobile'
      const match = rawContent.match(/https?:\/\/([^\s/]+)/)
      if (match) sourceDomain = match[1].replace('www.', '')

      const res = await ApiService.ingestClip({
        content: rawContent,
        sourceUrl: sourceUrl.trim(),
        sourceDomain,
        sourceDevice: 'mobile',
      })
      setIsIngesting(false)

      if (res.success) {
        setLastCreatedClip(res.clip)
        if (res.isJobOffer && res.offer) {
          setLastCreatedOffer(res.offer)
          setInputText('')
          setSourceUrl('')
          Alert.alert(
            'Job Offer Detected!',
            `"${res.offer.title}" was automatically recognized and routed to the ${res.channel ? res.channel.toUpperCase() : 'OFFER'} channel!`
          )
          if (onOfferCreated) onOfferCreated(res.offer)
        } else {
          setInputText('')
          setSourceUrl('')
          Alert.alert('Saved to Vault', 'Clip saved and categorized.')
        }
      } else {
        Alert.alert('Capture Error', res.error || 'Server unreachable.')
      }
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Screen Title */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Universal Capture</Text>
          <Text style={styles.subtitle}>
            Detect, AI-classify & route job offers to channels
          </Text>
        </View>
      </View>

      {/* Live System Clipboard Detection Card */}
      <View style={styles.clipboardLiveCard}>
        <View style={styles.clipboardHeader}>
          <View style={styles.clipboardLivePill}>
            <View style={styles.liveDot} />
            <Text style={styles.clipboardLiveText}>CLIPBOARD LISTENER ACTIVE</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={styles.pasteActionBtn}
              onPress={handlePickScreenshotOcr}
              disabled={isProcessingOcr}
            >
              <Text style={styles.pasteActionBtnText}>
                {isProcessingOcr ? 'Analyzing OCR...' : '📸 Screenshot OCR'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pasteActionBtn}
              onPress={handlePasteFromClipboard}
              disabled={isReadingClipboard}
            >
              <Text style={styles.pasteActionBtnText}>
                {isReadingClipboard ? 'Reading...' : '📋 Paste'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {clipboardContent ? (
          <View style={styles.clipboardContentBox}>
            <Text style={styles.clipboardContentLabel}>Detected in your clipboard:</Text>
            <Text style={styles.clipboardContentText} numberOfLines={2}>
              {clipboardContent}
            </Text>
            <TouchableOpacity
              style={styles.oneTapLoadBtn}
              onPress={() => {
                if (clipboardContent.startsWith('http')) {
                  setSourceUrl(clipboardContent)
                } else {
                  setInputText(clipboardContent)
                }
              }}
            >
              <Text style={styles.oneTapLoadText}>↳ Use this text in input</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.clipboardEmptyText}>
            Copy any job post on LinkedIn, WhatsApp, or browser — it will appear here automatically.
          </Text>
        )}

        <View style={{
          marginTop: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: THEME.colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}>
          <Text style={{ fontSize: 12 }}>📸</Text>
          <Text style={{ fontSize: 11, color: THEME.colors.textMuted, flex: 1, lineHeight: 15 }}>
            <Text style={{ fontWeight: '700', color: '#10b981' }}>Automatic Screenshot Watcher:</Text> Any screenshot you take on this phone is automatically detected and parsed via Groq Vision OCR without entering or uploading manually!
          </Text>
        </View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'auto' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('auto')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'auto' && styles.modeBtnTextActive]}>
            ⚡ Auto Detect
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'offer' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('offer')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'offer' && styles.modeBtnTextActive]}>
            💼 Job Offer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'clip' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('clip')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'clip' && styles.modeBtnTextActive]}>
            📋 Vault Clip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Area */}
      <View style={styles.inputCard}>
        <Text style={styles.label}>Paste Text / Job Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Paste full LinkedIn post, email body, WhatsApp job alert, or tech notes..."
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          numberOfLines={6}
          value={inputText}
          onChangeText={setInputText}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Source URL (Optional)</Text>
        <TextInput
          style={styles.urlInput}
          placeholder="https://linkedin.com/feed/update/... or company careers link"
          placeholderTextColor={THEME.colors.textMuted}
          value={sourceUrl}
          onChangeText={setSourceUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Ingest Action Button */}
        <TouchableOpacity
          style={styles.ingestBtn}
          onPress={handleIngest}
          disabled={isIngesting || (!inputText && !sourceUrl)}
        >
          {isIngesting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.ingestBtnText}>
              ⚡ Extract with Groq AI & Route to Channel
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Last Result Card */}
      {lastCreatedOffer && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadge}>✓ CREATED & ROUTED</Text>
            <Text style={styles.resultChannel}>
              Channel: {lastCreatedOffer.channel?.toUpperCase() || 'ATS'}
            </Text>
          </View>
          <Text style={styles.resultTitle}>{lastCreatedOffer.title}</Text>
          <Text style={styles.resultCompany}>
            🏢 {lastCreatedOffer.company || 'Direct Organization'} • 📍 {lastCreatedOffer.location || 'Remote'}
          </Text>
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.viewOfferBtn}
              onPress={() => onNavigateOffers && onNavigateOffers()}
            >
              <Text style={styles.viewOfferText}>View in Offers Pipeline →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  content: {
    padding: 16,
    paddingBottom: 160, // generous bottom padding so buttons are never eaten out
  },
  headerRow: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },

  // Live Clipboard Card
  clipboardLiveCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  clipboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clipboardLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  clipboardLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  pasteActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pasteActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  clipboardContentBox: {
    backgroundColor: THEME.colors.bgElevated,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  clipboardContentLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  clipboardContentText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 16,
  },
  oneTapLoadBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  oneTapLoadText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
  },
  clipboardEmptyText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 3,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  modeBtnText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },

  // Input Card
  inputCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  urlInput: {
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: THEME.colors.textPrimary,
  },
  ingestBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  ingestBtnText: {
    color: '#09090b',
    fontSize: 13,
    fontWeight: '800',
  },

  // Result Card
  resultCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  resultChannel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 3,
  },
  resultCompany: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
  },
  resultActions: {
    flexDirection: 'row',
  },
  viewOfferBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewOfferText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
})

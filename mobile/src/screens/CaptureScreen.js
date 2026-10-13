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
import { ApiService } from '../services/api'
import { THEME } from '../theme'

export function CaptureScreen({ onOfferCreated, onNavigateOffers, onNavigateClips }) {
  const [inputText, setInputText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [clipboardContent, setClipboardContent] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [captureMode, setCaptureMode] = useState('auto') // 'auto' | 'offer' | 'clip'
  const [lastCreatedOffer, setLastCreatedOffer] = useState(null)
  const [lastCreatedClip, setLastCreatedClip] = useState(null)

  useEffect(() => {
    checkClipboard()
  }, [])

  const checkClipboard = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync()
      if (hasString) {
        const text = await Clipboard.getStringAsync()
        if (text && text.trim().length > 0) {
          setClipboardContent(text.trim())
          if (text.trim().startsWith('http')) {
            setSourceUrl(text.trim())
          } else {
            setInputText(text.trim())
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync()
      if (text) {
        if (text.startsWith('http')) {
          setSourceUrl(text)
        } else {
          setInputText(text)
        }
      }
    } catch {
      Alert.alert('Error', 'Unable to read system clipboard.')
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
      // Ingest explicitly as job offer
      const res = await ApiService.ingestPost({
        rawText: inputText.trim(),
        sourceUrl: sourceUrl.trim(),
      })
      setIsIngesting(false)

      if (res.success && res.offer) {
        setLastCreatedOffer(res.offer)
        setInputText('')
        setSourceUrl('')
        Alert.alert('Success 🎉', `Offer "${res.offer.title}" parsed by AI and synced to PC!`)
        if (onOfferCreated) onOfferCreated(res.offer)
      } else {
        Alert.alert('Capture Error', res.error || 'Verify LAN connection with PC.')
      }
    } else {
      // Auto or Clip mode: Universal ingest
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

      if (res.success && res.clip) {
        setLastCreatedClip(res.clip)
        if (res.isJobOffer && res.offer) {
          setLastCreatedOffer(res.offer)
          if (onOfferCreated) onOfferCreated(res.offer)
          Alert.alert(
            'Success 🎉 Job Offer Detected!',
            `AI detected an opportunity: "${res.offer.title}". It has been routed to your Offer Channel and synced to PC!`
          )
        } else {
          Alert.alert('Success ✨ Saved to Vault', `"${res.clip.title}" classified and saved in your Clip Vault.`)
        }
        setInputText('')
        setSourceUrl('')
      } else {
        Alert.alert('Capture Error', res.error || 'Verify LAN connection with PC.')
      }
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI SYNC • CROSS-DEVICE</Text>
        </View>
        <Text style={styles.title}>Universal Capture</Text>
        <Text style={styles.subtitle}>
          Copy a LinkedIn job, article, GitHub repo, or note: AI classifies and syncs it directly to your PC.
        </Text>
      </View>

      {/* Mode Selector Tabs */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeTab, captureMode === 'auto' && styles.modeTabActive]}
          onPress={() => setCaptureMode('auto')}
        >
          <Text style={[styles.modeTabText, captureMode === 'auto' && styles.modeTabTextActive]}>
            ⚡ Auto-Detect
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, captureMode === 'offer' && styles.modeTabActive]}
          onPress={() => setCaptureMode('offer')}
        >
          <Text style={[styles.modeTabText, captureMode === 'offer' && styles.modeTabTextActive]}>
            💼 Job Offer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, captureMode === 'clip' && styles.modeTabActive]}
          onPress={() => setCaptureMode('clip')}
        >
          <Text style={[styles.modeTabText, captureMode === 'clip' && styles.modeTabTextActive]}>
            📋 Universal Clip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clipboard Detector Chip */}
      {clipboardContent ? (
        <TouchableOpacity style={styles.clipboardChip} onPress={handlePasteFromClipboard}>
          <Text style={styles.clipboardIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.clipboardLabel}>Detected in Clipboard:</Text>
            <Text style={styles.clipboardPreview} numberOfLines={1}>
              {clipboardContent}
            </Text>
          </View>
          <Text style={styles.clipboardAction}>Paste ⚡</Text>
        </TouchableOpacity>
      ) : null}

      {/* Main Input Form */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>URL / LINK (OPTIONAL)</Text>
        <TextInput
          style={styles.urlInput}
          placeholder="https://linkedin.com/posts/... or https://indeed.com/..."
          placeholderTextColor="#64748b"
          value={sourceUrl}
          onChangeText={setSourceUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>
            {captureMode === 'offer' ? 'JOB POST / RECRUITER TEXT' : 'TEXT CONTENT / CODE / NOTE'}
          </Text>
          <TouchableOpacity onPress={handlePasteFromClipboard}>
            <Text style={styles.pasteText}>Paste Clipboard</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textArea}
          placeholder={
            captureMode === 'offer'
              ? 'Paste recruiter post, job description, or application requirements here...'
              : 'Paste any text snippet, article link, idea, code, or contact...'
          }
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={inputText}
          onChangeText={setInputText}
        />

        <TouchableOpacity
          style={[styles.ingestButton, isIngesting && styles.ingestButtonDisabled]}
          onPress={handleIngest}
          disabled={isIngesting}
        >
          {isIngesting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.ingestButtonText}>Analyzing with AI...</Text>
            </View>
          ) : (
            <Text style={styles.ingestButtonText}>
              {captureMode === 'offer' ? '🚀 Extract & Route to Channel' : '✨ Classify & Sync to PC'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Offer Result Card */}
      {lastCreatedOffer ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadge}>🎯 Offer Routed</Text>
            <Text style={styles.resultStatus}>{lastCreatedOffer.status?.toUpperCase()}</Text>
          </View>
          <Text style={styles.resultTitle}>{lastCreatedOffer.title}</Text>
          <Text style={styles.resultCompany}>
            🏢 {lastCreatedOffer.company || 'Company'} • 📍 {lastCreatedOffer.location || 'Remote / Hybrid'}
          </Text>

          {lastCreatedOffer.categoryReasoning ? (
            <Text style={styles.resultReasoning}>
              💡 AI: {lastCreatedOffer.categoryReasoning}
            </Text>
          ) : null}

          {lastCreatedOffer.recruiterName || lastCreatedOffer.recruiterEmail ? (
            <View style={styles.recruiterBox}>
              <Text style={styles.recruiterText}>
                👤 {lastCreatedOffer.recruiterName || 'Recruiter'} {lastCreatedOffer.recruiterEmail ? `(${lastCreatedOffer.recruiterEmail})` : ''}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.viewOfferBtn}
            onPress={() => {
              if (onNavigateOffers) onNavigateOffers()
            }}
          >
            <Text style={styles.viewOfferBtnText}>View in Offers Pipeline →</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Clip Result Card */}
      {lastCreatedClip && !lastCreatedOffer ? (
        <View style={styles.clipResultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.clipBadge}>📋 Saved to Clip Vault</Text>
            <Text style={styles.clipType}>{lastCreatedClip.contentType?.toUpperCase()}</Text>
          </View>
          <Text style={styles.resultTitle}>{lastCreatedClip.title}</Text>
          <Text style={styles.resultReasoning}>
            {lastCreatedClip.summary || lastCreatedClip.content?.slice(0, 140)}
          </Text>

          <TouchableOpacity
            style={styles.viewOfferBtn}
            onPress={() => {
              if (onNavigateClips) onNavigateClips()
            }}
          >
            <Text style={styles.viewOfferBtnText}>View in Vault →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    paddingTop: 28,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: THEME.colors.bgElevated,
  },
  modeTabText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  clipboardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  clipboardIcon: {
    fontSize: 18,
  },
  clipboardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  clipboardPreview: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  clipboardAction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c7d2fe',
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pasteText: {
    fontSize: 11,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  urlInput: {
    backgroundColor: THEME.colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    height: 40,
    color: THEME.colors.textPrimary,
    fontSize: 12.5,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: THEME.colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    minHeight: 110,
    color: THEME.colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  ingestButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingestButtonDisabled: {
    opacity: 0.6,
  },
  ingestButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCard: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    padding: 14,
    marginBottom: 16,
  },
  clipResultCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c7d2fe',
  },
  clipBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  resultStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34d399',
  },
  clipType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60a5fa',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  resultCompany: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  resultReasoning: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
    marginBottom: 8,
  },
  recruiterBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 10,
  },
  recruiterText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  viewOfferBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  viewOfferBtnText: {
    fontSize: 11.5,
    color: '#c7d2fe',
    fontWeight: '600',
  },
})

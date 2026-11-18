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
import { ScreenshotWatcher } from '../services/screenshotWatcher'
import { THEME } from '../theme'

export function CaptureScreen({ onOfferCreated, onNavigateOffers, onNavigateClips }) {
  const [inputText, setInputText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [clipboardContent, setClipboardContent] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [isReadingClipboard, setIsReadingClipboard] = useState(false)
  const [isProcessingOcr, setIsProcessingOcr] = useState(false)
  const [isScanningScreenshot, setIsScanningScreenshot] = useState(false)
  const [captureMode, setCaptureMode] = useState('auto') // 'auto' | 'bulk' | 'offer' | 'clip'
  const [lastCreatedOffer, setLastCreatedOffer] = useState(null)
  const [lastCreatedClip, setLastCreatedClip] = useState(null)
  const [bulkBatchResult, setBulkBatchResult] = useState(null)

  // Direct Independent Local OCR Result State (Zero LLM)
  const [localOcrResult, setLocalOcrResult] = useState(null)

  const detectedLinksCount = (inputText.match(/https?:\/\/[^\s,;"'\)\]\}]+/g) || []).length

  const handleScanLatestScreenshot = async () => {
    setIsScanningScreenshot(true)
    try {
      const res = await ScreenshotWatcher.scanLatestScreenshot({ force: true })
      if (res && res.success) {
        setLastCreatedClip(res.clip)
        if (res.isJobOffer && res.offer) {
          setLastCreatedOffer(res.offer)
          Alert.alert(
            'Screenshot Analyzed',
            `"${res.offer.title}" was extracted via local OCR and routed to channels.`
          )
          if (onOfferCreated) onOfferCreated(res.offer)
        } else {
          Alert.alert('Screenshot Ingested', 'Extracted text categorized and saved into Clip Vault.')
        }
      } else {
        Alert.alert(
          'Screenshot Notice',
          res?.error || 'No new screenshot found. Take a screenshot in another app, then tap here to parse instantly.'
        )
      }
    } catch (err) {
      Alert.alert('OCR Error', err.message || 'Failed to scan screenshot.')
    } finally {
      setIsScanningScreenshot(false)
    }
  }

  // Independent Local OCR (Native 15ms, Zero LLM)
  const handleRunLocalOcr = async () => {
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
        setLocalOcrResult(null)

        // 1. Run direct independent local OCR (Zero LLM)
        const ocrRes = await ApiService.extractLocalOcr(asset.base64)
        setIsProcessingOcr(false)

        if (ocrRes && ocrRes.success && ocrRes.text) {
          setLocalOcrResult({
            text: ocrRes.text,
            durationMs: ocrRes.durationMs || 15,
            engine: ocrRes.engine || 'windows_media_ocr',
            imageBase64: asset.base64,
          })
        } else {
          // Fallback to full OCR ingest
          setIsProcessingOcr(true)
          const ingestRes = await ApiService.ocrIngestClip({
            imageBase64: asset.base64,
            sourceDevice: 'mobile',
          })
          setIsProcessingOcr(false)

          if (ingestRes.success) {
            setLastCreatedClip(ingestRes.clip)
            if (ingestRes.isJobOffer && ingestRes.offer) {
              setLastCreatedOffer(ingestRes.offer)
              if (onOfferCreated) onOfferCreated(ingestRes.offer)
            }
            Alert.alert('OCR Ingested', 'Screenshot text extracted and saved to Vault.')
          } else {
            Alert.alert('OCR Notice', ingestRes.error || 'Could not parse text from image.')
          }
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
        if (trimmed.startsWith('http') && !trimmed.includes('\n') && captureMode !== 'bulk') {
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
    setBulkBatchResult(null)

    if (captureMode === 'bulk') {
      const res = await ApiService.bulkIngestClips({
        rawText: inputText.trim(),
        sourceDevice: 'mobile',
      })
      setIsIngesting(false)
      if (res && res.success) {
        setBulkBatchResult(res)
        setInputText('')
        Alert.alert(
          'Bulk Batch Completed',
          `Processed ${res.count || 0} discrete items independently. Check Clip Vault or Offers.`
        )
      } else {
        Alert.alert('Bulk Ingest Error', res?.error || 'Could not process bulk items.')
      }
      return
    }

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
        Alert.alert('Offer Created', `"${res.offer.title}" parsed by AI and synced to PC.`)
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
        if (res.isMultiLink) {
          setBulkBatchResult({ count: res.batchCount, clips: res.clips, offers: res.offers })
          if (res.offer) {
            setLastCreatedOffer(res.offer)
            if (onOfferCreated) onOfferCreated(res.offer)
          }
          setInputText('')
          setSourceUrl('')
          Alert.alert(
            'Multi-Link Post Decomposed',
            `Isolated and processed ${res.batchCount} links independently while linking to the source post.`
          )
        } else {
          setLastCreatedClip(res.clip)
          if (res.isJobOffer && res.offer) {
            setLastCreatedOffer(res.offer)
            setInputText('')
            setSourceUrl('')
            Alert.alert(
              'Job Offer Detected',
              `"${res.offer.title}" was automatically recognized and routed to ${res.channel ? res.channel.toUpperCase() : 'OFFER'} channel.`
            )
            if (onOfferCreated) onOfferCreated(res.offer)
          } else {
            setInputText('')
            setSourceUrl('')
            Alert.alert('Clip Saved', 'Signal saved to your Universal Clip Vault.')
          }
        }
      } else {
        Alert.alert('Ingestion Notice', res.error || 'Verify LAN connection with PC.')
      }
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Screen Title */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.beaconDot} />
          <Text style={styles.title}>SIGNAL CAPTURE</Text>
        </View>
        <Text style={styles.subtitle}>
          Multi-Channel Ingest · Independent Local OCR · Vault Triage
        </Text>
      </View>

      {/* Live System Clipboard Detection Card */}
      <View style={styles.clipboardLiveCard}>
        <View style={styles.clipboardHeader}>
          <View style={styles.clipboardLivePill}>
            <View style={styles.liveDot} />
            <Text style={styles.clipboardLiveText}>LIVE AUTO-DETECTION</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={styles.pasteActionBtn}
              onPress={handleRunLocalOcr}
              disabled={isProcessingOcr}
            >
              <Text style={styles.pasteActionBtnText}>
                {isProcessingOcr ? 'Running OCR...' : 'LOCAL OCR'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pasteActionBtn}
              onPress={handlePasteFromClipboard}
              disabled={isReadingClipboard}
            >
              <Text style={styles.pasteActionBtnText}>
                {isReadingClipboard ? 'Reading...' : 'PASTE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1-Tap Instant Screenshot Scanner */}
        <TouchableOpacity
          style={styles.scanScreenshotBanner}
          onPress={handleScanLatestScreenshot}
          disabled={isScanningScreenshot}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, overflow: 'hidden' }}>
            <View style={styles.ocrBadgeIcon}>
              <Text style={styles.ocrBadgeIconText}>OCR</Text>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Text style={styles.scanScreenshotTitle} numberOfLines={1}>
                {isScanningScreenshot ? 'Scanning Latest Screenshot...' : 'Instant Scan Last Screenshot (1-Tap)'}
              </Text>
              <Text style={styles.scanScreenshotDesc} numberOfLines={1}>
                Zero LLM · 15ms Windows Media OCR on host node
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {clipboardContent ? (
          <View style={styles.clipboardContentBox}>
            <Text style={styles.clipboardContentLabel}>Detected in clipboard:</Text>
            <Text style={styles.clipboardContentText} numberOfLines={2}>
              {clipboardContent}
            </Text>
            <TouchableOpacity
              style={styles.oneTapLoadBtn}
              onPress={() => {
                if (clipboardContent.startsWith('http') && !clipboardContent.includes('\n') && captureMode !== 'bulk') {
                  setSourceUrl(clipboardContent)
                } else {
                  setInputText(clipboardContent)
                }
              }}
            >
              <Text style={styles.oneTapLoadText}>Load into input field</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.clipboardEmptyText}>
            Copy any job post on LinkedIn, WhatsApp, or browser — it will appear here automatically.
          </Text>
        )}
      </View>

      {/* Independent Local OCR Raw Text Inspection Box */}
      {localOcrResult && (
        <View style={styles.ocrResultBox}>
          <View style={styles.ocrResultHeader}>
            <Text style={styles.ocrResultTitle}>LOCAL OCR EXTRACTED TEXT</Text>
            <Text style={styles.ocrResultMeta}>
              {localOcrResult.durationMs}ms · {localOcrResult.engine}
            </Text>
          </View>
          <TextInput
            style={styles.ocrResultTextInput}
            multiline
            editable={false}
            value={localOcrResult.text}
          />
          <View style={styles.ocrResultActions}>
            <TouchableOpacity
              style={styles.ocrActionBtn}
              onPress={async () => {
                await Clipboard.setStringAsync(localOcrResult.text)
                Alert.alert('Copied', 'Extracted OCR text copied to clipboard.')
              }}
            >
              <Text style={styles.ocrActionBtnText}>COPY TEXT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ocrActionBtn, styles.ocrActionBtnPrimary]}
              onPress={() => {
                setInputText(localOcrResult.text)
                setLocalOcrResult(null)
              }}
            >
              <Text style={styles.ocrActionBtnPrimaryText}>LOAD INTO INGEST</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'auto' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('auto')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'auto' && styles.modeBtnTextActive]}>
            AUTO DETECT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'bulk' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('bulk')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'bulk' && styles.modeBtnTextActive]}>
            BULK INGEST
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'offer' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('offer')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'offer' && styles.modeBtnTextActive]}>
            JOB OFFER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, captureMode === 'clip' && styles.modeBtnActive]}
          onPress={() => setCaptureMode('clip')}
        >
          <Text style={[styles.modeBtnText, captureMode === 'clip' && styles.modeBtnTextActive]}>
            VAULT CLIP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Area */}
      <View style={styles.inputCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={styles.label}>
            {captureMode === 'bulk' ? 'BULK RAW TEXT / LINKS' : 'RAW CONTENT / DESCRIPTION'}
          </Text>
          {detectedLinksCount > 0 && (
            <View style={styles.detectedBadge}>
              <Text style={styles.detectedBadgeText}>{detectedLinksCount} LINK{detectedLinksCount > 1 ? 'S' : ''}</Text>
            </View>
          )}
        </View>

        <TextInput
          style={styles.textArea}
          placeholder={
            captureMode === 'bulk'
              ? 'Paste multiple links, email digests, or bookmark lists. Each will be isolated and processed independently...'
              : 'Paste LinkedIn post, email body, WhatsApp alert, or job link...'
          }
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          numberOfLines={6}
          value={inputText}
          onChangeText={setInputText}
        />

        {captureMode !== 'bulk' && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>SOURCE URL (OPTIONAL)</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://linkedin.com/... or source link"
              placeholderTextColor={THEME.colors.textMuted}
              value={sourceUrl}
              onChangeText={setSourceUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* Ingest Action Button */}
        <TouchableOpacity
          style={styles.ingestBtn}
          onPress={handleIngest}
          disabled={isIngesting || (!inputText && !sourceUrl)}
        >
          {isIngesting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.ingestBtnText}>
              {captureMode === 'bulk'
                ? `INGEST ${detectedLinksCount ? `${detectedLinksCount} DISCRETE ITEMS` : 'BULK BATCH'}`
                : 'INGEST & ROUTE TO PIPELINE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bulk Batch Summary */}
      {bulkBatchResult && (
        <View style={styles.batchResultCard}>
          <Text style={styles.batchResultTitle}>
            BATCH COMPLETED ({bulkBatchResult.count} items)
          </Text>
          <Text style={styles.batchResultSubtitle}>
            Discrete items processed and linked to source batch.
          </Text>
          <TouchableOpacity
            style={styles.viewBatchClipsBtn}
            onPress={() => onNavigateClips && onNavigateClips()}
          >
            <Text style={styles.viewBatchClipsText}>Inspect in Clip Vault →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Last Result Card */}
      {lastCreatedOffer && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadge}>CREATED & ROUTED</Text>
            <Text style={styles.resultChannel}>
              CHANNEL: {lastCreatedOffer.channel?.toUpperCase() || 'ATS'}
            </Text>
          </View>
          <Text style={styles.resultTitle}>{lastCreatedOffer.title}</Text>
          <Text style={styles.resultCompany}>
            {lastCreatedOffer.company || 'Direct Organization'} • {lastCreatedOffer.location || 'Remote'}
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
    paddingBottom: 160,
  },
  headerRow: {
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 3,
  },
  clipboardLiveCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  clipboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clipboardLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  clipboardLiveText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pasteActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: THEME.colors.bgInput,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pasteActionBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scanScreenshotBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  ocrBadgeIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ocrBadgeIconText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '900',
  },
  scanScreenshotTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  scanScreenshotDesc: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  clipboardContentBox: {
    backgroundColor: THEME.colors.bgInput,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  clipboardContentLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clipboardContentText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  oneTapLoadBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  oneTapLoadText: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  clipboardEmptyText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  ocrResultBox: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  ocrResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrResultTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ocrResultMeta: {
    color: '#FF3B30',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  ocrResultTextInput: {
    backgroundColor: THEME.colors.bgInput,
    borderRadius: 4,
    padding: 10,
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'monospace',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  ocrResultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  ocrActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgInput,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ocrActionBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  ocrActionBtnPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  ocrActionBtnPrimaryText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  modeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  inputCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 14,
  },
  label: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detectedBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  detectedBadgeText: {
    color: '#FF3B30',
    fontSize: 9,
    fontWeight: '800',
  },
  textArea: {
    backgroundColor: THEME.colors.bgInput,
    borderRadius: 6,
    padding: 12,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  urlInput: {
    backgroundColor: THEME.colors.bgInput,
    borderRadius: 6,
    padding: 10,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  ingestBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ingestBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  batchResultCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderElevated,
    borderRadius: 8,
    padding: 14,
    marginTop: 14,
  },
  batchResultTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  batchResultSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  viewBatchClipsBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  viewBatchClipsText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 14,
    marginTop: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultBadge: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultChannel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  resultTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  resultCompany: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  resultActions: {
    marginTop: 10,
  },
  viewOfferBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewOfferText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
})

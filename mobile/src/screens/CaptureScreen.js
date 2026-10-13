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

export function CaptureScreen({ onOfferCreated, onNavigateOffers }) {
  const [inputText, setInputText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [clipboardContent, setClipboardContent] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [lastCreatedOffer, setLastCreatedOffer] = useState(null)

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
          // If it's a URL
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
      Alert.alert('Erreur', 'Impossible de lire le presse-papiers.')
    }
  }

  const handleIngest = async () => {
    if (!inputText.trim() && !sourceUrl.trim()) {
      Alert.alert('Champ Requis', 'Veuillez coller le texte ou le lien du post LinkedIn.')
      return
    }

    setIsIngesting(true)
    setLastCreatedOffer(null)

    const res = await ApiService.ingestPost({
      rawText: inputText.trim(),
      sourceUrl: sourceUrl.trim(),
    })
    setIsIngesting(false)

    if (res.success && res.offer) {
      setLastCreatedOffer(res.offer)
      setInputText('')
      setSourceUrl('')
      Alert.alert('Succès 🎉', `Offre "${res.offer.title}" analysée par l'IA et synchronisée avec le PC !`)
      if (onOfferCreated) onOfferCreated(res.offer)
    } else {
      Alert.alert('Erreur de Capture', res.error || 'Vérifiez la connexion avec le PC.')
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>IA & CLOUD SYNC</Text>
        </View>
        <Text style={styles.title}>Capture & Ingestion Mobile</Text>
        <Text style={styles.subtitle}>
          Copiez une offre ou un post LinkedIn sur votre téléphone, l'IA classifie et injecte directement sur votre PC !
        </Text>
      </View>

      {/* Clipboard Detector Chip */}
      {clipboardContent ? (
        <TouchableOpacity style={styles.clipboardChip} onPress={handlePasteFromClipboard}>
          <Text style={styles.clipboardIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.clipboardLabel}>Contenu Détecté dans le Presse-Papiers :</Text>
            <Text style={styles.clipboardPreview} numberOfLines={1}>
              {clipboardContent}
            </Text>
          </View>
          <Text style={styles.clipboardAction}>Coller ⚡</Text>
        </TouchableOpacity>
      ) : null}

      {/* Main Input Form */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>LIEN DU POST / PROFIL LINKEDIN (OPTIONNEL)</Text>
        <TextInput
          style={styles.urlInput}
          placeholder="https://www.linkedin.com/posts/..."
          placeholderTextColor="#52525b"
          value={sourceUrl}
          onChangeText={setSourceUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>TEXTE DU POST / DESCRIPTIF DU PFE</Text>
          <TouchableOpacity onPress={handlePasteFromClipboard}>
            <Text style={styles.pasteText}>Coller Presse-papiers</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textArea}
          placeholder="Collez ici le post LinkedIn du recruteur, le sujet du PFE, email ou numéro WhatsApp..."
          placeholderTextColor="#52525b"
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
              <Text style={styles.ingestButtonText}>Analyse IA en cours sur le PC...</Text>
            </View>
          ) : (
            <Text style={styles.ingestButtonText}>🚀 Extraire & Sauvegarder sur PC</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Last Result Card */}
      {lastCreatedOffer ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultBadge}>✨ Nouvelle Offre Enregistrée</Text>
            <Text style={styles.resultStatus}>{lastCreatedOffer.status?.toUpperCase()}</Text>
          </View>
          <Text style={styles.resultTitle}>{lastCreatedOffer.title}</Text>
          <Text style={styles.resultCompany}>
            🏢 {lastCreatedOffer.company || 'Entreprise identifiée'} • 📍 {lastCreatedOffer.location || 'France / Remote'}
          </Text>

          {lastCreatedOffer.categoryReasoning ? (
            <Text style={styles.resultReasoning}>
              💡 IA : {lastCreatedOffer.categoryReasoning}
            </Text>
          ) : null}

          {lastCreatedOffer.recruiterName || lastCreatedOffer.recruiterEmail ? (
            <View style={styles.recruiterBox}>
              <Text style={styles.recruiterText}>
                👤 {lastCreatedOffer.recruiterName || 'Recruteur'} {lastCreatedOffer.recruiterEmail ? `(${lastCreatedOffer.recruiterEmail})` : ''}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.viewOffersButton}
            onPress={() => onNavigateOffers && onNavigateOffers()}
          >
            <Text style={styles.viewOffersText}>Voir dans le Stream Mobile →</Text>
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
    paddingTop: 30,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: THEME.colors.accentLight,
    borderWidth: 1,
    borderColor: THEME.colors.accentBorder,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.accent,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  clipboardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12,
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
    color: '#d8b4fe',
  },
  clipboardPreview: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  clipboardAction: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: THEME.colors.textMuted,
  },
  pasteText: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  urlInput: {
    backgroundColor: THEME.colors.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    height: 42,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    marginTop: 6,
  },
  textArea: {
    backgroundColor: THEME.colors.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    height: 120,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  ingestButton: {
    backgroundColor: THEME.colors.accent,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ingestButtonDisabled: {
    opacity: 0.6,
  },
  ingestButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    padding: 14,
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
    color: THEME.colors.success,
  },
  resultStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    backgroundColor: THEME.colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  resultCompany: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  resultReasoning: {
    fontSize: 11,
    color: '#a78bfa',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 15,
  },
  recruiterBox: {
    backgroundColor: THEME.colors.bgElevated,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  recruiterText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  viewOffersButton: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: THEME.colors.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  viewOffersText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
})

import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import * as Linking from 'expo-linking'
import * as Clipboard from 'expo-clipboard'
import { ApiService } from '../services/api'
import { THEME, getStageMeta } from '../theme'

export function OfferDetailScreen({ offer, onBack, onStatusUpdated }) {
  const [currentOffer, setCurrentOffer] = useState(offer)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const stageMeta = getStageMeta(currentOffer.status)

  const handleStageSelect = async (newStage) => {
    if (newStage === currentOffer.status) return
    setIsUpdatingStatus(true)
    const res = await ApiService.updateOfferStatus(currentOffer.id, newStage)
    setIsUpdatingStatus(false)
    if (res.success) {
      setCurrentOffer((prev) => ({ ...prev, status: newStage }))
      if (onStatusUpdated) onStatusUpdated(currentOffer.id, newStage)
    } else {
      Alert.alert('Erreur', res.error || 'Impossible de mettre à jour le statut.')
    }
  }

  const handleCopyText = async (text, label) => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    Alert.alert('Copié !', `${label} copié dans le presse-papiers.`)
  }

  const handleOpenWhatsApp = () => {
    const phone = currentOffer.sharer?.phone || currentOffer.recruiterPhone || ''
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const msg = currentOffer.whatsAppMsg || `Bonjour, je vous contacte au sujet de l'offre PFE ${currentOffer.title}.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp.'))
  }

  const handleOpenEmail = () => {
    const email = currentOffer.recruiterEmail
    if (!email) {
      Alert.alert('Email indisponible', 'Aucune adresse email spécifiée pour ce poste.')
      return
    }
    const subject = `Candidature Stage PFE - ${currentOffer.title}`
    const body = currentOffer.customEmailBody || `Bonjour,\n\nJe vous adresse ma candidature pour le stage PFE.\n\nCordialement,`
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const handleOpenUrl = (url) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url)
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={[styles.stageBadge, { backgroundColor: stageMeta.bg }]}>
          <Text style={[styles.stageBadgeText, { color: stageMeta.color }]}>
            {stageMeta.label}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title & Company */}
        <Text style={styles.title}>{currentOffer.title}</Text>
        <Text style={styles.company}>
          🏢 {currentOffer.company || 'Entreprise PFE'} • 📍 {currentOffer.location || 'France'}
        </Text>

        {currentOffer.createdAt && (
          <Text style={styles.createdAtText}>
            📅 Ajouté le {new Date(currentOffer.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        )}

        {/* Dynamic Domain Badge */}
        <View style={styles.domainCard}>
          <View style={styles.domainHeader}>
            <Text style={styles.domainTitle}>🏷️ Domaine & Analyse IA</Text>
            <Text style={styles.confidenceText}>
              Confiance : {Math.round((currentOffer.confidence || 0.9) * 100)}%
            </Text>
          </View>
          <Text style={styles.categoryBadge}>{currentOffer.category?.toUpperCase()}</Text>
          {currentOffer.categoryReasoning ? (
            <Text style={styles.reasoningText}>
              "{currentOffer.categoryReasoning}"
            </Text>
          ) : null}
        </View>

        {/* Interactive Pipeline Stage Selector */}
        <View style={styles.pipelineCard}>
          <Text style={styles.sectionTitle}>Progression Pipeline (Synchronisé PC)</Text>
          <View style={styles.stageButtonsGrid}>
            {THEME.stages.map((st) => {
              const isActive = currentOffer.status === st.id
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.stageBtn,
                    isActive && { backgroundColor: st.color, borderColor: st.color },
                  ]}
                  onPress={() => handleStageSelect(st.id)}
                  disabled={isUpdatingStatus}
                >
                  <Text
                    style={[
                      styles.stageBtnText,
                      isActive && { color: '#ffffff', fontWeight: 'bold' },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          {currentOffer.recruiterEmail ? (
            <TouchableOpacity style={styles.emailActionBtn} onPress={handleOpenEmail}>
              <Text style={styles.actionBtnText}>✉️ Envoyer Email</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.waActionBtn} onPress={handleOpenWhatsApp}>
            <Text style={styles.actionBtnText}>💬 WhatsApp Direct</Text>
          </TouchableOpacity>

          {currentOffer.sourceUrl ? (
            <TouchableOpacity
              style={styles.sourceActionBtn}
              onPress={() => handleOpenUrl(currentOffer.sourceUrl)}
            >
              <Text style={styles.actionBtnText}>🔗 Post LinkedIn</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Recruiter Details */}
        {(currentOffer.recruiterName || currentOffer.sharer?.name) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Contact Recruteur</Text>
            <Text style={styles.recruiterName}>
              👤 {currentOffer.recruiterName || currentOffer.sharer?.name}
            </Text>
            {currentOffer.sharer?.title ? (
              <Text style={styles.recruiterTitle}>{currentOffer.sharer.title}</Text>
            ) : null}
            {currentOffer.recruiterEmail ? (
              <Text style={styles.recruiterDetail}>✉️ {currentOffer.recruiterEmail}</Text>
            ) : null}
            {currentOffer.sharer?.phone ? (
              <Text style={styles.recruiterDetail}>📞 {currentOffer.sharer.phone}</Text>
            ) : null}
          </View>
        )}

        {/* Pre-written WhatsApp Message */}
        {currentOffer.whatsAppMsg ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderWithCopy}>
              <Text style={styles.sectionTitle}>Message WhatsApp Prêt à l'Emploi</Text>
              <TouchableOpacity
                onPress={() => handleCopyText(currentOffer.whatsAppMsg, 'Message WhatsApp')}
              >
                <Text style={styles.copyLink}>Copier 📋</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.msgPreview}>{currentOffer.whatsAppMsg}</Text>
          </View>
        ) : null}

        {/* Pre-written LinkedIn Note */}
        {currentOffer.linkedInNote ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderWithCopy}>
              <Text style={styles.sectionTitle}>Note d'Accompagnement LinkedIn</Text>
              <TouchableOpacity
                onPress={() => handleCopyText(currentOffer.linkedInNote, 'Note LinkedIn')}
              >
                <Text style={styles.copyLink}>Copier 📋</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.msgPreview}>{currentOffer.linkedInNote}</Text>
          </View>
        ) : null}

        {/* Job Description */}
        {currentOffer.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Description du Poste</Text>
            <Text style={styles.descText}>{currentOffer.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    lineHeight: 26,
    marginBottom: 6,
  },
  company: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  createdAtText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  domainCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  confidenceText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.accent,
    backgroundColor: THEME.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  reasoningText: {
    fontSize: 11,
    color: '#c4b5fd',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  pipelineCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  stageButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  stageBtnText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emailActionBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  waActionBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sourceActionBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 14,
  },
  recruiterName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  recruiterTitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  recruiterDetail: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  cardHeaderWithCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyLink: {
    fontSize: 11,
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  msgPreview: {
    backgroundColor: THEME.colors.bgElevated,
    padding: 10,
    borderRadius: 8,
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  descText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
})

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

function getChannelMeta(channel) {
  if (channel === 'email') return { label: 'Email Channel', icon: '✉️', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)' }
  if (channel === 'direct_contact') return { label: 'Direct DM / WA', icon: '💬', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)' }
  return { label: 'ATS / External Portal', icon: '🌐', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' }
}

export function OfferDetailScreen({ offer, onBack, onStatusUpdated }) {
  const [currentOffer, setCurrentOffer] = useState(offer)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const stageMeta = getStageMeta(currentOffer.status)
  const channelMeta = getChannelMeta(currentOffer.channel)

  const handleStageSelect = async (newStage) => {
    if (newStage === currentOffer.status) return
    setIsUpdatingStatus(true)
    const res = await ApiService.updateOfferStatus(currentOffer.id, newStage)
    setIsUpdatingStatus(false)
    if (res.success) {
      setCurrentOffer((prev) => ({ ...prev, status: newStage }))
      if (onStatusUpdated) onStatusUpdated(currentOffer.id, newStage)
    } else {
      Alert.alert('Error', res.error || 'Failed to update pipeline stage.')
    }
  }

  const handleCopyText = async (text, label) => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    Alert.alert('Copied', `${label} copied to clipboard.`)
  }

  const handleOpenWhatsApp = () => {
    const phone = currentOffer.sharer?.phone || currentOffer.recruiterPhone || ''
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const msg = currentOffer.whatsAppMsg || `Hello, I am reaching out regarding the position: ${currentOffer.title}.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open WhatsApp.'))
  }

  const handleOpenEmail = () => {
    const email = currentOffer.recruiterEmail
    if (!email) {
      Alert.alert('Notice', 'No direct recruiter email found for this offer.')
      return
    }
    const subject = `Application - ${currentOffer.title}`
    const body = currentOffer.customEmailBody || `Hello,\n\nI am writing to express my interest in the ${currentOffer.title} position.\n\nBest regards,`
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const handleOpenUrl = (url) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open URL.'))
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topRightBadges}>
          <View style={[styles.channelBadge, { backgroundColor: channelMeta.bg, borderColor: channelMeta.color + '40' }]}>
            <Text style={[styles.channelBadgeText, { color: channelMeta.color }]}>
              {channelMeta.icon} {channelMeta.label}
            </Text>
          </View>
          <View style={[styles.stageBadge, { backgroundColor: stageMeta.bg }]}>
            <Text style={[styles.stageBadgeText, { color: stageMeta.color }]}>
              {stageMeta.label}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title & Company */}
        <Text style={styles.title}>{currentOffer.title}</Text>
        <Text style={styles.company}>
          🏢 {currentOffer.company || 'Direct Organization'} • 📍 {currentOffer.location || 'Remote / Hybrid'}
        </Text>

        {currentOffer.createdAt && (
          <Text style={styles.createdAtText}>
            Added {new Date(currentOffer.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}

        {/* Domain & AI Analysis */}
        <View style={styles.domainCard}>
          <View style={styles.domainHeader}>
            <Text style={styles.domainTitle}>AI Role Intelligence</Text>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round((currentOffer.confidence || 0.9) * 100)}%
            </Text>
          </View>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryBadge}>{currentOffer.category?.toUpperCase() || 'GENERAL'}</Text>
          </View>
          {currentOffer.categoryReasoning ? (
            <Text style={styles.reasoningText}>
              "{currentOffer.categoryReasoning}"
            </Text>
          ) : null}
        </View>

        {/* Pipeline Stage Selector */}
        <View style={styles.pipelineCard}>
          <Text style={styles.sectionTitle}>Pipeline Status (Synced with PC)</Text>
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
              <Text style={styles.actionBtnText}>✉️ Send Email</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.waActionBtn} onPress={handleOpenWhatsApp}>
            <Text style={styles.actionBtnText}>💬 WhatsApp DM</Text>
          </TouchableOpacity>

          {currentOffer.sourceUrl ? (
            <TouchableOpacity
              style={styles.sourceActionBtn}
              onPress={() => handleOpenUrl(currentOffer.sourceUrl)}
            >
              <Text style={styles.actionBtnText}>🔗 Open Source</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Recruiter Details */}
        {(currentOffer.recruiterName || currentOffer.sharer?.name) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Recruiter / Contact Profile</Text>
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

        {/* WhatsApp Template */}
        {currentOffer.whatsAppMsg ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderWithCopy}>
              <Text style={styles.sectionTitle}>Pre-Drafted Outreach Note</Text>
              <TouchableOpacity
                onPress={() => handleCopyText(currentOffer.whatsAppMsg, 'Outreach Note')}
              >
                <Text style={styles.copyLink}>Copy 📋</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.msgPreview}>{currentOffer.whatsAppMsg}</Text>
          </View>
        ) : null}

        {/* LinkedIn Connection Note */}
        {currentOffer.linkedInNote ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderWithCopy}>
              <Text style={styles.sectionTitle}>LinkedIn Connection Note</Text>
              <TouchableOpacity
                onPress={() => handleCopyText(currentOffer.linkedInNote, 'LinkedIn Note')}
              >
                <Text style={styles.copyLink}>Copy 📋</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.msgPreview}>{currentOffer.linkedInNote}</Text>
          </View>
        ) : null}

        {/* Job Description */}
        {currentOffer.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Job Specification</Text>
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
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
  topRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '700',
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
    borderRadius: 12,
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
  categoryRow: {
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818cf8',
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reasoningText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  pipelineCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
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
    minWidth: 110,
    backgroundColor: '#065f46',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  waActionBtn: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#0f766e',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sourceActionBtn: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 14,
  },
  recruiterName: {
    fontSize: 14,
    fontWeight: '700',
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
    color: '#818cf8',
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

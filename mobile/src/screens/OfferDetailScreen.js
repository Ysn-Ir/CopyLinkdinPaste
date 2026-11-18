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
  if (channel === 'email') return { label: 'Direct Email', icon: 'EMAIL' }
  if (channel === 'direct_contact') return { label: 'Direct DM', icon: 'DM' }
  return { label: 'ATS Portal', icon: 'PORTAL' }
}

function formatCleanDescription(text) {
  if (!text) return ''
  // Strip scraper header tags if present
  let cleaned = text.replace(/^(TITLE|SITE|DESCRIPTION|PAGE CONTENT|URL):\s*[^\n]*\n+/gmi, '')
  const paras = cleaned.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const seen = new Set()
  const unique = []
  for (const p of paras) {
    const norm = p.toLowerCase().replace(/\s+/g, ' ').slice(0, 90)
    if (!seen.has(norm)) {
      seen.add(norm)
      unique.push(p)
    }
  }
  return unique.join('\n\n') || text
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
      Alert.alert('Status Error', res.error || 'Failed to update pipeline stage.')
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
          <Text style={styles.backButtonText}>← Opportunities</Text>
        </TouchableOpacity>
        <View style={styles.topRightBadges}>
          <View style={styles.channelBadge}>
            <Text style={styles.channelBadgeText}>
              {channelMeta.icon} {channelMeta.label}
            </Text>
          </View>
          <View style={[styles.stageBadge, { backgroundColor: stageMeta.bg, borderColor: stageMeta.border }]}>
            <Text style={[styles.stageBadgeText, { color: stageMeta.color }]}>
              {stageMeta.label}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Organization Header */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>{currentOffer.title}</Text>
          <Text style={styles.company}>
            {currentOffer.company || 'Direct Organization'} • {currentOffer.location || 'Remote / Hybrid'}
          </Text>

          {currentOffer.createdAt && (
            <Text style={styles.createdAtText}>
              Detected {new Date(currentOffer.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Action Buttons: Clean high-contrast buttons */}
        <View style={styles.actionsContainer}>
          {currentOffer.recruiterEmail ? (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenEmail} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Send Direct Email</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleOpenWhatsApp} activeOpacity={0.8}>
            <Text style={styles.secondaryActionText}>WhatsApp Outreach</Text>
          </TouchableOpacity>

          {currentOffer.sourceUrl ? (
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => handleOpenUrl(currentOffer.sourceUrl)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionText}>Open Source Job Post</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Intelligence Classification Card */}
        <View style={styles.domainCard}>
          <View style={styles.domainHeader}>
            <Text style={styles.domainTitle}>RADAR Intelligence Analysis</Text>
            <Text style={styles.confidenceText}>
              {Math.round((currentOffer.confidence || 0.92) * 100)}% Match
            </Text>
          </View>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryBadge}>
              {currentOffer.category?.toUpperCase() || 'GENERAL'}
            </Text>
          </View>
          {currentOffer.reasoning ? (
            <Text style={styles.reasoningText}>"{currentOffer.reasoning}"</Text>
          ) : null}
        </View>

        {/* Pipeline Stage Selector */}
        <View style={styles.pipelineCard}>
          <Text style={styles.sectionTitle}>Pipeline Stage</Text>
          <View style={styles.stageButtonsGrid}>
            {THEME.stages.map((st) => {
              const isActive = currentOffer.status === st.id
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.stageBtn,
                    isActive && { backgroundColor: st.bg, borderColor: st.border },
                  ]}
                  onPress={() => handleStageSelect(st.id)}
                  disabled={isUpdatingStatus}
                >
                  <Text
                    style={[
                      styles.stageBtnText,
                      isActive && { color: st.color, fontWeight: '700' },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Recruiter & Contact Card */}
        {(currentOffer.contactName || currentOffer.recruiterEmail || currentOffer.contactEmail) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Recruiter / Contact</Text>
            {currentOffer.contactName ? (
              <Text style={styles.recruiterName}>{currentOffer.contactName}</Text>
            ) : null}
            {currentOffer.contactTitle ? (
              <Text style={styles.recruiterTitle}>{currentOffer.contactTitle}</Text>
            ) : null}
            {currentOffer.recruiterEmail ? (
              <TouchableOpacity onPress={() => handleCopyText(currentOffer.recruiterEmail, 'Email')}>
                <Text style={styles.recruiterDetail}>✉️ {currentOffer.recruiterEmail} (Tap to copy)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Outreach Draft Preview */}
        {currentOffer.customEmailBody ? (
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderWithCopy}>
              <Text style={styles.sectionTitle}>Generated Outreach Message</Text>
              <TouchableOpacity onPress={() => handleCopyText(currentOffer.customEmailBody, 'Outreach message')}>
                <Text style={styles.copyLink}>Copy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.msgPreview}>{currentOffer.customEmailBody}</Text>
          </View>
        ) : null}

        {/* Job Description */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Description & Requirements</Text>
          <Text style={styles.descText}>
            {formatCleanDescription(currentOffer.description) || 'No detailed description available.'}
          </Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  topRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  channelBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  stageBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  heroSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 25,
    marginBottom: 6,
  },
  company: {
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  createdAtText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: THEME.colors.textPrimary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryActionText: {
    color: THEME.colors.textInverse,
    fontSize: 12.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  domainCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 14,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  categoryRow: {
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    letterSpacing: 0.5,
  },
  reasoningText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  pipelineCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stageButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.bgElevated,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBtnText: {
    fontSize: 10.5,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 14,
  },
  recruiterName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  recruiterTitle: {
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  recruiterDetail: {
    fontSize: 11.5,
    color: THEME.colors.textPrimary,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  cardHeaderWithCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  copyLink: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  msgPreview: {
    backgroundColor: THEME.colors.bgElevated,
    padding: 10,
    borderRadius: 6,
    color: THEME.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17,
  },
  descText: {
    color: THEME.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 18,
  },
})

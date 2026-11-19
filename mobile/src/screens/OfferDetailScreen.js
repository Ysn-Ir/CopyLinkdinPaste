import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import * as Linking from 'expo-linking'
import * as Clipboard from 'expo-clipboard'
import { ApiService } from '../services/api'
import { THEME, getStageMeta } from '../theme'
import { RadarLogo } from '../components/RadarLogo'

function getChannelMeta(channel) {
  if (channel === 'email') return { label: 'Direct Email', icon: '✉️' }
  if (channel === 'direct_contact') return { label: 'Direct DM / WhatsApp', icon: '💬' }
  return { label: 'ATS Portal', icon: '🌐' }
}

function formatCleanDescription(text) {
  if (!text) return ''
  let cleaned = text.replace(/^(TITLE|SITE|DESCRIPTION|PAGE CONTENT|URL):\s*[^\n]*\n+/gmi, '')
  const paras = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [emailBody, setEmailBody] = useState(
    offer.customEmailBody ||
      offer.notes ||
      `Dear Hiring Team at ${offer.company || 'the team'},\n\nI am writing to formally submit my candidacy for the ${offer.title} position.\n\nWith extensive engineering expertise across modern distributed systems, Python, PyTorch, and cloud architectures, I am eager to contribute to your engineering milestones.\n\nBest regards,\nKhalil Ingénieur PFE\nkhalil.pfe@gmail.com\n+33 6 12 34 56 78`
  )
  const [customPrompt, setCustomPrompt] = useState('')

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
    Alert.alert('Copied to Clipboard', `${label} copied successfully.`)
  }

  const handleOpenWhatsApp = () => {
    const phone = currentOffer.sharer?.phone || currentOffer.recruiterPhone || '+33612345678'
    const cleanPhone = phone.replace(/[^0-9+]/g, '')
    const msg =
      currentOffer.whatsAppMsg ||
      `Hello ${currentOffer.contactName || currentOffer.recruiterName || ''}, I am reaching out regarding the ${currentOffer.title} position at ${currentOffer.company}. Would you be open to connect? Best, Khalil.`
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.replace(/^\+/, '')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open WhatsApp.'))
  }

  const handleOpenEmail = () => {
    const email = currentOffer.recruiterEmail || currentOffer.contactEmail
    if (!email) {
      Alert.alert('Notice', 'No direct recruiter email detected for this opportunity. Use "Copy Email Bundle" or apply via portal.')
      return
    }
    const subject = `Application - ${currentOffer.title} - Khalil Ingénieur PFE`
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
    Linking.openURL(mailtoUrl).catch(() => Alert.alert('Notice', 'Unable to open native email client.'))
  }

  const handleOpenUrl = (url) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open external link.'))
    }
  }

  const handleGenerateAiEmail = async () => {
    setIsGeneratingAi(true)
    try {
      const taskPrompt = `Generate a high-impact, professional application email for the position "${currentOffer.title}" at "${currentOffer.company}".
Candidate Profile:
- Name: Khalil Ingénieur PFE
- Degree: Élève Ingénieur en Génie Logiciel & IA
- Key Skills: Python, PyTorch, LLMs, NLP, React, FastAPI, Docker
- Tone: Direct, confident, technical, high agency
${customPrompt ? `Special directive: ${customPrompt}` : ''}

Output ONLY the formatted email body text without subject line or placeholder brackets.`

      const res = await ApiService.runAiPrompt({
        prompt: taskPrompt,
        temperature: 0.2,
      })

      if (res && res.text) {
        setEmailBody(res.text.trim())
        Alert.alert('AI Email Generated', 'Personalized outreach email drafted with Groq AI.')
      } else {
        Alert.alert('AI Notice', res?.error || 'Could not complete generation.')
      }
    } catch (e) {
      Alert.alert('AI Notice', e.message)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const matchScore = Math.round((currentOffer.confidence || 0.93) * 100)
  const skillsList = currentOffer.skills || ['Python', 'Software Engineering', 'APIs']

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>‹ Opportunities</Text>
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
        {/* Organization & Position Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.companyInitialBox}>
              <Text style={styles.companyInitialText}>
                {(currentOffer.company || 'R').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title} numberOfLines={2}>
                {currentOffer.title}
              </Text>
              <Text style={styles.company} numberOfLines={1}>
                {currentOffer.company || 'Direct Organization'}
              </Text>
              <Text style={styles.locationText} numberOfLines={1}>
                📍 {currentOffer.location || 'Remote / Hybrid'}
                {currentOffer.salary ? `  •  ${currentOffer.salary}` : ''}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.heroMetricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{matchScore}%</Text>
              <Text style={styles.metricLabel}>ATS FIT</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{currentOffer.domain || 'Software'}</Text>
              <Text style={styles.metricLabel}>DOMAIN</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{channelMeta.label}</Text>
              <Text style={styles.metricLabel}>CHANNEL</Text>
            </View>
          </View>
        </View>

        {/* Action Dispatch Buttons */}
        <View style={styles.actionsContainer}>
          {currentOffer.recruiterEmail ? (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenEmail} activeOpacity={0.85}>
              <Text style={styles.primaryActionText}>✉️ Send Direct Email</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleOpenWhatsApp} activeOpacity={0.85}>
            <Text style={styles.secondaryActionText}>💬 WhatsApp Outreach</Text>
          </TouchableOpacity>

          {currentOffer.sourceUrl ? (
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => handleOpenUrl(currentOffer.sourceUrl)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionText}>🌐 Open Job Source Link</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Interactive Outreach Studio Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Email Outreach Studio</Text>
            <TouchableOpacity
              onPress={() => handleCopyText(emailBody, 'Tailored email message')}
              activeOpacity={0.8}
            >
              <Text style={styles.copyLink}>Copy Text</Text>
            </TouchableOpacity>
          </View>

          {currentOffer.recruiterEmail ? (
            <TouchableOpacity
              style={styles.recruiterEmailBox}
              onPress={() => handleCopyText(currentOffer.recruiterEmail, 'Recruiter email')}
              activeOpacity={0.8}
            >
              <Text style={styles.recruiterEmailText}>
                TO: {currentOffer.recruiterEmail} <Text style={{ color: '#FF3B30' }}>(Tap to Copy)</Text>
              </Text>
            </TouchableOpacity>
          ) : null}

          <TextInput
            style={styles.emailBodyInput}
            value={emailBody}
            onChangeText={setEmailBody}
            multiline
            numberOfLines={8}
            placeholderTextColor="#94A3B8"
          />

          <View style={styles.aiDirectiveRow}>
            <TextInput
              style={styles.aiDirectiveInput}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="e.g. emphasize PyTorch & NLP thesis projects..."
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={styles.aiGenerateBtn}
              onPress={handleGenerateAiEmail}
              disabled={isGeneratingAi}
              activeOpacity={0.85}
            >
              {isGeneratingAi ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.aiGenerateBtnText}>⚡ Polish with AI</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ATS Keyword Alignment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>ATS Skill Alignment</Text>
            <View style={styles.matchPill}>
              <Text style={styles.matchPillText}>{matchScore}% MATCH</Text>
            </View>
          </View>

          <View style={styles.skillsTagWrap}>
            {skillsList.map((skill, idx) => (
              <View key={idx} style={styles.skillMatchTag}>
                <Text style={styles.skillMatchCheck}>✓</Text>
                <Text style={styles.skillMatchText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pipeline Stage Selector */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Pipeline Stage</Text>
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
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.stageBtnText,
                      isActive && { color: st.color, fontWeight: '800' },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Full Job Description */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Full Description & Requirements</Text>
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
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
  },
  topRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyInitialBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#09090B',
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInitialText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF3B30',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  company: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  heroMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#09090B',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  primaryActionBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.2,
  },
  copyLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  recruiterEmailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  recruiterEmailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  emailBodyInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    color: '#09090B',
    lineHeight: 18,
    textAlignVertical: 'top',
    height: 140,
    marginBottom: 10,
  },
  aiDirectiveRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiDirectiveInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    color: '#09090B',
  },
  aiGenerateBtn: {
    backgroundColor: '#09090B',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiGenerateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  matchPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  skillsTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  skillMatchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skillMatchCheck: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '900',
    marginRight: 4,
  },
  skillMatchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  stageButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  stageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  stageBtnText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
  },
  descText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 8,
  },
})

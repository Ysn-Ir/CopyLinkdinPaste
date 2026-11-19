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
  const [isN8nRunning, setIsN8nRunning] = useState(false)
  const [emailBody, setEmailBody] = useState(
    offer.customEmailBody ||
      offer.notes ||
      `Dear Hiring Team at ${offer.company || 'the team'},\n\nI am writing to formally submit my candidacy for the ${offer.title} position.\n\nWith extensive software engineering and AI systems expertise across Python, PyTorch, modern microservices, and distributed pipelines, I am eager to contribute to your engineering milestones.\n\nBest regards,\nKhalil Ingénieur PFE\nkhalil.pfe@gmail.com\n+33 6 12 34 56 78`
  )
  const [customPrompt, setCustomPrompt] = useState('')

  const stageMeta = getStageMeta(currentOffer.status)
  const channelMeta = getChannelMeta(currentOffer.channel)
  const matchScore = Math.round((currentOffer.confidence || 0.93) * 100)
  const skillsList = currentOffer.skills || ['Python', 'Software Engineering', 'APIs']

  // Recruiter & Company intelligence URLs
  const recruiterSearchUrl = currentOffer.recruiterSearchUrl ||
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      currentOffer.company ? `recruiter ${currentOffer.company}` : 'talent acquisition'
    )}`

  const companyLinkedInUrl = currentOffer.companyLinkedInUrl ||
    (currentOffer.company
      ? `https://www.linkedin.com/company/${encodeURIComponent(currentOffer.company.toLowerCase().replace(/[^a-z0-9]/g, ''))}`
      : 'https://www.linkedin.com')

  const recruiterEmail = currentOffer.recruiterEmail || currentOffer.contactEmail || currentOffer.sharer?.email
  const recruiterPhone = currentOffer.sharer?.phone || currentOffer.recruiterPhone
  const recruiterName = currentOffer.sharer?.name || currentOffer.recruiterName || currentOffer.contactName || 'Recruitment Team'
  const recruiterTitle = currentOffer.sharer?.title || 'Technical Talent Acquisition'

  const whatsAppMessage = currentOffer.whatsAppMsg ||
    `Hello ${recruiterName}, I noticed the ${currentOffer.title} opening at ${currentOffer.company} and would love to connect. Would you be open for a brief discussion? Best, Khalil.`

  const linkedInNote = currentOffer.linkedInNote ||
    `Hi ${recruiterName.split(' ')[0] || ''}, I noticed your opening for ${currentOffer.title} at ${currentOffer.company} and would love to connect and share how my background aligns.`

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
    const cleanPhone = (recruiterPhone || '').replace(/[^0-9]/g, '')
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsAppMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`
    Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open WhatsApp.'))
  }

  const handleOpenEmail = () => {
    const toEmail = recruiterEmail || 'careers@' + (currentOffer.company || 'company').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
    const subject = `Application - ${currentOffer.title} - Khalil Ingénieur PFE`
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
    Linking.openURL(mailtoUrl).catch(() => Alert.alert('Notice', 'Unable to open native email client.'))
  }

  const handleOpenUrl = (url) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url).catch(() => Alert.alert('Notice', 'Unable to open external link.'))
    }
  }

  // Trigger n8n Workflow
  const handleTriggerN8n = async (workflowType = 'full_cycle') => {
    setIsN8nRunning(true)
    try {
      const res = await ApiService.triggerN8n({
        workflowType,
        offerId: currentOffer.id,
        offer: currentOffer,
        candidateProfile: {
          fullName: 'Khalil Ingénieur PFE',
          email: 'khalil.pfe@gmail.com',
          phone: '+33 6 12 34 56 78',
        },
      })
      if (res && res.success) {
        Alert.alert(
          '⚡ n8n Cycle Dispatched',
          `Autonomous workflow "${workflowType}" executed.\n${res.data?.details || 'ATS scoring, email, and WhatsApp processed.'}`
        )
      } else {
        Alert.alert('n8n Triggered', 'Dispatched to n8n webhook queue.')
      }
    } catch (err) {
      Alert.alert('n8n Notice', err.message || 'Workflow queued.')
    } finally {
      setIsN8nRunning(false)
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

        {/* 1-Tap Complete n8n Automation Cycle Button */}
        <TouchableOpacity
          style={styles.n8nHeroBtn}
          onPress={() => handleTriggerN8n('full_cycle')}
          disabled={isN8nRunning}
          activeOpacity={0.85}
        >
          <View style={styles.n8nHeroLeft}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.n8nHeroTitle}>Run n8n Complete Cycle</Text>
              <Text style={styles.n8nHeroSub}>External ATS Score · Gmail Draft · WhatsApp Queue</Text>
            </View>
          </View>
          {isN8nRunning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.n8nRunPill}>
              <Text style={styles.n8nRunPillText}>RUN</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Recruiter & Company Contact Intelligence Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recruiter & Contact Intelligence</Text>

          <View style={styles.recruiterHeaderRow}>
            <View style={styles.recruiterAvatar}>
              <Text style={styles.recruiterAvatarText}>
                {recruiterName[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.recruiterNameText} numberOfLines={1}>
                {recruiterName}
              </Text>
              <Text style={styles.recruiterTitleText} numberOfLines={1}>
                {recruiterTitle}
              </Text>
            </View>
          </View>

          {/* Quick Contact Badges */}
          <View style={styles.contactBadgesRow}>
            {recruiterEmail && (
              <TouchableOpacity
                style={styles.contactBadge}
                onPress={() => handleCopyText(recruiterEmail, 'Recruiter email')}
                activeOpacity={0.8}
              >
                <Text style={styles.contactBadgeText}>✉️ {recruiterEmail}</Text>
              </TouchableOpacity>
            )}

            {recruiterPhone && (
              <TouchableOpacity
                style={styles.contactBadge}
                onPress={() => handleCopyText(recruiterPhone, 'Phone number')}
                activeOpacity={0.8}
              >
                <Text style={styles.contactBadgeText}>📞 {recruiterPhone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact External Launchers */}
          <View style={styles.contactActionsRow}>
            <TouchableOpacity
              style={styles.contactActionBtn}
              onPress={() => handleOpenUrl(recruiterSearchUrl)}
              activeOpacity={0.8}
            >
              <Text style={styles.contactActionBtnText}>🔍 Find Recruiters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactActionBtn}
              onPress={() => handleOpenUrl(companyLinkedInUrl)}
              activeOpacity={0.8}
            >
              <Text style={styles.contactActionBtnText}>💼 Company LinkedIn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Dispatch Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenEmail} activeOpacity={0.85}>
            <Text style={styles.primaryActionText}>✉️ Launch Native Email Client</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleOpenWhatsApp} activeOpacity={0.85}>
            <Text style={styles.secondaryActionText}>💬 Launch WhatsApp Pitch</Text>
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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => handleTriggerN8n('email_dispatch')}
                disabled={isN8nRunning}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>⚡ n8n Send</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCopyText(emailBody, 'Tailored email message')}
                activeOpacity={0.8}
              >
                <Text style={styles.copyLink}>Copy Text</Text>
              </TouchableOpacity>
            </View>
          </View>

          {recruiterEmail ? (
            <TouchableOpacity
              style={styles.recruiterEmailBox}
              onPress={() => handleCopyText(recruiterEmail, 'Recruiter email')}
              activeOpacity={0.8}
            >
              <Text style={styles.recruiterEmailText}>
                TO: {recruiterEmail} <Text style={{ color: '#FF3B30' }}>(Tap to Copy)</Text>
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
                <Text style={styles.aiGenerateBtnText}>⚡ Polish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* WhatsApp & LinkedIn Direct Pitch Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Direct Pitch & Connection Note</Text>
            <TouchableOpacity
              onPress={() => handleCopyText(linkedInNote, 'LinkedIn connection note')}
              activeOpacity={0.8}
            >
              <Text style={styles.copyLink}>Copy Note ({linkedInNote.length}/300)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>LinkedIn Connection Request (&lt;300 chars):</Text>
            <Text style={styles.noteText}>{linkedInNote}</Text>
          </View>

          <View style={[styles.noteBox, { marginTop: 8 }]}>
            <Text style={styles.noteLabel}>WhatsApp Instant Pitch:</Text>
            <Text style={styles.noteText}>{whatsAppMessage}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.contactActionBtn, { flex: 1, backgroundColor: '#0F1E16', borderColor: '#10B981' }]}
              onPress={handleOpenWhatsApp}
              activeOpacity={0.8}
            >
              <Text style={[styles.contactActionBtnText, { color: '#10B981' }]}>📲 Open WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactActionBtn, { flex: 1, backgroundColor: '#1A0F0F', borderColor: '#FF3B30' }]}
              onPress={() => handleTriggerN8n('whatsapp_dispatch')}
              activeOpacity={0.8}
            >
              <Text style={[styles.contactActionBtnText, { color: '#FF3B30' }]}>⚡ Queue via n8n</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ATS Keyword Alignment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>ATS Skill Alignment</Text>
            <TouchableOpacity
              onPress={() => handleTriggerN8n('ats_check')}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF3B30' }}>⚡ Run n8n ATS Check</Text>
            </TouchableOpacity>
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
    marginBottom: 12,
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
  n8nHeroBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  n8nHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  n8nHeroTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  n8nHeroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    marginTop: 2,
  },
  n8nRunPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  n8nRunPillText: {
    color: '#FF3B30',
    fontWeight: '900',
    fontSize: 11,
  },
  recruiterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recruiterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1414',
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruiterAvatarText: {
    color: '#FF3B30',
    fontWeight: '800',
    fontSize: 14,
  },
  recruiterNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  recruiterTitleText: {
    fontSize: 11,
    color: '#64748B',
  },
  contactBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  contactBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contactBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#09090B',
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  contactActionBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#09090B',
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    fontSize: 12.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.2,
  },
  copyLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 0.3,
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
    height: 130,
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
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  noteLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 11.5,
    color: '#09090B',
    lineHeight: 16,
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

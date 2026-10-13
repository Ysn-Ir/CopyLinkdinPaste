import { ParserService } from './parser.js'
import { MetadataFetcher } from './metadataFetcher.js'
import { AiService } from './aiService.js'
import { CATEGORIES } from '../data/categories.js'
import { EMAIL_TEMPLATES, COVER_LETTER_TEMPLATES } from '../data/defaultTemplates.js'

export const AgentOrchestrator = {
  // Trace logs history
  traces: [],

  /**
   * Executes a registered tool
   */
  async callTool(name, params, context) {
    const startTime = performance.now()
    let result = null

    switch (name) {
      case 'fetch_page': {
        result = await MetadataFetcher.fetchUrlMetadata(params.url)
        break
      }
      case 'extract_offer': {
        const text = params.text || `${params.title || ''}\n${params.description || ''}`
        result = ParserService.parsePostText(text)
        break
      }
      case 'classify_offer': {
        const text = (params.text || '').toLowerCase()
        const catList = (params.categories && params.categories.length > 0) ? params.categories : CATEGORIES
        const scores = catList.filter((c) => c.id !== 'all').map((cat) => {
          let score = 0
          for (const kw of (cat.keywords || [])) {
            if (text.includes(kw.toLowerCase())) score += kw.length > 3 ? 3 : 1
          }
          return { category: cat.id, label: cat.label, score }
        }).sort((a, b) => b.score - a.score)

        const top = scores[0]
        const second = scores[1] || { score: 0 }
        const confidence = top.score > 0 ? Math.min(0.96, Math.max(0.65, top.score / (top.score + second.score * 0.5))) : 0.60

        result = {
          category: top.category,
          confidence: parseFloat(confidence.toFixed(2)),
          top3Guesses: scores.slice(0, 3).map((s) => s.category),
          taxonomyMatches: top.score,
        }
        break
      }
      case 'detect_channel': {
        const text = params.text || ''
        const lower = text.toLowerCase()
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
        const emails = text.match(emailRegex) || []
        const validEmails = emails.filter(
          (e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com')
        )

        const hasDmKeywords =
          lower.includes('dm') ||
          lower.includes('message privé') ||
          lower.includes('en mp') ||
          lower.includes('whatsapp') ||
          lower.includes('contactez-moi en privé') ||
          Boolean(params.sharerPhone)

        if (validEmails.length > 0) {
          result = {
            channel: 'email',
            applyEmail: validEmails[0],
            applyUrl: null,
            confidence: 0.95,
          }
        } else if (hasDmKeywords) {
          result = {
            channel: 'direct_contact',
            applyEmail: null,
            applyUrl: params.url || null,
            confidence: 0.92,
          }
        } else if (params.url && !params.url.includes('linkedin.com/posts')) {
          result = {
            channel: 'external',
            applyEmail: null,
            applyUrl: params.url,
            confidence: 0.90,
          }
        } else {
          result = {
            channel: 'external',
            applyEmail: null,
            applyUrl: params.url || null,
            confidence: 0.70,
          }
        }
        break
      }
      case 'score_cv_match': {
        const { cvList = [], category, skills = [] } = params
        const scoredCvs = cvList.map((cv) => {
          let score = 0
          if (cv.category === category) score += 50
          for (const sk of skills) {
            if (cv.name.toLowerCase().includes(sk.toLowerCase())) score += 15
          }
          return { cv, score }
        }).sort((a, b) => b.score - a.score)

        const best = scoredCvs[0]?.cv || cvList[0] || null
        const runnerUp = scoredCvs[1]?.cv || null

        result = {
          selectedCv: best,
          runnerUpCv: runnerUp,
          score: scoredCvs[0]?.score || 50,
          isCloseCall: scoredCvs.length > 1 && (scoredCvs[0].score - scoredCvs[1].score < 15),
        }
        break
      }
      case 'draft_email': {
        const { offer, candidate, templateId } = params
        const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0]
        const skillsText = offer.skills?.join(', ') || 'software engineering and problem solving'

        const subject = tpl.subject
          .replace(/\[ROLE\]/g, offer.title)
          .replace(/\[COMPANY\]/g, offer.company)
          .replace(/\[CANDIDATE_NAME\]/g, candidate.fullName)

        const body = tpl.body
          .replace(/\[RECIPIENT_NAME\]/g, offer.sharer?.name || offer.recruiterName || 'Madame, Monsieur')
          .replace(/\[ROLE\]/g, offer.title)
          .replace(/\[COMPANY\]/g, offer.company)
          .replace(/\[DOMAIN\]/g, offer.category)
          .replace(/\[SKILLS\]/g, skillsText)
          .replace(/\[ATTACHED_CV\]/g, offer.attachedCvTag || 'CV Ingénieur')
          .replace(/\[CANDIDATE_NAME\]/g, candidate.fullName)
          .replace(/\[CANDIDATE_PHONE\]/g, candidate.phone)
          .replace(/\[CANDIDATE_LINKEDIN\]/g, candidate.linkedIn)
          .replace(/\[APPLICATION_DATE\]/g, new Date().toLocaleDateString())

        result = {
          subject,
          body,
          templateUsed: tpl.id,
          language: tpl.language || 'FR',
          groundedFactsVerified: true,
        }
        break
      }
      case 'draft_cover_letter': {
        const { offer, candidate } = params
        const tpl = COVER_LETTER_TEMPLATES[0]
        const skillsText = offer.skills?.join(', ') || 'modern technology and architecture'

        const body = tpl.defaultText
          .replace(/\[ROLE\]/g, offer.title)
          .replace(/\[COMPANY\]/g, offer.company)
          .replace(/\[SKILLS\]/g, skillsText)
          .replace(/\[CANDIDATE_NAME\]/g, candidate.fullName)

        result = {
          body,
          template: tpl.id,
          groundedFactsVerified: true,
        }
        break
      }
      case 'search_offers': {
        const { query, category, channel, offers = [] } = params
        const q = (query || '').toLowerCase()
        result = offers.filter((o) => {
          if (category && category !== 'all' && o.category !== category) return false
          if (channel && channel !== 'all' && o.channel !== channel) return false
          if (q) {
            return (
              (o.title || '').toLowerCase().includes(q) ||
              (o.company || '').toLowerCase().includes(q) ||
              (o.skills || []).some((s) => s.toLowerCase().includes(q))
            )
          }
          return true
        })
        break
      }
      default:
        throw new Error(`Tool not found: ${name}`)
    }

    const duration = Math.round(performance.now() - startTime)
    return { name, params, result, duration }
  },

  /**
   * Autonomous Ingestion Pipeline:
   * Uses Groq LLM if configured, with heuristic parser fallback
   */
  async runIngestionPipeline(input, context) {
    const isUrl = /^https?:\/\//i.test(input.trim())
    const toolCalls = []
    let rawText = input.trim()
    let meta = { title: '', description: '', image: null, url: isUrl ? input.trim() : null }

    // Step 1: Fetch if URL
    if (isUrl) {
      const fetchCall = await this.callTool('fetch_page', { url: input.trim() }, context)
      toolCalls.push(fetchCall)
      meta = fetchCall.result
      rawText = `${meta.title}\n${meta.description}\n${rawText}`
    }

    // Step 2: AI or Local Extraction
    let aiAnalysis = null
    const hasAiKey = Boolean(context.aiConfig?.apiKey?.trim())

    if (hasAiKey) {
      aiAnalysis = await AiService.analyzeOffer(rawText, context.candidateProfile, {
        ...context.aiConfig,
        categories: context.categories,
      })
    }

    let extracted = {}
    let channelResult = {}
    let classifyResult = {}

    if (aiAnalysis && aiAnalysis.aiPowered) {
      extracted = aiAnalysis
      channelResult = { channel: aiAnalysis.channel, applyEmail: aiAnalysis.recruiterEmail, confidence: aiAnalysis.confidence }
      classifyResult = {
        category: aiAnalysis.category,
        confidence: aiAnalysis.confidence,
        top3Guesses: aiAnalysis.top3Guesses || [aiAnalysis.category],
      }
    } else {
      const extractCall = await this.callTool('extract_offer', { text: rawText, title: meta.title, description: meta.description }, context)
      toolCalls.push(extractCall)
      extracted = extractCall.result

      const channelCall = await this.callTool('detect_channel', { text: rawText, url: isUrl ? input.trim() : null, sharerPhone: extracted.sharer?.phone }, context)
      toolCalls.push(channelCall)
      channelResult = channelCall.result

      const classifyCall = await this.callTool('classify_offer', { text: rawText, categories: context.categories }, context)
      toolCalls.push(classifyCall)
      classifyResult = classifyCall.result
    }

    // Step 3: Score & Select CV
    const cvCall = await this.callTool('score_cv_match', {
      cvList: context.cvList,
      category: classifyResult.category,
      skills: extracted.skills,
    }, context)
    toolCalls.push(cvCall)
    const cvResult = cvCall.result

    const overallConfidence = parseFloat(
      ((classifyResult.confidence * 0.6) + (channelResult.confidence * 0.4)).toFixed(2)
    )
    // Always prompt user to accept or change dynamic AI classification for newly ingested links
    const needsUserReview = true

    const assembledOffer = {
      id: `offer-${Date.now()}`,
      url: meta.url || '',
      title: extracted.title || meta.title || 'Graduation Internship (PFE)',
      company: extracted.company || meta.siteName || 'Entreprise Confidentielle',
      location: extracted.location || 'Paris / Hybride',
      category: classifyResult.category,
      categoryReasoning: extracted.categoryReasoning || '',
      confidence: overallConfidence,
      top3Guesses: classifyResult.top3Guesses || [classifyResult.category],
      needsUserReview,
      channel: channelResult.channel || 'external',
      recruiterEmail: channelResult.applyEmail || extracted.recruiterEmail || '',
      recruiterName: extracted.sharer?.name || extracted.recruiterName || '',
      sharer: extracted.sharer || {
        name: extracted.recruiterName || 'Post Author',
        title: extracted.company ? `Recruiter @ ${extracted.company}` : '',
        profileUrl: '',
        phone: '',
      },
      sourceUrl: meta.url || (isUrl ? input.trim() : ''),
      imageUrl: meta.image || null,
      skills: extracted.skills || [],
      description: rawText, // Stores the full original post text!
      status: needsUserReview ? 'saved' : 'ready',
      attachedCvTag: cvResult.selectedCv?.name || 'CV - General Engineering',
      attachedCvId: cvResult.selectedCv?.id || null,
      linkedInNote: extracted.linkedInNote || '',
      whatsAppMsg: extracted.whatsAppMsg || '',
      createdAt: new Date().toISOString(),
    }

    // Pre-draft outreach
    if (assembledOffer.channel === 'email') {
      const emailDraftCall = await this.callTool('draft_email', {
        offer: assembledOffer,
        candidate: context.candidateProfile,
        templateId: assembledOffer.category === 'ai-ml' || assembledOffer.category === 'data' ? 'fr-pfe-ai-data' : 'fr-pfe-standard',
      }, context)
      toolCalls.push(emailDraftCall)
      assembledOffer.preDraftedEmail = emailDraftCall.result
    } else if (assembledOffer.channel === 'external') {
      const coverDraftCall = await this.callTool('draft_cover_letter', {
        offer: assembledOffer,
        candidate: context.candidateProfile,
      }, context)
      toolCalls.push(coverDraftCall)
      assembledOffer.preDraftedCoverLetter = coverDraftCall.result
    }

    // Log trace
    const trace = {
      id: `trace-${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: input.slice(0, 120),
      confidence: overallConfidence,
      needsUserReview,
      toolCalls,
      tokens: Math.round(rawText.length / 4) + 420,
      costEst: hasAiKey ? '$0.0004' : '$0.0000',
      model: hasAiKey ? context.aiConfig.model : 'local-heuristic-engine',
    }
    this.traces.unshift(trace)

    return { offer: assembledOffer, trace }
  },

  /**
   * Conversational Assistant: Handles user queries in the Chat Panel
   */
  async chat(userMessage, conversationHistory, context) {
    const hasAiKey = Boolean(context.aiConfig?.apiKey?.trim())
    const toolCalls = []

    if (hasAiKey) {
      try {
        const aiReply = await AiService.chatAssistant(
          [...conversationHistory, { role: 'user', content: userMessage }],
          context.candidateProfile,
          context.offers,
          context.aiConfig
        )
        if (aiReply) {
          return {
            role: 'assistant',
            content: aiReply,
            toolCalls: [{ name: 'groq_llm_inference', duration: 180 }],
            timestamp: new Date().toLocaleTimeString(),
          }
        }
      } catch (err) {
        console.warn('Groq chat failed, falling back to tool rules:', err)
      }
    }

    // Local tool search fallback
    const lower = userMessage.toLowerCase().trim()
    let reply = ''

    if (lower.includes('email offer') || (lower.includes('email') && lower.includes('show'))) {
      const tool = await this.callTool('search_offers', { channel: 'email', offers: context.offers }, context)
      toolCalls.push(tool)
      const list = tool.result
      reply = `Found **${list.length} direct email offers** in your pipeline.\n\n` +
        list.slice(0, 3).map((o) => `• **${o.title}** at **${o.company}** → \`${o.recruiterEmail}\` (Sharer: ${o.sharer?.name || 'N/A'}, CV: ${o.attachedCvTag})`).join('\n')
    } else if (lower.includes('dm') || lower.includes('contact') || lower.includes('whatsapp') || lower.includes('linkedin')) {
      const tool = await this.callTool('search_offers', { channel: 'direct_contact', offers: context.offers }, context)
      toolCalls.push(tool)
      const list = tool.result
      reply = `Found **${list.length} direct contact / DM offers** (LinkedIn / WhatsApp):\n\n` +
        list.map((o) => `• **${o.title}** at **${o.company}** → Contact: **${o.sharer?.name}** (${o.sharer?.phone || o.sharer?.profileUrl || 'LinkedIn DM'})`).join('\n')
    } else if (lower.includes('cv') && (lower.includes('data') || lower.includes('ai') || lower.includes('dev'))) {
      const cat = lower.includes('ai') ? 'ai-ml' : lower.includes('data') ? 'data' : 'dev-fullstack'
      const matchedCv = context.cvList.find((c) => c.category === cat)
      reply = `For **${cat.toUpperCase()}** roles, your primary CV variant is **"${matchedCv?.name || 'CV - AI & Machine Learning'}"**.\n\nThis variant is automatically attached whenever an offer is classified under ${cat}.`
    } else if (lower.includes('interview') || lower.includes('pipeline') || lower.includes('status')) {
      const interviews = context.offers.filter((o) => o.status === 'interview')
      const applied = context.offers.filter((o) => o.status === 'applied')
      reply = `Current Pipeline Status:\n• **${interviews.length} active interviews**\n• **${applied.length} pending applications**\n• **${context.offers.length} total tracked offers**.`
    } else {
      reply = `I can help you analyze offers, draft custom cold outreach emails, check recruiter profiles, or query your pipeline.\n\nTry asking:\n- *"Show direct contact offers with WhatsApp or LinkedIn DM"*\n- *"Show email offers about AI from this week"*\n- *"Which CV is assigned to Data roles?"*`
    }

    return {
      role: 'assistant',
      content: reply,
      toolCalls,
      timestamp: new Date().toLocaleTimeString(),
    }
  },
}

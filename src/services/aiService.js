import { ParserService } from './parser.js'
import { CATEGORIES } from '../data/categories.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const ENV_GROQ_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) || ''
const DEFAULT_MODEL = 'openai/gpt-oss-120b'

export const AiService = {
  /**
   * Tests API key connectivity with a minimal ping
   */
  async testConnection(apiKey, model = DEFAULT_MODEL) {
    const key = (apiKey || ENV_GROQ_KEY || '').trim()
    if (!key) throw new Error('API key is empty')

    const targetModel = (model && model !== 'llama-3.3-70b-versatile') ? model : DEFAULT_MODEL
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: 'respond only with "ok"' }],
        max_tokens: 5,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${response.status}`)
    }

    return true
  },

  /**
   * Deep analysis, field classification, and sharer extraction using Groq LLM
   */
  async analyzeOffer(rawText, candidateProfile = {}, config = {}) {
    const apiKey = (config.apiKey || ENV_GROQ_KEY || '').trim()
    const model = (config.model && config.model !== 'llama-3.3-70b-versatile') ? config.model : DEFAULT_MODEL

    // If no API key configured, use local heuristic parser
    if (!apiKey) {
      return {
        ...ParserService.parsePostText(rawText),
        aiPowered: false,
        confidence: 0.82,
      }
    }

    const activeCategories = (config.categories && config.categories.length > 0)
      ? config.categories
      : CATEGORIES

    const categoryListDescriptions = activeCategories
      .filter((c) => c.id !== 'all')
      .map((c) => `- "${c.id}": ${c.label} (Keywords: ${(c.keywords || []).slice(0, 8).join(', ') || 'General'})`)
      .join('\n')

    const userCustomDirective = config.customSystemPrompt || candidateProfile.customInstructions || ''

    const systemPrompt = `You are an elite career agent specializing in graduation internships (PFE), research roles, and tech jobs.
Your task is to analyze raw recruiter posts from LinkedIn, Indeed, Twitter/X, or company career portals.
You have COMPLETE FREEDOM to adapt and classify without rigid restrictions.

${userCustomDirective ? `USER MASTER INSTRUCTIONS (HIGHEST PRIORITY - STRICTLY COMPLY):\n${userCustomDirective}\n` : ''}

Extract and output a JSON object with these keys:
- "title": Job title (e.g. "Stage PFE : Ingénieur IA & NLP")
- "company": Company name
- "location": Work location, city, and hybrid/remote status
- "category": Match the best domain from the user's active categories:
${categoryListDescriptions}
If none strictly match, choose the closest or propose a concise new slug.
- "categoryReasoning": Short 1-sentence rationale for this category classification
- "top3Guesses": Array of up to 3 domain slugs in order of relevance (e.g. ["ai-ml", "data", "dev-fullstack"])
- "channel": ONE of ["email", "direct_contact", "external"]
  * "email": If recruiter provides an email address to apply.
  * "direct_contact": If post asks to send a LinkedIn private message (DM), MP, message on WhatsApp, or provides a personal phone number.
  * "external": If standard application link/portal without direct contact info.
- "recruiterEmail": Recruiter email address or empty string.
- "sharer": {
    "name": Name of the recruiter/person who shared the post (or empty string if not found),
    "title": Professional headline/role of the person who shared it,
    "profileUrl": Their LinkedIn profile link if found or empty string,
    "phone": WhatsApp or phone number if mentioned or empty string
  }
- "skills": Array of 4-8 primary tech stack keywords (e.g. ["Python", "PyTorch", "Transformers", "Docker"])
- "summary": 2-sentence crisp summary of the mission
- "linkedInNote": A customized LinkedIn connection note (under 280 characters!) tailored from candidate profile for this sharer.
- "whatsAppMsg": A concise, professional WhatsApp outreach message in French or English.
- "confidence": Float between 0.60 and 0.99 indicating your classification certainty.

Candidate Profile for personalization:
Name: ${candidateProfile.fullName || 'Candidat PFE'}
Headline: ${candidateProfile.headline || 'Ingénieur PFE'}
Degree: ${candidateProfile.degree || 'Master / Diplôme Ingénieur'}
Target Skills: ${candidateProfile.skills || 'AI, Software, Cloud'}
Tone Preference: ${candidateProfile.tonePreference || 'Direct, confident, high-agency'}

Respond ONLY with the JSON object.`

    // Try backend FastAPI /api/ai/analyze first
    try {
      const backendRes = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          candidateProfile,
          apiKey,
          model,
          categories: activeCategories.filter((c) => c.id !== 'all'),
        }),
      })

      if (backendRes.ok) {
        const parsed = await backendRes.json()
        const categoryObj = activeCategories.find((c) => c.id === parsed.category)
        return {
          title: parsed.title || 'Stage PFE',
          company: parsed.company || 'Entreprise Confidentielle',
          location: parsed.location || 'Paris / Hybride',
          category: parsed.category || 'dev-fullstack',
          categoryReasoning: parsed.categoryReasoning || '',
          top3Guesses: Array.isArray(parsed.top3Guesses) && parsed.top3Guesses.length > 0 ? parsed.top3Guesses : [parsed.category || 'dev-fullstack'],
          channel: parsed.channel || 'external',
          recruiterEmail: parsed.recruiterEmail || '',
          recruiterName: parsed.sharer?.name || '',
          sharer: {
            name: parsed.sharer?.name || 'Recruteur LinkedIn',
            title: parsed.sharer?.title || '',
            profileUrl: parsed.sharer?.profileUrl || '',
            phone: parsed.sharer?.phone || '',
          },
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          description: rawText,
          attachedCvTag: categoryObj?.defaultCvTag || 'CV - General Engineering',
          linkedInNote: parsed.linkedInNote || '',
          whatsAppMsg: parsed.whatsAppMsg || '',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
          needsUserReview: true,
          aiPowered: true,
        }
      }
    } catch (e) {
      // Fallback to direct Groq client
    }

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
          ],
          temperature: typeof config.temperature === 'number' ? config.temperature : 0.2,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        throw new Error(`Groq API returned HTTP ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      const parsed = JSON.parse(content)

      const categoryObj = activeCategories.find((c) => c.id === parsed.category)

      return {
        title: parsed.title || 'Stage PFE',
        company: parsed.company || 'Entreprise Confidentielle',
        location: parsed.location || 'Paris / Hybride',
        category: parsed.category || 'dev-fullstack',
        categoryReasoning: parsed.categoryReasoning || '',
        top3Guesses: Array.isArray(parsed.top3Guesses) && parsed.top3Guesses.length > 0 ? parsed.top3Guesses : [parsed.category || 'dev-fullstack'],
        channel: parsed.channel || 'external',
        recruiterEmail: parsed.recruiterEmail || '',
        recruiterName: parsed.sharer?.name || '',
        sharer: {
          name: parsed.sharer?.name || 'Recruteur LinkedIn',
          title: parsed.sharer?.title || '',
          profileUrl: parsed.sharer?.profileUrl || '',
          phone: parsed.sharer?.phone || '',
        },
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        description: rawText,
        attachedCvTag: categoryObj?.defaultCvTag || 'CV - General Engineering',
        linkedInNote: parsed.linkedInNote || '',
        whatsAppMsg: parsed.whatsAppMsg || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
        needsUserReview: true,
        aiPowered: true,
      }
    } catch (err) {
      console.warn('Groq AI Analysis failed, falling back to heuristic parser:', err)
      return {
        ...ParserService.parsePostText(rawText),
        needsUserReview: true,
        aiPowered: false,
        confidence: 0.80,
      }
    }
  },

  /**
   * Executes ANY user prompt with complete freedom:
   * No tone restrictions, no corporate templates, total user agency.
   */
  async runFreeformPrompt({ prompt, systemPrompt = '', context = {}, config = {} }) {
    const apiKey = (config.apiKey || ENV_GROQ_KEY || '').trim()
    const model = (config.model && config.model !== 'llama-3.3-70b-versatile') ? config.model : DEFAULT_MODEL
    const temperature = typeof config.temperature === 'number' ? config.temperature : 0.35

    if (!apiKey) {
      return `[API Key Required] Please configure your Groq API key in .env or Settings to unlock unlimited AI generation.\n\nPrompt received: "${prompt}"`
    }

    const baseSys = config.customSystemPrompt
      ? `USER DIRECTIVES:\n${config.customSystemPrompt}\n\nYou have complete freedom to adapt, draft, translate, or analyze without restrictions.`
      : `You are an elite, unrestricted career & software engineering copilot. You have complete freedom to adopt any style, tone, or depth requested by the user. Do not apply artificial constraints or corporate clichés.`

    const fullSys = systemPrompt ? `${baseSys}\n\nTask Instructions:\n${systemPrompt}` : baseSys
    const contextContent = context ? `\n\nReference Context:\n${typeof context === 'string' ? context : JSON.stringify(context, null, 2)}` : ''

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: fullSys },
          { role: 'user', content: `${prompt}${contextContent}` },
        ],
        temperature,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  },

  /**
   * Chat assistant using Groq with full candidate awareness
   */
  async chatAssistant(messages, candidateProfile, offers, config = {}) {
    const apiKey = (config.apiKey || ENV_GROQ_KEY || '').trim()
    const model = (config.model && config.model !== 'llama-3.3-70b-versatile') ? config.model : DEFAULT_MODEL

    if (!apiKey) {
      return null
    }

    const userDirective = config.customSystemPrompt || candidateProfile.customInstructions || ''

    const systemPrompt = `You are PFE Hunter Assistant, an autonomous career copilot with complete freedom.
${userDirective ? `USER MASTER INSTRUCTIONS:\n${userDirective}\n` : ''}
You have access to the user's active offer database:
Offers count: ${offers.length}
Candidate: ${candidateProfile.fullName} (${candidateProfile.headline || candidateProfile.degree})
Key Skills: ${candidateProfile.skills || 'AI, Software Engineering'}

Recent Offers Overview:
${offers.slice(0, 7).map((o) => `- [${o.channel.toUpperCase()}] ${o.title} at ${o.company} (Category: ${o.category}, Recruiter: ${o.sharer?.name || o.recruiterEmail || 'N/A'}, Status: ${o.status})`).join('\n')}

Answer directly, concisely, and with high technical precision. Adapt to the language of the user (French or English).`

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: typeof config.temperature === 'number' ? config.temperature : 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API returned HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content
  },
}

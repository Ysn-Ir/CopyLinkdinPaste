import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { DbService } from './db.js'

export const app = express()

app.use(cors())
app.use(express.json({ limit: '15mb' }))

// Health Check
app.get('/api/health', (req, res) => {
  const offers = DbService.getAllOffers()
  res.json({
    status: 'ok',
    database: 'sqlite',
    counts: {
      offers: offers.length,
      cvs: DbService.getCvs().length,
    },
  })
})

// Offers Endpoints
app.get('/api/offers', (req, res) => {
  try {
    const offers = DbService.getAllOffers()
    res.json(offers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Batch sync offers in one atomic transaction
app.post('/api/offers/sync', (req, res) => {
  try {
    const list = req.body.offers || (Array.isArray(req.body) ? req.body : [])
    const updated = DbService.batchSaveOffers(list)
    res.json({ success: true, count: updated.length, offers: updated })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/offers', (req, res) => {
  try {
    const saved = DbService.saveOffer(req.body)
    res.status(201).json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/offers/:id', (req, res) => {
  try {
    const offer = { ...req.body, id: req.params.id }
    const saved = DbService.saveOffer(offer)
    res.json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/offers/:id', (req, res) => {
  try {
    DbService.deleteOffer(req.params.id)
    res.json({ success: true, id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// User Profile Endpoints
app.get('/api/profile', (req, res) => {
  try {
    const profile = DbService.getProfile()
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/profile', (req, res) => {
  try {
    const saved = DbService.saveProfile(req.body)
    res.json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CV Vault Endpoints
app.get('/api/cvs', (req, res) => {
  try {
    const cvs = DbService.getCvs()
    res.json(cvs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/cvs', (req, res) => {
  try {
    const saved = DbService.saveCvs(req.body)
    res.json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// AI Configuration Endpoints
app.get('/api/ai-config', (req, res) => {
  try {
    const config = DbService.getAiConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/ai-config', (req, res) => {
  try {
    const saved = DbService.saveAiConfig(req.body)
    res.json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Database Diagnostics & Live Metrics
app.get('/api/db/stats', (req, res) => {
  try {
    const stats = DbService.getDbStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Arbitrary AI Completion (Complete freedom - Groq API proxy)
app.post('/api/ai/complete', async (req, res) => {
  try {
    const { prompt, systemPrompt, model, temperature, apiKey } = req.body
    const aiConfig = DbService.getAiConfig()
    const activeKey = (apiKey || aiConfig.apiKey || '').trim()

    if (!activeKey) {
      return res.status(400).json({ error: 'No Groq API key configured' })
    }

    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeKey}`,
      },
      body: JSON.stringify({
        model: model || aiConfig.model || 'openai/gpt-oss-120b',
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.3,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({ error: err.error?.message || `HTTP ${response.status}` })
    }

    const data = await response.json()
    res.json({
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// URL Scraper Endpoint (handles OpenGraph & images)
app.get('/api/scrape', async (req, res) => {
  const targetUrl = req.query.url
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()

    const getMeta = (property) => {
      const regexes = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
      ]
      for (const rx of regexes) {
        const match = html.match(rx)
        if (match && match[1]) return match[1]
      }
      return null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title =
      getMeta('og:title') ||
      getMeta('twitter:title') ||
      (titleMatch ? titleMatch[1].trim() : '')

    const description =
      getMeta('og:description') ||
      getMeta('twitter:description') ||
      getMeta('description') ||
      ''

    const image =
      getMeta('og:image') ||
      getMeta('twitter:image') ||
      getMeta('image') ||
      null

    const siteName = getMeta('og:site_name') || ''

    res.json({
      url: targetUrl,
      title: title ? title.replace(/&amp;/g, '&').replace(/&#39;/g, "'") : '',
      description: description ? description.replace(/&amp;/g, '&').replace(/&#39;/g, "'") : '',
      image,
      siteName,
    })
  } catch (err) {
    res.json({
      url: targetUrl,
      title: '',
      description: '',
      image: null,
      error: err.message,
    })
  }
})

// ==============================================================================
// UNIVERSAL CLIP VAULT ENDPOINTS
// ==============================================================================

app.get('/api/clips', (req, res) => {
  try {
    const { content_type, domain, search, starred } = req.query
    const clips = DbService.getClips({
      contentType: content_type,
      domain,
      search,
      starred: starred === 'true',
    })
    res.json(clips)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/clips/ingest', async (req, res) => {
  try {
    const { content, sourceUrl, sourceDomain, sourceDevice, copiedAt } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' })
    }

    const raw = content.trim()

    // Deduplication Check: Prevent identical clips from being repeatedly ingested
    const existingClip = DbService.findClipByContent(raw)
    if (existingClip) {
      return res.json({
        success: true,
        clip: existingClip,
        isJobOffer: existingClip.contentType === 'job_offer',
        isDuplicate: true,
      })
    }

    const isJob = /stage|pfe|recrute|hiring|candidat|poste|cdi|cdd|internship|job offer|apply|engineer|developer/i.test(raw)
    const emails = raw.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || []
    const phones = raw.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g) || []

    let channel = 'external'
    if (emails.length > 0) channel = 'email'
    else if (phones.length > 0 || /whatsapp|linkedin\.com\/in/i.test(raw)) channel = 'direct_contact'

    let category = 'dev-fullstack'
    if (/ai|ia|nlp|llm|machine learning|deep learning/i.test(raw)) category = 'ai-ml'
    else if (/data|sql|spark|analytics/i.test(raw)) category = 'data'
    else if (/devops|cloud|aws|docker/i.test(raw)) category = 'devops-cloud'
    else if (/cyber|security/i.test(raw)) category = 'cybersecurity'

    const clip = DbService.saveClip({
      content: raw,
      sourceUrl: sourceUrl || '',
      sourceDomain: sourceDomain || 'clipboard',
      sourceDevice: sourceDevice || 'desktop',
      copiedAt: copiedAt || new Date().toISOString(),
      contentType: isJob ? 'job_offer' : 'note',
      title: raw.split('\n')[0].slice(0, 70),
      summary: raw.slice(0, 200),
      convertedToOffer: isJob ? 1 : 0,
    })

    let offer = null
    if (isJob) {
      // Check if an offer with this description or sourceUrl already exists
      const existingOffers = DbService.getOffers()
      const duplicateOffer = existingOffers.find(
        (o) => (o.description && o.description.trim() === raw) || (sourceUrl && o.sourceUrl === sourceUrl)
      )

      if (duplicateOffer) {
        offer = duplicateOffer
      } else {
        offer = DbService.saveOffer({
          id: `offer-clip-${Date.now()}`,
          title: clip.title,
          company: sourceDomain || 'Company',
          location: 'Remote / Hybride',
          category,
          categoryReasoning: `Auto-routed to ${channel.toUpperCase()} channel from clipboard`,
          channel,
          recruiterEmail: emails[0] || '',
          recruiterName: '',
          skills: ['Software Engineering'],
          description: raw,
          sourceUrl: sourceUrl || '',
          status: 'saved',
          attachedCvTag: 'CV - General',
          confidence: 0.92,
          needsUserReview: true,
          notes: `Captured from ${sourceDomain} (${sourceDevice})`,
          createdAt: new Date().toISOString(),
        })
      }
    }

    res.json({ success: true, clip, isJobOffer: isJob, offer })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/clips/sync-all', (req, res) => {
  try {
    const clips = DbService.getClips()
    const uncoverted = clips.filter((c) => !c.convertedToOffer)
    const createdOffers = []

    for (const clip of uncoverted) {
      const raw = clip.content || ''
      const isJob = clip.contentType === 'job_offer' || /stage|pfe|recrute|hiring|candidat|poste|cdi|internship|job/i.test(raw)
      if (!isJob) continue

      const emails = raw.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || []
      const phones = raw.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g) || []
      let channel = 'external'
      if (emails.length > 0) channel = 'email'
      else if (phones.length > 0 || /whatsapp|linkedin\.com\/in/i.test(raw)) channel = 'direct_contact'

      let category = 'dev-fullstack'
      if (/ai|ia|nlp|llm|machine learning/i.test(raw)) category = 'ai-ml'
      else if (/data|sql|spark/i.test(raw)) category = 'data'

      const offer = DbService.saveOffer({
        id: `offer-clip-${Date.now()}-${clip.id.slice(0, 6)}`,
        title: clip.title,
        company: clip.sourceDomain || 'Company',
        location: 'Remote / Hybride',
        category,
        categoryReasoning: `Synced from Clip Vault to ${channel} channel`,
        channel,
        recruiterEmail: emails[0] || '',
        recruiterName: '',
        description: raw,
        sourceUrl: clip.sourceUrl || '',
        status: 'saved',
        confidence: 0.9,
        needsUserReview: true,
        createdAt: new Date().toISOString(),
      })

      DbService.saveClip({ ...clip, convertedToOffer: 1, contentType: 'job_offer' })
      createdOffers.push(offer)
    }

    res.json({ success: true, syncedCount: createdOffers.length, offers: createdOffers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


app.patch('/api/clips/:id/star', (req, res) => {
  try {
    const result = DbService.starClip(req.params.id)
    if (!result) return res.status(404).json({ error: 'Clip not found' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/clips/:id', (req, res) => {
  try {
    DbService.deleteClip(req.params.id)
    res.json({ success: true, id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


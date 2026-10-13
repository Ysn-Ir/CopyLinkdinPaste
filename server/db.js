import 'dotenv/config'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { INITIAL_OFFERS } from '../src/data/initialOffers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'pfe_hunter.db')
export const db = new Database(dbPath)

// Enable Write-Ahead Logging for speed & resilience
db.pragma('journal_mode = WAL')

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    category TEXT,
    category_reasoning TEXT,
    channel TEXT,
    recruiter_email TEXT,
    recruiter_name TEXT,
    sharer_json TEXT,
    skills_json TEXT,
    description TEXT,
    source_url TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'saved',
    attached_cv_tag TEXT,
    attached_cv_id TEXT,
    confidence REAL,
    needs_user_review INTEGER DEFAULT 0,
    top3_guesses_json TEXT,
    pre_drafted_email_json TEXT,
    pre_drafted_cover_json TEXT,
    linked_in_note TEXT,
    whats_app_msg TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cv_vault (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    file_name TEXT,
    file_size TEXT,
    is_default INTEGER DEFAULT 0,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    headline TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    linkedin TEXT,
    github TEXT,
    portfolio TEXT,
    degree TEXT,
    city TEXT,
    skills TEXT,
    projects TEXT,
    tone_preference TEXT,
    custom_instructions TEXT,
    bio TEXT,
    custom_links_json TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    id TEXT PRIMARY KEY,
    api_key TEXT,
    model TEXT DEFAULT 'llama-3.3-70b-versatile',
    provider TEXT DEFAULT 'groq',
    temperature REAL DEFAULT 0.2,
    custom_system_prompt TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    input TEXT,
    confidence REAL,
    needs_user_review INTEGER,
    tool_calls_json TEXT,
    tokens INTEGER,
    cost_est TEXT,
    model TEXT
  );

  CREATE TABLE IF NOT EXISTS clip_vault (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'note',
    title TEXT,
    summary TEXT,
    source_url TEXT,
    source_domain TEXT DEFAULT 'clipboard',
    source_device TEXT DEFAULT 'desktop',
    tags_json TEXT,
    entities_json TEXT,
    is_starred INTEGER DEFAULT 0,
    converted_to_offer INTEGER DEFAULT 0,
    copied_at TEXT,
    created_at TEXT,
    updated_at TEXT
  );
`)

// Safe column migrations for existing databases
const ensureColumn = (table, column, def) => {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run()
  } catch (e) {
    // Column already exists or table doesn't have it
  }
}

ensureColumn('offers', 'custom_data_json', 'TEXT')
ensureColumn('user_profile', 'headline', 'TEXT')
ensureColumn('user_profile', 'whatsapp', 'TEXT')
ensureColumn('user_profile', 'github', 'TEXT')
ensureColumn('user_profile', 'portfolio', 'TEXT')
ensureColumn('user_profile', 'skills', 'TEXT')
ensureColumn('user_profile', 'projects', 'TEXT')
ensureColumn('user_profile', 'tone_preference', 'TEXT')
ensureColumn('user_profile', 'custom_links_json', 'TEXT')

// Seed initial offers if table is empty
const offerCount = db.prepare('SELECT count(*) as count FROM offers').get().count
if (offerCount === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO offers (
      id, title, company, location, category, channel, recruiter_email, recruiter_name,
      sharer_json, skills_json, description, source_url, image_url, status, attached_cv_tag,
      notes, created_at, updated_at
    ) VALUES (
      @id, @title, @company, @location, @category, @channel, @recruiterEmail, @recruiterName,
      @sharer_json, @skills_json, @description, @sourceUrl, @imageUrl, @status, @attachedCvTag,
      @notes, @createdAt, @updatedAt
    )
  `)

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertStmt.run({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        category: item.category,
        channel: item.channel,
        recruiterEmail: item.recruiterEmail || '',
        recruiterName: item.recruiterName || '',
        sharer_json: JSON.stringify(item.sharer || {}),
        skills_json: JSON.stringify(item.skills || []),
        description: item.description || '',
        sourceUrl: item.sourceUrl || '',
        imageUrl: item.imageUrl || null,
        status: item.status || 'saved',
        attachedCvTag: item.attachedCvTag || 'CV - General',
        notes: item.notes || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  })

  insertMany(INITIAL_OFFERS)
}

// Seed initial CVs if empty
const cvCount = db.prepare('SELECT count(*) as count FROM cv_vault').get().count
if (cvCount === 0) {
  const defaultCvs = [
    { id: 'cv-1', name: 'CV - AI & Machine Learning', category: 'ai-ml', file_name: 'CV_AI_ML.pdf', file_size: '184 KB', is_default: 1 },
    { id: 'cv-2', name: 'CV - Software & Fullstack Dev', category: 'dev-fullstack', file_name: 'CV_Fullstack.pdf', file_size: '192 KB', is_default: 1 },
    { id: 'cv-3', name: 'CV - Data Science & Analytics', category: 'data', file_name: 'CV_Data.pdf', file_size: '175 KB', is_default: 1 },
    { id: 'cv-4', name: 'CV - Cloud & DevOps', category: 'devops-cloud', file_name: 'CV_Cloud.pdf', file_size: '180 KB', is_default: 1 },
    { id: 'cv-5', name: 'CV - Cybersecurity', category: 'cybersecurity', file_name: 'CV_Cyber.pdf', file_size: '168 KB', is_default: 1 },
  ]
  const insertCv = db.prepare(`
    INSERT INTO cv_vault (id, name, category, file_name, file_size, is_default, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const cv of defaultCvs) {
    insertCv.run(cv.id, cv.name, cv.category, cv.file_name, cv.file_size, cv.is_default, new Date().toISOString())
  }
}

// Seed user profile if empty
const profileCount = db.prepare('SELECT count(*) as count FROM user_profile').get().count
if (profileCount === 0) {
  db.prepare(`
    INSERT INTO user_profile (id, full_name, email, phone, linkedin, degree, city, custom_instructions, bio, updated_at)
    VALUES ('default', 'Khalil Ingénieur PFE', 'khalil.pfe@gmail.com', '+33 6 12 34 56 78', 'linkedin.com/in/khalil-pfe', 'Master 2 / Ingénieur en Génie Logiciel & IA', 'Paris, France', 'Give maximum freedom to the user. Prioritize NLP and AI applications.', 'Étudiant ingénieur passionné par l''IA et le développement logiciel', datetime('now'))
  `).run()
}

// Seed AI config if empty
const groqEnvKey = (process.env.GROQ_API_KEY || '').trim()
const existingAi = db.prepare('SELECT * FROM ai_config WHERE id = ?').get('default')
if (!existingAi) {
  db.prepare(`
    INSERT INTO ai_config (id, api_key, model, provider, temperature, custom_system_prompt, updated_at)
    VALUES ('default', ?, 'openai/gpt-oss-120b', 'groq', 0.2, '', datetime('now'))
  `).run(groqEnvKey)
} else if (groqEnvKey && (!existingAi.api_key || existingAi.model === 'llama-3.3-70b-versatile')) {
  db.prepare(`
    UPDATE ai_config SET api_key = ?, model = 'openai/gpt-oss-120b', updated_at = datetime('now') WHERE id = 'default'
  `).run(groqEnvKey)
}

// Database helper functions
export const DbService = {
  getAllOffers() {
    const rows = db.prepare('SELECT * FROM offers ORDER BY created_at DESC').all()
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      location: r.location,
      category: r.category,
      categoryReasoning: r.category_reasoning,
      channel: r.channel,
      recruiterEmail: r.recruiter_email,
      recruiterName: r.recruiter_name,
      sharer: r.sharer_json ? JSON.parse(r.sharer_json) : {},
      skills: r.skills_json ? JSON.parse(r.skills_json) : [],
      description: r.description,
      sourceUrl: r.source_url,
      imageUrl: r.image_url,
      status: r.status,
      attachedCvTag: r.attached_cv_tag,
      attachedCvId: r.attached_cv_id,
      confidence: r.confidence,
      needsUserReview: Boolean(r.needs_user_review),
      top3Guesses: r.top3_guesses_json ? JSON.parse(r.top3_guesses_json) : [],
      preDraftedEmail: r.pre_drafted_email_json ? JSON.parse(r.pre_drafted_email_json) : null,
      preDraftedCoverLetter: r.pre_drafted_cover_json ? JSON.parse(r.pre_drafted_cover_json) : null,
      linkedInNote: r.linked_in_note,
      whatsAppMsg: r.whats_app_msg,
      notes: r.notes,
      customData: r.custom_data_json ? JSON.parse(r.custom_data_json) : {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  },

  saveOffer(offer) {
    const existing = db.prepare('SELECT id FROM offers WHERE id = ?').get(offer.id)
    const now = new Date().toISOString()

    const params = {
      id: offer.id,
      title: offer.title || 'Stage PFE',
      company: offer.company || '',
      location: offer.location || '',
      category: offer.category || 'dev-fullstack',
      category_reasoning: offer.categoryReasoning || '',
      channel: offer.channel || 'external',
      recruiter_email: offer.recruiterEmail || '',
      recruiter_name: offer.recruiterName || '',
      sharer_json: JSON.stringify(offer.sharer || {}),
      skills_json: JSON.stringify(offer.skills || []),
      description: offer.description || '',
      source_url: offer.sourceUrl || '',
      image_url: offer.imageUrl || null,
      status: offer.status || 'saved',
      attached_cv_tag: offer.attachedCvTag || 'CV - General',
      attached_cv_id: offer.attachedCvId || null,
      confidence: typeof offer.confidence === 'number' ? offer.confidence : 0.9,
      needs_user_review: offer.needsUserReview ? 1 : 0,
      top3_guesses_json: JSON.stringify(offer.top3Guesses || []),
      pre_drafted_email_json: JSON.stringify(offer.preDraftedEmail || null),
      pre_drafted_cover_json: JSON.stringify(offer.preDraftedCoverLetter || null),
      linked_in_note: offer.linkedInNote || '',
      whats_app_msg: offer.whatsAppMsg || '',
      notes: offer.notes || '',
      custom_data_json: JSON.stringify(offer.customData || {}),
      created_at: offer.createdAt || now,
      updated_at: now,
    }

    if (existing) {
      db.prepare(`
        UPDATE offers SET
          title = @title, company = @company, location = @location, category = @category,
          category_reasoning = @category_reasoning, channel = @channel, recruiter_email = @recruiter_email,
          recruiter_name = @recruiter_name, sharer_json = @sharer_json, skills_json = @skills_json,
          description = @description, source_url = @source_url, image_url = @image_url, status = @status,
          attached_cv_tag = @attached_cv_tag, attached_cv_id = @attached_cv_id, confidence = @confidence,
          needs_user_review = @needs_user_review, top3_guesses_json = @top3_guesses_json,
          pre_drafted_email_json = @pre_drafted_email_json, pre_drafted_cover_json = @pre_drafted_cover_json,
          linked_in_note = @linked_in_note, whats_app_msg = @whats_app_msg, notes = @notes,
          custom_data_json = @custom_data_json, updated_at = @updated_at
        WHERE id = @id
      `).run(params)
    } else {
      db.prepare(`
        INSERT INTO offers (
          id, title, company, location, category, category_reasoning, channel, recruiter_email,
          recruiter_name, sharer_json, skills_json, description, source_url, image_url, status,
          attached_cv_tag, attached_cv_id, confidence, needs_user_review, top3_guesses_json,
          pre_drafted_email_json, pre_drafted_cover_json, linked_in_note, whats_app_msg, notes,
          custom_data_json, created_at, updated_at
        ) VALUES (
          @id, @title, @company, @location, @category, @category_reasoning, @channel, @recruiter_email,
          @recruiter_name, @sharer_json, @skills_json, @description, @source_url, @image_url, @status,
          @attached_cv_tag, @attached_cv_id, @confidence, @needs_user_review, @top3_guesses_json,
          @pre_drafted_email_json, @pre_drafted_cover_json, @linked_in_note, @whats_app_msg, @notes,
          @custom_data_json, @created_at, @updated_at
        )
      `).run(params)
    }

    return this.getAllOffers().find((o) => o.id === offer.id)
  },

  batchSaveOffers(offersList) {
    const saveTx = db.transaction((items) => {
      for (const item of items) {
        this.saveOffer(item)
      }
    })
    saveTx(offersList)
    return this.getAllOffers()
  },

  deleteOffer(id) {
    db.prepare('DELETE FROM offers WHERE id = ?').run(id)
    return true
  },

  getProfile() {
    const row = db.prepare('SELECT * FROM user_profile WHERE id = ?').get('default')
    if (!row) return null
    return {
      fullName: row.full_name || '',
      headline: row.headline || 'Ingénieur PFE & IA',
      email: row.email || '',
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      linkedIn: row.linkedin || '',
      github: row.github || '',
      portfolio: row.portfolio || '',
      degree: row.degree || '',
      city: row.city || '',
      skills: row.skills || '',
      projects: row.projects || '',
      tonePreference: row.tone_preference || 'Direct, concise, and high-agency',
      customInstructions: row.custom_instructions || '',
      bio: row.bio || '',
      customLinks: row.custom_links_json ? JSON.parse(row.custom_links_json) : [],
    }
  },

  saveProfile(p) {
    db.prepare(`
      INSERT INTO user_profile (
        id, full_name, headline, email, phone, whatsapp, linkedin, github, portfolio,
        degree, city, skills, projects, tone_preference, custom_instructions, bio,
        custom_links_json, updated_at
      ) VALUES (
        'default', @fullName, @headline, @email, @phone, @whatsapp, @linkedIn, @github, @portfolio,
        @degree, @city, @skills, @projects, @tonePreference, @customInstructions, @bio,
        @customLinksJson, datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        full_name = @fullName, headline = @headline, email = @email, phone = @phone,
        whatsapp = @whatsapp, linkedin = @linkedIn, github = @github, portfolio = @portfolio,
        degree = @degree, city = @city, skills = @skills, projects = @projects,
        tone_preference = @tonePreference, custom_instructions = @customInstructions,
        bio = @bio, custom_links_json = @customLinksJson, updated_at = datetime('now')
    `).run({
      fullName: p.fullName || '',
      headline: p.headline || '',
      email: p.email || '',
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      linkedIn: p.linkedIn || '',
      github: p.github || '',
      portfolio: p.portfolio || '',
      degree: p.degree || '',
      city: p.city || '',
      skills: p.skills || '',
      projects: p.projects || '',
      tonePreference: p.tonePreference || '',
      customInstructions: p.customInstructions || '',
      bio: p.bio || '',
      customLinksJson: JSON.stringify(p.customLinks || []),
    })
    return this.getProfile()
  },

  getCvs() {
    const rows = db.prepare('SELECT * FROM cv_vault ORDER BY updated_at DESC').all()
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      fileName: r.file_name,
      fileSize: r.file_size,
      isDefault: Boolean(r.is_default),
    }))
  },

  saveCvs(cvList) {
    db.transaction(() => {
      db.prepare('DELETE FROM cv_vault').run()
      const insert = db.prepare(`
        INSERT INTO cv_vault (id, name, category, file_name, file_size, is_default, updated_at)
        VALUES (@id, @name, @category, @fileName, @fileSize, @isDefault, datetime('now'))
      `)
      for (const cv of cvList) {
        insert.run({
          id: cv.id,
          name: cv.name,
          category: cv.category,
          fileName: cv.fileName || `${cv.name}.pdf`,
          fileSize: cv.fileSize || '180 KB',
          isDefault: cv.isDefault ? 1 : 0,
        })
      }
    })()
    return this.getCvs()
  },

  getAiConfig() {
    const row = db.prepare('SELECT * FROM ai_config WHERE id = ?').get('default')
    const envKey = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '').trim()
    const apiKey = row?.api_key || envKey
    const model = (row?.model && row.model !== 'llama-3.3-70b-versatile') ? row.model : 'openai/gpt-oss-120b'
    return {
      apiKey,
      model,
      provider: 'groq',
      temperature: typeof row?.temperature === 'number' ? row.temperature : 0.25,
      customSystemPrompt: row?.custom_system_prompt || '',
    }
  },

  saveAiConfig(c) {
    db.prepare(`
      INSERT INTO ai_config (id, api_key, model, provider, temperature, custom_system_prompt, updated_at)
      VALUES ('default', @apiKey, @model, @provider, @temperature, @customSystemPrompt, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        api_key = @apiKey, model = @model, provider = @provider, temperature = @temperature,
        custom_system_prompt = @customSystemPrompt, updated_at = datetime('now')
    `).run({
      apiKey: c.apiKey || (process.env.GROQ_API_KEY || '').trim(),
      model: c.model || 'openai/gpt-oss-120b',
      provider: c.provider || 'groq',
      temperature: typeof c.temperature === 'number' ? c.temperature : 0.25,
      customSystemPrompt: c.customSystemPrompt || '',
    })
    return this.getAiConfig()
  },

  getDbStats() {
    let fileSizeKb = 0
    try {
      const stats = fs.statSync(dbPath)
      fileSizeKb = Math.round(stats.size / 1024)
    } catch (e) {}

    const offerCount = db.prepare('SELECT count(*) as count FROM offers').get().count
    const cvCount = db.prepare('SELECT count(*) as count FROM cv_vault').get().count
    const clipCount = db.prepare('SELECT count(*) as count FROM clip_vault').get().count
    const profileExists = Boolean(db.prepare('SELECT id FROM user_profile WHERE id = ?').get('default'))

    return {
      dbPath,
      fileSizeKb,
      counts: {
        offers: offerCount,
        cvs: cvCount,
        clips: clipCount,
        hasProfile: profileExists,
      },
      journalMode: 'WAL',
      connected: true,
    }
  },

  getClips({ contentType, domain, search, starred } = {}) {
    let sql = 'SELECT * FROM clip_vault WHERE 1=1'
    const params = []
    if (contentType && contentType !== 'all') {
      sql += ' AND content_type = ?'
      params.push(contentType)
    }
    if (domain && domain !== 'all') {
      sql += ' AND source_domain = ?'
      params.push(domain)
    }
    if (starred) {
      sql += ' AND is_starred = 1'
    }
    sql += ' ORDER BY created_at DESC'
    let rows = db.prepare(sql).all(...params)
    rows = rows.map((r) => ({
      ...r,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      entities: r.entities_json ? JSON.parse(r.entities_json) : {},
      isStarred: Boolean(r.is_starred),
      convertedToOffer: Boolean(r.converted_to_offer),
      contentType: r.content_type,
      sourceUrl: r.source_url,
      sourceDomain: r.source_domain,
      sourceDevice: r.source_device,
      copiedAt: r.copied_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.content || '').toLowerCase().includes(q) ||
          (c.summary || '').toLowerCase().includes(q) ||
          (c.sourceDomain || '').toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }
    return rows
  },

  saveClip(clip) {
    const id = clip.id || `clip-${Date.now()}`
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO clip_vault (
        id, content, content_type, title, summary, source_url, source_domain,
        source_device, tags_json, entities_json, is_starred, converted_to_offer,
        copied_at, created_at, updated_at
      ) VALUES (
        @id, @content, @contentType, @title, @summary, @sourceUrl, @sourceDomain,
        @sourceDevice, @tagsJson, @entitiesJson, @isStarred, @convertedToOffer,
        @copiedAt, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        content = @content, content_type = @contentType, title = @title,
        summary = @summary, source_url = @sourceUrl, source_domain = @sourceDomain,
        source_device = @sourceDevice, tags_json = @tagsJson, entities_json = @entitiesJson,
        is_starred = @isStarred, converted_to_offer = @convertedToOffer,
        updated_at = @updatedAt
    `).run({
      id,
      content: clip.content || '',
      contentType: clip.contentType || 'note',
      title: clip.title || (clip.content || '').slice(0, 60),
      summary: clip.summary || (clip.content || '').slice(0, 150),
      sourceUrl: clip.sourceUrl || '',
      sourceDomain: clip.sourceDomain || 'clipboard',
      sourceDevice: clip.sourceDevice || 'desktop',
      tagsJson: JSON.stringify(clip.tags || []),
      entitiesJson: JSON.stringify(clip.entities || {}),
      isStarred: clip.isStarred ? 1 : 0,
      convertedToOffer: clip.convertedToOffer ? 1 : 0,
      copiedAt: clip.copiedAt || now,
      createdAt: clip.createdAt || now,
      updatedAt: now,
    })
    return this.getClips().find((c) => c.id === id)
  },

  starClip(clipId) {
    const clip = db.prepare('SELECT is_starred FROM clip_vault WHERE id = ?').get(clipId)
    if (!clip) return null
    const newStar = clip.is_starred ? 0 : 1
    db.prepare('UPDATE clip_vault SET is_starred = ?, updated_at = datetime("now") WHERE id = ?').run(
      newStar,
      clipId
    )
    return { success: true, id: clipId, isStarred: Boolean(newStar) }
  },

  deleteClip(clipId) {
    db.prepare('DELETE FROM clip_vault WHERE id = ?').run(clipId)
    return { success: true, id: clipId }
  },
}

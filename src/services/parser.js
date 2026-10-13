import { CATEGORIES } from '../data/categories.js'

// Comprehensive dictionary of tech keywords commonly found in PFE listings
const TECH_KEYWORDS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', '.NET', 'Go', 'Golang', 'Rust', 'PHP',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'FastAPI', 'Django', 'Flask', 'Spring Boot',
  'PyTorch', 'TensorFlow', 'Keras', 'Scikit-Learn', 'Hugging Face', 'LangChain', 'LlamaIndex', 'RAG',
  'OpenAI', 'Transformers', 'Computer Vision', 'OpenCV', 'NLP', 'LLM', 'Deep Learning', 'Machine Learning',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Spark', 'Databricks', 'Airflow', 'Kafka',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'CI/CD', 'GitLab', 'GitHub Actions', 'Linux',
  'REST API', 'GraphQL', 'Microservices', 'Git', 'Agile', 'Scrum'
]

export const ParserService = {
  /**
   * Analyzes raw post text (e.g. from LinkedIn feed or job description)
   */
  parsePostText(text) {
    if (!text || typeof text !== 'string') {
      return this.getEmptyParsedResult()
    }

    const cleanText = text.trim()
    const lower = cleanText.toLowerCase()

    // 1. Extract Recruiter Email
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const emails = cleanText.match(emailRegex) || []
    const validEmails = emails.filter(
      (e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com')
    )
    const recruiterEmail = validEmails[0] || ''

    // 2. Extract Phone / WhatsApp Number
    const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:(?:\(0\)\d{1,4}|\d{1,4})[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g
    const phoneMatches = cleanText.match(phoneRegex) || []
    const validPhones = phoneMatches
      .map((p) => p.trim())
      .filter((p) => p.length >= 8 && p.length <= 20 && !p.startsWith('202') && !p.startsWith('199'))
    const sharerPhone = validPhones[0] || ''

    // 3. Extract LinkedIn Profile URL
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
    const linkedinMatch = cleanText.match(linkedinRegex)
    const sharerProfileUrl = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : ''

    // 4. Extract Category based on keyword frequency score
    let bestCategory = 'dev-fullstack'
    let highestScore = 0

    for (const cat of CATEGORIES) {
      if (cat.id === 'all' || cat.id === 'other') continue
      let score = 0
      for (const kw of cat.keywords) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
        const matches = lower.match(regex)
        if (matches) {
          score += matches.length * (kw.length > 3 ? 2 : 1)
        }
      }
      if (score > highestScore) {
        highestScore = score
        bestCategory = cat.id
      }
    }

    if (highestScore === 0) {
      if (lower.includes('pfe') && lower.includes('data')) bestCategory = 'data'
      else if (lower.includes('ia') || lower.includes('intelligence')) bestCategory = 'ai-ml'
      else bestCategory = 'dev-fullstack'
    }

    // 5. Extract Role / Job Title
    let title = ''
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean)
    
    for (const line of lines.slice(0, 5)) {
      if (
        /stage\s+pfe|stage|pfe|internship|ingénieur|développeur|architecte|consultant/i.test(line) &&
        line.length < 90
      ) {
        title = line.replace(/^[#•\-\*\s]+/, '').trim()
        break
      }
    }

    if (!title && lines.length > 0) {
      title = lines[0].slice(0, 75)
    }

    // 6. Extract Company
    let company = ''
    const companyMatch =
      cleanText.match(/(?:chez|at|au sein de|entreprise|société|rejoint|cabinet)\s+([A-Z][A-Za-z0-9&.\-_ ]{2,25})/i) ||
      cleanText.match(/([A-Z][A-Za-z0-9&]{2,20})\s+(?:recrute|cherche|embauche)/i)

    if (companyMatch && companyMatch[1]) {
      company = companyMatch[1].trim()
    }

    // 7. Extract Location
    let location = 'Remote / Hybride'
    const locationMatch = cleanText.match(
      /(?:lieu|localisation|location|ville|base|basé à|sur)\s*[:\-]?\s*([A-Za-z0-9, \-]{3,30})/i
    )
    if (locationMatch && locationMatch[1]) {
      location = locationMatch[1].trim()
    } else {
      const knownCities = [
        'Paris', 'Casablanca', 'Rabat', 'Lyon', 'Toulouse', 'Tunis', 'Nantes', 'Bordeaux',
        'Lille', 'Montpellier', 'Sophia Antipolis', 'Remote', 'Télétravail'
      ]
      for (const city of knownCities) {
        if (new RegExp(`\\b${city}\\b`, 'i').test(cleanText)) {
          location = city
          break
        }
      }
    }

    // 8. Extract Tech Skills
    const detectedSkills = []
    for (const skill of TECH_KEYWORDS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(cleanText)) {
        detectedSkills.push(skill)
      }
    }

    // 9. Extract Sharer / Recruiter Name & Headline
    let recruiterName = ''
    const nameMatch = cleanText.match(/(?:contact|recruteur|hr|rh|par|auteur)\s*[:\-]?\s*([A-Z][a-z]+ [A-Z][a-z]+)/i)
    if (nameMatch && nameMatch[1]) {
      recruiterName = nameMatch[1].trim()
    }

    // 10. Intelligent Channel Determination:
    // - email: recruiter email present
    // - direct_contact: "DM", "message privé", "MP", "WhatsApp", phone number given with instructions to contact
    // - external: portal link or standard ATS
    let channel = 'external'
    const hasDmKeyword =
      lower.includes('dm') ||
      lower.includes('message privé') ||
      lower.includes('en mp') ||
      lower.includes('whatsapp') ||
      lower.includes('contactez-moi') ||
      lower.includes('contact me') ||
      Boolean(sharerPhone)

    if (recruiterEmail) {
      channel = 'email'
    } else if (hasDmKeyword || sharerProfileUrl) {
      channel = 'direct_contact'
    } else {
      channel = 'external'
    }

    // 11. Match default CV tag
    const categoryObj = CATEGORIES.find((c) => c.id === bestCategory)
    const attachedCvTag = categoryObj ? categoryObj.defaultCvTag : 'CV - General Engineering'

    return {
      title: title || 'Stage PFE',
      company: company || 'Entreprise Confidentielle',
      location,
      category: bestCategory,
      channel,
      recruiterEmail,
      recruiterName,
      sharer: {
        name: recruiterName || 'Recruiter / Sharer',
        title: company ? `Recruiter / Team Lead @ ${company}` : 'Post Author',
        profileUrl: sharerProfileUrl || '',
        phone: sharerPhone || '',
      },
      skills: detectedSkills.slice(0, 8),
      description: cleanText,
      attachedCvTag,
    }
  },

  getEmptyParsedResult() {
    return {
      title: '',
      company: '',
      location: 'Hybride / Sur site',
      category: 'dev-fullstack',
      channel: 'email',
      recruiterEmail: '',
      recruiterName: '',
      sharer: {
        name: '',
        title: '',
        profileUrl: '',
        phone: '',
      },
      skills: [],
      description: '',
      attachedCvTag: 'CV - Software & Fullstack Dev',
    }
  },
}

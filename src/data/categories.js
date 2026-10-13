export const CATEGORIES = [
  {
    id: 'all',
    label: 'All Categories',
    shortLabel: 'All',
    icon: 'Layers',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  {
    id: 'ai-ml',
    label: 'AI & Machine Learning',
    shortLabel: 'AI / ML',
    icon: 'Brain',
    color: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: 'rgba(14, 165, 233, 0.35)',
    defaultCvTag: 'CV - AI & Machine Learning',
    keywords: [
      'ai', 'ia', 'machine learning', 'deep learning', 'nlp', 'llm', 'computer vision',
      'pytorch', 'tensorflow', 'transformers', 'genai', 'intelligence artificielle',
      'rag', 'langchain', 'data science & ai', 'vision par ordinateur'
    ]
  },
  {
    id: 'data',
    label: 'Data Science & Engineering',
    shortLabel: 'Data',
    icon: 'Database',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    defaultCvTag: 'CV - Data Science & Analytics',
    keywords: [
      'data', 'data engineer', 'data scientist', 'bi', 'business intelligence',
      'spark', 'sql', 'etl', 'hadoop', 'pandas', 'analytics', 'big data',
      'power bi', 'tableau', 'databricks', 'snowflake'
    ]
  },
  {
    id: 'dev-fullstack',
    label: 'Software & Fullstack Dev',
    shortLabel: 'Software Dev',
    icon: 'Code2',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    defaultCvTag: 'CV - Software & Fullstack Dev',
    keywords: [
      'dev', 'developer', 'développeur', 'software', 'fullstack', 'frontend', 'backend',
      'react', 'angular', 'vue', 'node', 'python', 'java', 'spring', '.net', 'c#',
      'golang', 'typescript', 'javascript', 'web', 'mobile', 'flutter', 'react native'
    ]
  },
  {
    id: 'devops-cloud',
    label: 'DevOps & Cloud Infrastructure',
    shortLabel: 'DevOps / Cloud',
    icon: 'Cloud',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    defaultCvTag: 'CV - Cloud & DevOps',
    keywords: [
      'devops', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s',
      'terraform', 'ansible', 'ci/cd', 'jenkins', 'gitlab', 'sre', 'infrastructure'
    ]
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity & InfoSec',
    shortLabel: 'Cybersecurity',
    icon: 'ShieldCheck',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    defaultCvTag: 'CV - Cybersecurity',
    keywords: [
      'cyber', 'cybersecurity', 'sécurité', 'security', 'pentest', 'soc',
      'siem', 'cryptography', 'vulnerability', 'auditeur', 'iso 27001'
    ]
  },
  {
    id: 'embedded-iot',
    label: 'Embedded & IoT / Systems',
    shortLabel: 'Embedded / IoT',
    icon: 'Cpu',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    defaultCvTag: 'CV - Embedded Systems',
    keywords: [
      'embarqué', 'embedded', 'iot', 'c/c++', 'firmware', 'stm32', 'fpga',
      'microcontroller', 'robotics', 'automatisme', 'system'
    ]
  },
  {
    id: 'other',
    label: 'General / Other Domains',
    shortLabel: 'Other',
    icon: 'Briefcase',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    defaultCvTag: 'CV - General Engineering',
    keywords: []
  }
]

export const APPLICATION_CHANNELS = {
  EMAIL: 'email',
  DIRECT_CONTACT: 'direct_contact',
  EXTERNAL: 'external',
}

export const CHANNEL_META = {
  email: { id: 'email', label: 'Direct Email', shortLabel: 'Email', icon: 'Mail', color: '#10b981' },
  direct_contact: { id: 'direct_contact', label: 'Direct Contact / DM / WhatsApp', shortLabel: 'Direct DM', icon: 'MessageSquare', color: '#a855f7' },
  external: { id: 'external', label: 'External Portal / ATS', shortLabel: 'Portal', icon: 'Globe', color: '#3b82f6' },
}

export const APPLICATION_STATUSES = [
  { id: 'to_apply', label: 'To Apply', color: '#f59e0b', dotColor: '#fbbf24' },
  { id: 'applied', label: 'Applied / Sent', color: '#3b82f6', dotColor: '#60a5fa' },
  { id: 'follow_up', label: 'Follow-up Due', color: '#ec4899', dotColor: '#f472b6' },
  { id: 'interview', label: 'Interviewing', color: '#8b5cf6', dotColor: '#a78bfa' },
  { id: 'offer', label: 'Offer Received 🎉', color: '#10b981', dotColor: '#34d399' },
  { id: 'rejected', label: 'Rejected', color: '#64748b', dotColor: '#94a3b8' },
]

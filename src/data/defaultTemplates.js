export const EMAIL_TEMPLATES = [
  {
    id: 'en-standard-impact',
    name: 'Direct Application - Impactful (EN)',
    language: 'EN',
    subject: 'Application: [ROLE] – [CANDIDATE_NAME]',
    body: `Dear [RECIPIENT_NAME],

I am writing to express my strong interest in the [ROLE] position at [COMPANY].

With a rigorous background in [DOMAIN] and hands-on expertise across [SKILLS], I have led end-to-end projects delivering robust, scalable solutions. I am particularly drawn to [COMPANY]'s engineering philosophy and would love to contribute directly to your roadmap.

I have attached my resume ([ATTACHED_CV]) detailing my experience and achievements. I would welcome the opportunity to discuss how my skillset aligns with your team's objectives.

Thank you for your time and consideration.

Best regards,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'en-tech-ai-systems',
    name: 'AI & Systems Specialist (EN)',
    language: 'EN',
    subject: '[ROLE] – Engineering Application – [CANDIDATE_NAME]',
    body: `Hi [RECIPIENT_NAME],

I noticed your opening for [ROLE] at [COMPANY] and wanted to reach out directly.

I specialize in building intelligent, high-throughput systems with a primary focus on [SKILLS]. In previous technical initiatives, I architected and deployed solutions optimizing performance, latency, and operational efficiency.

My resume is attached ([ATTACHED_CV]). Are you available for a brief 10-minute introductory conversation this week?

Best regards,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'fr-standard-pro',
    name: 'Candidature Professionnelle (FR)',
    language: 'FR',
    subject: 'Candidature : [ROLE] – [CANDIDATE_NAME]',
    body: `Madame, Monsieur [RECIPIENT_NAME],

Je me permets de vous soumettre ma candidature pour le poste de [ROLE] au sein de [COMPANY].

Diplômé et expérimenté dans le domaine de [DOMAIN], je dispose de compétences solides en [SKILLS]. Passionné par la conception de solutions performantes, je souhaite mettre ma rigueur et mon autonomie au service de vos défis techniques.

Vous trouverez ci-joint mon Curriculum Vitae ([ATTACHED_CV]) retraçant mon parcours et mes réalisations.

Je serais honoré d'échanger avec vous lors d'un entretien afin d'approfondir l'adéquation de mon profil avec vos besoins.

Dans cette attente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'follow-up',
    name: 'Professional Follow-up / Relance',
    language: 'EN',
    subject: 'Follow-up: [ROLE] Application – [CANDIDATE_NAME]',
    body: `Dear [RECIPIENT_NAME],

I hope you are having a productive week.

I am following up on my application submitted on [APPLICATION_DATE] for the [ROLE] opening at [COMPANY].

I remain very enthusiastic about your team's mission and would be glad to provide any additional work samples, references, or context regarding my background in [SKILLS].

Thank you again for your time and consideration.

Best regards,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
]

export const COVER_LETTER_TEMPLATES = [
  {
    id: 'latex-classic',
    name: 'Academic LaTeX Serif (Classic)',
    fontFamily: 'Times-Roman',
    headerStyle: 'latex',
    defaultText: `To the Hiring Team at [COMPANY],

Subject: Application for [ROLE]

I am writing to formally submit my application for the [ROLE] position at [COMPANY]. With a strong technical background and a disciplined engineering methodology, I am eager to contribute to your engineering objectives.

Throughout my career and technical projects, I have developed expertise across [SKILLS]. What specifically draws me to [COMPANY] is your high standard of engineering, mission, and commitment to impactful technical solutions.

During my previous work, I spearheaded several technical milestones, including architectural design, clean coding practices, and cross-functional collaboration. I pride myself on self-driven learning, speed of execution, and an analytical mindset that allows me to quickly deconstruct complex challenges.

Thank you very much for considering my application. I look forward to the possibility of discussing this opportunity with you in an interview.

Sincerely,

[CANDIDATE_NAME]`,
  },
  {
    id: 'modern-tech',
    name: 'Modern Tech Sans (Clean)',
    fontFamily: 'Helvetica',
    headerStyle: 'modern',
    defaultText: `Dear Hiring Manager,

I am thrilled to apply for the [ROLE] position at [COMPANY]. Having followed your recent developments, I am inspired by the challenges you tackle and would love to deliver value alongside your team.

With a strong foundation in [SKILLS], I bring a blend of theoretical rigor and hands-on delivery. I thrive when building robust, scalable solutions and collaborating in fast-paced environments.

I would be delighted to discuss how my background and enthusiasm make me a strong match for [COMPANY]. Thank you for your consideration.

Warm regards,

[CANDIDATE_NAME]`,
  },
]

export const EMAIL_TEMPLATES = [
  {
    id: 'fr-pfe-standard',
    name: 'Candidature PFE - Recommandé (FR)',
    language: 'FR',
    subject: 'Candidature Stage PFE – [ROLE] – [CANDIDATE_NAME]',
    body: `Madame, Monsieur [RECIPIENT_NAME],

Actuellement étudiant en dernière année d'ingénierie / Master spécialisé en [DOMAIN], je me permets de vous contacter afin de vous soumettre ma candidature pour l'opportunité de Stage PFE en tant que [ROLE] au sein de [COMPANY].

Particulièrement motivé par les projets menés par vos équipes, je dispose de compétences solides en [SKILLS]. J'ai eu l'occasion de mettre en pratique ces connaissances lors de mes projets académiques et expériences précédentes.

Vous trouverez ci-joint mon Curriculum Vitae ([ATTACHED_CV]) détaillant mon parcours et mes réalisations.

Je serais honoré d'échanger avec vous lors d'un entretien afin de vous présenter plus en détail ma motivation et la valeur que je peux apporter à [COMPANY].

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'en-pfe-standard',
    name: 'Graduation Internship (PFE) - Impactful (EN)',
    language: 'EN',
    subject: 'Application: Final Year Internship (PFE) – [ROLE] – [CANDIDATE_NAME]',
    body: `Dear [RECIPIENT_NAME],

I am writing to express my strong interest in the [ROLE] graduation internship (PFE) at [COMPANY], as advertised on LinkedIn.

Currently completing my Master's Degree / Engineering program in [DOMAIN], I have developed hands-on expertise in [SKILLS]. I am enthusiastic about the innovative work being done at [COMPANY] and eager to contribute effectively to your upcoming roadmap.

I have attached my resume ([ATTACHED_CV]) for your review. I would welcome the opportunity to discuss how my profile aligns with your team's objectives.

Thank you for your time and consideration.

Best regards,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'fr-pfe-ai-data',
    name: 'Spécialisé IA & Data Science (FR)',
    language: 'FR',
    subject: 'Candidature PFE IA & Data : [ROLE] – [CANDIDATE_NAME]',
    body: `Bonjour [RECIPIENT_NAME],

Passionné par l'Intelligence Artificielle et la valorisation des données, je vous sollicite pour le stage PFE [ROLE] chez [COMPANY].

Mon parcours m'a permis d'aborder des problématiques concrètes autour de [SKILLS], notamment à travers la conception de modèles, le traitement de données et l'implémentation de solutions scalables. Je suis convaincu que mon autonomie et ma rigueur seront des atouts immédiats pour vos projets.

Mon CV est joint à ce message ([ATTACHED_CV]). Je serais ravi d'échanger avec vous lors d'un bref appel pour approfondir les défis techniques de ce stage.

Bien cordialement,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]
[CANDIDATE_LINKEDIN]`,
  },
  {
    id: 'follow-up',
    name: 'Relance Professionnelle / Follow-up (FR)',
    language: 'FR',
    subject: 'Relance – Candidature PFE [ROLE] – [CANDIDATE_NAME]',
    body: `Bonjour [RECIPIENT_NAME],

Je me permets de revenir vers vous concernant ma candidature transmise le [APPLICATION_DATE] pour l'offre de stage PFE [ROLE] au sein de [COMPANY].

Toujours vivement intéressé par cette opportunité et la vision de votre entreprise, je souhaitais savoir si le processus de sélection avait avancé ou si vous aviez besoin d'éléments complémentaires sur mon profil.

Je vous remercie chaleureusement pour votre temps et vous souhaite une excellente journée.

Bien cordialement,

[CANDIDATE_NAME]
[CANDIDATE_PHONE]`,
  },
]

export const COVER_LETTER_TEMPLATES = [
  {
    id: 'latex-classic',
    name: 'Academic LaTeX Serif (Classic)',
    fontFamily: 'Times-Roman',
    headerStyle: 'latex',
    defaultText: `To the Hiring Team at [COMPANY],

Subject: Application for [ROLE] (Final Year Internship / PFE)

I am writing to formally submit my application for the [ROLE] position at [COMPANY]. As an engineering student entering my final graduation semester, I am eager to contribute my technical knowledge and problem-solving skills to your team.

Throughout my studies and technical projects, I have developed expertise across [SKILLS]. What specifically draws me to [COMPANY] is your high standard of engineering and commitment to impactful technical solutions. I am eager to apply rigorous methodologies in a professional setting while learning from seasoned mentors.

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

I am thrilled to apply for the [ROLE] position at [COMPANY]. Having followed your recent developments, I am inspired by the challenges you tackle and would love to dedicate my PFE journey to delivering value alongside your team.

With a strong foundation in [SKILLS], I bring a blend of theoretical rigor and hands-on delivery. I thrive when building robust, scalable solutions and collaborating in fast-paced environments.

I would be delighted to discuss how my background and enthusiasm make me a strong match for [COMPANY]. Thank you for your consideration.

Warm regards,

[CANDIDATE_NAME]`,
  },
]

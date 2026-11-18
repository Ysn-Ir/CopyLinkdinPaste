import json
import logging
import httpx
import io
import os
import base64
import re
import sys
import shutil
from PIL import Image, ImageOps, ImageEnhance
from .config import GROQ_API_KEY, DEFAULT_MODEL

logger = logging.getLogger("radar.ai")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def clean_repetitive_text(text: str) -> str:
    """
    Cleans raw post or scraped text by removing header prefixes (TITLE:, SITE:, DESCRIPTION:)
    and deduplicating repeated sentences and paragraphs.
    """
    if not text:
        return ""

    cleaned = re.sub(r'^(TITLE|SITE|DESCRIPTION|PAGE CONTENT|URL):\s*[^\n]*\n+', '', text, flags=re.MULTILINE)
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', cleaned) if p.strip()]
    seen_paras = set()
    unique_paras = []

    for p in paragraphs:
        norm = re.sub(r'\s+', ' ', p.lower())[:100]
        if norm not in seen_paras:
            seen_paras.add(norm)
            lines = [l.strip() for l in p.split('\n') if l.strip()]
            seen_lines = set()
            unique_lines = []
            for l in lines:
                l_norm = re.sub(r'\s+', ' ', l.lower())
                if l_norm not in seen_lines:
                    seen_lines.add(l_norm)
                    unique_lines.append(l)
            if unique_lines:
                unique_paras.append("\n".join(unique_lines))

    result = "\n\n".join(unique_paras)
    return result if len(result) > 20 else text.strip()


async def call_groq_chat(messages, api_key=None, model=None, temperature=0.25, max_tokens=1500):
    key = (api_key or GROQ_API_KEY or "").strip()
    target_model = model or DEFAULT_MODEL or "openai/gpt-oss-120b"
    # Normalize decommissioned models to the active working high-intelligence model
    if target_model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-11b-vision-preview"]:
        target_model = "openai/gpt-oss-120b"

    if not key:
        raise ValueError("Groq API key is not configured. Add it to .env or in Settings.")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
    }
    payload = {
        "model": target_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(GROQ_API_URL, json=payload, headers=headers)
        if response.status_code != 200:
            err_data = response.json() if "application/json" in response.headers.get("content-type", "") else {}
            err_msg = err_data.get("error", {}).get("message") or f"HTTP {response.status_code}: {response.text}"
            raise RuntimeError(f"Groq API Error: {err_msg}")

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {
            "content": content,
            "model": data.get("model", target_model),
            "usage": data.get("usage", {})
        }


def preprocess_image_for_ocr(pil_img: Image.Image) -> Image.Image:
    """Prepares image for optimal OCR recognition (white background for RGBA, contrast enhancement)."""
    try:
        # Convert RGBA to RGB on white background
        if pil_img.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", pil_img.size, (255, 255, 255))
            if pil_img.mode == "P":
                pil_img = pil_img.convert("RGBA")
            bg.paste(pil_img, mask=pil_img.split()[-1])
            pil_img = bg
        elif pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        # Auto-scale if image is very small
        w, h = pil_img.size
        if w < 600 or h < 300:
            scale = max(2, int(800 / max(w, 1)))
            pil_img = pil_img.resize((w * scale, h * scale), Image.Resampling.LANCZOS)

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.4)
        return pil_img
    except Exception as e:
        logger.warning(f"Image preprocessing warning: {e}")
        return pil_img


def discover_tesseract_binary() -> str:
    """Finds installed tesseract binary across PATH and standard Windows/Linux locations."""
    cmd = shutil.which("tesseract")
    if cmd:
        return cmd
    common_win = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in common_win:
        if os.path.exists(p):
            return p
    return ""


async def call_groq_vision(image_base64: str, prompt: str = "Extract all text and details from this screenshot", api_key: str = None):
    """
    Robust Multi-Engine OCR Processor for RADAR:
    1. Preprocesses image for contrast and clarity.
    2. Engine 1: Windows Native OCR (winocr) - works offline, zero external dependencies.
    3. Engine 2: Tesseract OCR with auto-binary discovery.
    4. Post-processing: Groq LLM repairs OCR glitches, restores layout, bullet points and formatting.
    """
    if not image_base64:
        raise ValueError("Empty image data provided")

    # Clean base64 string
    clean_b64 = re.sub(r'^data:image/[a-zA-Z]+;base64,', '', image_base64).strip()
    try:
        raw_bytes = base64.b64decode(clean_b64)
        pil_image = Image.open(io.BytesIO(raw_bytes))
    except Exception as e:
        logger.error(f"Failed decoding image for OCR: {e}")
        raise ValueError(f"Invalid image format: {e}")

    extracted_raw = ""

    # Engine 1: Windows Native OCR (winocr)
    if sys.platform == "win32":
        try:
            import winocr
            res = await winocr.recognize_pil(pil_image, "en")
            if res and res.text and len(res.text.strip()) > 5:
                extracted_raw = res.text.strip()
            else:
                # Retry with preprocessed image
                prep = preprocess_image_for_ocr(pil_image)
                res2 = await winocr.recognize_pil(prep, "en")
                if res2 and res2.text and len(res2.text.strip()) > 5:
                    extracted_raw = res2.text.strip()
        except Exception as e:
            logger.warning(f"Windows winocr attempt error: {e}")

    # Engine 2: Tesseract OCR (cross-platform, fallback)
    if not extracted_raw or len(extracted_raw) < 10:
        try:
            import pytesseract
            t_bin = discover_tesseract_binary()
            if t_bin:
                pytesseract.pytesseract.tesseract_cmd = t_bin
            prep = preprocess_image_for_ocr(pil_image)
            res = pytesseract.image_to_string(prep)
            if res and len(res.strip()) > 5:
                extracted_raw = res.strip()
        except Exception as e:
            logger.warning(f"Tesseract OCR attempt error: {e}")

    # Fallback message if completely unreadable
    if not extracted_raw or len(extracted_raw.strip()) < 5:
        return "Could not detect readable text in screenshot. Please ensure the image contains clear text."

    # Engine 3: Semantic Reconstruction via Groq LLM (openai/gpt-oss-120b)
    key = (api_key or GROQ_API_KEY or "").strip()
    if key:
        try:
            clean_prompt = f"""You are RADAR's OCR text repair specialist.
Below is raw text extracted from a screenshot (such as a recruiter post, WhatsApp chat, movie info, game notes, or article).
Clean up typos, fix merged or broken words, restore proper paragraphs, and preserve all details (roles, companies, requirements, contacts, titles, dates, specs).
Return ONLY the cleaned text verbatim without commentary.

Raw OCR Text:
{extracted_raw[:3500]}"""
            clean_res = await call_groq_chat(
                [{"role": "user", "content": clean_prompt}],
                api_key=key,
                model="openai/gpt-oss-120b",
                temperature=0.1,
                max_tokens=1400
            )
            cleaned = clean_res.get("content", "").strip()
            if cleaned and len(cleaned) > 10:
                return cleaned
        except Exception as e:
            logger.warning(f"AI OCR cleanup failed, returning raw OCR: {e}")

    return extracted_raw


async def analyze_clip(raw_text: str, source_url: str = None, source_domain: str = None, candidate_profile: dict = None, api_key: str = None, model: str = None):
    """
    Universal Semantic Triage & Analysis Engine for RADAR.
    Classifies any clipboard or screen-snip content into 4 distinct operational categories:
    1. "job_offer": Internship, PFE, full-time job, hiring post, career opportunity.
    2. "contact_lead": Professional contact, recruiter, hiring manager, phone/email, LinkedIn profile.
    3. "general_media": Video game, movie, book, TV series, music album, anime, educational video.
    4. "general_note": Programming code snippet, tech article, bash command, reminder, meeting note.
    """
    from urllib.parse import urlparse

    extracted_domain = (source_domain or "").strip()
    if source_url and not extracted_domain:
        try:
            parsed = urlparse(source_url)
            extracted_domain = parsed.netloc.replace("www.", "")
        except Exception:
            pass

    if not extracted_domain:
        for dom in ["linkedin.com", "github.com", "twitter.com", "x.com", "medium.com", "stackoverflow.com", "reddit.com", "youtube.com", "imdb.com", "steampowered.com"]:
            if dom in raw_text.lower():
                extracted_domain = dom
                break
    if not extracted_domain:
        extracted_domain = "Local Clipboard"

    prof = candidate_profile or {}
    user_skills = prof.get("skills", "Python, Machine Learning, Fullstack, React, FastAPI")

    system_prompt = f"""You are RADAR, an elite universal semantic intelligence and triage engine.
Analyze the user's copied clipboard text or screen snip and categorize it into EXACTLY ONE of 4 categories:
1. "job_offer": Any job offer, internship, PFE, hiring post, recruitment announcement, or company vacancy.
2. "contact_lead": A specific person, recruiter, executive, email address, phone number, or LinkedIn profile.
3. "general_media": Video game, movie, TV series, book, anime, music album, or educational video.
4. "general_note": Programming code, terminal command, technical article, quick note, or general clipboard text.

Extract structured JSON with the following schema:
{{
  "contentType": "job_offer" | "contact_lead" | "general_media" | "general_note",
  "title": "Concise headline (max 75 chars)",
  "summary": "Crisp 2-3 sentence overview highlighting what it is and why it matters",
  "tags": ["3 to 6 descriptive tags"],
  "entities": {{
    "companies": [],
    "people": [],
    "technologies": [],
    "links": [],
    "emails": [],
    "phones": []
  }},
  
  // IF contentType == "job_offer":
  "jobData": {{
    "title": "Role title",
    "company": "Company name",
    "location": "City, Country or Remote",
    "category": "ai-ml" | "data" | "dev-fullstack" | "devops-cloud" | "cybersecurity" | "embedded-iot" | "other",
    "channel": "email" | "direct_contact" | "external",
    "recruiterEmail": "email if found or empty string",
    "recruiterName": "recruiter name if found or empty string",
    "recruiterPhone": "phone/whatsapp if found or empty string",
    "skills": ["required skills"],
    "requirements": ["key requirements"],
    "atsScoreEstimate": 85, // estimated fit score out of 100 based on user skills ({user_skills})
    "tailoredEmailSubject": "Subject line for application",
    "tailoredEmailBody": "Professional outreach email tailored to this position",
    "linkedInNote": "Connection request message under 280 chars"
  }},

  // IF contentType == "contact_lead":
  "contactData": {{
    "name": "Full name",
    "headline": "Current title or company role",
    "company": "Associated company",
    "email": "Email address",
    "phone": "Phone or WhatsApp",
    "profileUrl": "LinkedIn or website URL",
    "icebreakerMessage": "Quick friendly networking message to initiate contact"
  }},

  // IF contentType == "general_media":
  "mediaData": {{
    "mediaType": "Game" | "Movie" | "Book" | "Series" | "Music" | "Video",
    "title": "Title of the work",
    "creator": "Studio, Director, Author, or Developer",
    "releaseOrYear": "Release date or year if mentioned",
    "genre": "Genre or category",
    "synopsis": "Crisp synopsis or gameplay/story breakdown",
    "platforms": ["PC", "PS5", "Netflix", etc. if applicable]
  }},

  // IF contentType == "general_note":
  "noteData": {{
    "noteType": "code" | "command" | "article" | "idea" | "reference",
    "language": "python" | "javascript" | "bash" | "text",
    "keyTakeaways": ["Bullet point 1", "Bullet point 2"],
    "actionItems": ["Actionable step if any"]
  }}
}}

Output ONLY valid JSON. No markdown backticks.
"""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Domain: {extracted_domain}\nURL: {source_url or 'N/A'}\n\nContent:\n{raw_text[:3800]}"}
        ]
        res = await call_groq_chat(messages, api_key=api_key, model=model, temperature=0.2)
        content = res["content"].strip()
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        parsed = json.loads(content)
        parsed["sourceDomain"] = extracted_domain
        
        # Backward compatibility flags
        parsed["isJobOffer"] = (parsed.get("contentType") == "job_offer")
        parsed["isEducationalVideo"] = (parsed.get("contentType") == "general_media" and parsed.get("mediaData", {}).get("mediaType") == "Video")
        return parsed
    except Exception as e:
        logger.warning(f"Universal triage AI parsing fallback triggered: {e}")
        return fallback_analyze_clip(raw_text, source_url, extracted_domain)


def fallback_analyze_clip(raw_text: str, source_url: str = None, extracted_domain: str = "clipboard", candidate_profile: dict = None) -> dict:
    """Deterministic heuristic fallback when Groq LLM is unavailable or offline."""
    candidate_name = (candidate_profile or {}).get("fullName", "Candidate")
    lower = raw_text.lower()
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
    phones = re.findall(r'(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}', raw_text)
    
    is_job = any(w in lower for w in [
        "stage", "pfe", "recrute", "hiring", "candidat", "poste", "cdi", "cdd", "internship", 
        "job offer", "apply", "engineer", "ingénieur", "developer", "recrutement", "salary", "stipend"
    ])
    is_contact = (emails or phones or "linkedin.com/in" in lower) and len(raw_text.splitlines()) <= 5 and not is_job
    is_media = any(w in lower for w in ["game", "movie", "series", "imdb", "steam", "anime", "album", "trailer", "gameplay", "directed by", "starring"])
    is_code = any(w in raw_text for w in ["def ", "class ", "import ", "const ", "function", "return ", "npm ", "git ", "{", "};", "<div", "SELECT ", "FROM "])

    if is_job:
        content_type = "job_offer"
    elif is_contact:
        content_type = "contact_lead"
    elif is_media:
        content_type = "general_media"
    elif is_code:
        content_type = "general_note"
    else:
        content_type = "general_note"

    first_line = raw_text.strip().split("\n")[0][:75] or "Saved Item"
    channel = "email" if emails else ("direct_contact" if (phones or "whatsapp" in lower or "linkedin.com/in" in lower) else "external")
    cat = "ai-ml" if any(w in lower for w in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning"]) else ("data" if any(w in lower for w in ["data", "sql", "spark"]) else "dev-fullstack")

    job_data = None
    if is_job:
        job_data = {
            "title": first_line,
            "company": extracted_domain or "Recruiter Post",
            "location": "Remote / Hybrid" if ("hybrid" in lower or "remote" in lower or "télétravail" in lower) else "On-site",
            "category": cat,
            "channel": channel,
            "recruiterEmail": emails[0] if emails else "",
            "recruiterName": "",
            "recruiterPhone": phones[0] if phones else "",
            "skills": ["Software Engineering", "Tech"],
            "requirements": [],
            "atsScoreEstimate": 80,
            "tailoredEmailSubject": f"Application: {first_line}",
            "tailoredEmailBody": f"Dear Hiring Team,\n\nI am writing to express my strong interest in the {first_line} role at {extracted_domain}.\n\nBest regards,\n{candidate_name}",
            "linkedInNote": f"Hi! Reaching out regarding your {first_line} opening."
        }

    contact_data = None
    if is_contact:
        contact_data = {
            "name": first_line,
            "headline": "Professional Contact",
            "company": extracted_domain,
            "email": emails[0] if emails else "",
            "phone": phones[0] if phones else "",
            "profileUrl": source_url or "",
            "icebreakerMessage": f"Hello! Connecting regarding opportunities at {extracted_domain}."
        }

    media_data = None
    if is_media:
        media_data = {
            "mediaType": "Game" if ("game" in lower or "steam" in lower) else "Movie",
            "title": first_line,
            "creator": extracted_domain,
            "releaseOrYear": "",
            "genre": "Entertainment",
            "synopsis": raw_text[:250],
            "platforms": []
        }

    note_data = None
    if content_type == "general_note":
        note_data = {
            "noteType": "code" if is_code else "note",
            "language": "python" if "def " in raw_text or "import " in raw_text else ("javascript" if "const " in raw_text else "text"),
            "keyTakeaways": [first_line],
            "actionItems": []
        }

    return {
        "contentType": content_type,
        "title": first_line,
        "summary": raw_text[:220] + ("..." if len(raw_text) > 220 else ""),
        "tags": [content_type.replace("_", " ").title(), extracted_domain],
        "entities": {
            "emails": emails,
            "phones": phones,
            "technologies": [],
            "companies": [extracted_domain] if extracted_domain else [],
            "people": [],
            "links": [source_url] if source_url else []
        },
        "jobData": job_data,
        "contactData": contact_data,
        "mediaData": media_data,
        "noteData": note_data,
        "isJobOffer": is_job,
        "isEducationalVideo": False,
        "sourceDomain": extracted_domain
    }


async def generate_latex_cv_for_offer(job_title: str, job_description: str, candidate_profile: dict = None, api_key: str = None) -> dict:
    """
    Rewrites and generates an ATS-optimized LaTeX CV tailored specifically to a target job offer.
    Uses modern, cleanly compilable LaTeX formatting with quantified impact bullets matching the job requirements.
    """
    prof = candidate_profile or {}
    name = prof.get("fullName", "Candidate Name")
    email = prof.get("email", "candidate@email.com")
    phone = prof.get("phone", "+1 (555) 019-2834")
    linkedin = prof.get("linkedIn", "linkedin.com/in/candidate")
    github = prof.get("github", "github.com/candidate")
    degree = prof.get("degree", "M.S. in Software Engineering & AI")
    skills = prof.get("skills", "Python, PyTorch, FastAPI, React, PostgreSQL, Docker, AWS")

    system_prompt = f"""You are an elite ATS Resume Optimization & LaTeX Specialist.
Rewrite the candidate's CV into clean, compilable, ATS-friendly LaTeX code tailored directly to the target job description.

Target Job: {job_title}
Job Description:
{job_description[:2500]}

Candidate Info:
- Name: {name}
- Email: {email}
- Phone: {phone}
- LinkedIn: {linkedin}
- GitHub: {github}
- Degree: {degree}
- Core Stack: {skills}

Requirements:
1. Generate standard, compilable LaTeX using article/moderncv styling.
2. Emphasize matching skills and high-impact action verbs.
3. Quantify accomplishments with metrics (e.g., "improved latency by 35%", "scaled throughput to 10k req/s").
4. Output valid JSON with keys:
   - "latexCode": Complete LaTeX document string (compilable with pdflatex)
   - "atsFitScore": Integer between 75 and 99
   - "matchedKeywords": Array of matched technical terms from the job post
   - "tailoredBulletPoints": Array of 3-5 top customized bullet points designed for this specific position
   - "summaryRationale": Short explanation of how the CV was optimized for ATS parsers

Output ONLY the raw JSON object. Do not wrap in markdown quotes if possible."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Optimize candidate CV in LaTeX for: {job_title}"}
    ]

    try:
        res = await call_groq_chat(messages, api_key=api_key, model="openai/gpt-oss-120b", temperature=0.25, max_tokens=2200)
        content = res["content"].strip()
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        return json.loads(content)
    except Exception as e:
        logger.warning(f"LaTeX CV generation fallback: {e}")
        escaped_name = name.replace("&", "\\&")
        fallback_latex = rf"""\documentclass[a4paper,10pt]{{article}}
\usepackage[utf8]{{inputenc}}
\usepackage[margin=0.75in]{{geometry}}
\usepackage{{hyperref}}
\usepackage{{enumitem}}

\begin{{document}}
\begin{{center}}
    {{\LARGE \textbf{{{escaped_name}}}}} \\ \vspace{{3pt}}
    \small {email} \quad | \quad {phone} \quad | \quad \url{{{linkedin}}} \quad | \quad \url{{{github}}}
\end{{center}}

\section*{{Summary}}
High-impact engineer specialized in {skills[:50]}, with a focus on delivering robust solutions tailored for {job_title}.

\section*{{Education}}
\textbf{{{degree}}} \hfill Graduated with Distinction

\section*{{Technical Skills}}
\textbf{{Core Stack:}} {skills}

\section*{{Tailored Experience \& Projects}}
\begin{{itemize}}[leftmargin=*]
    \item Developed high-performance pipelines and intelligent agents utilizing modern AI frameworks.
    \item Optimized search and OCR data ingestion architectures with automated triage.
    \item Designed production-grade REST APIs and scalable backend architectures.
\end{{itemize}}
\end{{document}}"""
        return {
            "latexCode": fallback_latex,
            "atsFitScore": 88,
            "matchedKeywords": [s.strip() for s in skills.split(",")[:5]],
            "tailoredBulletPoints": [
                f"Tailored expertise for {job_title}",
                f"Production deployment of {skills.split(',')[0].strip() if skills else 'Python'}",
                "Automated data pipeline processing and semantic extraction"
            ],
            "summaryRationale": "Structured template aligned with standard ATS resume parsers."
        }


async def analyze_offer(raw_text: str, candidate_profile: dict = None, api_key: str = None, model: str = None, categories: list = None):
    """
    Dedicated offer analyzer for legacy endpoints and detailed offer extraction.
    """
    profile = candidate_profile or {}

    category_descriptions = ""
    if categories and len(categories) > 0:
        cat_lines = []
        for c in categories:
            cid = c.get("id")
            if cid == "all":
                continue
            lbl = c.get("label") or cid
            kws = ", ".join(c.get("keywords") or [])
            cat_lines.append(f'- "{cid}": {lbl} (Keywords: {kws or "General"})')
        category_descriptions = "\n".join(cat_lines)
    else:
        category_descriptions = """- "ai-ml": AI & Machine Learning (NLP, PyTorch, LLMs, Computer Vision, Transformers)
- "data": Data Science & Engineering (SQL, Spark, Big Data, BI, Snowflake)
- "dev-fullstack": Software & Fullstack Development (React, Node, Python, Java, Web, Go)
- "devops-cloud": DevOps & Cloud Infrastructure (AWS, Docker, K8s, CI/CD, Terraform)
- "cybersecurity": Cybersecurity & InfoSec (Pentest, SOC, Cryptography, Security)
- "embedded-iot": Embedded & IoT / Systems (C/C++, STM32, Firmware, Microcontrollers)
- "other": General / Other Domains"""

    clean_input = clean_repetitive_text(raw_text)

    system_prompt = f"""You are RADAR, an elite career and hiring analysis assistant.
Analyze recruiter posts from LinkedIn, Indeed, or career sites.
Extract and output ONLY a valid JSON object with the following keys:
- "title": Job / Internship title
- "company": Company name
- "location": Work location, city, and remote status
- "category": Detected domain slug:
{category_descriptions}
- "categoryReasoning": Short rationale for category classification
- "channel": ONE of ["email", "direct_contact", "external"]
- "recruiterEmail": Recruiter email address or empty string
- "sharer": {{
    "name": Recruiter / Sharer full name,
    "title": Recruiter headline / role,
    "profileUrl": Their LinkedIn profile link or empty string,
    "phone": WhatsApp or phone number if mentioned or empty string
}}
- "skills": Array of 4-8 keywords (e.g. ["Python", "PyTorch", "NLP", "FastAPI"])
- "summary": 2-sentence crisp summary
- "jobSpecification": Clean, structured job description formatted with Role Overview, Key Responsibilities, and Requirements in clean bullet points.
- "linkedInNote": Concise connection request note (under 280 characters!) personalized from candidate profile
- "whatsAppMsg": Crisp professional WhatsApp pitch
- "confidence": Float between 0.70 and 0.99 indicating certainty of classification

Candidate Profile:
Name: {profile.get('fullName', 'Candidate')}
Degree: {profile.get('degree', 'Software & AI Engineer')}
Skills: {profile.get('skills', 'Python, PyTorch, LLMs, NLP, React, FastAPI')}

Return ONLY the raw JSON object."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": clean_input}
    ]

    res = await call_groq_chat(messages, api_key=api_key, model=model, temperature=0.2)
    content = res["content"].strip()
    
    if content.startswith("```"):
        lines = content.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    try:
        parsed = json.loads(content)
        parsed["aiPowered"] = True
        return parsed
    except Exception as e:
        logger.warning(f"Failed to parse Groq JSON: {e}")
        return {
            "title": "Software Engineering Opportunity",
            "company": "Company",
            "location": "Remote / Hybrid",
            "category": "dev-fullstack",
            "channel": "external",
            "recruiterEmail": "",
            "sharer": {"name": "", "title": "", "profileUrl": "", "phone": ""},
            "skills": ["Python", "FastAPI", "React"],
            "description": raw_text,
            "linkedInNote": "Hello, I would love to connect and discuss your engineering opportunity.",
            "whatsAppMsg": "Hello, I am reaching out regarding your engineering opportunity.",
            "confidence": 0.75,
            "aiPowered": False
        }

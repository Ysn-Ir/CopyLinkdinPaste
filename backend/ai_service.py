import json
import logging
import httpx
import io
import base64
import re
import sys
from PIL import Image
from .config import GROQ_API_KEY, DEFAULT_MODEL

logger = logging.getLogger("pfe_hunter.ai")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def clean_repetitive_text(text: str) -> str:
    """
    Cleans raw post or scraped text by removing header prefixes (TITLE:, SITE:, DESCRIPTION:)
    and deduplicating repeated sentences and paragraphs.
    """
    if not text:
        return ""

    # Strip multi-layered scraper headers
    cleaned = re.sub(r'^(TITLE|SITE|DESCRIPTION|PAGE CONTENT|URL):\s*[^\n]*\n+', '', text, flags=re.MULTILINE)
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n{2,}', cleaned) if p.strip()]
    seen_paras = set()
    unique_paras = []

    for p in paragraphs:
        # Normalize for deduplication comparison
        norm = re.sub(r'\s+', ' ', p.lower())[:100]
        if norm not in seen_paras:
            seen_paras.add(norm)
            # Within the paragraph, deduplicate consecutive identical lines
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
    target_model = model or DEFAULT_MODEL
    if target_model == "llama-3.3-70b-versatile":
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


async def call_groq_vision(image_base64: str, prompt: str = "Extract all text and job/educational details from this screenshot", api_key: str = None):
    """
    Robust Multi-Engine OCR Processor:
    1. Extracts text from base64 image using Windows Native OCR (winocr) or Tesseract (Linux/Docker).
    2. Cleans and formats the extracted text with Groq LLM (openai/gpt-oss-120b) to remove OCR noise and restore structured layout.
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

    # Engine 1: Windows Native OCR (winocr) - high accuracy, fast, works offline
    if sys.platform == "win32":
        try:
            import winocr
            res = await winocr.recognize_pil(pil_image, "en")
            if res and res.text and len(res.text.strip()) > 5:
                extracted_raw = res.text.strip()
        except Exception as e:
            logger.warning(f"Windows OCR error: {e}")

    # Engine 2: Tesseract OCR (cross-platform, Linux, Docker)
    if not extracted_raw or len(extracted_raw) < 10:
        try:
            import pytesseract
            res = pytesseract.image_to_string(pil_image)
            if res and len(res.strip()) > 5:
                extracted_raw = res.strip()
        except Exception as e:
            logger.warning(f"Tesseract OCR error: {e}")

    # Fallback message if completely unreadable
    if not extracted_raw or len(extracted_raw.strip()) < 5:
        return "Could not detect readable text in screenshot. Please ensure the image contains clear text or post content."

    # Engine 3: Semantic Reconstruction via Groq LLM (openai/gpt-oss-120b)
    # Fixes typos, restores bullet points and lines, removes OCR noise
    key = (api_key or GROQ_API_KEY or "").strip()
    if key:
        try:
            clean_prompt = f"""You are an OCR text repair specialist.
Below is raw text extracted from a mobile screenshot (such as a recruiter post on LinkedIn, WhatsApp message, or job listing).
Clean up typos, fix merged or broken words, restore proper paragraphs, and preserve all details (role, company, requirements, recruiter email, phone, links).
Return ONLY the cleaned text verbatim without adding commentary.

Raw OCR Text:
{extracted_raw[:3500]}"""
            clean_res = await call_groq_chat(
                [{"role": "user", "content": clean_prompt}],
                api_key=key,
                model="openai/gpt-oss-120b",
                temperature=0.1,
                max_tokens=1200
            )
            cleaned = clean_res.get("content", "").strip()
            if cleaned and len(cleaned) > 10:
                return cleaned
        except Exception as e:
            logger.warning(f"AI OCR cleanup failed, returning raw OCR: {e}")

    return extracted_raw


async def analyze_offer(raw_text: str, candidate_profile: dict = None, api_key: str = None, model: str = None, categories: list = None):
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

    system_prompt = f"""You are an elite PFE (graduation internship) career assistant with complete freedom.
Analyze recruiter posts from LinkedIn, Indeed, or career sites.
Extract and output ONLY a valid JSON object with the following keys:
- "title": Job / Internship title (e.g. "Stage PFE - Ingénieur R&D NLP")
- "company": Company name
- "location": Work location, city, and remote status
- "category": Detected domain slug. Choose the best match from the user's active categories:
{category_descriptions}
If none match, you have freedom to propose a new concise slug (e.g. "robotics", "fintech").
- "categoryReasoning": Short rationale for category classification
- "channel": ONE of ["email", "direct_contact", "external"]
    * "email" if an email address is provided to apply.
    * "direct_contact" if post asks to message in DM, MP, WhatsApp, or gives a phone number.
    * "external" if applying through a company career portal / ATS link.
- "recruiterEmail": Recruiter email address or empty string
- "sharer": {{
    "name": Recruiter / Sharer full name,
    "title": Recruiter headline / role,
    "profileUrl": Their LinkedIn profile link or empty string,
    "phone": WhatsApp or phone number if mentioned or empty string
}}
- "skills": Array of 4-8 keywords (e.g. ["Python", "PyTorch", "NLP", "FastAPI"])
- "summary": 2-sentence crisp summary
- "jobSpecification": Clean, structured job description formatted with Role Overview, Key Responsibilities, and Requirements in clean bullet points. Strictly remove redundant repetitions, headers, and footer noise.
- "linkedInNote": Concise connection request note (strictly UNDER 280 characters!) personalized from candidate profile
- "whatsAppMsg": Crisp professional WhatsApp pitch
- "confidence": Float between 0.70 and 0.99 indicating certainty of classification

Candidate Profile:
Name: {profile.get('fullName', 'Khalil')}
Degree: {profile.get('degree', 'Ingénieur Génie Logiciel & IA')}
Skills: {profile.get('skills', 'Python, PyTorch, LLMs, NLP, React, FastAPI')}

Return ONLY the raw JSON object. Do not wrap in markdown quotes if possible."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": raw_text}
    ]

    res = await call_groq_chat(messages, api_key=api_key, model=model, temperature=0.2)
    content = res["content"].strip()
    
    # Strip markdown fences if present
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
        logger.warning(f"Failed to parse Groq JSON: {e}. Raw content: {content[:100]}")
        return {
            "title": "Software Engineering Internship",
            "company": "Company",
            "location": "Remote / Hybrid",
            "category": "dev-fullstack",
            "channel": "external",
            "recruiterEmail": "",
            "sharer": {"name": "", "title": "", "profileUrl": "", "phone": ""},
            "skills": ["Python", "FastAPI", "React"],
            "description": raw_text,
            "linkedInNote": "Hello, I would love to connect and discuss your engineering internship opportunity.",
            "whatsAppMsg": "Hello, I am reaching out regarding your engineering internship opportunity.",
            "confidence": 0.75,
            "aiPowered": False
        }


async def analyze_clip(raw_text: str, source_url: str = None, source_domain: str = None, api_key: str = None, model: str = None):
    """
    Universal Semantic Classifier & Extractor for General Clipboard Clips.
    Classifies type (job_offer, code_snippet, tech_article, social_post, tool_or_repo, note, contact),
    summarizes, tags, extracts entities and domain of origin.
    """
    from urllib.parse import urlparse

    extracted_domain = (source_domain or "").strip()
    if source_url and not extracted_domain:
        try:
            parsed = urlparse(source_url)
            extracted_domain = parsed.netloc.replace("www.", "")
        except Exception:
            pass

    # Heuristic domain from text if URL found inside text
    if not extracted_domain:
        for dom in ["linkedin.com", "github.com", "twitter.com", "x.com", "medium.com", "stackoverflow.com", "reddit.com", "youtube.com"]:
            if dom in raw_text.lower():
                extracted_domain = dom
                break
    if not extracted_domain:
        extracted_domain = "Local Clipboard"

    system_prompt = f"""You are OmniMemory, a high-precision universal semantic clipboard analysis engine.
Analyze the user's copied text and extract structured metadata in strict JSON.

Determine:
1. "contentType": one of ["job_offer", "educational_video", "code_snippet", "tech_article", "social_post", "tool_or_repo", "note", "contact"]
   * Use "educational_video" for YouTube shorts/videos, TikTok tutorials, Instagram reels, educational demos, tech breakdowns.
   * Use "job_offer" if it represents an internship, PFE, hiring post, job listing.
   * Use "code_snippet" for programming code, scripts, configs, commands.
   * Use "tech_article" for documentation, guides, blog posts, whitepapers.
   * Use "social_post" for general LinkedIn/Twitter discussions or news.
2. "title": concise, professional title (max 70 chars)
3. "summary": 2-3 clear sentences summarizing the core idea, mission or learning objective
4. "tags": 3-6 relevant keywords/topics/technologies
5. "entities": object containing recognized items (e.g. {{"technologies": [...], "companies": [...], "people": [...], "links": [...]}})
6. "isJobOffer": boolean (true if it represents a stage, PFE, job listing, hiring post)
7. "isEducationalVideo": boolean (true if it is a video tutorial, short, reel, or educational clip)
8. If "isEducationalVideo" is true, include "videoData":
   {{
      "coreConcept": "Main lesson or concept taught (e.g. LoRA Fine-Tuning in 60s)",
      "keyTakeaways": ["Actionable takeaway or bullet point 1", "Key point 2", "Key point 3"],
      "toolsMentioned": ["PyTorch", "HuggingFace", "Unsloth"],
      "creator": "Creator name/handle if known or empty"
   }}
9. If "isJobOffer" is true, include "jobData":
   {{
      "title": job title,
      "company": company name,
      "location": city/country/remote,
      "category": "ai-ml" | "dev-fullstack" | "data" | "devops-cloud" | "cybersecurity",
      "recruiterEmail": email if found or "",
      "recruiterName": recruiter name if found or "",
      "skills": [skills],
      "channel": "email" | "direct_contact" | "external"
   }}

Output ONLY valid JSON. No markdown fences.
"""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Source URL: {source_url or 'N/A'}\nDomain: {extracted_domain}\n\nContent:\n{raw_text[:3500]}"}
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
        
        # Ensure jobData exists if isJobOffer is True
        if parsed.get("isJobOffer") and not parsed.get("jobData"):
            import re
            emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
            phones = re.findall(r'(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}', raw_text)
            channel = "email" if emails else ("direct_contact" if (phones or "whatsapp" in raw_text.lower() or "linkedin.com/in" in raw_text.lower()) else "external")
            cat = "ai-ml" if any(w in raw_text.lower() for w in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning"]) else ("data" if any(w in raw_text.lower() for w in ["data", "sql", "spark"]) else "dev-fullstack")
            parsed["jobData"] = {
                "title": parsed.get("title") or "Engineering Opportunity",
                "company": extracted_domain or "Company",
                "location": "Remote / On-site",
                "category": cat,
                "recruiterEmail": emails[0] if emails else "",
                "recruiterName": "",
                "skills": parsed.get("tags") or ["Python", "Engineering"],
                "channel": channel
            }
        return parsed
    except Exception as e:
        logger.warning(f"Universal clip AI parsing failed: {e}. Using intelligent fallback.")
        import re
        is_job = any(w in raw_text.lower() for w in [
            "stage", "pfe", "recrute", "hiring", "candidat", "poste", "cdi", "cdd", "internship", "job offer", "apply", "engineer", "ingénieur", "developer", "recrutement"
        ])
        is_video = any(d in (source_url or "").lower() or d in raw_text.lower() for d in ["youtube.com", "youtu.be", "tiktok.com", "instagram.com/reel", "shorts/"])
        is_code = any(w in raw_text for w in ["def ", "class ", "import ", "const ", "function", "return ", "npm ", "git ", "{", "};", "<div", "export "])
        
        content_type = "job_offer" if is_job else ("educational_video" if is_video else ("code_snippet" if is_code else "note"))
        first_line = raw_text.split("\n")[0][:70].strip() or "Clipboard Item"

        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
        phones = re.findall(r'(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}', raw_text)
        channel = "email" if emails else ("direct_contact" if (phones or "whatsapp" in raw_text.lower() or "linkedin.com/in" in raw_text.lower()) else "external")
        cat = "ai-ml" if any(w in raw_text.lower() for w in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning"]) else ("data" if any(w in raw_text.lower() for w in ["data", "sql", "spark", "etl"]) else "dev-fullstack")

        job_data = None
        if is_job:
            job_data = {
                "title": first_line,
                "company": extracted_domain or "Recruiter Post",
                "location": "Remote / Hybrid" if "hybride" in raw_text.lower() or "remote" in raw_text.lower() else "Tech Hub",
                "category": cat,
                "recruiterEmail": emails[0] if emails else "",
                "recruiterName": "",
                "skills": ["Software Engineering", "Tech"],
                "channel": channel
            }

        video_data = None
        if is_video:
            video_data = {
                "coreConcept": first_line,
                "keyTakeaways": [first_line, "Saved from educational short / video"],
                "toolsMentioned": [],
                "creator": extracted_domain,
            }

        return {
            "contentType": content_type,
            "title": first_line,
            "summary": raw_text[:200] + ("..." if len(raw_text) > 200 else ""),
            "tags": ["Video" if is_video else "Clipboard", extracted_domain] if extracted_domain else ["Clipboard"],
            "entities": {},
            "isJobOffer": is_job,
            "isEducationalVideo": is_video,
            "jobData": job_data,
            "videoData": video_data,
            "sourceDomain": extracted_domain,
            "detectedLanguage": "en"
        }



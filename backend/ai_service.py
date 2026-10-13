import json
import logging
import httpx
from .config import GROQ_API_KEY, DEFAULT_MODEL

logger = logging.getLogger("pfe_hunter.ai")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

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
            "title": "Stage PFE",
            "company": "Entreprise",
            "location": "Paris, France",
            "category": "dev-fullstack",
            "channel": "external",
            "recruiterEmail": "",
            "sharer": {"name": "", "title": "", "profileUrl": "", "phone": ""},
            "skills": ["Python", "FastAPI", "React"],
            "description": raw_text,
            "linkedInNote": "Bonjour, je serais ravi d'échanger au sujet de votre offre de stage PFE.",
            "whatsAppMsg": "Bonjour, je vous contacte au sujet de votre offre de stage PFE.",
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
        extracted_domain = "Presse-papiers Local"

    system_prompt = f"""You are OmniMemory, a high-precision universal semantic clipboard analysis engine.
Analyze the user's copied text and extract structured metadata in strict JSON.

Determine:
1. "contentType": one of ["job_offer", "code_snippet", "tech_article", "social_post", "tool_or_repo", "note", "contact"]
2. "title": concise, professional title (max 70 chars)
3. "summary": 2-3 clear sentences summarizing the core idea, key takeaways or purpose
4. "tags": 3-6 relevant keywords/topics/technologies
5. "entities": object containing recognized items (e.g. {{"technologies": [...], "companies": [...], "people": [...], "links": [...]}})
6. "isJobOffer": boolean (true if it represents a stage, PFE, job listing, hiring post)
7. "detectedLanguage": "fr" | "en" | "other"
8. If "isJobOffer" is true, also include "jobData":
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
        return parsed
    except Exception as e:
        logger.warning(f"Universal clip AI parsing failed: {e}. Using intelligent fallback.")
        is_job = any(w in raw_text.lower() for w in ["stage", "pfe", "recrute", "hiring", "candidat", "poste", "cdi", "internship", "job offer"])
        is_code = any(w in raw_text for w in ["def ", "class ", "import ", "const ", "function", "return ", "npm ", "git ", "{", "};", "<div", "export "])
        content_type = "job_offer" if is_job else ("code_snippet" if is_code else "note")
        first_line = raw_text.split("\n")[0][:70].strip() or "Note Presse-papiers"

        return {
            "contentType": content_type,
            "title": first_line,
            "summary": raw_text[:200] + ("..." if len(raw_text) > 200 else ""),
            "tags": ["Presse-papiers", extracted_domain] if extracted_domain else ["Presse-papiers"],
            "entities": {},
            "isJobOffer": is_job,
            "sourceDomain": extracted_domain,
            "detectedLanguage": "fr"
        }


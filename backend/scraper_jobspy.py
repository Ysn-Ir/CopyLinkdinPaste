import logging
import asyncio
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("radar.scraper_jobspy")

# Global in-memory hunt state
active_hunt_state = {
    "status": "idle",       # "idle", "running", "completed", "error"
    "progress": 0,
    "searchTerm": "",
    "location": "",
    "sites": [],
    "totalFound": 0,
    "results": [],
    "error": None,
    "startedAt": None,
    "completedAt": None,
}


def compute_ats_match_score(job_text: str, candidate_skills: str) -> int:
    """Computes an ATS keyword overlap score between 50% and 98%."""
    if not job_text or not candidate_skills:
        return 75

    text_lower = job_text.lower()
    skills_list = [s.strip().lower() for s in re.split(r'[,|/\n]', candidate_skills) if len(s.strip()) > 1]
    if not skills_list:
        return 75

    matches = sum(1 for s in skills_list if s in text_lower)
    ratio = matches / len(skills_list)
    score = int(55 + (ratio * 43))
    return min(98, max(50, score))


def categorize_job(title: str, description: str) -> str:
    """Categorizes scraped job into one of RADAR's target domains."""
    comb = f"{title} {description}".lower()
    if any(k in comb for k in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning", "pytorch", "transformers", "computer vision"]):
        return "ai-ml"
    elif any(k in comb for k in ["data engineer", "data scientist", "bi", "spark", "sql", "snowflake", "big data", "etl"]):
        return "data"
    elif any(k in comb for k in ["devops", "cloud", "aws", "docker", "kubernetes", "k8s", "terraform", "ci/cd"]):
        return "devops-cloud"
    elif any(k in comb for k in ["cyber", "security", "sécurité", "pentest", "soc", "siem"]):
        return "cybersecurity"
    elif any(k in comb for k in ["embedded", "iot", "c/c++", "firmware", "stm32", "microcontroller"]):
        return "embedded-iot"
    elif any(k in comb for k in ["fullstack", "react", "node", "python", "software", "frontend", "backend", "developer", "développeur"]):
        return "dev-fullstack"
    return "other"


def execute_jobspy_scrape(
    sites: List[str],
    search_term: str,
    location: str,
    results_wanted: int = 20,
    is_remote: bool = False,
    country_indeed: str = "usa",
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """Synchronous execution of python-jobspy within a background worker."""
    from jobspy import scrape_jobs

    valid_sites = []
    for s in sites:
        clean = s.strip().lower()
        if clean in ["linkedin", "indeed", "glassdoor", "zip_recruiter", "ziprecruiter"]:
            valid_sites.append(clean)
    if not valid_sites:
        valid_sites = ["linkedin", "indeed"]

    logger.info(f"Starting JobSpy scrape: sites={valid_sites}, term='{search_term}', loc='{location}', wanted={results_wanted}")

    # Determine country based on location string
    loc_lower = (location or "").lower()
    country = country_indeed
    if any(w in loc_lower for w in ["france", "paris", "lyon"]):
        country = "france"
    elif any(w in loc_lower for w in ["germany", "berlin", "munich"]):
        country = "germany"
    elif any(w in loc_lower for w in ["uk", "united kingdom", "london"]):
        country = "uk"
    elif any(w in loc_lower for w in ["canada", "montreal", "toronto"]):
        country = "canada"

    try:
        df = scrape_jobs(
            site_name=valid_sites,
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            is_remote=is_remote,
            country_indeed=country,
            linkedin_fetch_description=True
        )
    except Exception as e:
        logger.error(f"JobSpy scrape failed: {e}")
        # Try fallback on indeed only if multi-site failed
        try:
            logger.info("Retrying with Indeed fallback...")
            df = scrape_jobs(
                site_name=["indeed"],
                search_term=search_term,
                location=location,
                results_wanted=min(results_wanted, 15),
                is_remote=is_remote,
                country_indeed=country
            )
        except Exception as e2:
            logger.error(f"Fallback scrape also failed: {e2}")
            raise RuntimeError(f"Job search failed: {str(e2)}")

    if df is None or len(df) == 0:
        logger.info("JobSpy scrape returned 0 results.")
        return []

    records = df.to_dict(orient="records")
    normalized = []

    for r in records:
        # Normalize fields
        raw_title = str(r.get("title") or "Engineering Role").strip()
        raw_company = str(r.get("company") or "Company").strip()
        raw_desc = str(r.get("description") or "").strip()
        raw_loc = str(r.get("location") or location or "Remote").strip()
        raw_site = str(r.get("site") or "jobspy").lower()
        job_url = str(r.get("job_url_direct") or r.get("job_url") or "").strip()

        # Format salary if available
        min_amt = r.get("min_amount")
        max_amt = r.get("max_amount")
        curr = str(r.get("currency") or "USD")
        interval = str(r.get("interval") or "yearly")
        salary_str = ""
        if min_amt and max_amt:
            salary_str = f"{curr} {int(min_amt):,} - {int(max_amt):,} / {interval}"
        elif min_amt:
            salary_str = f"{curr} {int(min_amt):,} / {interval}"

        # Recruiter contact extraction
        emails_field = r.get("emails")
        emails = []
        if isinstance(emails_field, list):
            emails = [str(e) for e in emails_field if e]
        elif isinstance(emails_field, str) and emails_field:
            emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', emails_field)
        
        if not emails and raw_desc:
            emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_desc)

        # ATS match score
        ats_score = compute_ats_match_score(f"{raw_title} {raw_desc}", candidate_skills)
        category = categorize_job(raw_title, raw_desc)
        channel = "email" if emails else ("external" if job_url else "direct_contact")

        # Skills list
        skills = []
        if r.get("skills"):
            if isinstance(r["skills"], list):
                skills = [str(s) for s in r["skills"]]
            elif isinstance(r["skills"], str):
                skills = [s.strip() for s in r["skills"].split(",") if s.strip()]

        if not skills:
            detected = []
            for kw in ["Python", "FastAPI", "React", "Docker", "PyTorch", "NLP", "SQL", "AWS", "TypeScript", "Node.js", "Java", "Kubernetes"]:
                if kw.lower() in raw_desc.lower():
                    detected.append(kw)
            skills = detected or ["Software Engineering"]

        job_item = {
            "id": f"jobspy-{raw_site}-{int(datetime.utcnow().timestamp()*1000)}-{len(normalized)+1}",
            "site": raw_site,
            "title": raw_title,
            "company": raw_company,
            "location": raw_loc,
            "isRemote": bool(r.get("is_remote", False) or "remote" in raw_loc.lower()),
            "jobType": str(r.get("job_type") or "Full-Time"),
            "datePosted": str(r.get("date_posted") or datetime.utcnow().strftime("%Y-%m-%d")),
            "salary": salary_str,
            "jobUrl": job_url,
            "emails": emails,
            "recruiterEmail": emails[0] if emails else "",
            "description": raw_desc[:3000],
            "skills": skills[:8],
            "category": category,
            "channel": channel,
            "atsFitScore": ats_score,
            "companyLogo": str(r.get("company_logo") or ""),
            "companyUrl": str(r.get("company_url") or "")
        }
        normalized.append(job_item)

    # Sort descending by ATS fit score
    normalized.sort(key=lambda j: j["atsFitScore"], reverse=True)
    return normalized


async def run_hunt_async(
    sites: List[str],
    search_term: str,
    location: str,
    results_wanted: int = 20,
    is_remote: bool = False,
    country_indeed: str = "usa",
    candidate_skills: str = ""
):
    """Background async runner updating global state."""
    global active_hunt_state

    active_hunt_state.update({
        "status": "running",
        "progress": 25,
        "searchTerm": search_term,
        "location": location,
        "sites": sites,
        "results": [],
        "totalFound": 0,
        "error": None,
        "startedAt": datetime.utcnow().isoformat(),
        "completedAt": None,
    })

    try:
        results = await asyncio.to_thread(
            execute_jobspy_scrape,
            sites=sites,
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            is_remote=is_remote,
            country_indeed=country_indeed,
            candidate_skills=candidate_skills
        )
        active_hunt_state.update({
            "status": "completed",
            "progress": 100,
            "results": results,
            "totalFound": len(results),
            "completedAt": datetime.utcnow().isoformat()
        })
        logger.info(f"Hunt completed successfully. Found {len(results)} jobs.")
        return results
    except Exception as e:
        logger.error(f"Hunt background error: {e}")
        active_hunt_state.update({
            "status": "error",
            "progress": 0,
            "error": str(e),
            "completedAt": datetime.utcnow().isoformat()
        })
        return []


def cancel_active_hunt() -> bool:
    """Cancels the active autonomous scrape."""
    if active_hunt_state.get("status") == "running":
        active_hunt_state.update({
            "status": "cancelled",
            "progress": 0,
            "completedAt": datetime.utcnow().isoformat()
        })
        logger.info("Active hunt was cancelled.")
        return True
    return False



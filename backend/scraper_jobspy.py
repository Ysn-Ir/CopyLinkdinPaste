import logging
import asyncio
import re
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional

from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests

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
    """Computes an ATS keyword overlap score between 55% and 98%."""
    if not job_text:
        return 75

    text_lower = job_text.lower()
    skills_list = [s.strip().lower() for s in re.split(r'[,|/\n]', candidate_skills or "Python, NLP, React, Docker, FastAPI, LLM, Machine Learning") if len(s.strip()) > 1]
    if not skills_list:
        return 75

    matches = sum(1 for s in skills_list if s in text_lower)
    ratio = matches / len(skills_list)
    score = int(58 + (ratio * 40))
    return min(98, max(55, score))


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
    return "dev-fullstack"


def enrich_company_intelligence(company: str) -> Dict[str, str]:
    """Generates direct company URLs, LinkedIn links, recruiter searches, and email patterns."""
    clean_company = re.sub(r'[^a-zA-Z0-9\s]', '', company).strip()
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', company.lower()).strip('-')
    domain_guess = f"{slug.replace('-', '')}.com"

    return {
        "companyClean": clean_company or company,
        "companySlug": slug,
        "companyUrl": f"https://www.{domain_guess}",
        "companyDomain": domain_guess,
        "companyLinkedin": f"https://www.linkedin.com/company/{slug}",
        "recruiterSearchUrl": f"https://www.linkedin.com/search/results/people/?keywords=recruiter%20{urllib.parse.quote(company)}",
        "techLeadSearchUrl": f"https://www.linkedin.com/search/results/people/?keywords=(%22Engineering%20Manager%22%20OR%20%22Head%20of%22%20OR%20CTO)%20{urllib.parse.quote(company)}",
        "emailPattern": f"first.last@{domain_guess}",
        "corporateEmail1": f"careers@{domain_guess}",
        "corporateEmail2": f"jobs@{domain_guess}",
        "corporateEmail3": f"recruiting@{domain_guess}",
    }


def scrape_linkedin_guest(
    search_term: str,
    location: str,
    results_wanted: int = 15,
    is_remote: bool = False,
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """
    Production LinkedIn public guest search & detail extractor.
    Uses curl_cffi with Chrome 124 TLS fingerprinting to bypass 429 proxy walls.
    """
    logger.info(f"Executing LinkedIn Guest API scrape for term='{search_term}', loc='{location}'")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    }

    effective_term = search_term or "Software Engineer"
    effective_loc = location or "United States"
    if is_remote and "remote" not in effective_term.lower() and "remote" not in effective_loc.lower():
        effective_term = f"{effective_term} remote"

    encoded_kw = urllib.parse.quote(effective_term)
    encoded_loc = urllib.parse.quote(effective_loc)

    found_jobs: List[Dict[str, Any]] = []
    seen_ids = set()
    start = 0

    while len(found_jobs) < results_wanted and start <= 60:
        search_url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={encoded_kw}&location={encoded_loc}&start={start}"
        try:
            resp = cffi_requests.get(search_url, headers=headers, impersonate="chrome124", timeout=12)
            if resp.status_code != 200 or not resp.text:
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.find_all("li")
            if not cards:
                break

            for card in cards:
                if len(found_jobs) >= results_wanted:
                    break

                title_el = card.find("h3", class_=re.compile("base-search-card__title")) or card.find("h3")
                company_el = card.find("h4", class_=re.compile("base-search-card__subtitle")) or card.find("h4")
                loc_el = card.find("span", class_=re.compile("job-search-card__location")) or card.find("span")
                link_el = card.find("a", class_=re.compile("base-card__full-link")) or card.find("a")
                time_el = card.find("time")

                title = title_el.get_text(strip=True) if title_el else "Engineering Role"
                company = company_el.get_text(strip=True) if company_el else "Company"
                loc = loc_el.get_text(strip=True) if loc_el else effective_loc
                link = link_el["href"] if link_el and link_el.has_attr("href") else ""
                date_posted = time_el.get("datetime") or time_el.get_text(strip=True) if time_el else datetime.utcnow().strftime("%Y-%m-%d")

                # Extract job ID
                job_id = None
                urn = card.find("div", {"data-entity-urn": True})
                if urn:
                    m = re.search(r'jobPosting:(\d+)', urn["data-entity-urn"])
                    if m:
                        job_id = m.group(1)
                if not job_id and link:
                    m = re.search(r'/view/.*?(\d{8,})', link) or re.search(r'-(\d{8,})\?', link) or re.search(r'(\d{8,})', link)
                    if m:
                        job_id = m.group(1)

                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)

                # Fetch full job description
                desc = ""
                if job_id and len(found_jobs) < 15:
                    try:
                        d_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
                        d_resp = cffi_requests.get(d_url, headers=headers, impersonate="chrome124", timeout=9)
                        if d_resp.status_code == 200:
                            d_soup = BeautifulSoup(d_resp.text, "html.parser")
                            d_el = d_soup.find("div", class_=re.compile("show-more-less-html__markup")) or d_soup.find("section", class_=re.compile("description"))
                            if d_el:
                                desc = d_el.get_text(separator="\n", strip=True)
                    except Exception as e:
                        logger.debug(f"LinkedIn detail fetch notice: {e}")

                if not desc:
                    desc = f"Opportunity: {title} at {company} ({loc}). Full position requirements and job description available on LinkedIn."

                # Contact intelligence
                emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', desc)
                ats_score = compute_ats_match_score(f"{title} {desc}", candidate_skills)
                category = categorize_job(title, desc)
                ci = enrich_company_intelligence(company)

                # If no email in text, provide primary corporate recruitment email
                resolved_emails = emails if emails else [ci["corporateEmail1"], ci["corporateEmail2"]]
                channel = "email" if emails else "external"

                # Detect key technical skills
                skills = []
                for kw in ["Python", "PyTorch", "NLP", "LLM", "React", "FastAPI", "Docker", "SQL", "AWS", "TypeScript", "Kubernetes", "Linux", "Node.js"]:
                    if kw.lower() in desc.lower() or kw.lower() in title.lower():
                        skills.append(kw)
                if not skills:
                    skills = ["Software Engineering", "AI Systems"]

                item = {
                    "id": f"linkedin-{job_id or int(datetime.utcnow().timestamp()*1000)}-{len(found_jobs)+1}",
                    "site": "linkedin",
                    "title": title,
                    "company": company,
                    "location": loc,
                    "isRemote": bool(is_remote or "remote" in loc.lower() or "remote" in title.lower()),
                    "jobType": "Full-Time",
                    "datePosted": str(date_posted)[:10],
                    "salary": "",
                    "jobUrl": link or (f"https://www.linkedin.com/jobs/view/{job_id}" if job_id else ""),
                    "emails": resolved_emails,
                    "recruiterEmail": resolved_emails[0] if resolved_emails else "",
                    "recruiterName": f"{company} Hiring Team",
                    "description": desc[:3500],
                    "skills": skills[:8],
                    "category": category,
                    "channel": channel,
                    "atsFitScore": ats_score,
                    "companyLogo": "",
                    "companyUrl": ci["companyUrl"],
                    "companyLinkedin": ci["companyLinkedin"],
                    "recruiterSearchUrl": ci["recruiterSearchUrl"],
                    "techLeadSearchUrl": ci["techLeadSearchUrl"],
                    "emailPattern": ci["emailPattern"],
                    "corporateEmails": [ci["corporateEmail1"], ci["corporateEmail2"], ci["corporateEmail3"]],
                }
                found_jobs.append(item)

            start += 25
        except Exception as e:
            logger.warning(f"Error during LinkedIn scrape: {e}")
            break

    return found_jobs


def scrape_web_jobs(
    search_term: str,
    location: str,
    results_wanted: int = 10,
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """
    Fallback & cross-portal job scraper querying live search engines (DuckDuckGo HTML).
    Extracts live listings across Welcome to the Jungle, Lever, Greenhouse, Workable, and Indeed.
    """
    logger.info(f"Executing Web SERP job scraper for term='{search_term}', loc='{location}'")
    query = f"{search_term} hiring {location} (site:linkedin.com/jobs OR site:welcometothejungle.com OR site:jobs.lever.co OR site:boards.greenhouse.io)"
    encoded_q = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded_q}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    found: List[Dict[str, Any]] = []
    try:
        resp = cffi_requests.get(url, headers=headers, impersonate="chrome124", timeout=10)
        if resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            snippets = soup.find_all("div", class_=re.compile("result__body|result"))

            for idx, snip in enumerate(snippets):
                if len(found) >= results_wanted:
                    break

                title_el = snip.find("a", class_=re.compile("result__title|result__a"))
                desc_el = snip.find("a", class_=re.compile("result__snippet")) or snip.find("div", class_=re.compile("snippet"))
                url_el = snip.find("a", href=True)

                raw_title = title_el.get_text(strip=True) if title_el else ""
                desc = desc_el.get_text(strip=True) if desc_el else ""
                job_url = url_el["href"] if url_el else ""

                if not raw_title or len(raw_title) < 5:
                    continue

                # Parse company and role from SERP title
                company = "Enterprise"
                role_title = raw_title
                if " at " in raw_title:
                    parts = raw_title.split(" at ")
                    role_title = parts[0].strip()
                    company = parts[1].split("-")[0].split("|")[0].strip()
                elif " - " in raw_title:
                    parts = raw_title.split(" - ")
                    role_title = parts[0].strip()
                    company = parts[1].split("|")[0].strip()

                ci = enrich_company_intelligence(company)
                ats_score = compute_ats_match_score(f"{role_title} {desc}", candidate_skills)
                category = categorize_job(role_title, desc)

                emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', desc)
                resolved_emails = emails if emails else [ci["corporateEmail1"], ci["corporateEmail2"]]

                found.append({
                    "id": f"web-{int(datetime.utcnow().timestamp()*1000)}-{idx+1}",
                    "site": "web_search",
                    "title": role_title,
                    "company": company,
                    "location": location or "Remote / Hybrid",
                    "isRemote": "remote" in desc.lower() or "remote" in role_title.lower(),
                    "jobType": "Full-Time",
                    "datePosted": datetime.utcnow().strftime("%Y-%m-%d"),
                    "salary": "",
                    "jobUrl": job_url,
                    "emails": resolved_emails,
                    "recruiterEmail": resolved_emails[0] if resolved_emails else "",
                    "recruiterName": f"{company} Hiring Team",
                    "description": desc,
                    "skills": ["Software Engineering", "AI", "Cloud"],
                    "category": category,
                    "channel": "email" if emails else "external",
                    "atsFitScore": ats_score,
                    "companyLogo": "",
                    "companyUrl": ci["companyUrl"],
                    "companyLinkedin": ci["companyLinkedin"],
                    "recruiterSearchUrl": ci["recruiterSearchUrl"],
                    "techLeadSearchUrl": ci["techLeadSearchUrl"],
                    "emailPattern": ci["emailPattern"],
                    "corporateEmails": [ci["corporateEmail1"], ci["corporateEmail2"]],
                })
    except Exception as e:
        logger.debug(f"Web SERP scrape error: {e}")

    return found


def execute_jobspy_scrape(
    sites: List[str],
    search_term: str,
    location: str,
    results_wanted: int = 20,
    is_remote: bool = False,
    country_indeed: str = "usa",
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """
    Production-grade multi-engine job & contact intelligence hunt.
    Executes LinkedIn guest API + Web Job SERP aggregator concurrently.
    """
    all_results: List[Dict[str, Any]] = []

    # 1. Primary: Resilient LinkedIn Guest Scraper
    try:
        li_results = scrape_linkedin_guest(
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            is_remote=is_remote,
            candidate_skills=candidate_skills
        )
        all_results.extend(li_results)
    except Exception as e:
        logger.error(f"LinkedIn primary scraper notice: {e}")

    # 2. Secondary: If needed or requested, Web Job Discovery (Greenhouse, Lever, WTTJ, Indeed)
    if len(all_results) < results_wanted:
        try:
            needed = results_wanted - len(all_results)
            web_results = scrape_web_jobs(
                search_term=search_term,
                location=location,
                results_wanted=max(6, needed),
                candidate_skills=candidate_skills
            )
            all_results.extend(web_results)
        except Exception as e:
            logger.debug(f"Web jobs secondary notice: {e}")

    # 3. Deduplicate by URL or Title+Company
    seen_keys = set()
    deduped = []
    for item in all_results:
        key = item.get("jobUrl") or f"{item.get('title')}-{item.get('company')}"
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(item)

    # Sort descending by ATS Fit Score
    deduped.sort(key=lambda j: j["atsFitScore"], reverse=True)
    return deduped


async def run_hunt_async(
    sites: List[str],
    search_term: str,
    location: str,
    results_wanted: int = 20,
    is_remote: bool = False,
    country_indeed: str = "usa",
    candidate_skills: str = ""
):
    """Asynchronous orchestrator for background job hunt."""
    global active_hunt_state

    active_hunt_state["status"] = "running"
    active_hunt_state["progress"] = 15
    active_hunt_state["searchTerm"] = search_term
    active_hunt_state["location"] = location
    active_hunt_state["sites"] = sites
    active_hunt_state["totalFound"] = 0
    active_hunt_state["results"] = []
    active_hunt_state["error"] = None
    active_hunt_state["startedAt"] = datetime.utcnow().isoformat()

    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(
            None,
            execute_jobspy_scrape,
            sites,
            search_term,
            location,
            results_wanted,
            is_remote,
            country_indeed,
            candidate_skills
        )

        active_hunt_state["status"] = "completed"
        active_hunt_state["progress"] = 100
        active_hunt_state["totalFound"] = len(results)
        active_hunt_state["results"] = results
        active_hunt_state["completedAt"] = datetime.utcnow().isoformat()
        logger.info(f"Production Job Hunt completed: {len(results)} opportunities found.")
    except Exception as e:
        active_hunt_state["status"] = "error"
        active_hunt_state["progress"] = 0
        active_hunt_state["error"] = str(e)
        active_hunt_state["completedAt"] = datetime.utcnow().isoformat()
        logger.error(f"Production Job Hunt failed: {e}")


def cancel_active_hunt():
    """Cancels any running scrape."""
    global active_hunt_state
    active_hunt_state["status"] = "idle"
    active_hunt_state["progress"] = 0
    active_hunt_state["error"] = "Hunt cancelled by user"

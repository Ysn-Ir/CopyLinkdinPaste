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


def scrape_linkedin_guest(
    search_term: str,
    location: str,
    results_wanted: int = 15,
    is_remote: bool = False,
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """
    Scrapes LinkedIn jobs via the public guest search & detail API.
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

    while len(found_jobs) < results_wanted and start <= 50:
        search_url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={encoded_kw}&location={encoded_loc}&start={start}"
        try:
            resp = cffi_requests.get(search_url, headers=headers, impersonate="chrome124", timeout=12)
            if resp.status_code != 200 or not resp.text:
                logger.debug(f"LinkedIn guest search returned status {resp.status_code}")
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

                # Fetch full job description for top results
                desc = ""
                if job_id and len(found_jobs) < 12:
                    try:
                        d_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
                        d_resp = cffi_requests.get(d_url, headers=headers, impersonate="chrome124", timeout=10)
                        if d_resp.status_code == 200:
                            d_soup = BeautifulSoup(d_resp.text, "html.parser")
                            d_el = d_soup.find("div", class_=re.compile("show-more-less-html__markup")) or d_soup.find("section", class_=re.compile("description"))
                            if d_el:
                                desc = d_el.get_text(separator="\n", strip=True)
                    except Exception as e:
                        logger.debug(f"Notice fetching LinkedIn job {job_id} detail: {e}")

                if not desc:
                    desc = f"Role: {title} at {company} in {loc}. Application through LinkedIn guest pipeline."

                emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', desc)
                ats_score = compute_ats_match_score(f"{title} {desc}", candidate_skills)
                category = categorize_job(title, desc)
                channel = "email" if emails else "external"

                # Detect key technical skills from text
                skills = []
                for kw in ["Python", "FastAPI", "React", "Docker", "PyTorch", "NLP", "SQL", "AWS", "TypeScript", "Node.js", "Kubernetes", "Linux"]:
                    if kw.lower() in desc.lower():
                        skills.append(kw)
                if not skills:
                    skills = ["Software Engineering", "Problem Solving"]

                item = {
                    "id": f"guest-linkedin-{job_id or int(datetime.utcnow().timestamp()*1000)}-{len(found_jobs)+1}",
                    "site": "linkedin",
                    "title": title,
                    "company": company,
                    "location": loc,
                    "isRemote": bool(is_remote or "remote" in loc.lower() or "remote" in title.lower()),
                    "jobType": "Full-Time",
                    "datePosted": str(date_posted)[:10],
                    "salary": "",
                    "jobUrl": link or (f"https://www.linkedin.com/jobs/view/{job_id}" if job_id else ""),
                    "emails": emails,
                    "recruiterEmail": emails[0] if emails else "",
                    "description": desc[:3000],
                    "skills": skills[:8],
                    "category": category,
                    "channel": channel,
                    "atsFitScore": ats_score,
                    "companyLogo": "",
                    "companyUrl": f"https://www.linkedin.com/company/{company.lower().replace(' ', '-')}" if company else ""
                }
                found_jobs.append(item)

            start += 25
        except Exception as e:
            logger.warning(f"Error during LinkedIn guest scrape iteration: {e}")
            break

    logger.info(f"LinkedIn Guest API extracted {len(found_jobs)} jobs.")
    return found_jobs


def execute_jobspy_scrape(
    sites: List[str],
    search_term: str,
    location: str,
    results_wanted: int = 20,
    is_remote: bool = False,
    country_indeed: str = "usa",
    candidate_skills: str = ""
) -> List[Dict[str, Any]]:
    """Synchronous execution of multi-platform scrapers within a background worker."""
    all_results: List[Dict[str, Any]] = []

    valid_sites = [s.strip().lower() for s in sites if s.strip()]
    if not valid_sites:
        valid_sites = ["linkedin", "indeed"]

    # 1. First: If LinkedIn is requested, execute our resilient Guest API scraper (zero 429 proxies needed)
    if "linkedin" in valid_sites:
        try:
            li_results = scrape_linkedin_guest(
                search_term=search_term,
                location=location,
                results_wanted=results_wanted if len(valid_sites) == 1 else max(8, results_wanted // 2),
                is_remote=is_remote,
                candidate_skills=candidate_skills
            )
            all_results.extend(li_results)
        except Exception as e:
            logger.error(f"LinkedIn guest scraper notice: {e}")

    # 2. Second: For external sites (Indeed, Glassdoor, ZipRecruiter), run python-jobspy
    other_sites = [s for s in valid_sites if s in ["indeed", "glassdoor", "zip_recruiter", "ziprecruiter"]]
    if other_sites:
        from jobspy import scrape_jobs

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

        wanted_other = results_wanted if not all_results else max(5, results_wanted - len(all_results))

        try:
            logger.info(f"Scraping JobSpy sites: {other_sites}, wanted={wanted_other}, country={country}")
            df = scrape_jobs(
                site_name=other_sites,
                search_term=search_term,
                location=location,
                results_wanted=wanted_other,
                is_remote=is_remote,
                country_indeed=country,
            )
            if df is not None and len(df) > 0:
                records = df.to_dict(orient="records")
                for r in records:
                    raw_title = str(r.get("title") or "Engineering Role").strip()
                    raw_company = str(r.get("company") or "Company").strip()
                    raw_desc = str(r.get("description") or "").strip()
                    raw_loc = str(r.get("location") or location or "Remote").strip()
                    raw_site = str(r.get("site") or "jobspy").lower()
                    job_url = str(r.get("job_url_direct") or r.get("job_url") or "").strip()

                    min_amt = r.get("min_amount")
                    max_amt = r.get("max_amount")
                    curr = str(r.get("currency") or "USD")
                    interval = str(r.get("interval") or "yearly")
                    salary_str = ""
                    if min_amt and max_amt:
                        salary_str = f"{curr} {int(min_amt):,} - {int(max_amt):,} / {interval}"
                    elif min_amt:
                        salary_str = f"{curr} {int(min_amt):,} / {interval}"

                    emails_field = r.get("emails")
                    emails = []
                    if isinstance(emails_field, list):
                        emails = [str(e) for e in emails_field if e]
                    elif isinstance(emails_field, str) and emails_field:
                        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', emails_field)
                    if not emails and raw_desc:
                        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_desc)

                    ats_score = compute_ats_match_score(f"{raw_title} {raw_desc}", candidate_skills)
                    category = categorize_job(raw_title, raw_desc)
                    channel = "email" if emails else ("external" if job_url else "direct_contact")

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

                    item = {
                        "id": f"jobspy-{raw_site}-{int(datetime.utcnow().timestamp()*1000)}-{len(all_results)+1}",
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
                    all_results.append(item)
        except Exception as e:
            logger.warning(f"JobSpy secondary scrape notice: {e}")

    # Deduplicate and sort descending by ATS fit score
    seen_urls = set()
    deduped = []
    for j in all_results:
        key = j.get("jobUrl") or f"{j.get('title')}-{j.get('company')}"
        if key not in seen_urls:
            seen_urls.add(key)
            deduped.append(j)

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



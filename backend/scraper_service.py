"""
RADAR Enterprise Web Scraping & Content Extraction Engine
Powered by trafilatura (GitHub: adbar/trafilatura) and curl_cffi TLS impersonation.
Replaces legacy BeautifulSoup DOM hunting with linguistic and structural content extraction.
"""

import re
import urllib.parse
import logging
from urllib.parse import urlparse
from typing import Dict, Any, Optional

import httpx
from curl_cffi.requests import AsyncSession
import trafilatura

logger = logging.getLogger("radar.scraper")

STEALTH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def extract_youtube_id(url: str) -> str:
    """Extract 11-char YouTube video ID from watch URLs, shorts, or youtu.be links."""
    patterns = [
        r'(?:shorts\/)([0-9A-Za-z_-]{11})',
        r'(?:v=|\/v\/|embed\/)([0-9A-Za-z_-]{11})',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return ""


async def fetch_youtube_metadata_and_transcript(url: str, video_id: str) -> Dict[str, Any]:
    """Fetches YouTube title, creator, thumbnail, and captions/transcript via oEmbed and official API."""
    info = {
        "title": "",
        "author": "",
        "image": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "description": "",
        "transcript": "",
    }
    # 1. Fetch oEmbed metadata
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                info["title"] = data.get("title", "")
                info["author"] = data.get("author_name", "")
                if data.get("thumbnail_url"):
                    info["image"] = data["thumbnail_url"]
    except Exception as e:
        logger.debug(f"YouTube oEmbed notice: {e}")

    # 2. Fetch transcript via youtube_transcript_api
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcripts = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'fr', 'es', 'de'])
        full_text = " ".join([t.get("text", "") for t in transcripts if t.get("text")])
        info["transcript"] = full_text[:5000]  # Cap to first 5000 chars of spoken content
    except Exception as e:
        logger.debug(f"YouTube transcript notice: {e}")

    return info


async def fetch_tiktok_metadata(url: str) -> Dict[str, Any]:
    """Fetches TikTok creator, caption, and thumbnail using oEmbed API and OpenGraph fallback."""
    author_match = re.search(r'tiktok\.com/@([a-zA-Z0-9_.-]+)', url)
    author_guess = f"@{author_match.group(1)}" if author_match else "TikTok Creator"

    info = {
        "title": "",
        "author": author_guess,
        "description": "",
        "image": None,
    }
    target = url
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            if "vm.tiktok.com" in url or "vt.tiktok.com" in url:
                try:
                    r = await client.get(url, headers=STEALTH_HEADERS)
                    target = str(r.url)
                    m2 = re.search(r'tiktok\.com/@([a-zA-Z0-9_.-]+)', target)
                    if m2:
                        info["author"] = f"@{m2.group(1)}"
                except Exception:
                    pass

            # 1. Try TikTok oEmbed
            try:
                encoded = urllib.parse.quote(target, safe='')
                oembed_url = f"https://www.tiktok.com/oembed?url={encoded}"
                resp = await client.get(oembed_url, headers=STEALTH_HEADERS)
                if resp.status_code == 200:
                    data = resp.json()
                    info["title"] = data.get("title", "")
                    info["author"] = data.get("author_name") or info["author"]
                    info["image"] = data.get("thumbnail_url")
                    info["description"] = f"Educational TikTok by {info['author']}: {info['title']}"
            except Exception as e:
                logger.debug(f"TikTok oEmbed failed: {e}")

            # 2. OpenGraph fallback
            if not info["title"] or not info["image"]:
                try:
                    fb_headers = {
                        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                        "Accept-Language": "en-US,en;q=0.9",
                    }
                    page_resp = await client.get(target, headers=fb_headers)
                    if page_resp.status_code == 200:
                        html = page_resp.text
                        meta = trafilatura.extract_metadata(html)
                        if meta:
                            info["title"] = meta.title or info["title"]
                            info["description"] = meta.description or info["description"]
                            info["image"] = meta.image or info["image"]
                except Exception as e:
                    logger.debug(f"TikTok fallback failed: {e}")

        if not info["title"]:
            info["title"] = f"Educational TikTok by {info['author']}"
        info["description"] = info["description"] or f"TikTok video by {info['author']}: {info['title']}"
    except Exception as e:
        logger.warning(f"TikTok fetch error: {e}")
    return info


async def fetch_instagram_metadata(url: str) -> Dict[str, Any]:
    """Fetches Instagram Reel creator, description, and preview metadata via bot OpenGraph scraping."""
    user_match = re.search(r'instagram\.com/([a-zA-Z0-9_.]+)/(?:reel|p)/', url)
    reel_match = re.search(r'/(?:reel|p)/([A-Za-z0-9_-]+)', url)
    author = user_match.group(1) if user_match else "Instagram Creator"
    code = reel_match.group(1) if reel_match else "Reel"
    author_tag = f"@{author}" if not author.startswith("@") else author

    info = {
        "title": "",
        "author": author_tag,
        "description": "",
        "image": None,
    }

    try:
        headers = {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=8.0, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                html = resp.text
                meta = trafilatura.extract_metadata(html)
                if meta:
                    info["title"] = meta.title or ""
                    info["description"] = meta.description or ""
                    info["image"] = meta.image or None

                # Search for caption in OpenGraph description
                m_caption = re.search(r':\s*["\'](.+?)["\']\s*$', info["description"], re.DOTALL)
                if m_caption:
                    info["title"] = m_caption.group(1).strip()[:120]
    except Exception as e:
        logger.debug(f"Instagram OpenGraph fetch notice: {e}")

    if not info["title"]:
        info["title"] = f"Educational Reel by {info['author']}"
    if not info["description"]:
        info["description"] = f"Instagram Reel saved from {info['author']} ({code})"

    return info


async def fetch_html_stealth(target_url: str) -> Optional[str]:
    """
    Fetches HTML content with TLS fingerprint impersonation (curl_cffi chrome124)
    to bypass Cloudflare and bot shields, with graceful httpx fallback.
    """
    # 1. Primary: curl_cffi with chrome124 TLS fingerprint
    try:
        async with AsyncSession(impersonate="chrome124", timeout=12) as session:
            resp = await session.get(target_url, headers=STEALTH_HEADERS)
            if resp.status_code == 200 and resp.text:
                return resp.text
            elif resp.status_code < 400:
                return resp.text
            logger.debug(f"curl_cffi returned status {resp.status_code} on {target_url}")
    except Exception as e:
        logger.debug(f"curl_cffi fetch notice: {e}, falling back to httpx...")

    # 2. Secondary fallback: httpx with browser headers
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=STEALTH_HEADERS) as client:
            resp = await client.get(target_url)
            if resp.status_code < 400:
                return resp.text
    except Exception as e:
        logger.warning(f"httpx fallback also failed for {target_url}: {e}")

    return None


async def scrape_url_metadata(target_url: str) -> Dict[str, Any]:
    """
    Enterprise-grade web content scraper powered by trafilatura and curl_cffi.
    Extracts structural text, full job postings, articles, and video transcripts
    while automatically discarding web clutter, ads, navigation, and boilerplate.
    """
    clean_url = target_url.strip()
    parsed = urlparse(clean_url)
    domain = parsed.netloc.replace("www.", "").lower()

    # 1. YouTube & YouTube Shorts
    yt_id = extract_youtube_id(clean_url)
    if yt_id:
        yt_data = await fetch_youtube_metadata_and_transcript(clean_url, yt_id)
        title = yt_data["title"] or f"YouTube Video ({yt_id})"
        author = yt_data["author"] or "YouTube Creator"
        transcript = yt_data["transcript"]

        body_summary = f"Video by {author}. Title: {title}."
        if transcript:
            body_summary += f"\n\nVideo Transcript:\n{transcript}"

        return {
            "url": clean_url,
            "title": title,
            "description": f"Short/Video by {author}",
            "text": body_summary[:5000],
            "bodyText": body_summary[:5000],
            "image": yt_data["image"],
            "siteName": "YouTube",
            "author": author,
            "isVideo": True,
            "videoPlatform": "youtube",
            "transcript": transcript,
            "isEducationalVideo": True,
        }

    # 2. TikTok
    if "tiktok.com" in domain:
        tt_data = await fetch_tiktok_metadata(clean_url)
        title = tt_data["title"] or f"TikTok Video by {tt_data['author']}"
        author = tt_data["author"] or "TikTok Creator"
        desc = tt_data["description"] or title
        body = f"Platform: TikTok\nCreator: {author}\nCaption/Transcript: {title}"
        return {
            "url": clean_url,
            "title": title,
            "description": desc,
            "text": body,
            "bodyText": body,
            "image": tt_data["image"],
            "siteName": "TikTok",
            "author": author,
            "isVideo": True,
            "videoPlatform": "tiktok",
            "transcript": title,
            "isEducationalVideo": True,
        }

    # 3. Instagram Reels
    if "instagram.com" in domain:
        ig_data = await fetch_instagram_metadata(clean_url)
        title = ig_data["title"] or f"Instagram Reel by {ig_data['author']}"
        author = ig_data["author"] or "Instagram Creator"
        desc = ig_data["description"] or title
        body = f"Platform: Instagram\nCreator: {author}\nCaption: {title}"
        return {
            "url": clean_url,
            "title": title,
            "description": desc,
            "text": body,
            "bodyText": body,
            "image": ig_data["image"],
            "siteName": "Instagram",
            "author": author,
            "isVideo": True,
            "videoPlatform": "instagram",
            "transcript": title,
            "isEducationalVideo": True,
        }

    is_short_or_reel = (
        "shorts" in clean_url
        or "tiktok.com" in domain
        or "instagram.com/reel" in clean_url
        or "twitter.com" in domain
        or "x.com" in domain
    )

    try:
        html = await fetch_html_stealth(clean_url)
        if not html:
            return {
                "url": clean_url,
                "title": f"Link on {domain}",
                "description": "",
                "text": "",
                "bodyText": "",
                "image": None,
                "siteName": domain,
                "error": "Failed to retrieve page content",
                "isVideo": is_short_or_reel,
            }

        # Use trafilatura for structural extraction (best in class on GitHub)
        extracted_text = trafilatura.extract(
            html,
            include_links=True,
            include_comments=False,
            include_tables=True,
            output_format="txt",
            with_metadata=False,
        ) or ""

        # Extract structured metadata via trafilatura
        meta = trafilatura.extract_metadata(html)

        title = ""
        description = ""
        author = ""
        image = None
        site_name = domain

        if meta:
            title = meta.title or ""
            description = meta.description or ""
            author = meta.author or ""
            image = meta.image or None
            site_name = meta.sitename or domain

        # Fallback regex search for og:image if trafilatura missed it
        if not image:
            og_img_match = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html, re.I)
            if not og_img_match:
                og_img_match = re.search(r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']', html, re.I)
            if og_img_match:
                image = og_img_match.group(1).strip()

        # Fallback for title if empty
        if not title:
            title_tag = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.DOTALL)
            if title_tag:
                title = re.sub(r'\s+', ' ', title_tag.group(1)).strip()

        # Fallback for description if empty
        if not description:
            desc_tag = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', html, re.I)
            if desc_tag:
                description = desc_tag.group(1).strip()

        # Fallback text if trafilatura extracted minimal text
        if not extracted_text:
            # Strip tags safely
            clean_text = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL | re.I)
            clean_text = re.sub(r'<style.*?</style>', '', clean_text, flags=re.DOTALL | re.I)
            clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            extracted_text = clean_text[:3500]

        # Build clean combined text representation
        header_context = f"{title}\n{description}".strip()
        combined_text = f"{header_context}\n\n{extracted_text}".strip()

        is_video = is_short_or_reel or "tiktok" in domain or "instagram.com/reel" in clean_url or "youtube" in domain

        return {
            "url": clean_url,
            "title": title or f"Page on {domain}",
            "description": description or "",
            "text": combined_text[:4500],
            "bodyText": combined_text[:4500],
            "image": image,
            "siteName": site_name,
            "author": author,
            "isVideo": is_video,
            "videoPlatform": "tiktok" if "tiktok" in domain else ("instagram" if "instagram" in domain else domain),
            "isEducationalVideo": is_video,
        }

    except Exception as e:
        logger.warning(f"Error scraping {clean_url}: {e}")
        return {
            "url": clean_url,
            "title": f"Link on {domain}",
            "description": "",
            "text": "",
            "bodyText": "",
            "image": None,
            "siteName": domain,
            "error": str(e),
            "isVideo": is_short_or_reel,
        }

import re
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def extract_youtube_id(url: str) -> str:
    """Extract 11-char YouTube video ID from watch URLs, shorts, or youtu.be links"""
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

async def fetch_youtube_metadata_and_transcript(url: str, video_id: str):
    """Fetches YouTube title, creator, thumbnail, and captions/transcript"""
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
    except Exception:
        pass

    # 2. Fetch transcript via youtube_transcript_api
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcripts = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'fr', 'es', 'de'])
        full_text = " ".join([t.get("text", "") for t in transcripts if t.get("text")])
        info["transcript"] = full_text[:5000] # Cap to first 5000 chars of spoken content
    except Exception:
        pass

    return info

async def scrape_url_metadata(target_url: str):
    """
    Deep web scraper extracting OpenGraph, rich HTML body text,
    and video transcripts (YouTube Shorts, TikTok, Instagram Reels, job portals, blogs).
    """
    clean_url = target_url.strip()
    parsed = urlparse(clean_url)
    domain = parsed.netloc.replace("www.", "").lower()

    # Check for YouTube / YouTube Shorts
    yt_id = extract_youtube_id(clean_url)
    is_youtube = bool(yt_id)
    is_short_or_reel = "shorts" in clean_url or "tiktok.com" in domain or "instagram.com/reel" in clean_url or "twitter.com" in domain or "x.com" in domain

    if is_youtube:
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
            "bodyText": body_summary[:5000],
            "image": yt_data["image"],
            "siteName": "YouTube",
            "author": author,
            "isVideo": True,
            "videoPlatform": "youtube",
            "transcript": transcript,
            "isEducationalVideo": True,
        }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(clean_url, headers=headers)
            if resp.status_code >= 400:
                return {
                    "url": clean_url,
                    "title": "",
                    "description": "",
                    "bodyText": "",
                    "image": None,
                    "siteName": domain,
                    "error": f"HTTP {resp.status_code}",
                    "isVideo": is_short_or_reel,
                }

            html = resp.text
            soup = BeautifulSoup(html, "html.parser")

            def get_meta(prop_name):
                tag = soup.find("meta", property=prop_name) or soup.find("meta", attrs={"name": prop_name})
                return tag.get("content", "").strip() if tag and tag.get("content") else None

            title = (
                get_meta("og:title")
                or get_meta("twitter:title")
                or (soup.title.string.strip() if soup.title and soup.title.string else "")
            )
            description = (
                get_meta("og:description")
                or get_meta("twitter:description")
                or get_meta("description")
                or ""
            )
            image = (
                get_meta("og:image")
                or get_meta("twitter:image")
                or get_meta("image")
            )
            site_name = get_meta("og:site_name") or domain

            # Remove scripts, styles, navigation, footer, forms to isolate clean content
            for unwanted in soup(["script", "style", "noscript", "nav", "footer", "form", "svg", "button"]):
                unwanted.extract()

            # Extract main readable text
            main_container = soup.find("main") or soup.find("article") or soup.find("div", class_=re.compile(r"content|post|job|article|detail", re.I)) or soup.body
            
            body_paragraphs = []
            if main_container:
                for elem in main_container.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
                    txt = elem.get_text(separator=" ", strip=True)
                    if txt and len(txt) > 20:
                        body_paragraphs.append(txt)

            body_text = "\n".join(body_paragraphs[:30]) # Take top 30 coherent paragraphs
            if not body_text and main_container:
                body_text = main_container.get_text(separator=" ", strip=True)[:3500]

            # Build rich combined text representation
            combined_text = f"{title}\n{description}\n\n{body_text}".strip()

            is_video = is_short_or_reel or "tiktok" in domain or "instagram.com/reel" in clean_url or "youtube" in domain

            return {
                "url": clean_url,
                "title": title or f"Page on {domain}",
                "description": description or "",
                "bodyText": combined_text[:4500],
                "image": image,
                "siteName": site_name,
                "author": get_meta("author") or "",
                "isVideo": is_video,
                "videoPlatform": "tiktok" if "tiktok" in domain else ("instagram" if "instagram" in domain else domain),
                "isEducationalVideo": is_video,
            }
    except Exception as e:
        return {
            "url": clean_url,
            "title": f"Link on {domain}",
            "description": "",
            "bodyText": "",
            "image": None,
            "siteName": domain,
            "error": str(e),
            "isVideo": is_short_or_reel,
        }

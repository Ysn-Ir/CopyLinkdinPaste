import re
import urllib.parse
import logging
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

logger = logging.getLogger("pfe_hunter.scraper")

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

async def fetch_tiktok_metadata(url: str):
    """Fetches TikTok creator, caption, and thumbnail using oEmbed API and OpenGraph fallback"""
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
                    r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
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
                resp = await client.get(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    info["title"] = data.get("title", "")
                    info["author"] = data.get("author_name") or info["author"]
                    info["image"] = data.get("thumbnail_url")
                    info["description"] = f"Educational TikTok by {info['author']}: {info['title']}"
            except Exception as e:
                logger.warning(f"TikTok oEmbed failed: {e}")

            # 2. Fallback to OpenGraph scraping if title is still empty
            if not info["title"] or not info["image"]:
                try:
                    headers = {
                        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                        "Accept-Language": "en-US,en;q=0.9",
                    }
                    page_resp = await client.get(target, headers=headers)
                    if page_resp.status_code == 200:
                        soup = BeautifulSoup(page_resp.text, "html.parser")
                        og_title = soup.find("meta", property="og:title")
                        og_desc = soup.find("meta", property="og:description")
                        og_img = soup.find("meta", property="og:image")

                        if og_title and og_title.get("content"):
                            info["title"] = og_title["content"].strip()
                        if og_desc and og_desc.get("content") and not info["title"]:
                            info["title"] = og_desc["content"].strip()
                        if og_img and og_img.get("content") and not info["image"]:
                            info["image"] = og_img["content"].strip()
                except Exception as e:
                    logger.warning(f"TikTok OpenGraph fallback failed: {e}")

        if not info["title"]:
            info["title"] = f"Educational TikTok by {info['author']}"
        info["description"] = info["description"] or f"TikTok video by {info['author']}: {info['title']}"
    except Exception as e:
        logger.warning(f"TikTok fetch error: {e}")
    return info

async def fetch_instagram_metadata(url: str):
    """Fetches Instagram Reel creator, description, and preview metadata via bot OpenGraph scraping"""
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
                soup = BeautifulSoup(resp.text, "html.parser")
                og_title = soup.find("meta", property="og:title")
                og_desc = soup.find("meta", property="og:description")
                og_img = soup.find("meta", property="og:image")

                if og_img and og_img.get("content"):
                    info["image"] = og_img["content"].strip()

                desc_content = (og_desc.get("content") if og_desc else "") or ""
                # Instagram description often has: "... - Author on Date: \"Real caption here...\""
                caption_match = re.search(r':\s*["\'](.+?)["\']\s*$', desc_content, re.DOTALL)
                caption = caption_match.group(1).strip() if caption_match else desc_content.strip()

                title_content = (og_title.get("content") if og_title else "") or ""
                
                # Check for author name in title: "Author on Instagram: ..."
                if " on Instagram" in title_content:
                    author_part = title_content.split(" on Instagram")[0].strip()
                    if author_part:
                        info["author"] = f"@{author_part}" if not author_part.startswith("@") else author_part

                if caption and len(caption) > 5:
                    info["title"] = caption[:120]
                    info["description"] = caption
                elif title_content:
                    info["title"] = title_content[:120]
                    info["description"] = title_content
    except Exception as e:
        logger.warning(f"Instagram OpenGraph fetch error: {e}")

    if not info["title"]:
        info["title"] = f"Educational Reel by {info['author']}"
    if not info["description"]:
        info["description"] = f"Instagram Reel saved from {info['author']} ({code})"

    return info

async def scrape_url_metadata(target_url: str):
    """
    Deep web scraper extracting OpenGraph, rich HTML body text,
    and video transcripts (YouTube Shorts, TikTok, Instagram Reels, job portals, blogs).
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
            "bodyText": body,
            "image": ig_data["image"],
            "siteName": "Instagram",
            "author": author,
            "isVideo": True,
            "videoPlatform": "instagram",
            "transcript": title,
            "isEducationalVideo": True,
        }

    is_short_or_reel = "shorts" in clean_url or "tiktok.com" in domain or "instagram.com/reel" in clean_url or "twitter.com" in domain or "x.com" in domain

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

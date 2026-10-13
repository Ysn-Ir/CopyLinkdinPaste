import re
import httpx
from bs4 import BeautifulSoup

async def scrape_url_metadata(target_url: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(target_url, headers=headers)
            if resp.status_code >= 400:
                return {
                    "url": target_url,
                    "title": "",
                    "description": "",
                    "image": None,
                    "siteName": "",
                    "error": f"HTTP {resp.status_code}"
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
            site_name = get_meta("og:site_name") or ""

            return {
                "url": target_url,
                "title": title or "",
                "description": description or "",
                "image": image,
                "siteName": site_name or "",
            }
    except Exception as e:
        return {
            "url": target_url,
            "title": "",
            "description": "",
            "image": None,
            "siteName": "",
            "error": str(e)
        }

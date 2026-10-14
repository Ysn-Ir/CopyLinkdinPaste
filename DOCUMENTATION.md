# 🦅 OmniHunt • Application Technical Documentation & Architecture Reference

> **OmniHunt (PFE Hunter Career Command Center)** is an executive-grade, multi-platform intelligence suite designed for capturing, analyzing, categorizing, and executing career opportunities and technical knowledge from web and mobile sources.

---

## 📑 Table of Contents

1. [Executive Overview & Product Vision](#1-executive-overview--product-vision)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Core Subsystems Deep-Dive](#3-core-subsystems-deep-dive)
   - [Universal Clip Vault](#universal-clip-vault)
   - [Multi-Link Decomposition Engine](#multi-link-decomposition-engine)
   - [Web & Social Scraping Engine (TikTok, Instagram, LinkedIn, Web)](#web--social-scraping-engine)
   - [Mobile Intelligent Capture Suite (1-Tap OCR, MediaStore Watcher)](#mobile-intelligent-capture-suite)
   - [Career Pipeline & Outreach Command Center](#career-pipeline--outreach-command-center)
   - [Autonomous Agent Console](#autonomous-agent-console)
4. [Database Architecture & Data Models](#4-database-architecture--data-models)
5. [Complete REST API Specification](#5-complete-rest-api-specification)
6. [Mobile App Architecture (React Native & Native Android)](#6-mobile-app-architecture)
7. [Design System & Styling Architecture](#7-design-system--styling-architecture)
8. [Setup, Deployment & Operation Guide](#8-setup-deployment--operation-guide)
9. [Troubleshooting & Implementation Notes](#9-troubleshooting--implementation-notes)

---

## 1. Executive Overview & Product Vision

OmniHunt bridges the gap between chaotic real-world browsing (on phones and PCs) and structured career execution. Professionals, engineers, and researchers encounter valuable content across multiple fragmented apps: LinkedIn posts with multiple job links, TikTok/Instagram technical reels, GitHub repos, WhatsApp group forwards, recruiter emails, and phone screenshots.

### Key Capabilities
- **Universal Capture**: Seamless ingest from Android clipboard, native screenshots, browser URLs, or messy bulk text dumps.
- **Atomic Multi-Link Decomposition**: Automatically separates posts containing multiple job links or tools into discrete, independently analyzed clips while maintaining parent-post traceability.
- **Deep Groq Semantic AI**: Classifies content with Llama 3.3 70B & Vision 90B, generating executive summaries, key takeaways, skills extraction, tailored cover letters, and outreach messaging.
- **Specialized Social Scrapers**: Extracts full captions, author handles, poster thumbnails, and educational takeaways from TikTok and Instagram links.
- **Pipeline Execution**: Full Kanban application tracker, 1-tap WhatsApp direct messaging, customized email drafting, and CV matching.

---

## 2. High-Level System Architecture

OmniHunt operates on a **tri-tier distributed architecture**:

```mermaid
graph TD
    subgraph Mobile Device (Android / Expo)
        MS[Native Screenshot Watcher] -->|MediaStore / Albums| CS[Capture Screen]
        CB[Native Clipboard Watcher] -->|System Clipboard| CS
        1Tap[1-Tap Instant OCR Scan] --> CS
        CS -->|HTTP / JSON| MAPI[Mobile API Client]
        CV_M[Mobile Clip Vault Screen] <--> MAPI
        OD_M[Mobile Offer Details & WhatsApp] <--> MAPI
    end

    subgraph FastAPI Backend (Python 3.10+)
        MAPI -->|REST API| API_ROUTER[FastAPI Endpoints]
        API_ROUTER --> SCRAPER[Scraper Service]
        API_ROUTER --> AI[AI Engine - Groq Llama 3.3 / Vision]
        API_ROUTER --> ORM[SQLAlchemy ORM]
        
        SCRAPER -->|oEmbed & Bot Emulation| SOCIAL[TikTok / Instagram / Web]
        ORM --> DB[(SQLite Database / pfe_hunter.db)]
    end

    subgraph Web Command Center (React 19 + Vite)
        WEB_VAULT[Clip Vault View & Inspector Modal] <--> API_ROUTER
        WEB_BULK[Bulk Link & Text Cleaner] <--> API_ROUTER
        WEB_PIPE[Pipeline / Kanban View] <--> API_ROUTER
        WEB_AGENT[Autonomous Agent Console] <--> API_ROUTER
        WEB_SETTINGS[Settings & Categories Manager] <--> API_ROUTER
    end
```

### Components
1. **Web Command Center (`src/`)**: Built on React 19, Vite, and Lucide Icons. Uses pure Obsidian Executive styling tokens (high-contrast dark mode, zero external CSS framework bloat).
2. **FastAPI Backend (`backend/`)**: Python 3.10+ asynchronous backend providing REST endpoints, scraping engines, Groq Llama/Vision orchestration, and SQLite persistence via SQLAlchemy.
3. **Mobile Companion (`mobile/`)**: Native Android / Expo 52 client featuring background MediaStore screenshot monitoring, clipboard polling, 1-tap Groq Vision OCR capture, offline AsyncStorage caching, and zero-config local network pairing.

---

## 3. Core Subsystems Deep-Dive

### Universal Clip Vault
The Clip Vault (`ClipVaultModel`) is a centralized repository that ingests any snippet of text, code, tool, social video, contact, or job opportunity.

- **Content Categorization**:
  - `job_offer`: Internships, full-time engineering roles, contractor postings.
  - `educational_video`: TikTok / Instagram technical tutorials, coding walkthroughs, AI explainers.
  - `tool_or_repo`: GitHub repositories, developer utilities, libraries.
  - `tech_article`: Blog posts, whitepapers, documentation.
  - `code_snippet`: Formatted code blocks and scripts.
  - `contact`: Recruiter contacts, emails, phone numbers.
  - `note`: Scratchpads, personal notes, meeting takeaways.
- **Clip Inspector Modal**: Clicking any card in Web or Mobile reveals complete scraped text, creator profile, video breakdown, tags, parent-post context, and direct actions (`⚡ Deep AI Enrich`, `💼 Route to Career Offer`, `📋 Copy Text`, `🔗 Source Link`).

---

### Multi-Link Decomposition Engine
When users copy a LinkedIn post, WhatsApp broadcast, or newsletter containing multiple distinct links (e.g., 3 job offers or 4 AI tools):
1. **Context Slicing**: The backend uses regex to identify all URLs (`https?://...`).
2. **Sentence/Paragraph Isolation**: For each URL, the surrounding text is extracted to preserve local context (role requirements, company name, tool description).
3. **Independent Ingestion**: Each URL is scraped and ingested as an independent clip.
4. **Parent Post Traceability**: Every child clip receives `entities.parentPost`:
   ```json
   {
     "batchId": "batch-1791938667",
     "sourceSnippet": "Check out these 3 engineering openings...",
     "linkIndex": 1,
     "totalLinks": 3,
     "allUrls": ["url1", "url2", "url3"]
   }
   ```
5. **UI Badging**: Both Web and Mobile display a green badge `Part of Post (1/3)` linking back to the origin post.

---

### Web & Social Scraping Engine

Located in [`backend/scraper_service.py`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/backend/scraper_service.py):

#### 1. TikTok Scraper (`fetch_tiktok_metadata`)
- Uses TikTok's official oEmbed API endpoint:
  `https://www.tiktok.com/oembed?url={target_url}`
- Falls back to OpenGraph bot emulation with headers:
  `User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`
- Extracts author handle (`@creator`), thumbnail image URL, video title, and caption text.

#### 2. Instagram Scraper (`fetch_instagram_metadata`)
- Bypasses Instagram login walls by emulating crawler bots:
  `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... facebookexternalhit/1.1`
- Parses `og:description` after the colon delimiter to extract post captions without login prompts.
- Extracts author usernames, poster images, and video flags.

#### 3. General URL Scraper (`scrape_url_metadata`)
- Follows redirects up to 5 hops with a 12-second timeout.
- Extracts OpenGraph tags (`og:title`, `og:description`, `og:image`, `og:site_name`).
- Extracts Twitter Card metadata (`twitter:title`, `twitter:description`, `twitter:image`).
- Strips navigation, headers, footers, scripts, and styles to produce clean body text for LLM enrichment.

#### 4. Bulk Cleaner (`/api/clips/bulk-ingest`)
- Ingests raw messy text (bulleted lists, newline-separated links, mixed paragraphs).
- Identifies URLs or splits by double-newlines and bullet characters (`•`, `-`, `*`, `1.`, `2.`).
- Processes each item independently and returns batch statistics.

---

### Mobile Intelligent Capture Suite

Located in [`mobile/src/services/`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/mobile/src/services/):

#### 1. Android MediaStore Watcher (`screenshotWatcher.js`)
- Queries `expo-media-library` for the `Screenshots` album.
- **Timestamp Normalization**: Addresses an Android quirk where MediaStore returns seconds (`1.77e9`) while JavaScript evaluates `Date.now()` in milliseconds (`1.77e12`). Automatically scales seconds to milliseconds:
  ```javascript
  const assetTime = asset.creationTime < 1e11 ? asset.creationTime * 1000 : asset.creationTime;
  ```
- Compares against the last scanned timestamp to eliminate duplicate triggers.

#### 2. 1-Tap Instant Scan
- Prominently placed at the top of [`CaptureScreen.js`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/mobile/src/screens/CaptureScreen.js).
- Bypasses file pickers by querying the most recent image in the device gallery, converting to base64, and sending directly to the Groq Vision OCR endpoint.

#### 3. Groq Vision OCR (`/api/clips/ocr-ingest`)
- Uses `meta-llama/llama-3.2-90b-vision-instruct` to extract text verbatim from screenshots of WhatsApp chats, LinkedIn mobile feeds, and job flyers.
- Automatically routes the extracted text into the semantic classification pipeline.

#### 4. Clipboard Watcher (`clipboardWatcher.js`)
- Polls `expo-clipboard` every 2.5 seconds when the app is active.
- Detects new text or URLs, checks against local cache, and submits for categorization.

---

### Career Pipeline & Outreach Command Center

Located in [`backend/models.py`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/backend/models.py) and [`src/views/`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/src/views/):

- **Kanban Stages**:
  `saved` ➔ `ready` ➔ `applied` ➔ `interview` ➔ `offer` ➔ `rejected`
- **Smart Category Tagging**:
  Auto-categorizes into customizable domains (e.g., `dev-fullstack`, `ai-ml`, `data`, `devops`, `nlp`) with AI-generated reasoning.
- **Direct Outreach Generators**:
  - **WhatsApp Direct**: Pre-fills a conversational note with the recruiter's name and company context.
  - **Email Generator**: Generates professional subject lines and tailored body text.
  - **Custom Cover Letter**: Generates a high-impact cover letter referencing the applicant's profile and skills.
  - **LinkedIn Connection Note**: Generates a concise message (under 300 characters) for connection requests.

---

### Autonomous Agent Console

Located in [`src/views/AgentConsoleView.jsx`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/src/views/AgentConsoleView.jsx):

- Interactive agent powered by Groq Llama 3.3 70B (`openai/gpt-oss-120b`).
- Direct access to live database context: offers, clips, categories, user profile.
- Executes actions: categorizing offers, filtering high-value roles, drafting tailored outreach, and summarizing daily captures.

---

## 4. Database Architecture & Data Models

Database engine: **SQLite** via SQLAlchemy.
File path: `backend/pfe_hunter.db`

### Entity-Relationship Diagram

```mermaid
erDiagram
    CLIPS {
        string id PK
        text content
        string content_type
        string title
        text summary
        text source_url
        string source_domain
        string source_device
        text tags_json
        text entities_json
        boolean is_starred
        boolean converted_to_offer
        string copied_at
        string created_at
        string updated_at
    }

    OFFERS {
        string id PK
        string title
        string company
        string location
        string category
        text category_reasoning
        string channel
        string recruiter_email
        string recruiter_name
        text sharer_json
        text skills_json
        text description
        text source_url
        string image_url
        string status
        string attached_cv_tag
        string attached_cv_id
        float confidence
        boolean needs_user_review
        text top3_guesses_json
        text linked_in_note
        text whats_app_msg
        string custom_email_subject
        text custom_email_body
        text custom_cover_letter
        text notes
        string created_at
        string updated_at
    }

    CATEGORIES {
        string id PK
        string label
        string short_label
        string color
        string bg_color
        string border_color
        string default_cv_tag
        text keywords_json
        boolean is_custom
        string updated_at
    }

    AI_CONFIG {
        string id PK
        string api_key
        string model
        string provider
        float temperature
        text custom_system_prompt
        string updated_at
    }

    USER_PROFILE {
        string id PK
        string full_name
        string headline
        string email
        string phone
        string whatsapp
        string linkedin
        string github
        string portfolio
        string degree
        string city
        text skills
        text projects
        string tone_preference
        text custom_instructions
        text bio
        text custom_links_json
        string updated_at
    }

    CV_VAULT {
        string id PK
        string name
        string category
        string file_name
        string file_size
        boolean is_default
        string updated_at
    }
```

---

## 5. Complete REST API Specification

Base URL: `http://localhost:8003`

### Health & Network
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check with database connection test. |
| `GET` | `/api/db/stats` | Counts of offers, clips, categories, CVs, and AI config. |
| `GET` | `/api/network-info` | Local IPv4 addresses for mobile app pairing. |
| `GET` | `/api/mobile/pairing` | Pairing QR payload and local endpoint status. |

### Clip Vault Engine
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/clips` | Fetch all clips with optional category/type filters. |
| `POST` | `/api/clips/ingest` | Ingest single clip, URL, or multi-link post. Decomposes multi-link posts into discrete child clips. |
| `POST` | `/api/clips/bulk-ingest` | Ingest bulk messy text or URL lists, cleaning and creating discrete clips. |
| `POST` | `/api/clips/{clip_id}/enrich` | Deep semantic enrichment: re-scrapes target URL, extracts takeaways, creator handle, and tools. |
| `POST` | `/api/clips/ocr-ingest` | Process base64 screenshot via Groq Vision OCR into text. |
| `POST` | `/api/clips/{clip_id}/convert-to-offer`| Convert any clip into an active career job offer. |
| `PATCH` | `/api/clips/{clip_id}/star` | Toggle starred status of a clip. |
| `DELETE` | `/api/clips/{clip_id}` | Remove a clip from the vault. |
| `POST` | `/api/clips/sync-all` | Batch synchronization endpoint for mobile offline sync. |

### Career Offers & Pipeline
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/offers` | Fetch all career offers with sorting and category filters. |
| `POST` | `/api/offers` | Create a new offer manually or programmatically. |
| `POST` | `/api/offers/sync` | Sync multiple offers from mobile clients. |
| `PUT` | `/api/offers/{offer_id}` | Update offer details (status, notes, recruiter info). |
| `PATCH`| `/api/offers/{offer_id}/status` | Update pipeline stage (`saved` ➔ `ready` ➔ `applied` etc.). |
| `DELETE`| `/api/offers/{offer_id}` | Delete an offer. |
| `POST` | `/api/mobile/ingest` | Legacy mobile ingestion endpoint. |

### AI, Profile & Settings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/profile` | Retrieve the active candidate profile. |
| `POST` | `/api/profile` | Update candidate profile, CV links, and preferences. |
| `GET` | `/api/cvs` | List stored CV profiles in CV Vault. |
| `POST` | `/api/cvs` | Add or update a CV profile. |
| `GET` | `/api/categories` | Retrieve all career categories and keyword triggers. |
| `POST` | `/api/categories` | Create or update custom categories and badge colors. |
| `DELETE`| `/api/categories/{id}` | Delete a custom category. |
| `GET` | `/api/ai-config` | Get AI model settings (Groq API key, model, temperature). |
| `POST` | `/api/ai-config` | Update Groq API key and model selection. |
| `POST` | `/api/ai/analyze` | Run semantic analysis on arbitrary text. |
| `POST` | `/api/ai/complete` | Generic Groq LLM completion. |
| `POST` | `/api/ai/chat` | Autonomous Agent Console chat endpoint. |
| `GET` | `/api/scrape` | Scrape metadata and readable text from any URL. |

---

## 6. Mobile App Architecture

The mobile application is built with **React Native** and **Expo SDK 52**.

```
mobile/
├── App.js                   # Root navigation with Bottom Tab Navigator
├── app.json                 # Expo configuration & Android native permissions
├── package.json             # React Native, Expo 52, AsyncStorage
├── build_apk.py             # Automated standalone Gradle APK compiler
├── src/
│   ├── theme.js             # Obsidian executive palette & typography tokens
│   ├── services/
│   │   ├── api.js           # Axios HTTP client, offline AsyncStorage sync
│   │   ├── clipboardWatcher.js # Polling clipboard watcher with deduping
│   │   └── screenshotWatcher.js# MediaStore Screenshots album watcher & 1-tap scan
│   └── screens/
│       ├── DashboardScreen.js   # Pipeline metrics, quick actions
│       ├── CaptureScreen.js     # 1-Tap OCR, MediaStore status, Bulk & Single Ingest
│       ├── ClipVaultScreen.js   # Universal Vault with Clip Inspector Modal
│       ├── OffersListScreen.js  # Searchable career offers stream
│       ├── OfferDetailScreen.js # Full offer inspector, WhatsApp 1-Tap, Cover Letter
│       └── ConnectScreen.js     # LAN pairing, IP configuration, ping test
```

### Standalone Android Build Process
The project includes a standalone compilation script: [`mobile/build_apk.py`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/mobile/build_apk.py).
Executing `python mobile/build_apk.py`:
1. Validates Android SDK environment (`ANDROID_HOME`).
2. Runs Expo Prebuild to generate the native Android project.
3. Invokes `./gradlew assembleRelease` using Gradle 8.9.
4. Generates a signed release APK: `omnihunt-mobile.apk` (56.6 MB).
5. Copies the binary to `public/omnihunt-mobile.apk` for instant browser download.

---

## 7. Design System & Styling Architecture

Both Web and Mobile interfaces strictly adhere to the **Obsidian Executive Design System**:

| Token Name | Color Hex | Role |
| :--- | :--- | :--- |
| **Obsidian Black** | `#09090b` | App background, window canvases |
| **Card Zinc** | `#18181b` | Surfaces, modals, cards |
| **Titanium Border**| `#27272a` | High-contrast structural dividers |
| **Pure White** | `#ffffff` | Primary headings, active labels |
| **Muted Slate** | `#a1a1aa` | Secondary descriptions, timestamps |
| **Emerald Green** | `#10b981` | Success states, active badges, AI highlights |
| **Amber Gold** | `#f59e0b` | Action prompts, warnings, stars |

### Design Principles
- **No External CSS Bloat**: Standardized CSS variables and tokens.
- **Micro-Animations**: Transitions (`150ms-250ms ease`), subtle hover glows, and responsive touch feedback.
- **Strict English Localization**: Standardized professional English across all UI labels, notifications, and prompts.

---

## 8. Setup, Deployment & Operation Guide

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)
- Android Studio / Android SDK (only required if compiling native APKs locally)
- Groq API Key (for Llama 3.3 and Vision inference)

---

### Step 1: Clone & Configure

```bash
git clone https://github.com/Ysn-Ir/CopyLinkdinPaste.git
cd CopyLinkdinPaste
```

Create a `.env` file in the project root:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=8003
HOST=0.0.0.0
```

---

### Step 2: Start the Backend

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```
API Documentation will be available at: `http://localhost:8003/docs`

---

### Step 3: Start the Web Command Center

In a new terminal:
```bash
npm install
npm run dev
```
The web dashboard opens at: `http://localhost:5174`

---

### Step 4: Run the Mobile Companion

Option A: **Direct APK Installation (Fastest)**
- Download the compiled APK directly from the web command center or [`omnihunt-mobile.apk`](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/omnihunt-mobile.apk).
- Install on any Android device and connect to the same Wi-Fi network.

Option B: **Expo Go Development Server**
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code using the Expo Go app.

---

### Docker Deployment

To run the complete stack with Docker Compose:
```bash
docker-compose up --build -d
```
- Web Application: `http://localhost:80`
- API Backend: `http://localhost:8003`

---

## 9. Troubleshooting & Implementation Notes

### Android Screenshot Watcher Timing
- **Issue**: MediaStore timestamps are in seconds on Android (`~1.77e9`), while JavaScript's `Date.now()` is in milliseconds (`~1.77e12`).
- **Fix**: Timestamps must be normalized before delta calculation:
  ```javascript
  const assetMs = asset.creationTime < 1e11 ? asset.creationTime * 1000 : asset.creationTime;
  ```

### Instagram & TikTok Bot Headers
- Unauthenticated requests to Instagram or TikTok return login redirects or minimal shells.
- Scraper requests must supply social bot headers (`facebookexternalhit/1.1`) to trigger server-rendered OpenGraph metadata containing descriptions, creator handles, and poster images.

### Cross-Origin & Local IP Discovery
- When testing on a physical phone, ensure your PC firewall allows inbound connections on port `8003`.
- The Web Command Center includes a **Mobile Connect** modal that displays your PC's active LAN IPv4 address (e.g. `http://192.168.1.X:8003`) along with an auto-generated pairing QR code.

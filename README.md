# 🦅 OmniHunt • Multi-Platform Career Intelligence Suite

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB.svg?logo=react&logoColor=black)](https://vitejs.dev)
[![React Native](https://img.shields.io/badge/Mobile-React_Native_%2F_Expo_52-20232A.svg?logo=react&logoColor=61DAFB)](https://expo.dev)
[![AI Engine](https://img.shields.io/badge/AI-Groq_Llama_3.3_70B_%2F_Vision_90B-F55036.svg)](https://groq.com)
[![Platform](https://img.shields.io/badge/Platform-Web_%7C_Android_%7C_REST_API-gray.svg)](#)

OmniHunt (formerly PFE Hunter) is an executive-grade, multi-platform intelligence command center designed to capture, organize, analyze, and execute career opportunities, tools, educational videos, and technical content across Android mobile and desktop web.

---

## ⚡ Key Highlights

- **Universal Clip Vault**: Ingests job postings, GitHub repositories, educational TikTok/Instagram reels, code snippets, notes, and recruiter contacts.
- **Atomic Multi-Link Decomposition**: Automatically isolates multiple URLs inside a single LinkedIn post or message, ingesting each independently while preserving the source post reference (`entities.parentPost`).
- **Render Cloud Deployment (Optional)**: 1-Click deployment via `render.yaml` with hosted PostgreSQL database. Keeps web and mobile 100% synchronized 24/7 with zero PC required.
- **Remote 4G Tunnel Wizard (`start_tunnel.bat`)**: Solves NAT/cellular isolation. Run `start_tunnel.bat` on your PC to get a public HTTPS link so your phone on 4G syncs with your local machine with zero router setup!
- **Offline Ingestion Queue**: Buffer captures and clips on device when disconnected; auto-syncs to database upon reconnect.
- **1-Click CSV Export**: Full export of all career opportunities across Web and Mobile with Excel UTF-8 BOM compatibility.
- **Mobile 1-Tap & MediaStore Screenshot Watcher**: Real-time Android screenshot detection with 1-tap Groq Vision OCR (`llama-3.2-90b-vision-instruct`).
- **Specialized Social Scrapers**: Extracts full captions, author handles, video thumbnails, and educational takeaways from TikTok and Instagram links.
- **Bulk Link & Text Cleaner**: Ingests and decomposes messy lists of links, bulleted points, or notes into discrete clips.
- **Interactive Clip Inspector**: Click any clip to review full scraped text, author profile, video breakdown, and trigger deep AI enrichment.
- **Outreach Generator**: 1-tap pre-filled WhatsApp messages, customized cover letters, and email outreach.
- **Obsidian Executive Design**: High-contrast, typography-first dark mode (`#09090b` obsidian, zinc card surfaces, titanium borders, emerald accents).

---

## 🚀 Quick Start

### 1. Backend (FastAPI + Groq)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```
API Documentation: `http://localhost:8003/docs`

### 2. Web Command Center (React 19 + Vite)
```bash
npm install
npm run dev
```
Web App: `http://localhost:5174`

### 3. Mobile Companion (React Native / Expo 52)
- **Direct APK**: Download `omnihunt-mobile.apk` directly from the web command center or the project root.
- **Expo Go**:
```bash
cd mobile
npm install
npx expo start
```

---

## 📚 Complete Documentation

For the full architectural specification, REST API catalog (33 endpoints), data models, and deployment guides, see:

👉 **[DOCUMENTATION.md](file:///c:/Users/khali/OneDrive/Bureau/learning/nlp/ILIACODE/linkdin%20special/DOCUMENTATION.md)**

---

## 🛠️ Tech Stack

- **Web Frontend**: React 19, Vite, Lucide Icons, Vanilla Executive CSS tokens
- **Mobile Client**: React Native, Expo SDK 52, `expo-media-library`, `expo-clipboard`, AsyncStorage
- **Backend API**: Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic v2
- **Scraping & OCR**: BeautifulSoup4, HTTPX, TikTok oEmbed API, Instagram OpenGraph Bot Emulation
- **AI Engine**: Groq Cloud SDK (`openai/gpt-oss-120b`, `meta-llama/llama-3.2-90b-vision-instruct`)

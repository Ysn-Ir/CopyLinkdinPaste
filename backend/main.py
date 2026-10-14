import json
import socket
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import HOST, PORT, GROQ_API_KEY, DEFAULT_MODEL
from .database import engine, Base, get_db, DB_ENGINE_TYPE
from .models import OfferModel, CvVaultModel, UserProfileModel, AiConfigModel, CategoryModel, ClipVaultModel
from .schemas import (
    OfferSchema,
    BatchSyncOffersSchema,
    UserProfileSchema,
    CvItemSchema,
    AiConfigSchema,
    AiPromptRequest,
    AiAnalyzeRequest,
    CategorySchema,
    ClipSchema,
    ClipIngestSchema,
    AiChatRequest,
    ClipOcrRequest,
    BulkIngestSchema,
)
from .ai_service import call_groq_chat, analyze_offer, analyze_clip, call_groq_vision, clean_repetitive_text
from .scraper_service import scrape_url_metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pfe_hunter.api")

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PFE Hunter • Career Command Center API",
    description="High-performance FastAPI & PostgreSQL backend for LinkedIn & PFE offer extraction",
    version="2.0.0"
)

# Open CORS completely for LAN, Android mobile, and Tailscale networks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initial seed data
INITIAL_CATEGORIES = [
    {
        "id": "ai-ml",
        "label": "AI & Machine Learning",
        "short_label": "AI / ML",
        "color": "#0ea5e9",
        "bg_color": "rgba(14, 165, 233, 0.12)",
        "border_color": "rgba(14, 165, 233, 0.35)",
        "default_cv_tag": "CV - AI & Machine Learning",
        "keywords": ["ai", "ia", "machine learning", "deep learning", "nlp", "llm", "computer vision", "pytorch", "transformers", "genai", "rag"],
        "is_custom": False,
    },
    {
        "id": "data",
        "label": "Data Science & Engineering",
        "short_label": "Data",
        "color": "#06b6d4",
        "bg_color": "rgba(6, 182, 212, 0.12)",
        "border_color": "rgba(6, 182, 212, 0.35)",
        "default_cv_tag": "CV - Data Science & Analytics",
        "keywords": ["data", "data engineer", "data scientist", "bi", "spark", "sql", "etl", "analytics", "big data", "snowflake"],
        "is_custom": False,
    },
    {
        "id": "dev-fullstack",
        "label": "Software & Fullstack Dev",
        "short_label": "Software Dev",
        "color": "#3b82f6",
        "bg_color": "rgba(59, 130, 246, 0.12)",
        "border_color": "rgba(59, 130, 246, 0.35)",
        "default_cv_tag": "CV - Software & Fullstack Dev",
        "keywords": ["dev", "developer", "développeur", "software", "fullstack", "frontend", "backend", "react", "node", "python", "java", "golang", "typescript"],
        "is_custom": False,
    },
    {
        "id": "devops-cloud",
        "label": "DevOps & Cloud Infrastructure",
        "short_label": "DevOps / Cloud",
        "color": "#10b981",
        "bg_color": "rgba(16, 185, 129, 0.12)",
        "border_color": "rgba(16, 185, 129, 0.35)",
        "default_cv_tag": "CV - Cloud & DevOps",
        "keywords": ["devops", "cloud", "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "ci/cd"],
        "is_custom": False,
    },
    {
        "id": "cybersecurity",
        "label": "Cybersecurity & InfoSec",
        "short_label": "Cybersecurity",
        "color": "#f43f5e",
        "bg_color": "rgba(244, 63, 94, 0.12)",
        "border_color": "rgba(244, 63, 94, 0.35)",
        "default_cv_tag": "CV - Cybersecurity",
        "keywords": ["cyber", "cybersecurity", "sécurité", "security", "pentest", "soc", "siem", "cryptography"],
        "is_custom": False,
    },
    {
        "id": "embedded-iot",
        "label": "Embedded & IoT / Systems",
        "short_label": "Embedded / IoT",
        "color": "#f59e0b",
        "bg_color": "rgba(245, 158, 11, 0.12)",
        "border_color": "rgba(245, 158, 11, 0.35)",
        "default_cv_tag": "CV - Embedded Systems",
        "keywords": ["embarqué", "embedded", "iot", "c/c++", "firmware", "stm32", "microcontroller", "robotics"],
        "is_custom": False,
    },
    {
        "id": "other",
        "label": "General / Other Domains",
        "short_label": "Other",
        "color": "#8b5cf6",
        "bg_color": "rgba(139, 92, 246, 0.12)",
        "border_color": "rgba(139, 92, 246, 0.35)",
        "default_cv_tag": "CV - General Engineering",
        "keywords": [],
        "is_custom": False,
    }
]

INITIAL_CV_LIST = [
    {"id": "cv-1", "name": "CV - AI & Machine Learning", "category": "ai-ml", "fileName": "CV_AI_ML.pdf", "fileSize": "184 KB", "isDefault": True},
    {"id": "cv-2", "name": "CV - Software & Fullstack Dev", "category": "dev-fullstack", "fileName": "CV_Fullstack.pdf", "fileSize": "192 KB", "isDefault": True},
    {"id": "cv-3", "name": "CV - Data Science & Analytics", "category": "data", "fileName": "CV_Data.pdf", "fileSize": "175 KB", "isDefault": True},
    {"id": "cv-4", "name": "CV - Cloud & DevOps", "category": "devops-cloud", "fileName": "CV_Cloud.pdf", "fileSize": "180 KB", "isDefault": True},
    {"id": "cv-5", "name": "CV - Cybersecurity", "category": "cybersecurity", "fileName": "CV_Cyber.pdf", "fileSize": "168 KB", "isDefault": True},
]

INITIAL_OFFERS = [
    {
        "id": "offer-1",
        "title": "Stage PFE - Ingénieur R&D en Traitement du Langage Naturel & LLM",
        "company": "Mistral AI",
        "location": "Paris, France (Hybride)",
        "category": "ai-ml",
        "categoryReasoning": "Focus direct sur le NLP, architectures Transformers et modèles fondations.",
        "channel": "email",
        "recruiterEmail": "recrutement-pfe@mistral.ai",
        "recruiterName": "Alexandre Dupont",
        "sharer": {
            "name": "Alexandre Dupont",
            "title": "Lead Tech Recruiter & AI Partnerships @ Mistral AI",
            "profileUrl": "https://linkedin.com/in/alexandre-dupont-mistral",
            "phone": "+33 6 42 18 90 12"
        },
        "skills": ["Python", "PyTorch", "Transformers", "NLP", "LLMs", "vLLM", "FlashAttention"],
        "description": "Nous recherchons un(e) stagiaire PFE passionné(e) par l'entraînement et l'optimisation des grands modèles de langage. Contactez Alexandre Dupont sur LinkedIn ou envoyez directement votre candidature à recrutement-pfe@mistral.ai.",
        "sourceUrl": "https://linkedin.com/posts/mistral-ai-pfe-nlp-2025",
        "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
        "status": "ready",
        "attachedCvTag": "CV - AI & Machine Learning",
        "confidence": 0.98,
        "linkedInNote": "Bonjour Alexandre, élève ingénieur passionné par le NLP et les architectures transformers, je serais ravi d'échanger au sujet du stage PFE chez Mistral AI.",
        "whatsAppMsg": "Bonjour Alexandre, je vous contacte suite à votre offre de stage PFE R&D NLP chez Mistral AI. Je serais ravi de vous présenter mon parcours en Deep Learning.",
        "notes": "Poste prioritaire ! Alexandre est actif sur LinkedIn le matin."
    },
    {
        "id": "offer-2",
        "title": "Stage PFE - Deep Learning & Vision par Ordinateur Temps Réel",
        "company": "NeuroVision Systems",
        "location": "Lyon, France / Télétravail",
        "category": "ai-ml",
        "categoryReasoning": "Algorithmes de détection d'objets, YOLOv10 et segmentation d'images.",
        "channel": "direct_contact",
        "recruiterEmail": "",
        "recruiterName": "Karim Mansouri",
        "sharer": {
            "name": "Karim Mansouri",
            "title": "Directeur R&D & Fondateur @ NeuroVision",
            "profileUrl": "https://linkedin.com/in/karim-mansouri-vision",
            "phone": "+33 6 98 76 54 32"
        },
        "skills": ["Python", "OpenCV", "TensorFlow", "YOLO", "Edge AI", "CUDA"],
        "description": "Pour postuler : m'envoyer directement un message privé sur LinkedIn ou WhatsApp au 06 98 76 54 32 avec votre lien GitHub et vos réalisations.",
        "sourceUrl": "https://linkedin.com/posts/karim-mansouri-neurovision-pfe",
        "imageUrl": "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1200&q=80",
        "status": "saved",
        "attachedCvTag": "CV - AI & Machine Learning",
        "confidence": 0.95,
        "linkedInNote": "Bonjour Karim, passionné par la Computer Vision et le Deep Learning temps réel, je serais honoré d'échanger sur votre stage chez NeuroVision.",
        "whatsAppMsg": "Bonjour Karim, je vous contacte suite à votre post LinkedIn concernant le stage PFE Vision par Ordinateur chez NeuroVision Systems.",
        "notes": "Demande directe via WhatsApp possible."
    },
    {
        "id": "offer-3",
        "title": "Stage PFE - Ingénieur Fullstack & Plateforme Distribuée",
        "company": "Datadog Tech",
        "location": "Paris, France",
        "category": "dev-fullstack",
        "categoryReasoning": "Développement backend Node.js / Go et interfaces React haute performance.",
        "channel": "external",
        "recruiterEmail": "",
        "recruiterName": "Sophie Laurent",
        "sharer": {
            "name": "Sophie Laurent",
            "title": "University Recruiting Lead @ Datadog",
            "profileUrl": "https://linkedin.com/in/sophie-laurent-datadog",
            "phone": ""
        },
        "skills": ["TypeScript", "React", "Go", "Distributed Systems", "Docker", "GraphQL"],
        "description": "Postulez directement sur notre portail Workday Carrières. Lettre de motivation en anglais ou français demandée.",
        "sourceUrl": "https://careers.datadoghq.com/detail/pfe-intern-distributed-systems",
        "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
        "status": "saved",
        "attachedCvTag": "CV - Software & Fullstack Dev",
        "confidence": 0.93,
        "linkedInNote": "Bonjour Sophie, très intéressé par l'architecture des systèmes distribués chez Datadog, je viens de déposer mon dossier sur le portail carrières.",
        "notes": "Lettre de motivation LaTeX générée et prête pour le portail."
    }
]

@app.on_event("startup")
def seed_database():
    db = SessionLocal = None
    from .database import SessionLocal
    db = SessionLocal()
    try:
        # Check offers
        if db.query(OfferModel).count() == 0:
            logger.info("Seeding initial offers...")
            for o in INITIAL_OFFERS:
                sharer_str = json.dumps(o.get("sharer", {}))
                skills_str = json.dumps(o.get("skills", []))
                m = OfferModel(
                    id=o["id"],
                    title=o["title"],
                    company=o.get("company", ""),
                    location=o.get("location", ""),
                    category=o.get("category", "dev-fullstack"),
                    category_reasoning=o.get("categoryReasoning", ""),
                    channel=o.get("channel", "email"),
                    recruiter_email=o.get("recruiterEmail", ""),
                    recruiter_name=o.get("recruiterName", ""),
                    sharer_json=sharer_str,
                    skills_json=skills_str,
                    description=o.get("description", ""),
                    source_url=o.get("sourceUrl", ""),
                    image_url=o.get("imageUrl", ""),
                    status=o.get("status", "saved"),
                    attached_cv_tag=o.get("attachedCvTag", ""),
                    confidence=o.get("confidence", 0.9),
                    linked_in_note=o.get("linkedInNote", ""),
                    whats_app_msg=o.get("whatsAppMsg", ""),
                    notes=o.get("notes", "")
                )
                db.add(m)
            db.commit()

        # Check CVs
        if db.query(CvVaultModel).count() == 0:
            logger.info("Seeding CV Vault...")
            for cv in INITIAL_CV_LIST:
                c = CvVaultModel(
                    id=cv["id"],
                    name=cv["name"],
                    category=cv["category"],
                    file_name=cv["fileName"],
                    file_size=cv["fileSize"],
                    is_default=cv["isDefault"]
                )
                db.add(c)
            db.commit()

        # Check Categories
        if db.query(CategoryModel).count() == 0:
            logger.info("Seeding categories...")
            for cat in INITIAL_CATEGORIES:
                c = CategoryModel(
                    id=cat["id"],
                    label=cat["label"],
                    short_label=cat["short_label"],
                    color=cat["color"],
                    bg_color=cat["bg_color"],
                    border_color=cat["border_color"],
                    default_cv_tag=cat["default_cv_tag"],
                    keywords_json=json.dumps(cat["keywords"]),
                    is_custom=cat["is_custom"]
                )
                db.add(c)
            db.commit()

        # Check Profile
        if not db.query(UserProfileModel).filter_by(id="default").first():
            p = UserProfileModel(id="default")
            db.add(p)
            db.commit()

        # Check AI Config
        ai = db.query(AiConfigModel).filter_by(id="default").first()
        if not ai:
            ai = AiConfigModel(
                id="default",
                api_key=GROQ_API_KEY,
                model=DEFAULT_MODEL
            )
            db.add(ai)
            db.commit()
        elif GROQ_API_KEY and not ai.api_key:
            ai.api_key = GROQ_API_KEY
            ai.model = DEFAULT_MODEL
            db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    offer_count = db.query(OfferModel).count()
    cv_count = db.query(CvVaultModel).count()
    clip_count = db.query(ClipVaultModel).count()
    return {
        "status": "ok",
        "backend": "FastAPI",
        "databaseEngine": DB_ENGINE_TYPE,
        "counts": {
            "offers": offer_count,
            "cvs": cv_count,
            "clips": clip_count
        }
    }


@app.get("/api/db/stats")
def get_db_stats(db: Session = Depends(get_db)):
    offer_count = db.query(OfferModel).count()
    cv_count = db.query(CvVaultModel).count()
    clip_count = db.query(ClipVaultModel).count()
    has_profile = db.query(UserProfileModel).count() > 0
    return {
        "engine": DB_ENGINE_TYPE,
        "database": "postgresql" if DB_ENGINE_TYPE == "postgresql" else "sqlite",
        "dbPath": "PostgreSQL (localhost:5432/pfe_hunter)" if DB_ENGINE_TYPE == "postgresql" else "data/pfe_hunter.db",
        "connected": True,
        "counts": {
            "offers": offer_count,
            "cvs": cv_count,
            "clips": clip_count,
            "hasProfile": has_profile
        },
        "fileSizeKb": 0
    }



@app.get("/api/network-info")
def get_network_info():
    """Returns local LAN and Tailscale IPs so Android phones can connect effortlessly"""
    hostname = socket.gethostname()
    local_ips = []
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            ip = item[4][0]
            if ":" not in ip and ip != "127.0.0.1" and ip not in local_ips:
                local_ips.append(ip)
    except Exception:
        pass

    return {
        "hostname": hostname,
        "backendPort": PORT,
        "localIps": local_ips,
        "tailscaleTip": "If Tailscale is running on this PC and your Android phone, use your Tailscale IP (e.g. 100.x.x.x:5174)"
    }


@app.get("/api/mobile/pairing")
def get_mobile_pairing(db: Session = Depends(get_db)):
    """Zero-config mobile discovery and health handshake"""
    hostname = socket.gethostname()
    local_ips = []
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            ip = item[4][0]
            if ":" not in ip and ip != "127.0.0.1" and ip not in local_ips:
                local_ips.append(ip)
    except Exception:
        pass

    # Pick best local LAN IP
    primary_ip = next((ip for ip in local_ips if ip.startswith("192.168.") or ip.startswith("10.")), local_ips[0] if local_ips else "127.0.0.1")

    offer_count = db.query(OfferModel).count()
    category_count = db.query(CategoryModel).count()
    cv_count = db.query(CvVaultModel).count()
    clip_count = db.query(ClipVaultModel).count()

    return {
        "status": "online",
        "app": "PFE Hunter • Career Command Center",
        "version": "2.0.0",
        "hostname": hostname,
        "primaryIp": primary_ip,
        "backendPort": PORT,
        "serverUrl": f"http://{primary_ip}:{PORT}",
        "localIps": local_ips,
        "counts": {
            "offers": offer_count,
            "categories": category_count,
            "cvs": cv_count,
            "clips": clip_count
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# ==============================================================================
# OFFERS CRUD & SYNC
# ==============================================================================

@app.get("/api/offers", response_model=List[dict])
def get_offers(
    category: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(OfferModel)

    if category and category != "all":
        query = query.filter(OfferModel.category == category)
    if channel and channel != "all":
        query = query.filter(OfferModel.channel == channel)
    if status and status != "all":
        query = query.filter(OfferModel.status == status)

    offers = query.order_by(OfferModel.updated_at.desc()).all()
    results = [o.to_dict() for o in offers]

    if search and search.strip():
        q = search.lower()
        results = [
            o for o in results
            if q in (o.get("title") or "").lower()
            or q in (o.get("company") or "").lower()
            or q in (o.get("recruiterName") or "").lower()
            or any(q in s.lower() for s in (o.get("skills") or []))
        ]

    return results


@app.get("/api/offers/export/csv")
def export_offers_csv(
    category: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Exports all career offers to a standardized RFC 4180 CSV spreadsheet"""
    import csv
    import io
    from fastapi.responses import Response

    query = db.query(OfferModel)
    if category and category != "all":
        query = query.filter(OfferModel.category == category)
    if channel and channel != "all":
        query = query.filter(OfferModel.channel == channel)
    if status and status != "all":
        query = query.filter(OfferModel.status == status)

    offers = query.order_by(OfferModel.updated_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header Row
    writer.writerow([
        "Offer ID",
        "Role Title",
        "Company",
        "Location",
        "Category",
        "Channel",
        "Status",
        "Recruiter Name",
        "Recruiter Email",
        "Recruiter Phone / WhatsApp",
        "Required Skills",
        "Match Confidence",
        "LinkedIn Note",
        "WhatsApp Message",
        "Source URL",
        "Created At",
        "Updated At",
        "Notes",
        "Job Description"
    ])

    for o in offers:
        d = o.to_dict()
        sharer = d.get("sharer") or {}
        writer.writerow([
            d.get("id", ""),
            d.get("title", ""),
            d.get("company", ""),
            d.get("location", ""),
            d.get("category", ""),
            d.get("channel", ""),
            d.get("status", ""),
            d.get("recruiterName") or sharer.get("name", ""),
            d.get("recruiterEmail", ""),
            sharer.get("phone", ""),
            ", ".join(d.get("skills") or []),
            f"{int((d.get('confidence') or 0.9) * 100)}%",
            d.get("linkedInNote", ""),
            d.get("whatsAppMsg", ""),
            d.get("sourceUrl", ""),
            d.get("createdAt", ""),
            d.get("updatedAt", ""),
            d.get("notes", ""),
            (d.get("description") or "").replace("\r", " ").replace("\n", " ").strip()[:1000]
        ])

    csv_content = output.getvalue()
    filename = f"omnihunt_offers_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content="\ufeff" + csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@app.post("/api/offers/sync")
def sync_offers(payload: dict, db: Session = Depends(get_db)):
    """Atomic batch synchronization of offers from the frontend"""
    raw_list = payload.get("offers") or []
    updated = []

    for item in raw_list:
        offer_id = item.get("id") or f"offer-{int(datetime.utcnow().timestamp()*1000)}"
        existing = db.query(OfferModel).filter_by(id=offer_id).first()

        sharer_str = json.dumps(item.get("sharer") or {})
        skills_str = json.dumps(item.get("skills") or [])
        top3_str = json.dumps(item.get("top3Guesses") or [])

        data = {
            "title": item.get("title") or "Stage PFE",
            "company": item.get("company") or "",
            "location": item.get("location") or "",
            "category": item.get("category") or "dev-fullstack",
            "category_reasoning": item.get("categoryReasoning") or "",
            "channel": item.get("channel") or "email",
            "recruiter_email": item.get("recruiterEmail") or "",
            "recruiter_name": item.get("recruiterName") or "",
            "sharer_json": sharer_str,
            "skills_json": skills_str,
            "description": item.get("description") or "",
            "source_url": item.get("sourceUrl") or "",
            "image_url": item.get("imageUrl") or "",
            "status": item.get("status") or "saved",
            "attached_cv_tag": item.get("attachedCvTag") or "",
            "attached_cv_id": item.get("attachedCvId") or "",
            "confidence": float(item.get("confidence") or 0.9),
            "needs_user_review": bool(item.get("needsUserReview", False)),
            "top3_guesses_json": top3_str,
            "linked_in_note": item.get("linkedInNote") or "",
            "whats_app_msg": item.get("whatsAppMsg") or "",
            "custom_email_subject": item.get("customEmailSubject") or "",
            "custom_email_body": item.get("customEmailBody") or "",
            "custom_cover_letter": item.get("customCoverLetter") or "",
            "notes": item.get("notes") or "",
            "updated_at": datetime.utcnow().isoformat()
        }

        if existing:
            for k, v in data.items():
                setattr(existing, k, v)
            updated.append(existing)
        else:
            new_offer = OfferModel(id=offer_id, created_at=datetime.utcnow().isoformat(), **data)
            db.add(new_offer)
            updated.append(new_offer)

    db.commit()
    return {"success": True, "count": len(updated), "offers": [o.to_dict() for o in updated]}


@app.post("/api/offers", status_code=status.HTTP_201_CREATED)
def create_offer(offer: OfferSchema, db: Session = Depends(get_db)):
    offer_id = offer.id or f"offer-{int(datetime.utcnow().timestamp()*1000)}"
    sharer_str = json.dumps(offer.sharer or {})
    skills_str = json.dumps(offer.skills or [])
    top3_str = json.dumps(offer.top3Guesses or [])

    m = OfferModel(
        id=offer_id,
        title=offer.title,
        company=offer.company or "",
        location=offer.location or "",
        category=offer.category or "dev-fullstack",
        category_reasoning=offer.categoryReasoning or "",
        channel=offer.channel or "email",
        recruiter_email=offer.recruiterEmail or "",
        recruiter_name=offer.recruiterName or "",
        sharer_json=sharer_str,
        skills_json=skills_str,
        description=offer.description or "",
        source_url=offer.sourceUrl or "",
        image_url=offer.imageUrl or "",
        status=offer.status or "saved",
        attached_cv_tag=offer.attachedCvTag or "",
        attached_cv_id=offer.attachedCvId or "",
        confidence=offer.confidence or 0.9,
        needs_user_review=offer.needsUserReview or False,
        top3_guesses_json=top3_str,
        linked_in_note=offer.linkedInNote or "",
        whats_app_msg=offer.whatsAppMsg or "",
        custom_email_subject=offer.customEmailSubject or "",
        custom_email_body=offer.customEmailBody or "",
        custom_cover_letter=offer.customCoverLetter or "",
        notes=offer.notes or "",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m.to_dict()


@app.put("/api/offers/{offer_id}")
def update_offer(offer_id: str, offer: OfferSchema, db: Session = Depends(get_db)):
    existing = db.query(OfferModel).filter_by(id=offer_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")

    existing.title = offer.title
    existing.company = offer.company or ""
    existing.location = offer.location or ""
    existing.category = offer.category or existing.category
    existing.category_reasoning = offer.categoryReasoning or existing.category_reasoning
    existing.channel = offer.channel or existing.channel
    existing.recruiter_email = offer.recruiterEmail or ""
    existing.recruiter_name = offer.recruiterName or ""
    if offer.sharer:
        existing.sharer_json = json.dumps(offer.sharer)
    if offer.skills is not None:
        existing.skills_json = json.dumps(offer.skills)
    existing.description = offer.description or existing.description
    existing.source_url = offer.sourceUrl or existing.source_url
    existing.image_url = offer.imageUrl or existing.image_url
    existing.status = offer.status or existing.status
    existing.attached_cv_tag = offer.attachedCvTag or existing.attached_cv_tag
    existing.attached_cv_id = offer.attachedCvId or existing.attached_cv_id
    existing.linked_in_note = offer.linkedInNote or existing.linked_in_note
    existing.whats_app_msg = offer.whatsAppMsg or existing.whats_app_msg
    existing.custom_email_subject = offer.customEmailSubject or existing.custom_email_subject
    existing.custom_email_body = offer.customEmailBody or existing.custom_email_body
    existing.custom_cover_letter = offer.customCoverLetter or existing.custom_cover_letter
    existing.notes = offer.notes or existing.notes
    existing.updated_at = datetime.utcnow().isoformat()

    db.commit()
    db.refresh(existing)
    return existing.to_dict()


@app.delete("/api/offers/{offer_id}")
def delete_offer(offer_id: str, db: Session = Depends(get_db)):
    existing = db.query(OfferModel).filter_by(id=offer_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")
    db.delete(existing)
    db.commit()
    return {"success": True, "id": offer_id}


@app.patch("/api/offers/{offer_id}/status")
def update_offer_status(offer_id: str, payload: dict, db: Session = Depends(get_db)):
    """Fast stage update for mobile UI (e.g. advance stage with 1 tap)"""
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing status field")
    existing = db.query(OfferModel).filter_by(id=offer_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")
    existing.status = new_status
    existing.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(existing)
    return {"success": True, "id": offer_id, "status": existing.status, "offer": existing.to_dict()}


@app.post("/api/mobile/ingest")
async def mobile_ingest_post(payload: dict, db: Session = Depends(get_db)):
    """Captures a copied LinkedIn post or URL directly from mobile clipboard with LLM classification"""
    raw_text = (payload.get("rawText") or payload.get("text") or "").strip()
    source_url = (payload.get("sourceUrl") or payload.get("url") or "").strip()

    if not raw_text and not source_url:
        raise HTTPException(status_code=400, detail="Either rawText or sourceUrl must be provided")

    # If raw_text is minimal and source_url is provided, scrape metadata
    if len(raw_text) < 50 and source_url.startswith("http"):
        try:
            scraped = await scrape_url_metadata(source_url)
            if scraped.get("text"):
                raw_text = scraped["text"]
            elif scraped.get("title") and not raw_text:
                raw_text = f"{scraped.get('title')}\n{scraped.get('description', '')}"
        except Exception as e:
            logger.warning(f"Mobile scrape failed: {e}")

    # Gather categories for dynamic LLM classification
    db_cats = db.query(CategoryModel).all()
    categories_list = [c.to_dict() for c in db_cats] if db_cats else []

    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = (cfg.model if cfg else None) or DEFAULT_MODEL

    analyzed = None
    if raw_text and api_key:
        try:
            analyzed = await analyze_offer(
                raw_text=raw_text,
                candidate_profile=None,
                api_key=api_key,
                model=model,
                categories=categories_list
            )
        except Exception as err:
            logger.warning(f"Mobile AI analyze error: {err}")

    # Fallback if AI parsing wasn't executed or failed
    if not analyzed or not isinstance(analyzed, dict):
        first_line = raw_text.split("\n")[0][:80] if raw_text else "Nouvelle offre LinkedIn"
        analyzed = {
            "title": first_line if first_line else "Stage PFE Ingénieur",
            "company": "Entreprise (à préciser)",
            "location": "Hybride / Télétravail",
            "category": "dev-fullstack",
            "categoryReasoning": "Catégorisation automatique mobile",
            "channel": "direct_contact",
            "recruiterEmail": "",
            "recruiterName": "",
            "skills": ["LinkedIn", "Mobile Import"],
            "description": raw_text[:500] if raw_text else "Importé depuis le mobile",
            "sourceUrl": source_url or "",
            "confidence": 0.85,
            "needsUserReview": True
        }

    offer_id = f"offer-m-{int(datetime.utcnow().timestamp()*1000)}"
    sharer = analyzed.get("sharer") or {}
    skills = analyzed.get("skills") or []
    top3 = analyzed.get("top3Guesses") or []

    # Map category to default CV tag
    cat_id = analyzed.get("category", "dev-fullstack")
    cat_obj = next((c for c in categories_list if c["id"] == cat_id), None)
    attached_cv_tag = cat_obj.get("default_cv_tag") if cat_obj and cat_obj.get("default_cv_tag") else "CV - General"

    new_offer = OfferModel(
        id=offer_id,
        title=analyzed.get("title") or "Offre Ingestée Mobile",
        company=analyzed.get("company") or "",
        location=analyzed.get("location") or "",
        category=cat_id,
        category_reasoning=analyzed.get("categoryReasoning") or "Import mobile",
        channel=analyzed.get("channel") or "direct_contact",
        recruiter_email=analyzed.get("recruiterEmail") or "",
        recruiter_name=analyzed.get("recruiterName") or "",
        sharer_json=json.dumps(sharer),
        skills_json=json.dumps(skills),
        description=analyzed.get("description") or raw_text,
        source_url=source_url or analyzed.get("sourceUrl") or "",
        image_url=analyzed.get("imageUrl") or "",
        status="saved",
        attached_cv_tag=attached_cv_tag,
        confidence=float(analyzed.get("confidence") or 0.9),
        needs_user_review=True,
        top3_guesses_json=json.dumps(top3),
        linked_in_note=analyzed.get("linkedInNote") or "",
        whats_app_msg=analyzed.get("whatsAppMsg") or "",
        notes="📱 Ingested from Mobile App clipboard",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return {
        "success": True,
        "message": "Offre capturée et analysée avec succès !",
        "offer": new_offer.to_dict()
    }


# ==============================================================================
# PROFILE & CV VAULT
# ==============================================================================

@app.get("/api/profile")
def get_profile(db: Session = Depends(get_db)):
    prof = db.query(UserProfileModel).filter_by(id="default").first()
    if not prof:
        prof = UserProfileModel(id="default")
        db.add(prof)
        db.commit()
    return prof.to_dict()


@app.post("/api/profile")
def update_profile(profile_data: UserProfileSchema, db: Session = Depends(get_db)):
    prof = db.query(UserProfileModel).filter_by(id="default").first()
    if not prof:
        prof = UserProfileModel(id="default")
        db.add(prof)

    prof.full_name = profile_data.fullName or prof.full_name
    prof.headline = profile_data.headline or prof.headline
    prof.email = profile_data.email or prof.email
    prof.phone = profile_data.phone or prof.phone
    prof.whatsapp = profile_data.whatsapp or prof.whatsapp
    prof.linkedin = profile_data.linkedIn or prof.linkedin
    prof.github = profile_data.github or prof.github
    prof.portfolio = profile_data.portfolio or prof.portfolio
    prof.degree = profile_data.degree or prof.degree
    prof.city = profile_data.city or prof.city
    prof.skills = profile_data.skills or prof.skills
    prof.projects = profile_data.projects or prof.projects
    prof.tone_preference = profile_data.tonePreference or prof.tone_preference
    prof.custom_instructions = profile_data.customInstructions or prof.custom_instructions
    prof.bio = profile_data.bio or prof.bio
    if profile_data.customLinks is not None:
        prof.custom_links_json = json.dumps(profile_data.customLinks)
    prof.updated_at = datetime.utcnow().isoformat()

    db.commit()
    db.refresh(prof)
    return prof.to_dict()


@app.get("/api/cvs")
def get_cvs(db: Session = Depends(get_db)):
    cvs = db.query(CvVaultModel).all()
    return [c.to_dict() for c in cvs]


@app.post("/api/cvs")
def save_cvs(cv_list: List[CvItemSchema], db: Session = Depends(get_db)):
    db.query(CvVaultModel).delete()
    for cv in cv_list:
        m = CvVaultModel(
            id=cv.id,
            name=cv.name,
            category=cv.category or "",
            file_name=cv.fileName or f"{cv.name}.pdf",
            file_size=cv.fileSize or "180 KB",
            is_default=cv.isDefault or False,
            updated_at=datetime.utcnow().isoformat()
        )
        db.add(m)
    db.commit()
    return [c.to_dict() for c in db.query(CvVaultModel).all()]


# ==============================================================================
# CATEGORIES / DOMAINS MANAGEMENT
# ==============================================================================

@app.get("/api/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(CategoryModel).all()
    if not cats:
        for cat in INITIAL_CATEGORIES:
            c = CategoryModel(
                id=cat["id"],
                label=cat["label"],
                short_label=cat["short_label"],
                color=cat["color"],
                bg_color=cat["bg_color"],
                border_color=cat["border_color"],
                default_cv_tag=cat["default_cv_tag"],
                keywords_json=json.dumps(cat["keywords"]),
                is_custom=cat["is_custom"]
            )
            db.add(c)
        db.commit()
        cats = db.query(CategoryModel).all()
    return [c.to_dict() for c in cats]


@app.post("/api/categories")
def create_or_update_category(cat: CategorySchema, db: Session = Depends(get_db)):
    raw_slug = cat.id or cat.label.lower().replace(" ", "-").replace("/", "-").replace("&", "").strip()
    cat_id = "".join(ch for ch in raw_slug if ch.isalnum() or ch == "-")
    if not cat_id:
        cat_id = f"domain-{int(datetime.utcnow().timestamp())}"

    existing = db.query(CategoryModel).filter_by(id=cat_id).first()
    keywords_str = json.dumps(cat.keywords or [])
    short_label = cat.shortLabel or (cat.label[:14] if len(cat.label) > 14 else cat.label)

    if existing:
        existing.label = cat.label
        existing.short_label = short_label
        existing.color = cat.color or existing.color
        existing.bg_color = cat.bgColor or existing.bg_color
        existing.border_color = cat.borderColor or existing.border_color
        existing.default_cv_tag = cat.defaultCvTag or existing.default_cv_tag
        existing.keywords_json = keywords_str
        existing.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(existing)
        return existing.to_dict()
    else:
        new_cat = CategoryModel(
            id=cat_id,
            label=cat.label,
            short_label=short_label,
            color=cat.color or "#3b82f6",
            bg_color=cat.bgColor or "rgba(59, 130, 246, 0.12)",
            border_color=cat.borderColor or "rgba(59, 130, 246, 0.35)",
            default_cv_tag=cat.defaultCvTag or "",
            keywords_json=keywords_str,
            is_custom=True,
            updated_at=datetime.utcnow().isoformat()
        )
        db.add(new_cat)
        db.commit()
        db.refresh(new_cat)
        return new_cat.to_dict()


@app.delete("/api/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    existing = db.query(CategoryModel).filter_by(id=category_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(existing)
    db.commit()
    return {"success": True, "id": category_id}


# ==============================================================================
# AI CONFIG & GROQ LLM ACTIONS
# ==============================================================================

@app.get("/api/ai-config")
def get_ai_config(db: Session = Depends(get_db)):
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    if not cfg:
        cfg = AiConfigModel(id="default", api_key=GROQ_API_KEY, model=DEFAULT_MODEL)
        db.add(cfg)
        db.commit()
    res = cfg.to_dict()
    if not res.get("apiKey") and GROQ_API_KEY:
        res["apiKey"] = GROQ_API_KEY
    return res


@app.post("/api/ai-config")
def update_ai_config(config_data: AiConfigSchema, db: Session = Depends(get_db)):
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    if not cfg:
        cfg = AiConfigModel(id="default")
        db.add(cfg)

    cfg.api_key = config_data.apiKey or GROQ_API_KEY
    cfg.model = config_data.model or DEFAULT_MODEL
    cfg.provider = config_data.provider or "groq"
    cfg.temperature = config_data.temperature if config_data.temperature is not None else 0.25
    cfg.custom_system_prompt = config_data.customSystemPrompt or ""
    cfg.updated_at = datetime.utcnow().isoformat()

    db.commit()
    db.refresh(cfg)
    return cfg.to_dict()


@app.post("/api/ai/analyze")
async def analyze_offer_endpoint(req: AiAnalyzeRequest, db: Session = Depends(get_db)):
    """Extracts job offer entities using Groq gpt-oss-120b with dynamic domain classification"""
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    key = req.apiKey or (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = req.model or (cfg.model if cfg else None) or DEFAULT_MODEL

    # Gather active categories: from request payload or database
    categories_list = req.categories
    if not categories_list:
        db_cats = db.query(CategoryModel).all()
        if db_cats:
            categories_list = [c.to_dict() for c in db_cats]

    try:
        result = await analyze_offer(
            raw_text=req.text,
            candidate_profile=req.candidateProfile,
            api_key=key,
            model=model,
            categories=categories_list
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/complete")
async def complete_prompt_endpoint(req: AiPromptRequest, db: Session = Depends(get_db)):
    """Arbitrary uninhibited completion with Groq"""
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    key = req.apiKey or (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = req.model or (cfg.model if cfg else None) or DEFAULT_MODEL

    messages = []
    if req.systemPrompt:
        messages.append({"role": "system", "content": req.systemPrompt})
    messages.append({"role": "user", "content": req.prompt})

    try:
        res = await call_groq_chat(
            messages=messages,
            api_key=key,
            model=model,
            temperature=req.temperature or 0.3
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# UNIVERSAL CLIPBOARD VAULT & OMNICAPTURE
# ==============================================================================

@app.get("/api/clips")
def get_clips(
    content_type: Optional[str] = None,
    domain: Optional[str] = None,
    search: Optional[str] = None,
    starred: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Retrieve universal clips with semantic filters, website domains, and search"""
    query = db.query(ClipVaultModel)
    if content_type and content_type != "all":
        query = query.filter(ClipVaultModel.content_type == content_type)
    if domain and domain != "all":
        query = query.filter(ClipVaultModel.source_domain == domain)
    if starred is True:
        query = query.filter(ClipVaultModel.is_starred == True)

    clips = query.order_by(ClipVaultModel.created_at.desc()).all()
    results = [c.to_dict() for c in clips]

    if search and search.strip():
        q = search.lower()
        results = [
            c for c in results
            if q in (c.get("title") or "").lower()
            or q in (c.get("content") or "").lower()
            or q in (c.get("summary") or "").lower()
            or q in (c.get("sourceDomain") or "").lower()
            or any(q in t.lower() for t in (c.get("tags") or []))
        ]
    return results


@app.post("/api/clips/ingest")
async def ingest_clip(req: ClipIngestSchema, db: Session = Depends(get_db)):
    """Universal AI clipboard ingest with automatic categorization, entity extraction, multi-link decomposition, and job offer detection"""
    raw_content = req.content.strip()
    if not raw_content:
        raise HTTPException(status_code=400, detail="Clipboard content cannot be empty")

    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = (cfg.model if cfg else None) or DEFAULT_MODEL

    import re
    # Extract distinct URLs from the text
    found_urls = re.findall(r'https?://[^\s,;"\'\)\]\}]+', raw_content)
    seen_urls = set()
    all_urls = []
    for u in found_urls:
        clean_u = u.rstrip('.,;)')
        if clean_u not in seen_urls:
            seen_urls.add(clean_u)
            all_urls.append(clean_u)

    # CASE A: MULTIPLE LINKS IN A SINGLE POST/CLIPBOARD ITEM
    # If the text has multiple URLs and no explicit single sourceUrl was forced, process each independently while referencing the parent post.
    if len(all_urls) > 1 and not req.sourceUrl:
        created_clips = []
        created_offers = []
        parent_batch_id = f"batch-{int(datetime.utcnow().timestamp()*1000)}"
        lines = [line.strip() for line in raw_content.splitlines() if line.strip()]

        for idx, u in enumerate(all_urls[:12]):
            # Local paragraph or line containing this link
            context_lines = [l for l in lines if u in l]
            item_context = "\n".join(context_lines) if context_lines else raw_content[:400]

            scraped_meta = None
            rich_text = item_context
            try:
                scraped_meta = await scrape_url_metadata(u)
                if scraped_meta.get("bodyText"):
                    rich_text = f"TITLE: {scraped_meta.get('title', '')}\nSITE: {scraped_meta.get('siteName', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\nCONTEXT: {item_context}\n\nPAGE CONTENT:\n{scraped_meta.get('bodyText', '')}"
                elif scraped_meta.get("title"):
                    rich_text = f"TITLE: {scraped_meta.get('title', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\nCONTEXT: {item_context}\nURL: {u}"
            except Exception as e:
                logger.warning(f"Error scraping sub-link {u}: {e}")

            analyzed = await analyze_clip(
                raw_text=rich_text,
                source_url=u,
                source_domain=(scraped_meta.get("siteName") if scraped_meta else None),
                api_key=api_key,
                model=model
            )

            clip_id = f"clip-{int(datetime.utcnow().timestamp()*1000)}-{idx+1}"
            content_type = analyzed.get("contentType") or "note"
            if scraped_meta and (scraped_meta.get("isVideo") or scraped_meta.get("isEducationalVideo")):
                content_type = "educational_video"

            title = (scraped_meta.get("title") if scraped_meta and scraped_meta.get("title") and len(scraped_meta["title"]) > 10 else None) or analyzed.get("title") or u
            summary = analyzed.get("summary") or (scraped_meta.get("description") if scraped_meta else None) or item_context[:200]
            source_domain = analyzed.get("sourceDomain") or (scraped_meta.get("siteName") if scraped_meta else None) or "web"
            tags = analyzed.get("tags") or []
            entities = analyzed.get("entities") or {}

            # Reference parent post
            entities["parentPost"] = {
                "batchId": parent_batch_id,
                "sourceSnippet": raw_content[:250],
                "linkIndex": idx + 1,
                "totalLinks": len(all_urls),
                "allUrls": all_urls,
            }

            if analyzed.get("videoData"):
                entities["videoData"] = analyzed["videoData"]
            elif scraped_meta and scraped_meta.get("isVideo"):
                entities["videoData"] = {
                    "coreConcept": title,
                    "keyTakeaways": [summary, f"Educational video from {source_domain}"],
                    "toolsMentioned": tags,
                    "creator": scraped_meta.get("author") or source_domain,
                }

            sub_clip = ClipVaultModel(
                id=clip_id,
                content=f"{item_context}\n\nLink: {u}",
                content_type=content_type,
                title=title,
                summary=summary,
                source_url=u,
                source_domain=source_domain,
                source_device=req.sourceDevice or "desktop",
                tags_json=json.dumps(tags),
                entities_json=json.dumps(entities),
                is_starred=False,
                converted_to_offer=False,
                copied_at=req.copiedAt or datetime.utcnow().isoformat(),
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )
            db.add(sub_clip)

            is_job = bool(
                analyzed.get("isJobOffer")
                or content_type in ["job_offer", "job"]
                or any(w in rich_text.lower() for w in [
                    "stage", "pfe", "internship", "intern", "hiring", "recrute", "recrutement",
                    "candidat", "poste", "cdi", "cdd", "job offer", "we are hiring", "apply now", "postuler"
                ])
            )
            if is_job:
                job_data = analyzed.get("jobData") or {}
                emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', rich_text)
                detected_channel = job_data.get("channel") or ("email" if emails else "external")
                cat_id = job_data.get("category") or "dev-fullstack"
                db_cat = db.query(CategoryModel).filter_by(id=cat_id).first()
                cv_tag = db_cat.default_cv_tag if db_cat else "CV - General"

                new_offer = OfferModel(
                    id=f"offer-clip-{int(datetime.utcnow().timestamp()*1000)}-{idx+1}",
                    title=job_data.get("title") or title,
                    company=job_data.get("company") or source_domain or "Company",
                    location=job_data.get("location") or "Remote / Hybrid",
                    category=cat_id,
                    category_reasoning=f"Auto-routed from multi-link post link #{idx+1} ({source_domain})",
                    channel=detected_channel,
                    recruiter_email=job_data.get("recruiterEmail") or (emails[0] if emails else ""),
                    recruiter_name=job_data.get("recruiterName") or "",
                    skills_json=json.dumps(job_data.get("skills") or tags),
                    description=job_data.get("jobSpecification") or job_data.get("description") or clean_repetitive_text(rich_text),
                    source_url=u,
                    status="saved",
                    attached_cv_tag=cv_tag,
                    confidence=0.92,
                    needs_user_review=True,
                    notes=f"Auto-captured from multi-link post on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                    created_at=datetime.utcnow().isoformat(),
                    updated_at=datetime.utcnow().isoformat(),
                )
                db.add(new_offer)
                sub_clip.converted_to_offer = True
                sub_clip.content_type = "job_offer"
                created_offers.append(new_offer)

            created_clips.append(sub_clip)

        db.commit()
        for c in created_clips:
            db.refresh(c)

        return {
            "success": True,
            "isMultiLink": True,
            "batchCount": len(created_clips),
            "clips": [c.to_dict() for c in created_clips],
            "offers": [o.to_dict() for o in created_offers],
            "clip": created_clips[0].to_dict() if created_clips else None,
            "isJobOffer": len(created_offers) > 0,
            "offer": created_offers[0].to_dict() if created_offers else None,
        }

    # CASE B: SINGLE URL OR GENERAL TEXT
    # Deduplication check
    existing_clip = db.query(ClipVaultModel).filter_by(content=raw_content).first()
    if existing_clip:
        return {
            "success": True,
            "clip": existing_clip.to_dict(),
            "isJobOffer": existing_clip.content_type in ["job_offer", "job"],
            "isDuplicate": True,
        }

    target_url = req.sourceUrl or (all_urls[0] if all_urls else None)
    scraped_meta = None
    rich_text = raw_content

    if target_url:
        try:
            scraped_meta = await scrape_url_metadata(target_url)
            if scraped_meta.get("bodyText"):
                rich_text = f"TITLE: {scraped_meta.get('title', '')}\nSITE: {scraped_meta.get('siteName', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\n\nPAGE CONTENT:\n{scraped_meta.get('bodyText', '')}"
            elif scraped_meta.get("title"):
                rich_text = f"TITLE: {scraped_meta.get('title', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\nURL: {target_url}"
        except Exception as e:
            logger.warning(f"Error scraping URL {target_url}: {e}")

    # Run universal AI semantic classification
    analyzed = await analyze_clip(
        raw_text=rich_text,
        source_url=target_url or req.sourceUrl,
        source_domain=req.sourceDomain or (scraped_meta.get("siteName") if scraped_meta else None),
        api_key=api_key,
        model=model
    )

    clip_id = f"clip-{int(datetime.utcnow().timestamp()*1000)}"
    content_type = analyzed.get("contentType") or "note"
    if scraped_meta and (scraped_meta.get("isVideo") or scraped_meta.get("isEducationalVideo")):
        content_type = "educational_video"

    title = (scraped_meta.get("title") if scraped_meta and scraped_meta.get("title") and len(scraped_meta["title"]) > 10 else None) or analyzed.get("title") or raw_content.split("\n")[0][:70] or "New Clip"
    summary = analyzed.get("summary") or (scraped_meta.get("description") if scraped_meta else None) or raw_content[:200]
    source_domain = analyzed.get("sourceDomain") or (scraped_meta.get("siteName") if scraped_meta else None) or req.sourceDomain or "clipboard"
    tags = analyzed.get("tags") or []
    entities = analyzed.get("entities") or {}

    if analyzed.get("videoData"):
        entities["videoData"] = analyzed["videoData"]
    elif scraped_meta and scraped_meta.get("isVideo"):
        entities["videoData"] = {
            "coreConcept": title,
            "keyTakeaways": [summary, f"Educational video from {source_domain}"],
            "toolsMentioned": tags,
            "creator": scraped_meta.get("author") or source_domain,
        }

    clip = ClipVaultModel(
        id=clip_id,
        content=raw_content,
        content_type=content_type,
        title=title,
        summary=summary,
        source_url=target_url or req.sourceUrl or "",
        source_domain=source_domain,
        source_device=req.sourceDevice or "desktop",
        tags_json=json.dumps(tags),
        entities_json=json.dumps(entities),
        is_starred=False,
        converted_to_offer=False,
        copied_at=req.copiedAt or datetime.utcnow().isoformat(),
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    db.add(clip)

    auto_created_offer = None
    is_job = bool(
        analyzed.get("isJobOffer")
        or content_type in ["job_offer", "job"]
        or any(w in rich_text.lower() for w in [
            "stage", "pfe", "internship", "intern", "hiring", "recrute", "recrutement",
            "candidat", "poste", "cdi", "cdd", "job offer", "we are hiring", "apply now", "postuler"
        ])
    )

    if is_job:
        job_data = analyzed.get("jobData") or {}
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', rich_text)
        phones = re.findall(r'(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}', rich_text)

        detected_channel = job_data.get("channel")
        if not detected_channel or detected_channel not in ["email", "direct_contact", "external"]:
            if emails:
                detected_channel = "email"
            elif phones or "whatsapp" in rich_text.lower() or "linkedin.com/in" in rich_text.lower() or "mp" in rich_text.lower() or "dm" in rich_text.lower():
                detected_channel = "direct_contact"
            else:
                detected_channel = "external"

        offer_id = f"offer-clip-{int(datetime.utcnow().timestamp()*1000)}"
        cat_id = job_data.get("category")
        if not cat_id:
            if any(w in rich_text.lower() for w in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning", "vision"]):
                cat_id = "ai-ml"
            elif any(w in rich_text.lower() for w in ["data", "sql", "spark", "bi", "analytics"]):
                cat_id = "data"
            elif any(w in rich_text.lower() for w in ["devops", "cloud", "aws", "docker", "kubernetes"]):
                cat_id = "devops-cloud"
            elif any(w in rich_text.lower() for w in ["cyber", "security", "pentest"]):
                cat_id = "cybersecurity"
            else:
                cat_id = "dev-fullstack"

        db_cat = db.query(CategoryModel).filter_by(id=cat_id).first()
        cv_tag = db_cat.default_cv_tag if db_cat else "CV - General"

        new_offer = OfferModel(
            id=offer_id,
            title=job_data.get("title") or title,
            company=job_data.get("company") or source_domain or "Company",
            location=job_data.get("location") or "Remote / Hybrid",
            category=cat_id,
            category_reasoning=f"Auto-routed to {detected_channel.upper()} channel from clipboard ({source_domain})",
            channel=detected_channel,
            recruiter_email=job_data.get("recruiterEmail") or (emails[0] if emails else ""),
            recruiter_name=job_data.get("recruiterName") or "",
            skills_json=json.dumps(job_data.get("skills") or tags),
            description=job_data.get("jobSpecification") or job_data.get("description") or clean_repetitive_text(rich_text),
            source_url=target_url or req.sourceUrl or "",
            status="saved",
            attached_cv_tag=cv_tag,
            confidence=0.94,
            needs_user_review=True,
            notes=f"Auto-captured from {source_domain} ({req.sourceDevice}) on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        db.add(new_offer)
        clip.converted_to_offer = True
        clip.content_type = "job_offer"
        auto_created_offer = new_offer

    db.commit()
    db.refresh(clip)

    return {
        "success": True,
        "clip": clip.to_dict(),
        "isJobOffer": bool(is_job),
        "offer": auto_created_offer.to_dict() if auto_created_offer else None
    }


@app.post("/api/clips/bulk-ingest")
async def bulk_ingest_clips(req: BulkIngestSchema, db: Session = Depends(get_db)):
    """
    Cleans messy raw bulk text (lists of links, notes, or bullet points)
    and processes each item independently into the Clip Vault.
    """
    raw_text = (req.rawText or req.raw_text or req.content or "").strip()
    urls = list(req.urls or [])

    import re
    if raw_text:
        found = re.findall(r'https?://[^\s,;"\'\)\]\}]+', raw_text)
        for f in found:
            clean_f = f.rstrip('.,;)')
            if clean_f not in urls:
                urls.append(clean_f)

    results = []
    created_offers = []

    # If discrete URLs were extracted from bulk input, ingest each one
    if urls:
        for u in urls[:20]:
            try:
                ingest_res = await ingest_clip(
                    ClipIngestSchema(
                        content=u,
                        sourceUrl=u,
                        sourceDevice=req.sourceDevice or "desktop"
                    ),
                    db=db
                )
                if ingest_res.get("clip"):
                    results.append(ingest_res["clip"])
                if ingest_res.get("offer"):
                    created_offers.append(ingest_res["offer"])
            except Exception as e:
                logger.warning(f"Error bulk ingesting URL {u}: {e}")

        return {"success": True, "count": len(results), "clips": results, "offers": created_offers}

    # If no URLs found, split by double-newlines, bullets, or numbers
    chunks = [c.strip() for c in re.split(r'\n{2,}|\n(?=[•\-\*]|\d+[\.\)])', raw_text) if len(c.strip()) > 15]
    if not chunks and len(raw_text) > 10:
        chunks = [raw_text]

    for chunk in chunks[:12]:
        try:
            res = await ingest_clip(
                ClipIngestSchema(
                    content=chunk,
                    sourceDevice=req.sourceDevice or "desktop"
                ),
                db=db
            )
            if res.get("clip"):
                results.append(res["clip"])
            if res.get("offer"):
                created_offers.append(res["offer"])
        except Exception as e:
            logger.warning(f"Error bulk ingesting chunk: {e}")

    return {"success": True, "count": len(results), "clips": results, "offers": created_offers}


@app.post("/api/clips/{clip_id}/enrich")
async def enrich_clip(clip_id: str, db: Session = Depends(get_db)):
    """Deeply enriches a clip: re-fetches metadata, extracts rich takeaways, key points, tools, and updates Groq analysis"""
    clip = db.query(ClipVaultModel).filter_by(id=clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = (cfg.model if cfg else None) or DEFAULT_MODEL

    rich_text = clip.content
    scraped_meta = None
    target_url = clip.source_url

    if target_url:
        try:
            scraped_meta = await scrape_url_metadata(target_url)
            if scraped_meta.get("bodyText"):
                rich_text = f"TITLE: {scraped_meta.get('title', '')}\nSITE: {scraped_meta.get('siteName', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\n\nPAGE CONTENT:\n{scraped_meta.get('bodyText', '')}"
            elif scraped_meta.get("title"):
                rich_text = f"TITLE: {scraped_meta.get('title', '')}\nDESCRIPTION: {scraped_meta.get('description', '')}\nURL: {target_url}"
        except Exception as e:
            logger.warning(f"Re-scrape error on {target_url}: {e}")

    analyzed = await analyze_clip(
        raw_text=rich_text,
        source_url=target_url,
        source_domain=clip.source_domain or (scraped_meta.get("siteName") if scraped_meta else None),
        api_key=api_key,
        model=model
    )

    if analyzed.get("title") and len(analyzed["title"]) > 5:
        clip.title = analyzed["title"]
    if scraped_meta and scraped_meta.get("title") and len(scraped_meta["title"]) > 10:
        clip.title = scraped_meta["title"]

    if analyzed.get("summary"):
        clip.summary = analyzed["summary"]
    elif scraped_meta and scraped_meta.get("description"):
        clip.summary = scraped_meta["description"]

    if analyzed.get("contentType"):
        clip.content_type = analyzed["contentType"]
    if scraped_meta and (scraped_meta.get("isVideo") or scraped_meta.get("isEducationalVideo")):
        clip.content_type = "educational_video"

    entities = {}
    try:
        entities = json.loads(clip.entities_json) if clip.entities_json else {}
    except Exception:
        pass

    if analyzed.get("entities"):
        entities.update(analyzed["entities"])

    if analyzed.get("videoData"):
        entities["videoData"] = analyzed["videoData"]
    elif scraped_meta and scraped_meta.get("isVideo"):
        entities["videoData"] = {
            "coreConcept": clip.title,
            "keyTakeaways": [clip.summary or "Educational video insights", f"Source: {clip.source_domain}"],
            "toolsMentioned": analyzed.get("tags") or [],
            "creator": scraped_meta.get("author") or clip.source_domain,
        }

    clip.entities_json = json.dumps(entities)
    if analyzed.get("tags"):
        clip.tags_json = json.dumps(analyzed["tags"])

    clip.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(clip)

    return {"success": True, "clip": clip.to_dict()}


@app.post("/api/clips/ocr-ingest")
async def ocr_ingest_clip(req: ClipOcrRequest, db: Session = Depends(get_db)):
    """Extracts OCR text from mobile screenshot via Native OCR & Groq, then performs semantic classification"""
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = (cfg.api_key if cfg else None) or GROQ_API_KEY

    try:
        extracted_text = await call_groq_vision(
            image_base64=req.imageBase64,
            prompt="Extract all text from this screenshot. If this is a recruiter post, WhatsApp message, or job flyer, extract the full job description, company name, requirements, and recruiter contact info verbatim. Return only the extracted text.",
            api_key=api_key
        )
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {
            "success": False,
            "error": f"OCR processing failed: {str(e)}",
            "message": "Please ensure the screenshot is clear and contains readable text."
        }

    if not extracted_text or len(extracted_text.strip()) < 8:
        return {
            "success": False,
            "error": "No readable text detected in screenshot",
            "message": "Could not identify text in image. Try taking a closer screenshot of the text."
        }

    # Ingest the extracted text as a clip
    ingest_payload = ClipIngestSchema(
        content=extracted_text.strip(),
        sourceUrl=req.sourceUrl or "",
        sourceDomain="screenshot_ocr",
        sourceDevice=req.sourceDevice or "mobile",
        copiedAt=datetime.utcnow().isoformat()
    )
    return await ingest_clip(ingest_payload, db)


@app.post("/api/ai/chat")
async def chat_agent_endpoint(req: AiChatRequest, db: Session = Depends(get_db)):
    """Grounded conversational AI Career Agent powered by Groq LLM without deterministic fallbacks"""
    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = req.apiKey or (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = req.model or (cfg.model if cfg else None) or "llama-3.3-70b-versatile"

    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key is not configured")

    # Gather live pipeline context
    offers = req.offers
    if offers is None:
        db_offers = db.query(OfferModel).order_by(OfferModel.updated_at.desc()).limit(15).all()
        offers = [o.to_dict() for o in db_offers]

    prof = req.candidateProfile
    if prof is None:
        db_prof = db.query(UserProfileModel).filter_by(id="default").first()
        prof = db_prof.to_dict() if db_prof else {}

    offers_summary = "\n".join([
        f"- [{o.get('channel', 'external').upper()}] {o.get('title')} at {o.get('company', 'Unknown')} (Category: {o.get('category')}, Status: {o.get('status')}, Recruiter: {o.get('recruiterName') or o.get('recruiterEmail') or 'N/A'})"
        for o in (offers or [])[:10]
    ])

    system_prompt = f"""You are the Autonomous Career Agent & PFE Copilot for OmniHunt, powered by Groq.
You are dynamic, sharp, candid, and highly strategic. Answer open-ended questions intelligently without rigid canned responses.

Candidate Profile:
- Name: {prof.get('fullName', 'Candidate')}
- Headline: {prof.get('headline', 'Software & AI Engineer')}
- Degree: {prof.get('degree', 'Engineering Degree / Master')}
- Skills: {prof.get('skills', 'AI, NLP, Fullstack, Cloud')}
- Tone: {prof.get('tonePreference', 'Direct, confident, high-agency')}

Active Pipeline Snapshot ({len(offers or [])} offers):
{offers_summary or 'No offers in pipeline yet.'}

Instructions:
1. Provide thoughtful, actionable, and non-generic advice tailored to the candidate's exact stack and target roles.
2. If asked to write outreach (email, LinkedIn note, WhatsApp), generate polished, personalized copy ready to send.
3. If asked about pipeline stats or strategy, provide concrete insights based on the active offers above.
4. Always respond strictly in English. Never use French."""

    api_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role in ["user", "assistant"] and content:
            api_messages.append({"role": role, "content": content})

    try:
        res = await call_groq_chat(
            messages=api_messages,
            api_key=api_key,
            model=model,
            temperature=req.temperature or 0.5,
            max_tokens=1600
        )
        return {
            "role": "assistant",
            "content": res["content"],
            "model": res.get("model", model),
            "usage": res.get("usage", {})
        }
    except Exception as e:
        logger.error(f"Groq chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clips/sync-all")
async def sync_all_clips_to_offers(db: Session = Depends(get_db)):
    """Scans all clips in the vault and automatically converts any job offer clips into pipeline offers"""
    clips = db.query(ClipVaultModel).filter_by(converted_to_offer=False).all()
    created_offers = []
    import re
    
    for clip in clips:
        is_job = (
            clip.content_type in ["job_offer", "job"]
            or any(w in clip.content.lower() for w in [
                "stage", "pfe", "internship", "intern", "hiring", "recrute", "recrutement",
                "candidat", "poste", "cdi", "cdd", "job offer", "we are hiring", "apply now", "postuler"
            ])
        )
        if not is_job:
            continue
            
        raw_text = clip.content
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', raw_text)
        phones = re.findall(r'(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}', raw_text)
        
        channel = "email" if emails else ("direct_contact" if (phones or "whatsapp" in raw_text.lower() or "linkedin.com/in" in raw_text.lower()) else "external")
        cat = "ai-ml" if any(w in raw_text.lower() for w in ["ai", "ia", "nlp", "llm", "machine learning", "deep learning"]) else ("data" if any(w in raw_text.lower() for w in ["data", "sql", "spark"]) else "dev-fullstack")
        
        offer_id = f"offer-clip-{int(datetime.utcnow().timestamp()*1000)}-{clip.id[:6]}"
        db_cat = db.query(CategoryModel).filter_by(id=cat).first()
        cv_tag = db_cat.default_cv_tag if db_cat else "CV - General"
        
        tags = []
        try:
            tags = json.loads(clip.tags_json) if clip.tags_json else []
        except:
            tags = []
            
        new_offer = OfferModel(
            id=offer_id,
            title=clip.title,
            company=clip.source_domain or "Company",
            location="Remote / Hybride",
            category=cat,
            category_reasoning=f"Synced from Clip Vault (#{clip.id}) to {channel} channel",
            channel=channel,
            recruiter_email=emails[0] if emails else "",
            recruiter_name="",
            skills_json=json.dumps(tags),
            description=clip.content,
            source_url=clip.source_url or "",
            status="saved",
            attached_cv_tag=cv_tag,
            confidence=0.92,
            needs_user_review=True,
            notes=f"Synced from Clip Vault to {channel} channel",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        db.add(new_offer)
        clip.converted_to_offer = True
        clip.content_type = "job_offer"
        created_offers.append(new_offer)
        
    db.commit()
    return {
        "success": True,
        "syncedCount": len(created_offers),
        "offers": [o.to_dict() for o in created_offers]
    }



@app.post("/api/clips/{clip_id}/convert-to-offer")
async def convert_clip_to_offer(clip_id: str, db: Session = Depends(get_db)):
    """Manually promotes any generic clip into a full PFE Hunter job offer"""
    clip = db.query(ClipVaultModel).filter_by(id=clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    cfg = db.query(AiConfigModel).filter_by(id="default").first()
    api_key = (cfg.api_key if cfg else None) or GROQ_API_KEY
    model = (cfg.model if cfg else None) or DEFAULT_MODEL

    analyzed = await analyze_offer(
        raw_text=clip.content,
        api_key=api_key,
        model=model,
    )

    offer_id = f"offer-from-clip-{int(datetime.utcnow().timestamp()*1000)}"
    cat_id = analyzed.get("category") or "dev-fullstack"
    db_cat = db.query(CategoryModel).filter_by(id=cat_id).first()
    cv_tag = db_cat.default_cv_tag if db_cat else "CV - General"

    new_offer = OfferModel(
        id=offer_id,
        title=analyzed.get("title") or clip.title,
        company=analyzed.get("company") or "",
        location=analyzed.get("location") or "",
        category=cat_id,
        category_reasoning=analyzed.get("categoryReasoning") or f"Converted from clip #{clip_id[:8]}",
        channel=analyzed.get("channel") or "external",
        recruiter_email=analyzed.get("recruiterEmail") or "",
        recruiter_name=analyzed.get("recruiterName") or "",
        sharer_json=json.dumps(analyzed.get("sharer") or {}),
        skills_json=json.dumps(analyzed.get("skills") or []),
        description=analyzed.get("description") or clip.content,
        source_url=clip.source_url or analyzed.get("sourceUrl") or "",
        status="saved",
        attached_cv_tag=cv_tag,
        confidence=float(analyzed.get("confidence") or 0.88),
        needs_user_review=True,
        linked_in_note=analyzed.get("linkedInNote") or "",
        whats_app_msg=analyzed.get("whatsAppMsg") or "",
        notes=f"Converted from clipboard vault ({clip.source_domain})",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    clip.converted_to_offer = True
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return {"success": True, "offer": new_offer.to_dict()}


@app.patch("/api/clips/{clip_id}/star")
def toggle_star_clip(clip_id: str, db: Session = Depends(get_db)):
    clip = db.query(ClipVaultModel).filter_by(id=clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    clip.is_starred = not clip.is_starred
    clip.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return {"success": True, "id": clip_id, "isStarred": clip.is_starred}


@app.delete("/api/clips/{clip_id}")
def delete_clip(clip_id: str, db: Session = Depends(get_db)):
    clip = db.query(ClipVaultModel).filter_by(id=clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    db.delete(clip)
    db.commit()
    return {"success": True, "id": clip_id}


# ==============================================================================
# SCRAPER ENDPOINT
# ==============================================================================

@app.get("/api/scrape")
async def scrape_endpoint(url: str = Query(..., description="Target LinkedIn or job portal URL")):
    result = await scrape_url_metadata(url)
    return result


# ==============================================================================
# SERVE PRODUCTION WEB BUILD (FastAPI Serves Both API & React Web App on Port 8003)
# ==============================================================================
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_path = None
for cand in [
    Path(__file__).resolve().parent.parent / "dist",
    Path(__file__).resolve().parent / "dist",
    Path("/app/dist"),
    Path("dist")
]:
    if cand.exists() and (cand / "index.html").exists():
        dist_path = cand
        break

if dist_path:
    logger.info(f"Serving production web frontend from {dist_path}")
    if (dist_path / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        target_file = dist_path / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(dist_path / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)

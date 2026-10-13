import json
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Boolean, Integer, DateTime
from .database import Base

class OfferModel(Base):
    __tablename__ = "offers"

    id = Column(String(100), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), default="")
    location = Column(String(255), default="")
    category = Column(String(100), default="dev-fullstack", index=True)
    category_reasoning = Column(Text, default="")
    channel = Column(String(50), default="email", index=True)
    recruiter_email = Column(String(255), default="")
    recruiter_name = Column(String(255), default="")
    sharer_json = Column(Text, default="{}")
    skills_json = Column(Text, default="[]")
    description = Column(Text, default="")
    source_url = Column(Text, default="")
    image_url = Column(Text, default="")
    status = Column(String(50), default="saved", index=True)
    attached_cv_tag = Column(String(255), default="")
    attached_cv_id = Column(String(100), default="")
    confidence = Column(Float, default=0.9)
    needs_user_review = Column(Boolean, default=False)
    top3_guesses_json = Column(Text, default="[]")
    linked_in_note = Column(Text, default="")
    whats_app_msg = Column(Text, default="")
    custom_email_subject = Column(String(255), default="")
    custom_email_body = Column(Text, default="")
    custom_cover_letter = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        sharer = {}
        skills = []
        top3 = []
        try:
            sharer = json.loads(self.sharer_json) if self.sharer_json else {}
        except Exception:
            pass
        try:
            skills = json.loads(self.skills_json) if self.skills_json else []
        except Exception:
            pass
        try:
            top3 = json.loads(self.top3_guesses_json) if self.top3_guesses_json else []
        except Exception:
            pass

        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "category": self.category,
            "categoryReasoning": self.category_reasoning,
            "channel": self.channel,
            "recruiterEmail": self.recruiter_email,
            "recruiterName": self.recruiter_name,
            "sharer": sharer,
            "skills": skills,
            "description": self.description,
            "sourceUrl": self.source_url,
            "imageUrl": self.image_url,
            "status": self.status,
            "attachedCvTag": self.attached_cv_tag,
            "attachedCvId": self.attached_cv_id,
            "confidence": self.confidence,
            "needsUserReview": bool(self.needs_user_review),
            "top3Guesses": top3,
            "linkedInNote": self.linked_in_note,
            "whatsAppMsg": self.whats_app_msg,
            "customEmailSubject": self.custom_email_subject,
            "customEmailBody": self.custom_email_body,
            "customCoverLetter": self.custom_cover_letter,
            "notes": self.notes,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class CvVaultModel(Base):
    __tablename__ = "cv_vault"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="")
    file_name = Column(String(255), default="")
    file_size = Column(String(50), default="180 KB")
    is_default = Column(Boolean, default=False)
    updated_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "fileName": self.file_name,
            "fileSize": self.file_size,
            "isDefault": bool(self.is_default),
            "updatedAt": self.updated_at,
        }


class UserProfileModel(Base):
    __tablename__ = "user_profile"

    id = Column(String(50), primary_key=True, default="default")
    full_name = Column(String(255), default="Khalil Ingénieur PFE")
    headline = Column(String(255), default="Élève Ingénieur en Génie Logiciel & IA")
    email = Column(String(255), default="khalil.pfe@gmail.com")
    phone = Column(String(100), default="+33 6 12 34 56 78")
    whatsapp = Column(String(100), default="+33 6 12 34 56 78")
    linkedin = Column(String(255), default="https://linkedin.com/in/khalil-pfe")
    github = Column(String(255), default="https://github.com/khalil-dev")
    portfolio = Column(String(255), default="https://khalil.dev")
    degree = Column(String(255), default="Master 2 / Diplôme d'Ingénieur en Génie Logiciel & IA")
    city = Column(String(255), default="Paris, France / Télétravail")
    skills = Column(Text, default="Python, PyTorch, LLMs, NLP, React, FastAPI, Docker, PostgreSQL")
    projects = Column(Text, default="Agentic AI Workflows, NLP Semantic Search, PFE Command Center")
    tone_preference = Column(String(100), default="Direct, confident, technical, and high-impact")
    custom_instructions = Column(Text, default="Prioritize NLP, Generative AI, and software engineering roles.")
    bio = Column(Text, default="Futur ingénieur passionné par le traitement du langage naturel et l'ingénierie logicielle.")
    custom_links_json = Column(Text, default="[]")
    updated_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        links = []
        try:
            links = json.loads(self.custom_links_json) if self.custom_links_json else []
        except Exception:
            pass

        return {
            "fullName": self.full_name,
            "headline": self.headline,
            "email": self.email,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "linkedIn": self.linkedin,
            "github": self.github,
            "portfolio": self.portfolio,
            "degree": self.degree,
            "city": self.city,
            "skills": self.skills,
            "projects": self.projects,
            "tonePreference": self.tone_preference,
            "customInstructions": self.custom_instructions,
            "bio": self.bio,
            "customLinks": links,
        }


class AiConfigModel(Base):
    __tablename__ = "ai_config"

    id = Column(String(50), primary_key=True, default="default")
    api_key = Column(String(255), default="")
    model = Column(String(100), default="openai/gpt-oss-120b")
    provider = Column(String(50), default="groq")
    temperature = Column(Float, default=0.25)
    custom_system_prompt = Column(Text, default="")
    updated_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        return {
            "apiKey": self.api_key,
            "model": self.model or "openai/gpt-oss-120b",
            "provider": self.provider or "groq",
            "temperature": self.temperature if self.temperature is not None else 0.25,
            "customSystemPrompt": self.custom_system_prompt or "",
        }


class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(String(100), primary_key=True)
    label = Column(String(255), nullable=False)
    short_label = Column(String(100), nullable=False)
    color = Column(String(50), default="#3b82f6")
    bg_color = Column(String(100), default="rgba(59, 130, 246, 0.12)")
    border_color = Column(String(100), default="rgba(59, 130, 246, 0.35)")
    default_cv_tag = Column(String(255), default="")
    keywords_json = Column(Text, default="[]")
    is_custom = Column(Boolean, default=False)
    updated_at = Column(String(100), default=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        kw = []
        try:
            kw = json.loads(self.keywords_json) if self.keywords_json else []
        except Exception:
            pass
        return {
            "id": self.id,
            "label": self.label,
            "shortLabel": self.short_label,
            "color": self.color,
            "bgColor": self.bg_color,
            "borderColor": self.border_color,
            "defaultCvTag": self.default_cv_tag,
            "keywords": kw,
            "isCustom": bool(self.is_custom),
            "updatedAt": self.updated_at,
        }


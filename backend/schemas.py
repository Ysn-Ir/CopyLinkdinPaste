from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class SharerSchema(BaseModel):
    name: Optional[str] = ""
    title: Optional[str] = ""
    profileUrl: Optional[str] = ""
    phone: Optional[str] = ""

class OfferSchema(BaseModel):
    id: Optional[str] = None
    title: str
    company: Optional[str] = ""
    location: Optional[str] = ""
    category: Optional[str] = "dev-fullstack"
    categoryReasoning: Optional[str] = ""
    channel: Optional[str] = "email"
    recruiterEmail: Optional[str] = ""
    recruiterName: Optional[str] = ""
    sharer: Optional[Dict[str, Any]] = None
    skills: Optional[List[str]] = []
    description: Optional[str] = ""
    sourceUrl: Optional[str] = ""
    imageUrl: Optional[str] = ""
    status: Optional[str] = "saved"
    attachedCvTag: Optional[str] = ""
    attachedCvId: Optional[str] = ""
    confidence: Optional[float] = 0.9
    needsUserReview: Optional[bool] = False
    top3Guesses: Optional[List[str]] = []
    linkedInNote: Optional[str] = ""
    whatsAppMsg: Optional[str] = ""
    customEmailSubject: Optional[str] = ""
    customEmailBody: Optional[str] = ""
    customCoverLetter: Optional[str] = ""
    notes: Optional[str] = ""
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class BatchSyncOffersSchema(BaseModel):
    offers: List[OfferSchema]

class UserProfileSchema(BaseModel):
    fullName: Optional[str] = ""
    headline: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    linkedIn: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""
    degree: Optional[str] = ""
    city: Optional[str] = ""
    skills: Optional[str] = ""
    projects: Optional[str] = ""
    tonePreference: Optional[str] = ""
    customInstructions: Optional[str] = ""
    bio: Optional[str] = ""
    customLinks: Optional[List[Dict[str, Any]]] = []

class CvItemSchema(BaseModel):
    id: str
    name: str
    category: Optional[str] = ""
    fileName: Optional[str] = ""
    fileSize: Optional[str] = "180 KB"
    isDefault: Optional[bool] = False

class AiConfigSchema(BaseModel):
    apiKey: Optional[str] = ""
    model: Optional[str] = "openai/gpt-oss-120b"
    provider: Optional[str] = "groq"
    temperature: Optional[float] = 0.25
    customSystemPrompt: Optional[str] = ""

class AiPromptRequest(BaseModel):
    prompt: str
    systemPrompt: Optional[str] = ""
    model: Optional[str] = None
    temperature: Optional[float] = 0.3
    apiKey: Optional[str] = None

class AiAnalyzeRequest(BaseModel):
    text: str
    candidateProfile: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    apiKey: Optional[str] = None
    categories: Optional[List[Dict[str, Any]]] = None

class CategorySchema(BaseModel):
    id: Optional[str] = None
    label: str
    shortLabel: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    bgColor: Optional[str] = "rgba(59, 130, 246, 0.12)"
    borderColor: Optional[str] = "rgba(59, 130, 246, 0.35)"
    defaultCvTag: Optional[str] = ""
    keywords: Optional[List[str]] = []
    isCustom: Optional[bool] = True

class ClipIngestSchema(BaseModel):
    content: str
    sourceUrl: Optional[str] = ""
    sourceDomain: Optional[str] = ""
    sourceDevice: Optional[str] = "desktop"
    copiedAt: Optional[str] = None

class ClipSchema(BaseModel):
    id: Optional[str] = None
    content: str
    contentType: Optional[str] = "note"
    title: Optional[str] = ""
    summary: Optional[str] = ""
    sourceUrl: Optional[str] = ""
    sourceDomain: Optional[str] = "clipboard"
    sourceDevice: Optional[str] = "desktop"
    tags: Optional[List[str]] = []
    entities: Optional[Dict[str, Any]] = {}
    isStarred: Optional[bool] = False
    convertedToOffer: Optional[bool] = False
    copiedAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class AiChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    candidateProfile: Optional[Dict[str, Any]] = None
    offers: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.5
    apiKey: Optional[str] = None

class ClipOcrRequest(BaseModel):
    imageBase64: str
    sourceUrl: Optional[str] = ""
    sourceDevice: Optional[str] = "mobile"

class BulkIngestSchema(BaseModel):
    rawText: Optional[str] = ""
    raw_text: Optional[str] = None
    content: Optional[str] = None
    urls: Optional[List[str]] = []
    sourceDevice: Optional[str] = "desktop"




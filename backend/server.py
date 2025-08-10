from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import re
from PyPDF2 import PdfReader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------- Models ---------------------- #
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    answer_index: int
    qtype: str = "mcq"

    model_config = {
        "extra": "ignore"
    }

class Flashcard(BaseModel):
    front: str
    back: str

    model_config = {"extra": "ignore"}

class StudyPlanDay(BaseModel):
    day: int
    title: str
    objectives: List[str]

    model_config = {"extra": "ignore"}

class StudyContent(BaseModel):
    id: str
    title: str
    text: str
    created_at: datetime
    quiz: List[QuizQuestion]
    flashcards: List[Flashcard]
    plan: List[StudyPlanDay]

    model_config = {"extra": "ignore"}

# ---------------------- Utils ---------------------- #
STOPWORDS = set(
    """
    a an and are as at be by for from has have if in into is it its of on that the to was were will with this those these your you i we our us their they them he she his her or nor not but than then so too very can just should would could about above after again against all am any because been before being below between both did do does doing down during each few further here how more most other over own same some such under until up very what when where which while who whom why yourself themselves itself ourselves myself themselves don't can't won't shouldn't couldn't isn't aren't wasn't weren't i'm you're we're they're it's that's there's here's what's who's couldn't didn't haven't hasn't hadn't doesn't don't doesn't shouldn't wouldn't won't mustn't mightn't needn't
    """.split()
)

SENT_SPLIT = re.compile(r"(?&lt;![A-Z])[\.\?\!]+\s+")
TOKEN = re.compile(r"[A-Za-z][A-Za-z\-']+")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from io import BytesIO
        reader = PdfReader(BytesIO(file_bytes))
        pages_text = []
        for p in reader.pages:
            try:
                pages_text.append(p.extract_text() or "")
            except Exception:
                continue
        return "\n".join(pages_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")


def split_sentences(text: str) -&gt; List[str]:
    # A simple sentence splitter
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return []
    # Split on .?! followed by space
    parts = re.split(r"(?&lt;=[\.!\?])\s+", text)
    # Filter very short sentences
    return [s.strip() for s in parts if len(s.strip()) &gt;= 30]


def tokenize(text: str) -&gt; List[str]:
    return [t.lower() for t in TOKEN.findall(text)]


def top_keywords(text: str, k: int = 12) -&gt; List[str]:
    freq: Dict[str, int] = {}
    for tok in tokenize(text):
        if tok in STOPWORDS:
            continue
        if len(tok) &lt; 3:
            continue
        freq[tok] = freq.get(tok, 0) + 1
    # sort by frequency desc then alphabetically
    candidates = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    return [w for w, _ in candidates[:k]]


def build_quiz(sentences: List[str], keywords: List[str], total: int = 10) -&gt; List[QuizQuestion]:
    import random
    random.seed(42)
    quiz: List[QuizQuestion] = []
    used_keys = set()
    distract_pool = [k for k in keywords]

    for s in sentences:
        if len(quiz) &gt;= total:
            break
        # find a keyword present in sentence
        key = None
        for k in keywords:
            if k in used_keys:
                continue
            # basic word boundary search
            if re.search(rf"\b{re.escape(k)}\b", s, flags=re.IGNORECASE):
                key = k
                break
        if not key:
            continue
        used_keys.add(key)
        qtext = re.sub(rf"\b{re.escape(key)}\b", "_____", s, flags=re.IGNORECASE)
        # options: correct + 3 random distractors
        distractors = [d for d in distract_pool if d != key]
        random.shuffle(distractors)
        options = [key] + distractors[:3]
        random.shuffle(options)
        answer_index = options.index(key)
        quiz.append(
            QuizQuestion(
                id=str(uuid.uuid4()),
                question=qtext,
                options=options,
                answer_index=answer_index,
                qtype="mcq",
            )
        )
    # If not enough, fallback to True/False type based on sentences
    i = 0
    while len(quiz) &lt; total and i &lt; len(sentences):
        s = sentences[i]
        i += 1
        stmt = s if len(s) &lt;= 180 else s[:177] + "..."
        options = ["True", "False"]
        quiz.append(
            QuizQuestion(
                id=str(uuid.uuid4()),
                question=f"True/False: {stmt}",
                options=options,
                answer_index=0,
                qtype="tf",
            )
        )
    return quiz[:total]


def build_flashcards(sentences: List[str], keywords: List[str], total: int = 12) -&gt; List[Flashcard]:
    cards: List[Flashcard] = []
    used = set()
    for k in keywords:
        if len(cards) &gt;= total:
            break
        # find a supporting sentence
        support = next((s for s in sentences if re.search(rf"\b{re.escape(k)}\b", s, flags=re.IGNORECASE)), None)
        if not support:
            continue
        if k in used:
            continue
        used.add(k)
        front = f"Define: {k}"
        back = support if len(support) &lt;= 280 else support[:277] + "..."
        cards.append(Flashcard(front=front, back=back))
    # if not enough, add generic concept questions
    while len(cards) &lt; total and sentences:
        s = sentences[len(cards) % len(sentences)]
        cards.append(Flashcard(front="Key idea?", back=s if len(s) &lt;= 280 else s[:277] + "..."))
    return cards[:total]


def build_study_plan(sentences: List[str], keywords: List[str]) -&gt; List[StudyPlanDay]:
    days = 7
    total = max(len(sentences), days)
    per_day = max(1, total // days)
    plan: List[StudyPlanDay] = []
    for d in range(days):
        start = d * per_day
        end = start + per_day
        chunk = sentences[start:end] if start &lt; len(sentences) else []
        # objectives: first 3 sentences short or keyword-based
        objectives: List[str] = []
        for s in chunk[:3]:
            short = s if len(s) &lt;= 120 else s[:117] + "..."
            objectives.append(short)
        # if too few sentences, pad with keywords
        if len(objectives) &lt; 3:
            pad = [f"Review concept: {k}" for k in keywords[d: d + (3 - len(objectives))]]
            objectives.extend(pad)
        title = f"Day {d+1}: {keywords[d%len(keywords)] if keywords else 'Focus'}"
        plan.append(StudyPlanDay(day=d+1, title=title, objectives=objectives))
    return plan


def generate_artifacts(raw_text: str, title: Optional[str] = None) -&gt; Dict[str, Any]:
    text = raw_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty content")
    # limit extremely long inputs to keep it fast
    if len(text) &gt; 150000:
        text = text[:150000]
    sentences = split_sentences(text)
    if not sentences:
        # create pseudo-sentences by chunking
        sentences = [text[i:i+160] for i in range(0, min(len(text), 2000), 160)]
    keywords = top_keywords(text, k=14)
    quiz = build_quiz(sentences, keywords, total=10)
    flashcards = build_flashcards(sentences, keywords, total=12)
    plan = build_study_plan(sentences, keywords)
    return {
        "title": title or (sentences[0][:40] + "..." if sentences else "Untitled"),
        "quiz": [q.model_dump() for q in quiz],
        "flashcards": [c.model_dump() for c in flashcards],
        "plan": [p.model_dump() for p in plan],
        "text": text,
    }

# ---------------------- Routes ---------------------- #
@api_router.get("/")
async def root():
    return {"message": "Study Generator API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/generate")
async def generate(
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
    title: Optional[str] = Form(default=None),
):
    # Accept either a PDF file or raw text
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide a PDF file or text content")

    extracted = ""
    if file is not None:
        # Only accept PDF for now
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported in MVP")
        content = await file.read()
        extracted = extract_text_from_pdf(content)
    if text:
        extracted = (extracted + "\n" + text) if extracted else text

    payload = generate_artifacts(extracted, title=title)
    doc = {
        "id": str(uuid.uuid4()),
        "title": payload["title"],
        "text": payload["text"],
        "created_at": datetime.utcnow(),
        "quiz": payload["quiz"],
        "flashcards": payload["flashcards"],
        "plan": payload["plan"],
    }
    await db.study_contents.insert_one(doc)
    payload["id"] = doc["id"]
    return JSONResponse(payload)

@api_router.get("/content/{content_id}")
async def get_content(content_id: str):
    doc = await db.study_contents.find_one({"id": content_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    return doc

@api_router.get("/recent")
async def recent():
    items = await db.study_contents.find({}, {"_id": 0, "id": 1, "title": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)
    return items

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
import os
import uuid
import json
import re
import base64
import datetime
import aiofiles
import requests as http_requests

from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from dotenv import load_dotenv

from database import engine, Base, get_db, test_connection
from models import FileRecord, Expense

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-3.1-flash-lite:generateContent?key=" + GEMINI_API_KEY
)

test_connection()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartSpend API")

# CORS must be registered before any routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://smartspend-expense-tracker.vercel.app",
        "https://ai-expense.h4harsh.me",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CHUNKS_DIR = os.path.join(BASE_DIR, "uploads", "chunks")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHUNKS_DIR, exist_ok=True)

print("[startup] UPLOAD_DIR =", UPLOAD_DIR)
print("[startup] CHUNKS_DIR =", CHUNKS_DIR)

app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg":  ".jpg",
    "image/png":  ".png",
    "image/webp": ".webp",
    "image/gif":  ".gif",
}


def get_extension(original_name, mime_type):
    ext = os.path.splitext(original_name)[1].lower().strip()
    if ext and len(ext) > 1:
        return ext
    return MIME_TO_EXT.get(mime_type.lower(), ".jpg")


# ── HEALTH ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "SmartSpend API running"}


# ── CHUNK UPLOAD ──────────────────────────────────────────────

@app.post("/upload-chunk")
async def upload_chunk(
    file:          UploadFile = File(...),
    upload_id:     str        = Form(...),
    chunk_index:   int        = Form(...),
    total_chunks:  int        = Form(...),
    original_name: str        = Form(...),
    mime_type:     str        = Form(...),
    db:            Session    = Depends(get_db),
):
    # Read and save this chunk
    data       = await file.read()
    chunk_path = os.path.join(CHUNKS_DIR, upload_id + "_chunk_" + str(chunk_index))

    async with aiofiles.open(chunk_path, "wb") as f:
        await f.write(data)

    print("[chunk]", chunk_index + 1, "/", total_chunks, "saved — upload_id:", upload_id)

    # Not final chunk
    if chunk_index < total_chunks - 1:
        return {
            "done":    False,
            "message": "Chunk " + str(chunk_index + 1) + " of " + str(total_chunks) + " received",
        }

    # Final chunk — assemble
    print("[chunk] Final chunk. Assembling:", original_name)

    ext         = get_extension(original_name, mime_type)
    stored_name = uuid.uuid4().hex + ext
    final_path  = os.path.join(UPLOAD_DIR, stored_name)

    print("[chunk] stored_name:", stored_name)
    print("[chunk] final_path:", final_path)

    async with aiofiles.open(final_path, "wb") as out:
        for i in range(total_chunks):
            part = os.path.join(CHUNKS_DIR, upload_id + "_chunk_" + str(i))
            if not os.path.exists(part):
                raise HTTPException(status_code=400, detail="Missing chunk " + str(i))
            async with aiofiles.open(part, "rb") as p:
                await out.write(await p.read())
            os.remove(part)

    size = os.path.getsize(final_path)
    print("[chunk] Assembly complete. Size:", size, "bytes")

    record = FileRecord(
        original_name=original_name,
        stored_name=stored_name,
        file_path=final_path,
        file_type=mime_type,
        file_size=size,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    print("[chunk] DB record saved. file_id:", record.id)

    return {
        "done":          True,
        "message":       "Upload complete",
        "file_id":       record.id,
        "original_name": record.original_name,
        "stored_name":   record.stored_name,
        "file_size":     record.file_size,
        "image_url":     "/files/" + record.stored_name,
    }


# ── FILES LIST ────────────────────────────────────────────────

@app.get("/files-list")
def files_list(db: Session = Depends(get_db)):
    records = db.query(FileRecord).order_by(FileRecord.uploaded_at.desc()).all()
    return [
        {
            "id":            r.id,
            "original_name": r.original_name,
            "file_type":     r.file_type,
            "file_size":     r.file_size,
            "uploaded_at":   r.uploaded_at,
            "image_url":     "/files/" + r.stored_name,
        }
        for r in records
    ]


# ── DOWNLOAD ──────────────────────────────────────────────────

@app.get("/download-file/{file_id}")
def download_file(file_id: int, db: Session = Depends(get_db)):
    r = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="File not found")
    path = os.path.join(UPLOAD_DIR, r.stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        path=path,
        media_type=r.file_type,
        filename=r.original_name,
        headers={"Content-Disposition": 'attachment; filename="' + r.original_name + '"'},
    )


# ── DELETE FILE ───────────────────────────────────────────────

@app.delete("/delete-file/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    r = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="File not found")
    path = os.path.join(UPLOAD_DIR, r.stored_name)
    if os.path.exists(path):
        os.remove(path)
    db.delete(r)
    db.commit()
    return {"message": "Deleted " + r.original_name}


# ── GEMINI SCAN ───────────────────────────────────────────────

def build_prompt():
    today = datetime.date.today().strftime("%Y-%m-%d")
    return (
        "Look at this receipt or bill image and extract the expense details.\n"
        "Return ONLY a JSON object with these exact fields:\n"
        "{\n"
        '    "merchant": store or restaurant name as a string or null,\n'
        '    "date": date in YYYY-MM-DD format or null,\n'
        '    "items": [{"name": item name, "price": price as number}],\n'
        '    "total_amount": total amount as a plain number with no currency symbol,\n'
        '    "description": short description of the purchase,\n'
        '    "category": one of Food Travel Shopping Utilities Health Entertainment Other\n'
        "}\n"
        "If any field is not visible use null.\n"
        "If no items are visible return an empty list.\n"
        "Today is " + today + ". Use only if date missing from receipt.\n"
        "Return ONLY the JSON. No markdown. No explanation. No code fences."
    )


def call_gemini(image_path, mime_type):
    print("[gemini] Reading:", image_path)
    print("[gemini] Exists:", os.path.exists(image_path))

    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    body = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                    {"text": build_prompt()},
                ]
            }
        ]
    }

    print("[gemini] Calling Gemini REST API...")
    resp = http_requests.post(GEMINI_URL, json=body, timeout=30)
    print("[gemini] Status:", resp.status_code)

    if resp.status_code != 200:
        print("[gemini] Error:", resp.text[:300])
        return None

    raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    print("[gemini] Raw response (first 400):", raw[:400])

    # Strip code fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > 0:
            try:
                return json.loads(raw[start:end])
            except Exception:
                pass
        print("[gemini] Could not parse JSON from response")
        return None


def clean_result(data):
    if not data:
        return None

    try:
        amt = data.get("total_amount")
        if amt is not None:
            c = re.sub(r"[^\d.]", "", str(amt))
            data["total_amount"] = round(float(c), 2) if c else None
        else:
            data["total_amount"] = None
    except (ValueError, TypeError):
        data["total_amount"] = None

    raw_date = data.get("date")
    if raw_date and str(raw_date).lower() not in ("null", "none", ""):
        m = re.search(r"\d{4}-\d{2}-\d{2}", str(raw_date))
        data["date"] = m.group() if m else datetime.date.today().isoformat()
    else:
        data["date"] = datetime.date.today().isoformat()

    allowed = {"Food", "Travel", "Shopping", "Utilities", "Health", "Entertainment", "Other"}
    if data.get("category") not in allowed:
        data["category"] = "Other"

    if not isinstance(data.get("items"), list):
        data["items"] = []

    m_val = data.get("merchant")
    data["merchant"] = str(m_val).strip() if m_val and str(m_val).lower() not in ("null", "none") else None

    d_val = data.get("description")
    data["description"] = str(d_val).strip() if d_val and str(d_val).lower() not in ("null", "none") else None

    return data


@app.post("/scan-receipt/{file_id}")
def scan_receipt(file_id: int, db: Session = Depends(get_db)):
    r = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="File not found")

    image_path = os.path.join(UPLOAD_DIR, r.stored_name)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found on disk")

    print("[scan] file_id:", file_id, "| path:", image_path)

    raw    = call_gemini(image_path, r.file_type or "image/jpeg")
    result = clean_result(raw)

    if result is None:
        return {
            "merchant":          None,
            "total_amount":      None,
            "date":              None,
            "category":          "Other",
            "items":             [],
            "description":       None,
            "extraction_status": "failed",
            "file_id":           file_id,
            "image_url":         "/files/" + r.stored_name,
            "original_name":     r.original_name,
        }

    result["extraction_status"] = "success"
    result["file_id"]           = file_id
    result["image_url"]         = "/files/" + r.stored_name
    result["original_name"]     = r.original_name
    return result


# ── SAVE EXPENSE ──────────────────────────────────────────────

class ExpenseIn(BaseModel):
    file_id:      int
    merchant:     Optional[str]   = None
    total_amount: Optional[float] = None
    date:         Optional[str]   = None
    category:     str             = "Other"
    description:  Optional[str]   = None
    items:        list            = []
    source:       str             = "AI"


@app.post("/expenses")
def save_expense(data: ExpenseIn, db: Session = Depends(get_db)):
    exp = Expense(
        file_id=data.file_id,
        merchant=data.merchant,
        amount=data.total_amount,
        expense_date=data.date,
        category=data.category,
        description=data.description,
        items=json.dumps(data.items),
        source=data.source,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    print("[expense] Saved. id:", exp.id, "amount:", exp.amount)
    return {"message": "Expense saved", "expense_id": exp.id}


# ── GET EXPENSES ──────────────────────────────────────────────

@app.get("/expenses")
def get_expenses(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    month: Optional[str] = Query(None, description="YYYY-MM"),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sort_by: str = Query("date-desc"),
):
    query = db.query(Expense)

    if month:
        query = query.filter(Expense.expense_date.like(month + "%"))

    if category:
        query = query.filter(Expense.category == category)

    if from_date:
        query = query.filter(Expense.expense_date >= from_date)

    if to_date:
        query = query.filter(Expense.expense_date <= to_date)

    if search:
        like_pattern = "%" + search + "%"
        query = query.filter(
            or_(
                Expense.merchant.ilike(like_pattern),
                Expense.description.ilike(like_pattern),
            )
        )

    sort_map = {
        "date-desc": Expense.expense_date.desc(),
        "date-asc":  Expense.expense_date.asc(),
        "amt-desc":  Expense.amount.desc(),
        "amt-asc":   Expense.amount.asc(),
    }
    query = query.order_by(sort_map.get(sort_by, Expense.expense_date.desc()))

    total_records = query.count()
    total_pages   = max(1, (total_records + page_size - 1) // page_size)

    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for e in rows:
        fr = db.query(FileRecord).filter(FileRecord.id == e.file_id).first()
        items_list = []
        if e.items:
            try:
                items_list = json.loads(e.items)
            except Exception:
                items_list = []
        result.append({
            "id":           e.id,
            "file_id":      e.file_id,
            "merchant":     e.merchant,
            "total_amount": e.amount,
            "date":         e.expense_date,
            "category":     e.category,
            "description":  e.description,
            "items":        items_list,
            "source":       e.source,
            "created_at":   str(e.created_at),
            "image_url":    "/files/" + fr.stored_name if fr else None,
        })

    return {
        "page":          page,
        "page_size":     page_size,
        "total_records": total_records,
        "total_pages":   total_pages,
        "expenses":      result,
    }

# ── DELETE EXPENSE ────────────────────────────────────────────

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(e)
    db.commit()
    return {"message": "Expense deleted"}

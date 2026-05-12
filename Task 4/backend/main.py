import os
import uuid
import aiofiles
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, SessionLocal, Base
from models import FileRecord

# SETUP

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CHUNKS_DIR = os.path.join(BASE_DIR, "uploads", "chunks")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHUNKS_DIR, exist_ok=True)

app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# HEALTH CHECK

@app.get("/")
def root():
    return {"message": "File Manager API is running"}

# BACKGROUND WORKER

async def save_file_background(contents: bytes, file_path: str, record_id: int):
    try:
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(contents)

        db = SessionLocal()
        record = db.query(FileRecord).filter(FileRecord.id == record_id).first()
        if record:
            record.status = "uploaded"
            db.commit()
        db.close()

    except Exception as e:
        db = SessionLocal()
        record = db.query(FileRecord).filter(FileRecord.id == record_id).first()
        if record:
            record.status = "failed"
            db.commit()
        db.close()

# UPLOAD FILE (ASYNC)

@app.post("/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    contents = await file.read()

    extension = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    db = SessionLocal()
    record = FileRecord(
        original_name=file.filename,
        stored_name=stored_name,
        file_path=file_path,
        file_type=file.content_type,
        file_size=len(contents),
        status="uploading",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    db.close()

    background_tasks.add_task(save_file_background, contents, file_path, record.id)

    return {
        "message": "Upload started",
        "file_id": record.id,
        "original_name": record.original_name,
        "status": "uploading",
    }

# LIST ALL FILES

@app.get("/files-list")
def list_files():
    db = SessionLocal()
    files = db.query(FileRecord).order_by(FileRecord.uploaded_at.desc()).all()
    db.close()

    return [
        {
            "id": f.id,
            "original_name": f.original_name,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "status": f.status,
            "uploaded_at": f.uploaded_at,
            "view_url": f"/files/{f.stored_name}",
        }
        for f in files
    ]

# DOWNLOAD FILE

@app.get("/download-file/{file_id}")
def download_file(file_id: int):
    db = SessionLocal()
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    db.close()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = os.path.join(UPLOAD_DIR, record.stored_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        media_type=record.file_type,
        filename=record.original_name,
        headers={"Content-Disposition": f"attachment; filename=\"{record.original_name}\""}
    )

# DELETE FILE

@app.delete("/delete-file/{file_id}")
def delete_file(file_id: int):
    db = SessionLocal()
    record = db.query(FileRecord).filter(FileRecord.id == file_id).first()

    if not record:
        db.close()
        raise HTTPException(status_code=404, detail="File not found")

    file_path = os.path.join(UPLOAD_DIR, record.stored_name)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(record)
    db.commit()
    db.close()

    return {"message": f"File '{record.original_name}' deleted successfully"}

# CHUNK UPLOAD

@app.post("/upload-chunk")
async def upload_chunk(
    file: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    original_name: str = Form(...),
    mime_type: str = Form(...),
):
    chunk_bytes = await file.read()
    chunk_path = os.path.join(CHUNKS_DIR, f"{upload_id}_chunk_{chunk_index}")

    async with aiofiles.open(chunk_path, "wb") as f:
        await f.write(chunk_bytes)

    if chunk_index < total_chunks - 1:
        return {
            "message": f"Chunk {chunk_index + 1} of {total_chunks} received",
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "done": False,
        }

    extension = os.path.splitext(original_name)[1]
    stored_name = f"{uuid.uuid4().hex}{extension}"
    final_path = os.path.join(UPLOAD_DIR, stored_name)

    async with aiofiles.open(final_path, "wb") as final_file:
        for i in range(total_chunks):
            chunk_part_path = os.path.join(CHUNKS_DIR, f"{upload_id}_chunk_{i}")

            if not os.path.exists(chunk_part_path):
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing chunk {i} during assembly."
                )

            async with aiofiles.open(chunk_part_path, "rb") as chunk_file:
                await final_file.write(await chunk_file.read())

            os.remove(chunk_part_path)

    final_size = os.path.getsize(final_path)

    db = SessionLocal()
    record = FileRecord(
        original_name=original_name,
        stored_name=stored_name,
        file_path=final_path,
        file_type=mime_type,
        file_size=final_size,
        status="uploaded",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    db.close()

    return {
        "message": "File assembled and saved successfully",
        "file_id": record.id,
        "original_name": original_name,
        "file_size": final_size,
        "done": True,
    }
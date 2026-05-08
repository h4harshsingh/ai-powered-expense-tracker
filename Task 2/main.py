from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DATABASE CONNECTION
DATABASE_URL = "sqlite:///./notes.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()

# DATABASE TABLE
class NoteDB(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(String)
Base.metadata.create_all(bind=engine)

# REQUEST BODY
class Note(BaseModel):
    title: str
    content: str

# CREATE NOTE API
@app.put("/create-notes")
def create_note(note: Note):
    db = SessionLocal()
    new_note = NoteDB(
        title=note.title,
        content=note.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    db.close()
    return {
        "message": "Note created successfully",
        "data": {
            "id": new_note.id,
            "title": new_note.title,
            "content": new_note.content
        }
    }

# GET NOTES API
@app.get("/get-notes")
def get_notes():
    db = SessionLocal()
    notes = db.query(NoteDB).order_by(NoteDB.id.desc()).all()
    db.close()
    return notes

# UPDATE NOTE API
@app.post("/update-notes/{note_id}")
def update_note(note_id: int, note: Note):
    db = SessionLocal()
    existing_note = db.query(NoteDB).filter(
        NoteDB.id == note_id
    ).first()
    if not existing_note:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )
    existing_note.title = note.title
    existing_note.content = note.content
    db.commit()
    db.close()
    return {
        "message": "Note updated successfully"
    }

# DELETE NOTE API
@app.delete("/delete-notes/{note_id}")
def delete_note(note_id: int):
    db = SessionLocal()
    existing_note = db.query(NoteDB).filter(
        NoteDB.id == note_id
    ).first()
    if not existing_note:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )
    db.delete(existing_note)
    db.commit()
    db.close()
    return {
        "message": "Note deleted successfully"
    }
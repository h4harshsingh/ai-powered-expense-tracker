from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class FileRecord(Base):
    __tablename__ = "files"   # This becomes the table name in SQLite

    id = Column(Integer, primary_key=True, index=True)

    original_name = Column(String)
    # The filename the user uploaded — e.g., "my_receipt.jpg"
    # We store this to show the user their original filename

    stored_name = Column(String)
    # The name we save it as on disk — e.g., "a3f9b2...uuid.jpg"
    # We use UUID to avoid conflicts when two users upload "receipt.jpg"

    file_path = Column(String)
    # Full path on disk — e.g., "uploads/a3f9b2...uuid.jpg"
    # We use this to find and delete the file later

    file_type = Column(String)
    # MIME type — e.g., "image/jpeg", "application/pdf"
    # Useful for the frontend to know how to display the file

    file_size = Column(Integer)
    # Size in bytes — e.g., 45231
    # Useful to display "45.2 KB" in the UI

    status = Column(String, default="uploaded")
    # Tracks upload state — useful in Phase 6 (async uploads)
    # Values: "uploading", "uploaded", "failed"

    uploaded_at = Column(DateTime, default=datetime.utcnow)
    # Timestamp of upload — useful for sorting files by newest first
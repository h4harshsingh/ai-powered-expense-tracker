from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class FileRecord(Base):
    __tablename__ = "files" 

    id = Column(Integer, primary_key=True, index=True)
#update
    original_name = Column(String)

    stored_name = Column(String)

    file_path = Column(String)

    file_type = Column(String)

    file_size = Column(Integer)

    status = Column(String, default="uploaded")

    uploaded_at = Column(DateTime, default=datetime.utcnow)

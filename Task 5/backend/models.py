from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from database import Base


class FileRecord(Base):
    __tablename__ = "files"

    id            = Column(Integer, primary_key=True, index=True)
    original_name = Column(String(255), nullable=False)
    stored_name   = Column(String(255), nullable=False)
    file_path     = Column(Text, nullable=False)
    file_type     = Column(String(100))
    file_size     = Column(Integer)
    uploaded_at   = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id           = Column(Integer, primary_key=True, index=True)
    file_id      = Column(Integer)
    merchant     = Column(String(255))
    amount       = Column(Float)
    expense_date = Column(String(20))
    category     = Column(String(100), default="Other")
    description  = Column(Text)
    items        = Column(Text)              # JSON stored as text
    source       = Column(String(20), default="AI")
    created_at   = Column(DateTime, default=datetime.utcnow)
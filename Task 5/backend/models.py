from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base


class FileRecord(Base):
    __tablename__ = "files"

    id            = Column(Integer, primary_key=True, index=True)
    original_name = Column(String, nullable=False)
    stored_name   = Column(String, nullable=False)
    file_path     = Column(String, nullable=False)
    file_type     = Column(String)
    file_size     = Column(Integer)
    uploaded_at   = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id           = Column(Integer, primary_key=True, index=True)
    file_id      = Column(Integer)
    merchant     = Column(String)
    amount       = Column(Float)
    expense_date = Column(String)
    category     = Column(String, default="Other")
    description  = Column(String)
    items        = Column(String)
    source       = Column(String, default="AI")
    created_at   = Column(DateTime, default=datetime.utcnow)
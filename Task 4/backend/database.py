from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This tells SQLAlchemy to create a SQLite database file
# called "filemanager.db" in the current directory (backend/)
DATABASE_URL = "sqlite:///./filemanager.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
    # check_same_thread=False is required for SQLite when used with FastAPI
    # because FastAPI handles requests across multiple threads
)

# SessionLocal is a factory — every time you call SessionLocal()
# you get a new database session (connection)
SessionLocal = sessionmaker(bind=engine)

# Base is the parent class for all your database models
# When you write "class FileRecord(Base)", SQLAlchemy knows
# FileRecord is a database table
Base = declarative_base()
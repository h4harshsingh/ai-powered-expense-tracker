import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Read DATABASE_URL from .env
# Falls back to SQLite for local development if not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expense_tracker.db")

# PostgreSQL-specific settings
# These are ignored when using SQLite fallback
CONNECT_ARGS = {}
ENGINE_KWARGS = {}

if DATABASE_URL.startswith("postgresql"):
    # pool_pre_ping checks the connection before using it from the pool
    # This prevents "connection closed" errors after idle periods
    ENGINE_KWARGS = {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300,  # recycle connections every 5 minutes
    }
else:
    # SQLite needs this for FastAPI's multi-threaded request handling
    CONNECT_ARGS = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=CONNECT_ARGS,
    **ENGINE_KWARGS
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection():
    """
    Call this on startup to verify database connection.
    If it fails, you'll see a clear error instead of a cryptic one later.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[database] Connection successful ✓")
        print("[database] URL:", DATABASE_URL[:40] + "...")
    except Exception as e:
        print("[database] Connection FAILED:", str(e))
        raise
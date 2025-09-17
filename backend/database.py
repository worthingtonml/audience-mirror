# backend/database.py
import os
from datetime import datetime

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load .env variables (safe if the file doesn't exist)
load_dotenv()

# Build a robust fallback to a local SQLite file next to this module
DB_FILE = os.path.join(os.path.dirname(__file__), "audience_mirror.db")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback when DATABASE_URL is unset or empty
    DATABASE_URL = f"sqlite:///{DB_FILE}"

# Echo off by default; enable if you want SQL logs
engine_kwargs = {"future": True, "echo": False}
if DATABASE_URL.startswith("sqlite"):
    # Needed for SQLite with FastAPI in a single process
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---- Models ----
class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    patients_path = Column(String, nullable=False)
    competitors_path = Column(String, nullable=True)
    practice_zip = Column(String, nullable=False)
    vertical = Column(String, default="medspa")
    created_at = Column(DateTime, default=datetime.utcnow)
    patient_count = Column(Integer, default=0)
    unique_zips = Column(Integer, default=0)

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, nullable=False)
    status = Column(String, default="running")
    focus = Column(String, default="non_inv")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    headline_metrics = Column(JSON, nullable=True)
    top_segments = Column(JSON, nullable=True)
    map_points = Column(JSON, nullable=True)
    confidence_info = Column(JSON, nullable=True)

# ---- Session helper ----
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Create tables ----
def create_tables():
    Base.metadata.create_all(bind=engine)

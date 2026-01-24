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
    dominant_profile = Column(JSON)
    unique_zips = Column(Integer, default=0)
    detected_vertical = Column(String, default="medspa")

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
    procedure = Column(String, nullable=True)
    patient_count = Column(Integer, nullable=True)
    dominant_profile = Column(JSON, nullable=True)
    strategic_insights = Column(JSON, nullable=True)
    filtered_dataset_path = Column(String, nullable=True) 


class PatientOutreach(Base):
    __tablename__ = "patient_outreach"
    id = Column(String, primary_key=True)
    run_id = Column(String, nullable=False)
    patient_id = Column(String, nullable=False)
    segment = Column(String, nullable=True)  # one-and-done, lapsed, vip, referrers, cross-sell
    campaign_name = Column(String, nullable=True)  # User-friendly name like 'Win-back Jan 2026'
    contacted_at = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    revenue_recovered = Column(Float, nullable=True)
    days_stale_when_contacted = Column(Integer, nullable=True)
    outcome = Column(String, nullable=True)  # pending, closed, lost, no_answer, callback
    loan_amount = Column(Float, nullable=True)
    commission = Column(Float, nullable=True)


class WinbackTemplate(Base):
    __tablename__ = "winback_templates"
    
    id = Column(String, primary_key=True)
    treatment = Column(String, nullable=False)
    template_type = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=False)
    times_used = Column(Integer, default=0)
    times_converted = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SMSCampaign(Base):
    __tablename__ = "sms_campaigns"
    
    id = Column(String, primary_key=True)
    run_id = Column(String, nullable=True)
    
    name = Column(String, nullable=True)
    segment = Column(String, nullable=True)
    message_template = Column(Text, nullable=False)
    
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    clicks = Column(Integer, default=0)
    responses = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)


class SMSMessage(Base):
    __tablename__ = "sms_messages"
    
    id = Column(String, primary_key=True)
    campaign_id = Column(String, nullable=False)
    
    twilio_sid = Column(String, nullable=True)
    
    patient_id = Column(String, nullable=True)
    patient_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=False)
    
    message_body = Column(Text, nullable=False)
    
    status = Column(String, default="queued")
    error_code = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

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

    # Auto-add missing columns
    from sqlalchemy import inspect, text

    inspector = inspect(engine)

    # Check patient_outreach table
    existing_columns = [col['name'] for col in inspector.get_columns('patient_outreach')]

    with engine.connect() as conn:
        if 'segment' not in existing_columns:
            conn.execute(text('ALTER TABLE patient_outreach ADD COLUMN segment VARCHAR'))
            conn.commit()
            print("[DB] Added segment column to patient_outreach")
        if 'campaign_name' not in existing_columns:
            conn.execute(text('ALTER TABLE patient_outreach ADD COLUMN campaign_name VARCHAR'))
            conn.commit()
            print("[DB] Added campaign_name column to patient_outreach")

    # Check analysis_runs table
    existing_run_columns = [col['name'] for col in inspector.get_columns('analysis_runs')]

    with engine.connect() as conn:
        if 'filtered_dataset_path' not in existing_run_columns:
            conn.execute(text('ALTER TABLE analysis_runs ADD COLUMN filtered_dataset_path VARCHAR'))
            conn.commit()
            print("[DB] Added filtered_dataset_path column to analysis_runs")

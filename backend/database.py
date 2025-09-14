import os
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
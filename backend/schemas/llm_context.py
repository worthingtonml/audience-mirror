from pydantic import BaseModel
from typing import List, Optional

class SegmentContext(BaseModel):
    """Data passed to LLM for segment explanation"""
    segment_name: str
    patient_count: int
    avg_ltv: float
    avg_visits_per_year: float
    avg_ticket: float
    top_procedures: List[str]
    retention_rate: float
    revenue_contribution_pct: float
    risk_level: str  # "low", "medium", "high"
    
class CampaignContext(BaseModel):
    """Data for campaign generation"""
    segment_name: str
    patient_count: int
    avg_ltv: float
    avg_ticket: float
    top_procedures: List[str]
    target_zips: List[str]
    competition_level: str  # "low", "moderate", "high"
    recommended_budget: float
    target_demographics: str
    practice_name: str
    practice_city: str

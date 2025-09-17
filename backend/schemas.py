from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from datetime import datetime


# Type definitions
FocusType = Literal["non_inv", "surgical"]
StatusType = Literal["pending", "running", "done", "error"]

# Request models
class DatasetCreateRequest(BaseModel):
    practice_zip: str = Field(..., min_length=5, max_length=5)
    vertical: str = "medspa"

class RunCreateRequest(BaseModel):
    dataset_id: str
    focus: FocusType = "non_inv"
    market_trend: float = Field(1.0, ge=0.6, le=1.4)
    capacity_per_week: Optional[int] = Field(None, gt=0)

class ExportCreateRequest(BaseModel):
    run_id: str
    top_n: int = Field(10, ge=1, le=50)

# Response models
class DatasetCreateResponse(BaseModel):
    dataset_id: str

class RunCreateResponse(BaseModel):
    run_id: str

class BookingRange(BaseModel):
    p10: int = Field(..., ge=0)
    p50: int = Field(..., ge=0) 
    p90: int = Field(..., ge=0)

class TopSegment(BaseModel):
    zip: str
    match_score: float = Field(..., ge=0, le=1)
    expected_bookings: BookingRange
    distance_miles: float = Field(..., ge=0)
    competitors: int = Field(..., ge=0)
    cohort: str
    why: List[str] = Field(..., min_items=1, max_items=5)
    lat: Optional[float] = None
    lon: Optional[float] = None
    historical_patients: int = Field(..., ge=0)
    is_new_market: bool = False

class HeadlineMetrics(BaseModel):
    total_patients: int = Field(..., ge=0)
    total_revenue: float = Field(..., ge=0)
    avg_revenue: float = Field(..., ge=0)
    high_value_count: int = Field(..., ge=0)
    unique_zips: int = Field(..., ge=0)
    expansion_metrics: Optional[Dict] = None

class MapPoint(BaseModel):
    zip: str
    lat: float
    lon: float
    score: float = Field(..., ge=0, le=1)

class CalibrationMeta(BaseModel):
    mode: str
    n_calib: int
    confidence: str

class RunResult(BaseModel):
    status: StatusType = "done"
    headline_metrics: HeadlineMetrics
    top_segments: List[TopSegment]
    map_points: List[MapPoint]
    confidence_info: dict
    calibration_meta: Optional[CalibrationMeta] = None
    expansion_metrics: dict = {}

class ExportUrls(BaseModel):
    facebook_url: str
    google_url: str
    full_report_url: str
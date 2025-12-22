from dotenv import load_dotenv
import os

load_dotenv()
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import requests
import uuid
import json
import io
from typing import Optional, Dict, Any, Union
import statistics

import numpy as np
import pandas as pd
from datetime import datetime

import fastapi
from fastapi import UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sklearn.isotonic import IsotonicRegression
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis
import hashlib
from routers import procedures as procedures_router

from services.llm_service import llm_service
from schemas.llm_context import SegmentContext, CampaignContext

from schemas import *
from pydantic import BaseModel
from services.data_loaders import (
    validate_and_load_patients, load_competitors_csv,
    load_vertical_config
)


from services.scoring import (
    compute_accessibility_score, fit_lifestyle_cohorts,
    calculate_psychographic_scores, learn_ridge_regression,
    calibrate_booking_predictions, generate_segment_explanations, validate_zip_recommendation_accuracy,
    generate_llm_explanations
)
from services.churn_scoring import calculate_churn_risk, get_churn_summary, analyze_patient_churn
from services.verticals import detect_vertical, get_vertical, get_prompt_context
from services.validate import validate_algorithm_accuracy
from database import get_db, Dataset, AnalysisRun, PatientOutreach, create_tables

from sqlalchemy.orm import Session
from routers import patient_intel as patient_intel_router




class CampaignRequest(BaseModel):
    cohort: str
    zip_code: str
    competitors: int
    reasons: list[str]
    match_score: float
    procedure: Optional[str] = None

class DatasetCreateResponse(BaseModel):
    dataset_id: str
    message: str
    
class RunCreateRequest(BaseModel):
    dataset_id: str
    vertical: str = "medspa"
    focus: Optional[str] = None
    
class ExportCreateRequest(BaseModel):
    run_id: str
    top_n: int = 10
    format: str = "csv"

# NEW FUNCTION - Add this here
def calculate_campaign_metrics(top_segments, demographic_profile, cohort_label):
    """
    Calculate real campaign metrics instead of hardcoding
    """
    # Calculate expected timeline based on market density & competition
    avg_competition = statistics.mean([seg.get('competitors', 0) for seg in top_segments]) if top_segments else 0
    avg_population = statistics.mean([seg.get('population', 20000) for seg in top_segments]) if top_segments else 20000
    
    # More competition + lower population = longer timeline
    if avg_competition >= 5 or avg_population < 15000:
        timeline_weeks_min = 3
        timeline_weeks_max = 6
    elif avg_competition >= 3:
        timeline_weeks_min = 2
        timeline_weeks_max = 5
    else:
        timeline_weeks_min = 2
        timeline_weeks_max = 4
    
    # Calculate success rate based on actual demographic match
    behavioral_match = demographic_profile.get('behavioral_match_pct', 50)
    psychographic_match = demographic_profile.get('psychographic_match_pct', 50)
    
    # Higher match = higher success rate
    avg_match = (behavioral_match + psychographic_match) / 2
    
    if avg_match >= 70:
        success_rate = 94  # High confidence
    elif avg_match >= 60:
        success_rate = 87
    elif avg_match >= 50:
        success_rate = 78
    else:
        success_rate = 65
    
    # Determine best platform based on demographics
    age_indicators = cohort_label.lower() if cohort_label else ''
    
    if 'young professional' in age_indicators or 'millennial' in age_indicators:
        best_platform = 'Facebook'
        platform_success_rate = 94
    elif 'affluent' in age_indicators or 'executive' in age_indicators:
        best_platform = 'Instagram'
        platform_success_rate = 89
    elif 'family' in age_indicators or 'suburban' in age_indicators:
        best_platform = 'Facebook'
        platform_success_rate = 91
    else:
        best_platform = 'Facebook'
        platform_success_rate = 85
    
    # Calculate dynamic budget percentage based on competition
    if avg_competition >= 5:
        budget_percentage = 0.25  # Need more spend in competitive markets
    elif avg_competition >= 3:
        budget_percentage = 0.22
    else:
        budget_percentage = 0.20
    
    # Calculate ad variation count based on ZIP diversity
    unique_income_levels = len(set([
        round(seg.get('median_income', 75000) / 10000) 
        for seg in top_segments
    ])) if top_segments else 1
    
    # More diverse ZIPs = more ad variations needed
    variations_per_zip = 2 if unique_income_levels <= 2 else 3
    
    return {
        'timeline_weeks_min': timeline_weeks_min,
        'timeline_weeks_max': timeline_weeks_max,
        'success_rate': success_rate,
        'best_platform': best_platform,
        'platform_success_rate': platform_success_rate,
        'budget_percentage': budget_percentage,
        'variations_per_zip': variations_per_zip,
        'confidence_level': 'high' if avg_match >= 70 else 'medium' if avg_match >= 60 else 'moderate'
    }

def normalize_zip(z) -> str:
    """Convert any ZIP code format to clean 5-digit string"""
    try:
        z_str = str(z).strip()
        z_clean = ''.join(ch for ch in z_str if ch.isdigit())
        return z_clean.zfill(5) if z_clean else "00000"
    except:
        return "00000"

def coerce_float(x, default=0.0):
    """Safely convert to float with fallback"""
    try:
        if pd.isna(x) or x is None:
            return default
        return float(x)
    except:
        return default

def normalize_patients_dataframe(df):
    """Clean up patients dataframe with safe type conversion"""
    df = df.copy()
    
    if 'zip_code' in df.columns:
        print(f"[CLEAN] Normalizing {len(df)} ZIP codes")
        df['zip_code'] = df['zip_code'].apply(normalize_zip)
        print(f"[CLEAN] Sample ZIPs after cleaning: {df['zip_code'].head(3).tolist()}")
    
    if 'revenue' in df.columns:
        original_nulls = df['revenue'].isna().sum()
        df['revenue'] = df['revenue'].apply(lambda x: coerce_float(x, 500.0))
        print(f"[CLEAN] Revenue: {original_nulls} null values, filled with $500 default")
    
    return df

# ============================================================================
# STEP 1: ADD THIS FUNCTION AFTER normalize_patients_dataframe()
# ============================================================================
def aggregate_visits_to_patients(df: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse visit-level rows into patient-level rows.
    
    Input: One row per visit
    Output: One row per patient with aggregated metrics
    """
    patient_id_col = 'patient_id' if 'patient_id' in df.columns else None
    amount_col = next((c for c in ['amount', 'revenue', 'total'] if c in df.columns), None)
    date_col = next((c for c in ['visit_date', 'date', 'appointment_date'] if c in df.columns), None)
    treatment_col = next((c for c in ['treatment', 'procedure', 'service'] if c in df.columns), None)
    
    if not patient_id_col:
        print("[AGGREGATE] No patient_id column found - assuming rows are already patient-level")
        return df
    
    if df[patient_id_col].nunique() == len(df):
        print(f"[AGGREGATE] All {len(df)} rows have unique patient_id - no aggregation needed")
        return df
    
    print(f"[AGGREGATE] Collapsing {len(df)} visits into {df[patient_id_col].nunique()} patients")
    
    agg_dict = {}
    
    if amount_col:
        agg_dict[amount_col] = 'sum'
    
    if date_col:
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        agg_dict[date_col] = ['min', 'max', 'count']
    
    if treatment_col:
        agg_dict[treatment_col] = lambda x: ', '.join(sorted(set(str(v) for v in x.dropna())))
    
    static_cols = ['zip_code', 'dob', 'date_of_birth', 'gender', 'email', 'phone', 'city', 'state']
    for col in static_cols:
        if col in df.columns and col not in agg_dict:
            agg_dict[col] = 'first'
    
    grouped = df.groupby(patient_id_col, as_index=False).agg(agg_dict)
    
    new_cols = []
    for col in grouped.columns:
        if isinstance(col, tuple):
            if col[1] == 'sum':
                new_cols.append('revenue')
            elif col[1] == 'min':
                new_cols.append('first_visit')
            elif col[1] == 'max':
                new_cols.append('last_visit')
            elif col[1] == 'count':
                new_cols.append('visit_count')
            elif col[1] == '<lambda>':
                new_cols.append('treatments_received')
            elif col[1] == 'first':
                new_cols.append(col[0])
            else:
                new_cols.append(f"{col[0]}_{col[1]}")
        else:
            new_cols.append(col)
    grouped.columns = new_cols
    
    if 'revenue' not in grouped.columns and amount_col and amount_col in grouped.columns:
        grouped = grouped.rename(columns={amount_col: 'revenue'})
    
    if 'first_visit' in grouped.columns and 'last_visit' in grouped.columns:
        grouped['tenure_days'] = (grouped['last_visit'] - grouped['first_visit']).dt.days
        grouped['visits_per_year'] = grouped['visit_count'] / (grouped['tenure_days'] / 365.25).clip(lower=0.1)
    
    dob_col = 'dob' if 'dob' in grouped.columns else 'date_of_birth' if 'date_of_birth' in grouped.columns else None
    if dob_col:
        grouped['age'] = (pd.Timestamp.now() - pd.to_datetime(grouped[dob_col], errors='coerce')).dt.days // 365
    
    print(f"[AGGREGATE] Result: {len(grouped)} patients, Avg revenue: ${grouped['revenue'].mean():,.2f}, Avg visits: {grouped['visit_count'].mean():.1f}")
    
    # Fix patient_id column name if it got mangled
    if 'patient_id_' in grouped.columns and 'patient_id' not in grouped.columns:
        grouped = grouped.rename(columns={'patient_id_': 'patient_id'})
    
    return grouped


def segment_patients_by_behavior(patients_df: pd.DataFrame) -> pd.DataFrame:
    """
    Classify patients into 5 actionable segments based on composite scoring.
    Segments are OUTPUT of scoring, not inputs.
    """
    df = patients_df.copy()
    
    # Ensure columns exist
    revenue_col = 'revenue' if 'revenue' in df.columns else 'total_spent'
    if revenue_col in df.columns:
        df['revenue'] = pd.to_numeric(df[revenue_col], errors='coerce').fillna(0)
    else:
        df['revenue'] = 0
    
    freq_col = 'visits_per_year' if 'visits_per_year' in df.columns else 'visit_count'
    if freq_col in df.columns:
        df['frequency'] = pd.to_numeric(df[freq_col], errors='coerce').fillna(1)
    else:
        df['frequency'] = 1
    
    if 'last_visit' in df.columns:
        df['days_since_visit'] = (pd.Timestamp.now() - pd.to_datetime(df['last_visit'], errors='coerce')).dt.days.fillna(365)
    else:
        df['days_since_visit'] = 90  # default
    
    if 'treatments_received' in df.columns:
        df['treatment_count'] = df['treatments_received'].str.split(',').str.len().fillna(1)
    else:
        df['treatment_count'] = 1
    
    # Score each dimension (0-1 percentile rank)
    df['revenue_score'] = df['revenue'].rank(pct=True)
    df['frequency_score'] = df['frequency'].rank(pct=True)
    df['recency_score'] = 1 - df['days_since_visit'].rank(pct=True)  # recent = high
    df['diversity_score'] = df['treatment_count'].rank(pct=True)
    
    # Composite value score
    df['value_score'] = (
        df['revenue_score'] * 0.25 +
        df['frequency_score'] * 0.25 +
        df['recency_score'] * 0.25 +
        df['diversity_score'] * 0.25
    )
    
    # VIP threshold = top 20% of scores
    vip_threshold = df['value_score'].quantile(0.80)
    
    # Segment based on score + behavioral patterns
    def assign_segment(row):
        score = row['value_score']
        recency = row['recency_score']
        frequency = row['frequency_score']
        revenue = row['revenue_score']
        
        # VIP: Top 20% overall score
        if score >= vip_threshold:
            return "VIP"
        
        # At Risk: Was valuable (high revenue) but lapsed (low recency)
        if revenue >= 0.60 and recency < 0.30:
            return "At Risk"
        
        # Rising Star: Highly engaged recently, building value
        if recency >= 0.70 and frequency >= 0.60 and score >= 0.50:
            return "Rising Star"
        
        # Maintainer: Steady middle tier
        if score >= 0.40:
            return "Maintainer"
        
        # Explorer: Everyone else - new or low engagement
        return "Explorer"
    
    df['behavioral_segment'] = df.apply(assign_segment, axis=1)
    
    # Segment strategies (for UI/campaigns)
    SEGMENT_STRATEGIES = {
        "VIP": "Your best customers. Retain with priority access, personalized service, and exclusive offers.",
        "Rising Star": "High potential. Convert to VIP with loyalty programs and premium upsells.",
        "Maintainer": "Reliable core business. Increase frequency with packages and seasonal promotions.",
        "Explorer": "Early stage or occasional. Nurture with intro offers and education.",
        "At Risk": "Previously valuable, now lapsed. Win back with targeted re-engagement campaigns.",
    }
    
    # Log results
    print(f"\n[BEHAVIORAL] Classified {len(df)} patients:")
    segment_counts = df['behavioral_segment'].value_counts()
    for segment in ["VIP", "Rising Star", "Maintainer", "Explorer", "At Risk"]:
        if segment in segment_counts.index:
            count = segment_counts[segment]
            pct = (count / len(df)) * 100
            avg_rev = df[df['behavioral_segment'] == segment]['revenue'].mean()
            avg_score = df[df['behavioral_segment'] == segment]['value_score'].mean()
            print(f"  {segment:15s}: {count:3d} ({pct:4.1f}%) | Avg: ${avg_rev:,.0f} | Score: {avg_score:.2f}")
    print("")
    
    return df

# ============================================================================
# STOP HERE - Don't add anything else yet!
# Next: Make one small change to test this function
# ============================================================================


def _normalize_zip5(z: str) -> str:
    if pd.isna(z):
        return ""
    s = "".join(ch for ch in str(z).strip() if ch.isdigit())
    return s.zfill(5) if s else ""

def ensure_zip_latlon(df: pd.DataFrame, zip_col: str = "zip", country: str = "US") -> pd.DataFrame:
    """
    Fill 'lat' and 'lon' from ZIP centroids using pgeocode (offline, no PII).
    Requires `pgeocode==0.5.0` in requirements.txt.
    """
    try:
        import pgeocode
    except Exception as e:
        raise RuntimeError("Please add pgeocode==0.5.0 to requirements.txt") from e

    out = df.copy()
    if zip_col not in out.columns:
        raise ValueError(f"Column '{zip_col}' not found in DataFrame.")

    out[zip_col] = out[zip_col].apply(_normalize_zip5)

    if "lat" not in out.columns:
        out["lat"] = np.nan
    if "lon" not in out.columns:
        out["lon"] = np.nan

    mask = out["lat"].isna() | out["lon"].isna()
    zips_to_lookup = sorted(set(out.loc[mask, zip_col]))
    zips_to_lookup = [z for z in zips_to_lookup if z]

    if not zips_to_lookup:
        return out

    nomi = pgeocode.Nominatim(country.lower())
    lk = nomi.query_postal_code(zips_to_lookup)
    lk = lk.loc[lk["latitude"].notna() & lk["longitude"].notna(), ["postal_code", "latitude", "longitude"]]
    lk = lk.rename(columns={"postal_code": zip_col, "latitude": "lat", "longitude": "lon"})
    lk[zip_col] = lk[zip_col].astype(str).str.zfill(5)

    out = out.merge(lk, on=zip_col, how="left", suffixes=("", "_lkp"))
    out["lat"] = out["lat"].fillna(out["lat_lkp"])
    out["lon"] = out["lon"].fillna(out["lon_lkp"])
    out = out.drop(columns=[c for c in ["lat_lkp", "lon_lkp"] if c in out.columns])

    return out

def build_market_zip_universe(
    practice_zip: str, 
    raw_demographics: Optional[pd.DataFrame],
    radius_miles: float = 50.0
) -> pd.DataFrame:
    """
    Return ALL candidate ZIPs in the market (not just patient ZIPs).
    
    This is THE KEY FUNCTION that makes the algorithm profile-first.
    """
    
    # If we have a full market demographics file, use it
    if raw_demographics is not None and "zip" in raw_demographics.columns:
        print(f"[SCAN] Loading full market demographics...")
        df = raw_demographics.copy()
        df["zip"] = df["zip"].astype(str).str.zfill(5)
        print(f"[SCAN] Loaded {len(df)} ZIPs from market database")
    else:
        # Fallback: just the practice ZIP (keeps current behavior if no market file)
        print("[WARN] No market demographics provided, falling back to practice ZIP only")
        df = pd.DataFrame({"zip": [practice_zip]})
        df["zip"] = df["zip"].astype(str).str.zfill(5)
    
    # Ensure lat/lon for all ZIPs (offline, no PII)
    df = ensure_zip_latlon(df, zip_col="zip", country="US")
    
    # Get practice coordinates
    import pgeocode
    nom = pgeocode.Nominatim("us")
    practice_coords = nom.query_postal_code(practice_zip)
    
    if pd.isna(practice_coords["latitude"]):
        raise ValueError(f"Could not find coordinates for practice ZIP {practice_zip}")
    
    plat = float(practice_coords["latitude"])
    plon = float(practice_coords["longitude"])
    
    print(f"[SCAN] Practice at {practice_zip}: ({plat:.4f}, {plon:.4f})")
    
    # Calculate distance to practice using Haversine
    r = 3958.8  # Earth radius in miles
    lat1 = np.radians(df["lat"].astype(float))
    lon1 = np.radians(df["lon"].astype(float))
    lat2 = np.radians(plat)
    lon2 = np.radians(plon)
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    df["distance_miles"] = 2 * r * np.arcsin(np.sqrt(a))
    
    # Filter to market window (radius)
    market = df[df["distance_miles"] <= radius_miles].copy()
    
    print(f"[SCAN] {len(market)} ZIPs within {radius_miles}-mile radius")
    
    # Ensure required demographic columns exist with defaults
    defaults = {
        "median_income": 75000,
        "population": 20000,
        "college_pct": 0.32,
        "age_25_54_pct": 0.39,
        "owner_occ_pct": 0.65,
        "density_per_sqmi": 3000
    }
    
    for col, default in defaults.items():
        if col not in market.columns:
            market[col] = default
        else:
            market[col] = pd.to_numeric(market[col], errors="coerce").fillna(default)
    
    # Clean and deduplicate
    market = market.dropna(subset=["zip", "lat", "lon"])
    market = market.drop_duplicates(subset=["zip"])
    market = market.reset_index(drop=True)
    
    print(f"[SCAN] ✅ Market universe ready: {len(market)} ZIPs")
    
    return market

def normalize_demographics_dataframe(df):
    """Clean up demographics dataframe"""
    df = df.copy()
    
    if 'zip' in df.columns:
        df['zip'] = df['zip'].apply(normalize_zip)
    
    numeric_columns = {
        'median_income': 75000,
        'population': 20000,
        'lat': None,
        'lon': None,
        'density_per_sqmi': 3000,
        'college_pct': 0.32,
        'age_25_54_pct': 0.39,
        'owner_occ_pct': 0.65
    }
    
    for col, default in numeric_columns.items():
        if col in df.columns:
            df[col] = df[col].apply(lambda x: coerce_float(x, default))
    
    print(f"[CLEAN] Demographics cleaned: {len(df)} ZIP codes")
    return df

# ⬇️ PASTE THIS directly under build_strategic_insights_for_row(...) and above the closing helpers marker
def generate_campaign_card(segment_data, procedure=None, logo_url=None):
    # Extract all variables from segment_data first
    zip_code = segment_data.get('zip')
    cohort = segment_data.get('cohort', 'Budget Conscious')
    match_score = float(segment_data.get('match_score', 0))
    avg_ticket = float(segment_data.get('avg_ticket_zip', 750))
    distance = float(segment_data.get('distance_miles', 0))
    competitors = int(segment_data.get('competitors', 0))
    
    p50 = 0
    eb = segment_data.get('expected_bookings') or {}
    if isinstance(eb, dict):
        p50 = int(eb.get('p50') or 0)

    cpa_target = segment_data.get('cpa_target', 100)
    monthly_ad_cap = cpa_target * (p50 if p50 > 0 else 3)

    # tighter radius if the ZIP is far from practice
    radius = 5 if distance < 10 else 3
    
    demo_targeting = {
        'Affluent':  'Ages 35-55, Household Income $120k+, College-educated',
        'Premium':   'Ages 30-50, Household Income $100k+, Professional',
        'Emerging':  'Ages 25-45, Household Income $60k+, Health-conscious',
        'Value':     'Ages 25-55, cost-conscious, wellness-interested',
        'Niche':     'Ages 30-55, specialty-seeking, aesthetic-savvy',
    }.get(cohort, 'Ages 30-55, interested in wellness')
    
    # Calculate values for LLM context
    monthly_budget = monthly_ad_cap
    avg_lifetime_value = avg_ticket * 8  # Rough estimate
    
    # Generate AI-powered ad copy
    try:
        campaign_context = CampaignContext(
            segment_name=cohort,
            patient_count=1,
            avg_ltv=avg_lifetime_value,
            avg_ticket=avg_ticket,
            top_procedures=[procedure] if procedure else ['Aesthetic Treatments'],
            target_zips=[zip_code],
            competition_level="moderate" if competitors > 1 else "low",
            recommended_budget=monthly_budget,
            target_demographics=demo_targeting,
            practice_name="Your Practice",
            practice_city="Your Area"
        )
        
        fb_ad = llm_service.generate_facebook_ad(campaign_context)
        ad_copy = fb_ad.get('primary_text', 'Premium aesthetic treatments available.')
        print(f"[LLM] Generated Facebook ad copy for {cohort}")
    except Exception as e:
        print(f"[LLM ERROR] Falling back to template: {e}")
        # Procedure-specific fallback
        if procedure:
            if avg_ticket > 1200:
                ad_copy = f"Premier {procedure} results. Packages from ${int(avg_ticket)}. Book today."
            elif competitors > 1:
                ad_copy = f"Expert {procedure} treatments. Stand out from {competitors} options. ${int(avg_ticket)}."
            else:
                ad_copy = f"First in your area for {procedure}. From ${int(avg_ticket)}. Book now."
        else:
            if avg_ticket > 1200:
                ad_copy = f"Premier results. Packages from ${int(avg_ticket)}. Book today."
            elif competitors > 1:
                ad_copy = f"Stand out from {competitors} nearby clinics. Average ${int(avg_ticket)}."
            else:
                ad_copy = f"Be first in your area. Treatments average ${int(avg_ticket)}. Book now."
    daily_budget = max(5, round(monthly_ad_cap / 30))

    return {
        'zip': zip_code,
        'logo_url': logo_url,
        'targeting': f"{zip_code} + {radius} mile radius",
        'demographics': demo_targeting,
        'ad_copy': ad_copy,
        'daily_budget': daily_budget,
        'distance_note': f"{distance:.1f} mile travel consideration" if distance and distance > 10 else None,
        'match_score': match_score,
        'cohort': cohort,
        
        # Add these fields that your frontend expects
        'location': segment_data.get('location_name', f'ZIP {zip_code}'),
        'distance_miles': distance,
        'competition_level': segment_data.get('competition_level', 'Low'),
        'competitors_count': competitors,
        'monthly_revenue_potential': int(avg_ticket * p50),
        'demographic_description': segment_data.get('demographic_description', demo_targeting),
        'marketing_tags': segment_data.get('behavioral_tags', []),
        'recommended_channels': [segment_data.get('best_channel', 'Facebook')],
        'expected_bookings': eb,
    }

# ---------- Strategic insight helpers (updated) ----------
def _safe_num(x, default=0.0):
    try:
        v = float(x)
        if np.isnan(v):
            return default
        return v
    except Exception:
        return default

def _band_competition(competitors, population):
    """
    Competition density bands (per 10k residents):
      ≤ 0.8  -> Low competition
      0.8–2.0 -> Moderate competition
      ≥ 2.0  -> High competition
    """
    pop = max(_safe_num(population, 20000.0), 1.0)
    per_10k = _safe_num(competitors, 0.0) / (pop / 10000.0)

    if per_10k <= 0.8:
        return per_10k, "Low competition", "prioritize expansion"
    if per_10k < 2.0:
        return per_10k, "Moderate competition", "maintain bids; differentiate on offer & speed-to-lead"
    return per_10k, "High competition", "use defensive bids; sharpen offers and targeting"

def _estimate_no_show(distance_miles):
    """
    Drive-time estimation uses ~25 mph (urban/suburban) + parking/walking allowance.
    Returns (drive_minutes, qualitative_risk, suggested_policy).
    """
    d = _safe_num(distance_miles, 0.0)
    # Use 25 mph instead of 42 mph
    drive_min = int(round(d / 25.0 * 60.0))
    # Add 5–10 minutes (use constant 8) beyond 5 miles for parking/walking
    if d > 5:
        drive_min += 8

    # No specific % claims; qualitative risk + softer policy guidance
    if d <= 8:
        return drive_min, "baseline no-show risk", "use standard reminders"
    if d <= 18:
        return drive_min, "elevated no-show risk", "double reminders; consider deposit"
    return drive_min, "higher no-show risk", "consider deposit/prepay and tighter confirmation"

def build_strategic_insights_for_row(row_dict, avg_ticket, target_roas=5.0, cpl=None, default_population=20000):
    """
    Returns a list[str] with 4 actionable insights:
      1) Max CPA (+ monthly cap)
      2) Market saturation risk (competitors/10k band)
      3) Revenue opportunity size
      4) Distance economics (drive time + policy)

    target_roas: default 5.0.  # Industry standard ranges 3–5x; adjust based on practice goals
    """
    insights = []

    # ---- Input validation ----
    avg_ticket = _safe_num(avg_ticket, 750.0)
    if avg_ticket <= 0:
        avg_ticket = 750.0

    roas = _safe_num(target_roas, 5.0)
    if roas <= 0:
        roas = 5.0

    # P50 bookings: expected_bookings.p50 -> patient_count -> default 3
    p50_bookings = 0.0
    eb = row_dict.get("expected_bookings")
    if isinstance(eb, dict):
        p50_bookings = _safe_num(eb.get("p50"), 0.0)
    if p50_bookings <= 0:
        p50_bookings = _safe_num(row_dict.get("patient_count"), 0.0)
    if p50_bookings <= 0:
        p50_bookings = 3.0

    # 1) CPA target + monthly cap (+ optional conversion target)
    # Minimum CPA bumped to $25 to be realistic
    target_cpa = max(25.0, round((avg_ticket / roas) / 10.0) * 10.0)
    monthly_cap = target_cpa * p50_bookings
    cpa_line = f"Max CPA ${target_cpa:,.0f} (ROAS {roas:.0f}× on ${avg_ticket:,.0f}); monthly ad cap ${monthly_cap:,.0f}."
    if cpl is not None:
        cpl_v = _safe_num(cpl, 0.0)
        if cpl_v > 0:
            req_conv = target_cpa / cpl_v
            cpa_line += f" At CPL ${cpl_v:,.0f}, need {req_conv:.0%} lead→booking."
    insights.append(cpa_line)

    # 2) Market Saturation Risk (updated bands)
    per_10k, band, action = _band_competition(row_dict.get("competitors", 0), row_dict.get("population", default_population))
    insights.append(f"{per_10k:.1f} competitors/10k ({band}) — {action}.")

    # 3) Revenue Opportunity Size
    expected_rev = p50_bookings * avg_ticket
    insights.append(f"Revenue potential ${expected_rev:,.0f}/mo ({int(round(p50_bookings))} bookings × ${avg_ticket:,.0f}).")

    # 4) Distance Economics (no % claims, softer policy)
    drive_min, risk_text, policy_text = _estimate_no_show(row_dict.get("distance_miles", 0.0))
    d = _safe_num(row_dict.get("distance_miles", 0.0), 0.0)
    insights.append(f"{d:.1f} mi (~{drive_min} min) — {risk_text}; {policy_text}.")

    return insights
# ---------- /Strategic insight helpers ----------

# ---------- Dynamic Data Enrichment Functions ----------

# Add this dictionary RIGHT BEFORE the function
ZIP_LOCATIONS = {
    "11030": "Manhasset, Nassau County",
    "10805": "New Rochelle, Westchester County", 
    "10021": "Manhattan, NYC",
}

def get_location_name_from_demographics(zip_code: str, demographics_df: pd.DataFrame) -> str:
    """Dynamically determine location name from demographics data"""
    
    # DEBUG: Print what columns we have
    print(f"[LOCATION DEBUG] Columns in demographics_df: {list(demographics_df.columns)}")
    print(f"[LOCATION DEBUG] Looking up ZIP: {zip_code}")
    
    # Check the explicit mapping first
    if zip_code in ZIP_LOCATIONS:
        return ZIP_LOCATIONS[zip_code]
    
    # Then use your existing coordinate logic
    try:
        # Ensure ZIP is string and padded with zeros
        zip_str = str(zip_code).zfill(5)
        
        # Also ensure the dataframe ZIP column is string and padded
        demographics_df['zip'] = demographics_df['zip'].astype(str).str.zfill(5)
        
        # Now look up the ZIP
        matching_rows = demographics_df[demographics_df['zip'] == zip_str]
        
        if matching_rows.empty:
            print(f"[LOCATION] No data found for ZIP {zip_str}")
            return f"ZIP {zip_str}"
        
        zip_row = matching_rows.iloc[0]
        
        # Try to get city and state from demographics data
        city = str(zip_row.get('city', '')).strip() if 'city' in zip_row else ''
        state = str(zip_row.get('state_id', '')).strip() if 'state_id' in zip_row else ''
        
        print(f"[LOCATION] ZIP {zip_str} -> city: '{city}', state: '{state}'")
        
        # If we have city data, use it
        if city and state:
            return f"{city}, {state}"
        elif city:
            return city
        
        # Otherwise fall back to ZIP code
        return f"ZIP {zip_str}"
        
    except Exception as e:
        print(f"[LOCATION] Error getting location name for {zip_code}: {e}")
        return f"ZIP {zip_code}"

# Next function starts here...

def generate_dynamic_demographic_description(row: pd.Series, cohort: str, patients_df: pd.DataFrame, zip_code: str) -> str:
    """Generate description based entirely on actual data"""
    income = int(float(row.get('median_income', 75000)))
    population = int(float(row.get('population', 20000)))
    college_pct = float(row.get('college_pct', 0.35))
    distance = float(row.get('distance_miles', 5))
    competitors = int(row.get('competitors', 0))
    patient_count = int(row.get('patient_count', 0))
    
    zip_patients = patients_df[patients_df['zip_code'] == zip_code]
    if not zip_patients.empty and 'revenue' in zip_patients.columns:
        avg_revenue_in_zip = float(zip_patients['revenue'].mean())
    else:
        avg_revenue_in_zip = float(patients_df['revenue'].mean()) if 'revenue' in patients_df.columns else 750
    
    desc_parts = []
    
    if distance < 3:
        desc_parts.append(f"Prime location just {distance:.1f} miles from your practice")
    elif distance < 10:
        desc_parts.append(f"Accessible market {distance:.1f} miles away")
    else:
        desc_parts.append(f"Extended reach market at {distance:.1f} miles")
    
    if income > 150000:
        desc_parts.append(f" with affluent households (median ${income:,})")
    elif income > 100000:
        desc_parts.append(f" with upper-middle income households (${income:,})")
    else:
        desc_parts.append(f" with households earning ${income:,}")
    
    if college_pct > 0.5:
        desc_parts.append(f" and {college_pct:.0%} college-educated population")
    
    if patient_count > 0:
        desc_parts.append(f". You've served {patient_count} patients here")
        if avg_revenue_in_zip > patients_df['revenue'].mean() * 1.2:
            desc_parts.append(f" with above-average spend")
    
    if competitors == 0:
        desc_parts.append(". No direct competition in this area")
    elif competitors <= 2:
        desc_parts.append(f". Limited competition ({competitors} providers)")
    
    return ''.join(desc_parts)

def generate_data_driven_tags(row: pd.Series, patients_df: pd.DataFrame, zip_code: str) -> list:
    """Generate behavioral tags based on actual data patterns"""
    tags = []
    income = float(row.get('median_income', 75000))
    
    if income > 150000:
        tags.append("Premium market")
    elif income > 100000:
        tags.append("Quality-focused")
    else:
        tags.append("Value-conscious")
    
    zip_patients = patients_df[patients_df['zip_code'] == zip_code]
    if len(zip_patients) >= 5:
        tags.append("Proven market")
    elif len(zip_patients) >= 2:
        tags.append("Growing interest")
    else:
        tags.append("Untapped potential")
    
    return tags[:2]

def determine_best_channel_from_data(row: pd.Series, cohort: str, patients_df: pd.DataFrame, zip_code: str) -> str:
    """Determine marketing channel based on actual demographic data"""
    age_25_54_pct = float(row.get('age_25_54_pct', 0.4))
    college_pct = float(row.get('college_pct', 0.35))
    income = float(row.get('median_income', 75000))
    
    if income > 150000 and college_pct > 0.5:
        return "Instagram"
    elif cohort == "Luxury Clients":
        return "Instagram"
    else:
        return "Facebook"

def calculate_dynamic_cpa_target(avg_ticket: float, match_score: float, competitors: int, distance: float) -> float:
    """Calculate CPA target based on actual metrics"""
    base_cpa_ratio = 0.2
    
    if match_score > 0.8:
        base_cpa_ratio *= 1.2
    elif match_score < 0.5:
        base_cpa_ratio *= 0.8
    
    if competitors == 0:
        base_cpa_ratio *= 0.7
    elif competitors > 5:
        base_cpa_ratio *= 1.3
    
    if distance > 20:
        base_cpa_ratio *= 1.2
    elif distance < 5:
        base_cpa_ratio *= 0.9
    
    cpa = avg_ticket * base_cpa_ratio
    return max(50, min(500, cpa))

# ---------- /Dynamic Data Enrichment Functions ----------

# === FastAPI app ===
app = fastapi.FastAPI(
    title="Audience Mirror API",
    description="Advanced patient clustering using geographic, demographic, and psychographic analysis",
    version="1.0.0"
)

# Setup rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup Redis with graceful fallback
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    CACHE_ENABLED = True
    print("[CACHE] Redis connected successfully")
except Exception as e:
    CACHE_ENABLED = False
    redis_client = None
    print(f"[CACHE] Redis not available, caching disabled: {e}")

app.include_router(procedures_router.router)
app.include_router(patient_intel_router.router)

# Add this after your app = fastapi.FastAPI(...) section
@app.on_event("startup")
async def startup_event():
    create_tables()

# CORS middleware for development: allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ZIP_DEMOGRAPHICS_PATH = os.path.join(DATA_DIR, "uszips.csv")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory storage for MVP (replace with database in production)
datasets: Dict[str, Dict[str, Any]] = {}
runs: Dict[str, Dict[str, Any]] = {}
facebook_connections: Dict[str, Dict[str, Any]] = {}

async def save_uploaded_file(file: UploadFile, directory: str, filename: str) -> str:
    os.makedirs(directory, exist_ok=True)
    contents = await file.read()
    path = os.path.join(directory, filename)
    with open(path, "wb") as f:
        f.write(contents)
    await file.seek(0)
    return path

# ===========================================
# API ENDPOINTS
# ===========================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Audience Mirror API", "status": "healthy", "version": "1.0.0"}

@app.post("/api/v1/datasets", response_model=DatasetCreateResponse)
async def create_dataset(
    patients: UploadFile,
    practice_zip: str = Form(...),
    vertical: str = Form("medspa"),
    competitors: Optional[UploadFile] = None,
    db: Session = Depends(get_db)
):
    """Upload patient data and optional competitor data"""
    # Generate unique dataset ID
    dataset_id = str(uuid.uuid4())[:12]
    dataset_dir = os.path.join(UPLOAD_DIR, dataset_id)
    os.makedirs(dataset_dir, exist_ok=True)
    
    try:
        # Save and validate patient data
        patients_path = await save_uploaded_file(patients, dataset_dir, "patients.csv")
        is_valid, errors, validated_df = validate_and_load_patients(patients_path)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail={"errors": errors})
        
        # Save competitors data if provided
        competitors_path = None
        if competitors:
            competitors_path = await save_uploaded_file(competitors, dataset_dir, "competitors.csv")
        
        # Create database record instead of storing in memory
        dataset = Dataset(
            id=dataset_id,
            patients_path=patients_path,
            competitors_path=competitors_path,
            practice_zip=practice_zip,
            vertical=vertical,
            patient_count=len(validated_df),
            unique_zips=validated_df["zip_code"].nunique(),
            detected_vertical=detect_vertical(validated_df)
        )
        
        print(f"[DEBUG] Detected vertical: {detect_vertical(validated_df)} for dataset {dataset_id}")
        
        db.add(dataset)
        db.commit()
        
        return DatasetCreateResponse(
            dataset_id=dataset_id,
            message="Dataset created successfully"
)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 50)
        print("ERROR IN DATASET UPLOAD:")
        print(traceback.format_exc())
        print("=" * 50)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Dataset creation failed: {str(e)}")

@app.post("/api/v1/runs")
async def create_run(
    request: RunCreateRequest,
    procedure: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Start analysis run with sophisticated ML algorithm"""
    # Check if dataset exists in database instead of memory
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    run_id = str(uuid.uuid4())
    
    # Create database record instead of memory storage
    analysis_run = AnalysisRun(
        id=run_id,
        dataset_id=request.dataset_id,
        focus=request.focus,
        status="running",
        procedure=procedure
    )
    
    db.add(analysis_run)
    db.commit()

    try:
        import traceback
        import sys
        # Load and validate patient data
        is_valid, _, df_grouped = validate_and_load_patients(dataset.patients_path)
        if not is_valid or df_grouped is None:
            raise HTTPException(status_code=400, detail="Patient data validation failed")
        
        df_grouped = df_grouped.reset_index(drop=True)
        
        # Add procedure filtering if specified
            
        if procedure and procedure != "all":
            # Use the SAME column that was found during extraction
            # Priority: procedure > procedure_norm > treatment > service > treatments_received
            procedure_col = None
            for col in ['treatment', 'procedure', 'service', 'treatments_received', 'procedure_norm']:
                if col in df_grouped.columns:
                    # Skip columns that only have "Unknown" values
                    unique_vals = df_grouped[col].dropna().unique()
                    if len(unique_vals) > 0 and not all(str(v).lower() == 'unknown' for v in unique_vals):
                        procedure_col = col
                        print(f"[FILTER] Using column '{col}' for procedure filtering")
                        break

            if procedure_col:
                # Split comma-separated procedures
                selected_procs = [p.strip().lower() for p in procedure.split(',')]
                print(f"[FILTER] Filtering for procedures: {selected_procs}")
                print(f"[FILTER DEBUG] Sample values in {procedure_col}: {df_grouped[procedure_col].dropna().head(10).tolist()}")
                
                def matches(x):
                    if pd.isna(x):
                        return False
                    row_procs = [p.strip().lower() for p in str(x).split(',')]
                    return any(proc in row_procs for proc in selected_procs)
                
                # Mark rows that match
                df_grouped["__procedure_match"] = df_grouped[procedure_col].apply(matches)
                df_grouped = df_grouped[df_grouped["__procedure_match"]]
                print(f"[FILTER] Filtered to procedures: {procedure}, rows: {len(df_grouped)}")
                if df_grouped.empty:
                    raise HTTPException(status_code=400, detail=f"No data found for procedures: {procedure}")

        # Convert dataset to dict for compatibility with existing analysis function (DEDENTED)
        dataset_dict = {
            "patients_path": dataset.patients_path,
            "competitors_path": dataset.competitors_path,
            "practice_zip": dataset.practice_zip,
            "vertical": dataset.vertical
        }
        
        # Now call the analysis
        result = execute_advanced_analysis(dataset_dict, request, df_grouped=df_grouped)
        
        # Clean NaN values for database
        def _clean_num(x, default=0.0):
            try:
                v = float(x)
                if not np.isfinite(v):
                    return default
                return v
            except Exception:
                return default

        for seg in result.get("top_segments", []):
            # top-level numbers
            for k in ("match_score", "distance_miles", "lat", "lon",
                    "expected_monthly_revenue_p50", "cpa_target"):
                if k in seg:
                    seg[k] = _clean_num(seg[k], 0.0)
            # nested expected_bookings
            if isinstance(seg.get("expected_bookings"), dict):
                eb = seg["expected_bookings"]
                for k in ("p10", "p50", "p90"):
                    if k in eb:
                        try:
                            eb[k] = int(_clean_num(eb[k], 0))
                        except Exception:
                            eb[k] = 0

        
        # Update database record with results
        analysis_run.status = "done"
        analysis_run.completed_at = datetime.utcnow()
        analysis_run.headline_metrics = result["headline_metrics"]
        analysis_run.top_segments = result["top_segments"]
        analysis_run.map_points = result["map_points"]
        analysis_run.confidence_info = result["confidence_info"]
        analysis_run.patient_count = result.get("patient_count", 0) 
        analysis_run.dominant_profile = result.get("dominant_profile", {})
        analysis_run.strategic_insights = result.get("strategic_insights", [])
        
        db.commit()
        
        # Auto-reconcile any contacted patients who returned
        print(f"[DEBUG] About to reconcile for run_id: {run_id}")
        reconcile_outreach_returns(db, run_id, df_grouped)
        
        return fastapi.responses.JSONResponse({"run_id": run_id})
    
    except Exception as e:
        traceback.print_exc(file=sys.stdout)
        analysis_run.status = "error"
        analysis_run.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/v1/exports")
async def create_export_urls(request: ExportCreateRequest, db: Session = Depends(get_db)):
    """Generate export URLs for different platforms"""
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == request.run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run not found or not completed")

    base_url = f"/api/v1/exports/{request.run_id}"
    
    return {
        "facebook_url": f"{base_url}?format=facebook&top_n={request.top_n}",
        "google_url": f"{base_url}?format=google&top_n={request.top_n}",
        "full_report_url": f"{base_url}?format=full&top_n={request.top_n}"
    }

def g(obj, path, default=None):
    cur = obj
    for p in path.split("."):
        cur = getattr(cur, p, None)
        if cur is None:
            return default
    return cur

@app.get("/api/v1/exports/{run_id}")
async def download_export(run_id: str, format: str = "full", top_n: int = 10, db: Session = Depends(get_db)):
    """Stream CSV exports for different advertising platforms"""
    
    # Get from database instead of memory
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run results not found")
    
    # Get top segments for export
    top_segments = analysis_run.top_segments[:top_n]

    # Generate appropriate CSV format
    if format == "facebook":
        # Facebook Custom Audiences format
        data = [{"zip": segment.get("zip", ""), "country": "US"} for segment in top_segments]
        filename = f"facebook_audience_{run_id}.csv"

    elif format == "google":
        # Google Ads location targeting with bid modifiers
        data = [{
            "zip": segment.get("zip", ""),
            "country": "US",
            "bid_modifier": round(1.0 + (float(segment.get("match_score", 0.0)) * 0.25), 2)
        } for segment in top_segments]
        filename = f"google_ads_{run_id}.csv"

    else:  # full report
        # Comprehensive analysis report
        data = [{
            "zip": segment.get("zip", ""),
            "match_score": round(float(segment.get("match_score", 0.0)), 3),
            "cohort": segment.get("cohort", ""),
            "expected_bookings_p50": (segment.get("expected_bookings", {}) or {}).get("p50"),
            "distance_miles": round(float(segment.get("distance_miles", 0.0)), 1),
            "competitors": segment.get("competitors", 0),
            "primary_reason": (segment.get("why", ["Strong signal"]) or ["Strong signal"])[0],
            "bid_modifier": round(1.0 + (float(segment.get("match_score", 0.0)) * 0.25), 2)
        } for segment in top_segments]
        filename = f"audience_analysis_{run_id}.csv"

    # Convert to CSV
    df = pd.DataFrame(data)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    return StreamingResponse(
        io.BytesIO(csv_buffer.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
    
@app.get("/api/v1/runs/{run_id}/results")
async def get_run_results(run_id: str, db: Session = Depends(get_db)):
    """Get full analysis results including dominant profile for frontend"""
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    # df_grouped may be created during run-time analysis flow; define locally to avoid
    # compile-time undefined-name errors when this endpoint is imported/run.
    df_grouped = None
    if not analysis_run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Return status if not done
    if analysis_run.status == "processing":
        return {"status": "processing"}
    
    if analysis_run.status == "error":
        return {
            "status": "error",
            "error": analysis_run.error_message or "Analysis failed"
        }
    
    if analysis_run.status != "done":
        return {"status": analysis_run.status}
    
    # Parse stored results
    top_segments = analysis_run.top_segments
    if isinstance(top_segments, str):
        try:
            top_segments = json.loads(top_segments)
        except Exception:
            top_segments = []
    
    # Get dominant_profile if stored (you'll need to add this field to database)
    dominant_profile_data = getattr(analysis_run, 'dominant_profile', None)
    if isinstance(dominant_profile_data, str):
        try:
            dominant_profile_data = json.loads(dominant_profile_data)
        except Exception:
            dominant_profile_data = None

    # Calculate campaign metrics - handle missing data gracefully
    if dominant_profile_data and isinstance(dominant_profile_data, dict):
        dominant_cohort = dominant_profile_data.get("dominant_profile", {}).get("combined", "Premium Market")
    else:
        # Fallback: use most common cohort from segments
        if top_segments:
            cohorts = [s.get('cohort', 'Premium Market') for s in top_segments]
            dominant_cohort = max(set(cohorts), key=cohorts.count) if cohorts else "Premium Market"
        else:
            dominant_cohort = "Premium Market"
    
    
    campaign_metrics = calculate_campaign_metrics(
        top_segments=top_segments[:10],
        demographic_profile=dominant_profile_data.get("dominant_profile", {}) if dominant_profile_data else {},
        cohort_label=dominant_cohort
    )
    mortgage_data = {}
   
   # Get available procedures from the dataset
    available_procedures = []
    try:
        # Get the dataset for this run
        dataset = db.query(Dataset).filter(Dataset.id == analysis_run.dataset_id).first()
        if dataset and dataset.patients_path:
            import pandas as pd
            df = pd.read_csv(dataset.patients_path)
            
            # Check multiple possible column names for procedures
            possible_columns = ['procedure_norm', 'procedure', 'treatment', 'service', 'treatments_received']
            procedure_column = None
            
            for col in possible_columns:
                if col in df.columns:
                    procedure_column = col
                    print(f"[DEBUG] Found procedure column: {col}")
                    break
            
            if procedure_column:
                # If it's a comma-separated list (like "Botox, Fillers"), split it
                if procedure_column == 'treatments_received':
                    all_procedures = []
                    for treatments in df[procedure_column].dropna():
                        procs = [p.strip() for p in str(treatments).split(',')]
                        all_procedures.extend(procs)
                    available_procedures = sorted(list(set(all_procedures)))
                else:
                    available_procedures = sorted(df[procedure_column].dropna().unique().tolist())
                
                print(f"[DEBUG] Found {len(available_procedures)} procedures: {available_procedures}")
            else:
                print(f"[DEBUG] No procedure column found. Available columns: {df.columns.tolist()}")
                
    except Exception as e:
        print(f"[DEBUG] Could not extract procedures: {e}")
        import traceback
        print(traceback.format_exc())
        available_procedures = []

    # Add mortgage-specific analysis if applicable
    if dataset and dataset.detected_vertical == 'real_estate_mortgage':
        try:
            from services.mortgage_metrics import get_mortgage_analysis
            mortgage_df = pd.read_csv(dataset.patients_path)
            mortgage_data = get_mortgage_analysis(mortgage_df)
            print(f"[DEBUG] Mortgage analysis complete: {mortgage_data.get('preapproval_metrics', {}).get('stale_count', 0)} stale preapprovals")
        except Exception as e:
            print(f"[DEBUG] Mortgage analysis failed: {e}")

    # Return full structure for frontend
    # Calculate actual total revenue from stored segments
    actual_total_revenue = sum(
        seg.get('expected_monthly_revenue', 0) 
        for seg in top_segments
    ) if top_segments else 0

    # Safely calculate filtered counts/revenue if df_grouped is still in scope
    filtered_patient_count = len(df_grouped) if df_grouped is not None else getattr(analysis_run, 'patient_count', 0)
    filtered_revenue = float(df_grouped["revenue"].sum()) if df_grouped is not None and "revenue" in df_grouped.columns else actual_total_revenue

    return {
        "status": "done",
        "procedure": analysis_run.procedure,
        "patient_count": dominant_profile_data.get("segment_patient_count", getattr(analysis_run, 'patient_count', 79)) if dominant_profile_data else getattr(analysis_run, 'patient_count', 79),
        "actual_total_revenue": actual_total_revenue,
        "filtered_patient_count": filtered_patient_count,
        "filtered_revenue": filtered_revenue,
        "dominant_profile": dominant_profile_data.get("dominant_profile", {}) if dominant_profile_data else {},
        "cohort_descriptor": dominant_profile_data.get("cohort_descriptor", {}) if dominant_profile_data else {},
        "profile_characteristics": dominant_profile_data.get("profile_characteristics", {}) if dominant_profile_data else {},
        "behavior_patterns": dominant_profile_data.get("behavior_patterns", {}) if dominant_profile_data else {},
        "geographic_summary": dominant_profile_data.get("geographic_summary", {}) if dominant_profile_data else {},
        "profile_summary": dominant_profile_data.get("profile_summary", "") if dominant_profile_data else "",
        "strategic_insights": analysis_run.strategic_insights if analysis_run.strategic_insights else [], 
        "top_segments": top_segments[:10],
        "campaign_metrics": campaign_metrics,
        "available_procedures": available_procedures,
        # Mortgage-specific metrics
        "preapproval_metrics": None,
        "channel_roi": None,
        "preapproval_metrics": mortgage_data.get('preapproval_metrics') if mortgage_data else None,
        "channel_roi": mortgage_data.get('channel_roi') if mortgage_data else None,
        "detected_vertical": dataset.detected_vertical if dataset else "medspa"
    }


@app.post("/api/generate-campaign")
async def generate_campaign_endpoint(request: CampaignRequest):
    """Generate dynamic Facebook campaign content using LLM"""
    try:
        print(f"[DEBUG] Attempting to import campaign_generator...")
        from services.campaign_generator import generate_campaign_content
        print(f"[DEBUG] Import successful, calling generate_campaign_content...")
        
        return generate_campaign_content(
            request.cohort,
            request.zip_code,
            request.competitors,
            request.reasons,
            request.match_score,
            request.procedure
        )
    except ImportError as e:
        print(f"[ERROR] ImportError: {e}")
        raise HTTPException(status_code=501, detail=f"Campaign generation service not implemented: {e}")
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Campaign generation failed: {str(e)}")

@app.post("/api/v1/integrations/facebook")
async def connect_facebook(access_token: str = Form(...), ad_account_id: str = Form(...)):
    """Connect Facebook Ads account"""
    try:
        from facebook_business.api import FacebookAdsApi
        from facebook_business.adobjects.adaccount import AdAccount
    except ImportError as e:
        raise HTTPException(status_code=400, detail=f"Facebook SDK not available: {e}")

    try:
        # Initialize Facebook API
        FacebookAdsApi.init(access_token=access_token)
        
        # Test connection
        account = AdAccount(ad_account_id)
        account.remote_read(fields=['name', 'account_status'])
        
        # Store connection (in production, encrypt these)
        # For MVP, store in memory
        facebook_connections[ad_account_id] = {
            'access_token': access_token,
            'account_id': ad_account_id
        }
        
        return {"status": "connected", "account_id": ad_account_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Facebook connection failed: {str(e)}")

@app.post("/api/v1/campaigns/create")
async def create_facebook_campaign(
    run_id: str = Form(...),
    campaign_name: str = Form(...),
    daily_budget: int = Form(...)
):
    """Create Facebook campaign from analysis results"""
    try:
        from facebook_business.api import FacebookAdsApi
        from facebook_business.adobjects.adaccount import AdAccount
        from facebook_business.adobjects.campaign import Campaign
    except ImportError as e:
        raise HTTPException(status_code=400, detail=f"Facebook SDK not available: {e}")
    if run_id not in runs or runs[run_id]["status"] != "done":
        raise HTTPException(status_code=404, detail="Run results not found")
    
    # Get top ZIP codes from analysis
    result = runs[run_id]["result"]
    top_zips = [segment.zip for segment in result.top_segments[:5]]  # Top 5 ZIPs
    
    # Create campaign targeting these ZIPs
    campaign_data = {
        'name': campaign_name,
        'objective': 'LEAD_GENERATION',
        'status': 'PAUSED',  # Start paused for review
        'daily_budget': daily_budget * 100,  # Facebook expects cents
        'targeting': {
            'geo_locations': {
                'zips': [{'key': zip_code} for zip_code in top_zips]
            }
        }
    }
    
    return {
        "status": "created",
        "campaign_name": campaign_name,
        "targeted_zips": top_zips,
        "daily_budget": daily_budget
    }

@app.get("/api/v1/validate")
async def validate_algorithm(
    top_n: int = 10
):
    # Validate ZIP recommendation accuracy using 75/25 split on the most recently uploaded patient data.
    # Returns accuracy metrics for algorithm benchmarking.
    if not datasets:
        raise HTTPException(status_code=404, detail="No datasets found. Upload patient data first.")
    # Find the most recently uploaded dataset by created_at
    latest_dataset = max(datasets.values(), key=lambda d: d.get("created_at", ""))
    dataset = latest_dataset
    # Load patient and ZIP demographic data
    patients_df = pd.read_csv(dataset["patients_path"])
    # Ensure ZIP codes are consistent strings
    if "zip_code" in patients_df.columns:
        patients_df["zip_code"] = patients_df["zip_code"].astype(str).str.zfill(5)

    if not os.path.exists(ZIP_DEMOGRAPHICS_PATH):
        raise HTTPException(status_code=500, detail=f"Missing demographics file at {ZIP_DEMOGRAPHICS_PATH}")

    zip_demographics = pd.read_csv(ZIP_DEMOGRAPHICS_PATH)
    competitors_df = None
    if dataset.get("competitors_path"):
        competitors_df = pd.read_csv(dataset["competitors_path"])
    avg_patient_revenue = patients_df["revenue"].mean() if "revenue" in patients_df.columns else 1000.0
    metrics = validate_zip_recommendation_accuracy(
        patients_df=patients_df,
        zip_demographics=zip_demographics,
        competitors_df=competitors_df,
        avg_patient_revenue=avg_patient_revenue,
        top_n=top_n,
        random_state=42
    )
    return metrics

# ===========================================
# CORE ANALYSIS ENGINE
# ===========================================
# ============================================================================
# STEP 2: ADD THIS FUNCTION BEFORE execute_advanced_analysis()
# ============================================================================
def generate_cohort_descriptor(top_patients: pd.DataFrame) -> dict:
    """
    Generate a human-readable descriptor for the top patient cohort
    based on age, income, and treatment patterns.
    """
    # Age bucket
    avg_age = top_patients['age'].mean() if 'age' in top_patients.columns else 40
    if avg_age >= 55:
        age_label = "Mature"
    elif avg_age >= 40:
        age_label = "Established"
    elif avg_age >= 30:
        age_label = "Mid-Career"
    else:
        age_label = "Young"
    
    # Income bucket (from ZIP)
    avg_income = top_patients['median_income'].mean() if 'median_income' in top_patients.columns else 75000
    if avg_income >= 150000:
        income_label = "Affluent"
    elif avg_income >= 100000:
        income_label = "Upper-Income"
    elif avg_income >= 75000:
        income_label = "Professional"
    else:
        income_label = "Value-Conscious"
    
    # Treatment pattern
    if 'treatments_received' in top_patients.columns:
        all_treatments = []
        for t in top_patients['treatments_received'].dropna():
            all_treatments.extend([x.strip().lower() for x in str(t).split(',')])
        
        premium_treatments = ['morpheus8', 'pdo threads', 'sculptra', 'kybella', 'coolsculpting']
        anti_aging = ['botox', 'juvederm', 'restylane', 'filler', 'morpheus8']
        maintenance = ['hydrafacial', 'chemical peel', 'dermaplaning', 'microneedling']
        
        premium_count = sum(1 for t in all_treatments if any(p in t for p in premium_treatments))
        anti_aging_count = sum(1 for t in all_treatments if any(a in t for a in anti_aging))
        maintenance_count = sum(1 for t in all_treatments if any(m in t for m in maintenance))
        
        if premium_count > len(all_treatments) * 0.3:
            treatment_label = "Premium Seekers"
        elif anti_aging_count > len(all_treatments) * 0.4:
            treatment_label = "Anti-Aging Focused"
        elif maintenance_count > len(all_treatments) * 0.4:
            treatment_label = "Maintenance Regulars"
        else:
            treatment_label = "Full-Service Clients"
    else:
        treatment_label = "Clients"
    
    # Combine into descriptor
    if income_label == "Affluent":
        descriptor = f"{income_label} {treatment_label}"
    else:
        descriptor = f"{age_label} {treatment_label}"
    
    # Top ZIPs
    top_zips = top_patients['zip_code'].value_counts().head(3).index.tolist() if 'zip_code' in top_patients.columns else []
    
    # Owner status
    owner_pct = top_patients['owner_occ_pct'].mean() * 100 if 'owner_occ_pct' in top_patients.columns else 50
    housing_label = "homeowners" if owner_pct > 60 else "residents"
    
    # Build description sentence
    income_display = f"${int(avg_income/1000)}K median household income"
    description = f"{income_display}, {housing_label} (avg age {int(avg_age)})"
    if top_zips:
        description += f", concentrated in {', '.join(str(z) for z in top_zips[:3])}"
    description += "."
    
    print(f"[DESCRIPTOR] Generated: {descriptor} — {description}")
    
    return {
        "label": descriptor,
        "description": description,
        "avg_age": int(avg_age),
        "avg_income": int(avg_income),
        "top_zips": top_zips,
        "housing_label": housing_label,
        "treatment_label": treatment_label
    }

def identify_dominant_profile(
    patients_df: pd.DataFrame, 
    zip_features: pd.DataFrame,
    top_percentile: float = 0.2
) -> dict:
    """
    PROFILE-FIRST: Identify WHO your best customers are using actual patient data.
    """
    revenue_col = 'revenue' if 'revenue' in patients_df.columns else 'total_spent'
    
    # Find top customers by revenue
    # Build composite value score (not just revenue)
    df = patients_df.copy()
    
    # Revenue score (0-1)
    df['revenue_score'] = df[revenue_col].rank(pct=True)
    
    # Frequency score (0-1)
    freq_col = 'visits_per_year' if 'visits_per_year' in df.columns else 'visit_count'
    df['frequency_score'] = df[freq_col].rank(pct=True) if freq_col in df.columns else 0.5
    
    # Recency score (0-1, more recent = higher)
    if 'last_visit' in df.columns:
        df['days_since_visit'] = (pd.Timestamp.now() - pd.to_datetime(df['last_visit'])).dt.days
        df['recency_score'] = 1 - df['days_since_visit'].rank(pct=True)  # invert: recent = high score
    else:
        df['recency_score'] = 0.5
    
    # Treatment diversity score (0-1)
    if 'treatments_received' in df.columns:
        df['treatment_count'] = df['treatments_received'].str.split(',').str.len().fillna(1)
        df['diversity_score'] = df['treatment_count'].rank(pct=True)
    else:
        df['diversity_score'] = 0.5
    
    # Composite score (equal weights)
    df['value_score'] = (
        df['revenue_score'] * 0.25 +
        df['frequency_score'] * 0.25 +
        df['recency_score'] * 0.25 +
        df['diversity_score'] * 0.25
    )
    
    print(f"[SCORE] Composite value score: revenue={df['revenue_score'].mean():.2f}, freq={df['frequency_score'].mean():.2f}, recency={df['recency_score'].mean():.2f}, diversity={df['diversity_score'].mean():.2f}")
    
    # Select top customers by composite score
    sorted_patients = patients_df.sort_values('value_score', ascending=False)
    top_count = max(1, int(len(df) * top_percentile))
    top_patients = sorted_patients.head(top_count)
    
    print(f"[PROFILE] Analyzing top {top_count} patients ({top_percentile*100:.0f}% of {len(patients_df)})")
    cohort_descriptor = generate_cohort_descriptor(top_patients)
    
    # Get dominant behavioral segment from TOP customers
    if 'behavioral_segment' in top_patients.columns:
        profile_dist = top_patients['behavioral_segment'].value_counts()
        dominant_profile_name = profile_dist.index[0]
        profile_pct = int((profile_dist.iloc[0] / len(top_patients)) * 100)
        
        print(f"[PROFILE] Dominant behavior: {dominant_profile_name} ({profile_pct}% of top patients)")
    else:
        # Fallback: classify now if not done yet
        top_patients = segment_patients_by_behavior(top_patients)
        profile_dist = top_patients['behavioral_segment'].value_counts()
        dominant_profile_name = profile_dist.index[0]
        profile_pct = int((profile_dist.iloc[0] / len(top_patients)) * 100)
    
    # Calculate metrics
    avg_ltv = int(top_patients[revenue_col].mean())
    median_ltv = int(top_patients[revenue_col].median())
    
    # Get age stats if available
    if 'age' in top_patients.columns:
        ages = top_patients['age'].dropna()
        if len(ages) > 0:
            avg_age = int(ages.mean())
            age_range = f"{int(ages.min())}-{int(ages.max())}"
        else:
            avg_age = None
            age_range = "Unknown"
    else:
        avg_age = None
        age_range = "Unknown"
    
    avg_visits = float(top_patients['visits_per_year'].mean()) if 'visits_per_year' in top_patients.columns else float(top_patients.get('visit_count', pd.Series([2.5])).mean())
    
    # Find top treatments and categorize
    top_treatments = ["Primary Service"]
    treatment_categories = {"Injectable Treatments": 0, "Laser & Energy": 0, "Skincare & Other": 0}
    
    if 'treatments_received' in top_patients.columns:
        all_treatments = []
        for treatments in top_patients['treatments_received'].dropna():
            treatment_list = [t.strip() for t in str(treatments).split(',') if t.strip()]
            all_treatments.extend(treatment_list)
        
        if all_treatments:
            treatment_counts = pd.Series(all_treatments).value_counts()
            top_treatments = treatment_counts.head(3).index.tolist()
            
            # Categorize treatments
            injectables = ['botox', 'filler', 'juvederm', 'restylane', 'sculptra', 'kybella', 'dysport', 'xeomin']
            laser_energy = ['laser', 'ipl', 'morpheus', 'coolsculpting', 'emsculpt', 'ultherapy', 'rf', 'microneedling', 'pdo']
            
            total = len(all_treatments)
            for treatment in all_treatments:
                t_lower = treatment.lower()
                if any(inj in t_lower for inj in injectables):
                    treatment_categories["Injectable Treatments"] += 1
                elif any(las in t_lower for las in laser_energy):
                    treatment_categories["Laser & Energy"] += 1
                else:
                    treatment_categories["Skincare & Other"] += 1
            
            # Convert to percentages
            if total > 0:
                treatment_categories = {k: round(v / total * 100) for k, v in treatment_categories.items()}
            
            print(f"[PROFILE] Treatment mix: {treatment_categories}")

    # Calculate referral rate
    referral_rate = 0.0
    if 'referral_source' in top_patients.columns:
        referral_patients = top_patients[
            top_patients['referral_source'].str.contains('referral|refer|friend', case=False, na=False)
        ]
        referral_rate = len(referral_patients) / len(top_patients) if len(top_patients) > 0 else 0.0
        print(f"[PROFILE] Referral rate: {referral_rate:.1%} ({len(referral_patients)}/{len(top_patients)} patients)")
    else:
        # Fallback: estimate from behavioral patterns
        referral_rate = 0.18  # Conservative default
        print(f"[PROFILE] No referral_source column; using default referral rate")

    # Calculate baseline from ALL patients (not industry average)
    baseline_visits = float(patients_df['visits_per_year'].mean()) if 'visits_per_year' in patients_df.columns else 2.0
    baseline_ltv = int(patients_df[revenue_col].mean())
    
    visits_lift_pct = ((avg_visits - baseline_visits) / baseline_visits) * 100 if baseline_visits > 0 else 0
    ltv_lift_pct = ((avg_ltv - baseline_ltv) / baseline_ltv) * 100 if baseline_ltv > 0 else 0
    
    print(f"[PROFILE] Repeat rate: {avg_visits:.1f}× vs {baseline_visits:.1f}× baseline = {visits_lift_pct:+.0f}% above your average")
    print(f"[PROFILE] LTV: ${avg_ltv:,} vs ${baseline_ltv:,} baseline = {ltv_lift_pct:+.0f}% above your average")

    # Calculate average treatments per patient
    avg_treatments_per_patient = 1
    if 'treatments_received' in top_patients.columns:
        treatment_counts_per_patient = top_patients['treatments_received'].str.split(',').str.len()
        avg_treatments_per_patient = int(treatment_counts_per_patient.mean()) if len(treatment_counts_per_patient) > 0 else 1
    
    
    
    # Geographic concentration
    top_zips = top_patients['zip_code'].value_counts().head(15)
    geo_concentration = []
    
    for zip_code, patient_count in top_zips.items():
        geo_concentration.append({
            "zip": str(zip_code),
            "patient_count": int(patient_count),
            "profile": dominant_profile_name
        })
    
        primary_city = "your area"
    if 'city' in top_patients.columns and len(top_patients) > 0:
        city_mode = top_patients['city'].mode()
        if len(city_mode) > 0:
            primary_city = city_mode.iloc[0]
    # Build summary
    summary = f"Your best patients are {dominant_profile_name}. They spend ${avg_ltv:,} on average"
    if avg_age:
        summary += f", average age {avg_age} years"
    summary += f", and visit {avg_visits:.1f}× per year. Concentrated across {len(top_zips)} key ZIPs."
    
    print(f"[PROFILE] Behavioral metrics: ${avg_ltv:,} LTV, {avg_visits:.1f}× yearly, {len(top_treatments)} treatments")
    print(f"[PROFILE] Top treatments: {', '.join(top_treatments[:3])}")
    print(f"[PROFILE] Found {len(geo_concentration)} high-match ZIPs:")
    
    # Count existing vs expansion ZIPs
    existing_zips = sum(1 for g in geo_concentration if g['patient_count'] > 0)
    expansion_zips = len(geo_concentration) - existing_zips
    
    print(f"[PROFILE]   - {existing_zips} ZIPs with existing patients")
    print(f"[PROFILE]   - {expansion_zips} expansion opportunity ZIPs")
    print(f"[PROFILE]   - {sum(g['patient_count'] for g in geo_concentration) * 1000:,} total addressable households")
    
    return {
        "segment_patient_count": len(top_patients),
        "dominant_profile": {
            "psychographic": dominant_profile_name,
            "combined": dominant_profile_name,
            "behavioral_match_pct": profile_pct,
            "psychographic_match_pct": profile_pct
        },
        "profile_characteristics": {
            "avg_lifetime_value": avg_ltv,
            "median_lifetime_value": median_ltv,
            "avg_age": avg_age,
            "age_range": age_range,
            "income_range": "Varies by ZIP"
        },
        "behavior_patterns": {
            "avg_lifetime_value": avg_ltv,
            "avg_visits_per_year": round(avg_visits, 1),
            "baseline_visits_per_year": round(baseline_visits, 1),
            "baseline_ltv": baseline_ltv,
            "visits_lift_pct": round(visits_lift_pct, 0),
            "ltv_lift_pct": round(ltv_lift_pct, 0),
            "top_treatments": top_treatments,
            "treatment_categories": treatment_categories,
            "referral_rate": round(referral_rate, 3),  
            "repeat_rate_lift_vs_market": round(visits_lift_pct / 100, 3), 
            "avg_treatments_per_patient": avg_treatments_per_patient  
        },
        "geographic_concentration": geo_concentration,
        "geographic_summary": {
            "total_zips": len(geo_concentration),
            "existing_patient_zips": existing_zips,
            "expansion_opportunity_zips": expansion_zips,
            "total_addressable_households": sum(g['patient_count'] for g in geo_concentration) * 1000,
            "primary_city": primary_city
        },
        "profile_summary": summary,
        "cohort_descriptor": cohort_descriptor
    }
def generate_strategic_insights(
    patients_df: pd.DataFrame,
    behavior_patterns: dict,
    dominant_profile: dict,
    top_segments: list
) -> list:
    """
    Generate ONLY relevant strategic insights based on actual patient data.
    Returns array of insights that apply to THIS practice.
    """
    insights = []
    
    # Get key metrics
    avg_visits = behavior_patterns.get('avg_visits_per_year', 2.0)
    avg_ltv = behavior_patterns.get('avg_lifetime_value', 1000)
    referral_rate = behavior_patterns.get('referral_rate', 0.0)
    repeat_rate_lift = behavior_patterns.get('repeat_rate_lift_vs_market', 0.0)
    
    # 1. VISIT FREQUENCY ANALYSIS
    industry_avg = 2.1
    if avg_visits < industry_avg * 0.85:  # More than 15% below industry
        visit_decline_pct = int(((industry_avg - avg_visits) / industry_avg) * 100)
        revenue_at_risk = int(len(patients_df) * (industry_avg - avg_visits) * (avg_ltv / avg_visits))
        
        insights.append({
            "type": "warning",
            "title": "Visits declining",
            "icon": "alert",
            "message": f"Visit frequency is {visit_decline_pct}% below industry average ({avg_visits:.1f}× vs {industry_avg}×). If trend continues, you'll lose ${revenue_at_risk:,} in annual revenue.",
            "mitigation": "Launch referral campaign within 30 days. Historical data shows referral programs increase visit frequency by 23%.",
            "severity": "high",
            "applies": True
        })
    elif avg_visits > industry_avg * 1.15:  # More than 15% above industry
        insights.append({
            "type": "success",
            "title": "Strong retention",
            "icon": "check",
            "message": f"Visit frequency is {int(((avg_visits / industry_avg) - 1) * 100)}% above industry average ({avg_visits:.1f}× vs {industry_avg}×). Your patients are highly engaged.",
            "mitigation": "Maintain service quality and consider upsell opportunities to maximize this engagement.",
            "severity": "low",
            "applies": True
        })
    
    # 2. REVENUE ANALYSIS
    if avg_ltv > 3000:  # High-value practice
        ltv_k = (avg_ltv / 1000)
        insights.append({
            "type": "success",
            "title": "Revenue growing",
            "icon": "trending_up",
            "message": f"Revenue is growing year-over-year. Average lifetime value is ~${ltv_k:.1f}K per patient—this segment is your growth engine. Protect this momentum.",
            "mitigation": "Focus on retention and premium service delivery to maintain high LTV.",
            "severity": "low",
            "applies": True
        })
    elif avg_ltv < 1500:  # Lower-value practice
        insights.append({
            "type": "info",
            "title": "Revenue opportunity",
            "icon": "trending_up",
            "message": f"Average lifetime value is ${avg_ltv:,}. Consider premium service bundles to increase per-patient revenue.",
            "mitigation": "Introduce treatment packages and membership programs to boost LTV by 30-50%.",
            "severity": "medium",
            "applies": True
        })
    
    # 3. MARKET PERFORMANCE
    if repeat_rate_lift > 0.10:  # Outperforming by 10%+
        lift_pct = int(repeat_rate_lift * 100)
        insights.append({
            "type": "success",
            "title": "Outperforming market",
            "icon": "check",
            "message": f"Repeat rate is ~{lift_pct}% stronger than comparable businesses. You already have an advantage—use campaigns here to widen that gap, not just maintain it.",
            "mitigation": "Expand into adjacent markets to capitalize on your retention strength.",
            "severity": "low",
            "applies": True
        })
    elif repeat_rate_lift < -0.10:  # Underperforming by 10%+
        lift_pct = int(abs(repeat_rate_lift) * 100)
        insights.append({
            "type": "warning",
            "title": "Below market average",
            "icon": "alert",
            "message": f"Repeat rate is ~{lift_pct}% weaker than comparable medspas. Focus on patient experience and follow-up protocols.",
            "mitigation": "Implement systematic follow-up program and loyalty incentives to improve retention.",
            "severity": "high",
            "applies": True
        })
    
    # 4. REFERRAL RATE ANALYSIS
    if referral_rate > 0.25:  # Strong referral rate
        ref_pct = int(referral_rate * 100)
        insights.append({
            "type": "success",
            "title": "Strong referral engine",
            "icon": "users",
            "message": f"{ref_pct}% of patients were referred by friends. This is a powerful growth lever—double down on it.",
            "mitigation": "Formalize your referral program with incentives to capture even more word-of-mouth growth.",
            "severity": "low",
            "applies": True
        })
    elif referral_rate < 0.15:  # Weak referral rate
        ref_pct = int(referral_rate * 100)
        insights.append({
            "type": "warning",
            "title": "Low referral activation",
            "icon": "alert",
            "message": f"Only {ref_pct}% of patients actively refer. Untapped growth opportunity.",
            "mitigation": "Launch structured referral program. Industry data shows well-executed programs generate 20-30% of new patients.",
            "severity": "medium",
            "applies": True
        })
    
    # 5. GEOGRAPHIC CONCENTRATION
    if len(top_segments) <= 5:
        insights.append({
            "type": "warning",
            "title": "Limited geographic reach",
            "icon": "map",
            "message": f"Only {len(top_segments)} ZIP codes represent your core market. Vulnerable to local economic shifts.",
            "mitigation": "Opportunity to expand into adjacent ZIPs and reduce concentration risk by 40%.",
            "severity": "medium",
            "applies": True
        })
    elif len(top_segments) >= 15:
        insights.append({
            "type": "success",
            "title": "Diversified market",
            "icon": "map",
            "message": f"Your patient base spans {len(top_segments)} ZIP codes. Well-diversified geographic footprint.",
            "mitigation": "Continue serving diverse markets while maintaining service quality across all locations.",
            "severity": "low",
            "applies": True
        })
    
    # Return only insights that apply
    return [i for i in insights if i.get('applies', False)]
# ============================================================================
# ZIP DEMOGRAPHICS LOADING AND STANDARDIZATION
# ============================================================================

def load_zip_demographics(path: str) -> pd.DataFrame:
    """Load and standardize ZIP demographics from SimpleMaps or other sources"""
    try:
        df = pd.read_csv(path)
        
        # If it's SimpleMaps format (has 'lng' column), standardize it
        if 'lng' in df.columns:
            df = standardize_simplemaps_columns(df)
        
        print(f"[DATA] Loaded demographics for {len(df)} ZIPs from {path}")
        return df
    except Exception as e:
        print(f"[ERROR] Failed to load demographics from {path}: {e}")
        return None


def standardize_simplemaps_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize SimpleMaps column names to match our algorithm's expectations.
    
    SimpleMaps columns → Our expected columns
    """
    
    # Column mapping
    column_mapping = {
        'zip': 'zip',
        'lat': 'lat',
        'lng': 'lon',  # SimpleMaps uses 'lng', we use 'lon'
        'population': 'population',
        'density': 'density_per_sqmi',
        'income_household_median': 'median_income',
        'education_college_or_above': 'college_pct',
        'home_ownership': 'owner_occ_pct',
        'age_median': 'age_median'
    }
    
    # Rename columns
    df = df.rename(columns=column_mapping)
    
    # Ensure ZIP is string with leading zeros
    df['zip'] = df['zip'].astype(str).str.zfill(5)
    
    # Convert percentages (SimpleMaps uses 0-1 scale already, but verify)
    for pct_col in ['college_pct', 'owner_occ_pct']:
        if pct_col in df.columns:
            # If values are > 1, they're percentages (like 45.0 instead of 0.45)
            if df[pct_col].max() > 1:
                df[pct_col] = df[pct_col] / 100
    
    # Calculate age_25_54_pct from median age
    if 'age_median' in df.columns:
        df['age_25_54_pct'] = df['age_median'].apply(
            lambda age: 0.45 if 30 <= age <= 50 else 
                       0.40 if 25 <= age < 30 or 50 < age <= 55 else 
                       0.35
        )
    else:
        df['age_25_54_pct'] = 0.39
    
    print(f"[DATA] Standardized {len(df)} ZIP records from SimpleMaps format")
    
    return df
# ============================================================================
# MAIN ANALYSIS FUNCTION
# ============================================================================

def execute_advanced_analysis(dataset: Dict[str, Any], request: RunCreateRequest, df_grouped: Optional[pd.DataFrame] = None):
    """Execute the sophisticated multi-step analysis algorithm"""
    import logging
    import traceback
    logger = logging.getLogger("audiencemirror.analysis")
    print("[ANALYSIS] Starting advanced analysis pipeline...")

    try:
        # Load configuration and data
        vertical_config = load_vertical_config(dataset["vertical"])
        print("[ANALYSIS] Loaded vertical config")

        # Use grouped patient data if provided
        
        if df_grouped is not None:
            patients_df = normalize_patients_dataframe(df_grouped.copy())
            print(f"[ANALYSIS] Using FILTERED patient data: {len(patients_df)} rows")
        else:
            _, _, raw_patients = validate_and_load_patients(dataset["patients_path"])
            patients_df = normalize_patients_dataframe(raw_patients)
            print(f"[ANALYSIS] Using UNFILTERED patient data: {len(patients_df)} rows")

        # Ensure unique index
        patients_df = patients_df.reset_index(drop=True)
        
        # CRITICAL: Aggregate visit rows into patient rows
        patients_df = aggregate_visits_to_patients(patients_df)
        
        competitors_df = load_competitors_csv(dataset["competitors_path"]) if dataset.get("competitors_path") else None
        print("[ANALYSIS] Loaded competitors")

        # Try to load a demographics file (optional)
        try:
            raw_demographics = load_zip_demographics(ZIP_DEMOGRAPHICS_PATH)
            print(f"[DEBUG RAW] Columns after load_zip_demographics: {list(raw_demographics.columns) if raw_demographics is not None else 'None'}")
        except Exception:
            raw_demographics = None

        # Build a usable demographics table from patient ZIPs (and enrich with any provided demos)
        demographics_df = build_market_zip_universe(
            practice_zip=dataset["practice_zip"],
            raw_demographics=raw_demographics,
            radius_miles=50.0
        )
        print(f"[DEBUG] Columns IMMEDIATELY after build_market_zip_universe: {list(demographics_df.columns)}")
        print(f"[CLEAN] Demographics ready: {len(demographics_df)} ZIPs with coordinates")
        
        # Merge patient ZIPs with demographics (keep all patient columns)
        patient_cols = list(patients_df.columns)
        demo_cols = [c for c in demographics_df.columns if c not in patient_cols and c != "zip"]
        if 'city' in demographics_df.columns and 'city' not in demo_cols:
            demo_cols.append('city')
        if 'state_id' in demographics_df.columns and 'state_id' not in demo_cols:
            demo_cols.append('state_id')
        merged = patients_df.merge(
            demographics_df[["zip"] + demo_cols],
            left_on="zip_code", right_on="zip", how="left", suffixes=("", "_demo")
        ).reset_index(drop=True)

        # Defensive fill (should be minimal now that we have lat/lon)
        default_demo = {
            "median_income": 75000,
            "density_per_sqmi": 3000,
            "college_pct": 0.32,
            "age_25_54_pct": 0.39,
            "owner_occ_pct": 0.65,
            "population": 20000,
            "lat": 0.0,
            "lon": 0.0
        }
        for col, val in default_demo.items():
            if col in merged.columns:
                merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(val)
            else:
                merged[col] = val

        # Update frames
        patients_df = merged.copy().reset_index(drop=True)
        print(f"[DEBUG] After second merge: patients_df has {len(patients_df)} rows")
        patients_df = segment_patients_by_behavior(patients_df)
        demographics_df = (
            merged[["zip_code"] + demo_cols]
            .rename(columns={"zip_code": "zip"})
            .dropna(subset=["zip"])
            .drop_duplicates(subset=["zip"])
            .reset_index(drop=True)
        )
        demographics_df["zip"] = demographics_df["zip"].astype(str).str.zfill(5)
        print("[ANALYSIS] Patients merged with demographics")

        # Merge patient ZIPs with demographics (left join, keep all patients and all patient columns)
        patient_cols = list(patients_df.columns)
        demo_cols = [col for col in demographics_df.columns if col not in patient_cols and col != "zip"]
        if 'city' in demographics_df.columns and 'city' not in demo_cols:
            demo_cols.append('city')
        if 'state_id' in demographics_df.columns and 'state_id' not in demo_cols:
            demo_cols.append('state_id')
        merged = patients_df.merge(
            demographics_df[["zip"] + demo_cols],
            left_on="zip_code", right_on="zip", how="left", suffixes=("", "_demo")
        ).reset_index(drop=True)

        # Fill missing demographic values with defaults
        default_demo = {
            "median_income": 75000,
            "density_per_sqmi": 3000,
            "college_pct": 0.32,
            "age_25_54_pct": 0.39,
            "owner_occ_pct": 0.65,
            "population": 20000,
            "lat": 0.0,
            "lon": 0.0
        }
        for col, val in default_demo.items():
            if col in merged.columns:
                merged[col] = merged[col].fillna(val)
            else:
                merged[col] = val

        # Log missing ZIPs and assign default demographics
        missing_zips = merged[merged["zip"].isna()]["zip_code"].unique().tolist()
        if missing_zips:
            print(f"[ANALYSIS] Missing ZIPs: {missing_zips}")
            for zip_code in missing_zips:
                merged.loc[merged["zip_code"] == zip_code, list(default_demo.keys())] = list(default_demo.values())
                merged.loc[merged["zip_code"] == zip_code, "zip"] = zip_code

        # Update dataframes
        patients_df = merged.copy().reset_index(drop=True)
        print(f"[DEBUG] After demographics merge: {len(patients_df)} rows")
        
        # Rebuild demographics_df from merged using ONLY demo columns + patient zip,
        # then rename zip_code -> zip so we end up with exactly one 'zip' column.
        demo_cols_present = [c for c in merged.columns if c not in patient_cols and c not in ("zip_code", "zip")]
        demographics_df = (
            merged[["zip_code"] + demo_cols_present]
            .rename(columns={"zip_code": "zip"})
            .dropna(subset=["zip"])
            .reset_index(drop=True)
        )

        # Remove duplicate columns (defensive) and duplicate zip rows
        demographics_df = demographics_df.loc[:, ~demographics_df.columns.duplicated()]
        demographics_df["zip"] = demographics_df["zip"].astype(str).str.strip()
        demographics_df = demographics_df.drop_duplicates(subset=["zip"]).reset_index(drop=True)
        print("[ANALYSIS] Merged patients with demographics (deduped 'zip')")

        # Ensure demographics has required fields and a single 'zip' column
        if "zip_demo" in demographics_df.columns:
            demographics_df["zip"] = demographics_df.get("zip", demographics_df["zip_demo"])
            demographics_df["zip"] = demographics_df["zip"].astype(str).str.zfill(5)
            demographics_df = demographics_df.drop(columns=["zip_demo"])

        # Backfill required demo columns with sensible defaults
        required_demo_defaults = {
            "population": 20000,
            "median_income": 75000,
            "density_per_sqmi": 3000,
            "college_pct": 0.32,
            "age_25_54_pct": 0.39,
            "owner_occ_pct": 0.65,
        }
        for col, default in required_demo_defaults.items():
            if col not in demographics_df.columns:
                demographics_df[col] = default
            else:
                demographics_df[col] = pd.to_numeric(demographics_df[col], errors="coerce").fillna(default)

        # Make sure coords columns exist before enrichment (will be filled next)
        if "lat" not in demographics_df.columns:
            demographics_df["lat"] = np.nan
        if "lon" not in demographics_df.columns:
            demographics_df["lon"] = np.nan

        # ---- STEP 1: Compute accessibility scores with robust practice ZIP handling ----
        # Fill coords from ZIP centroids (offline, no PII)
        demographics_df = ensure_zip_latlon(demographics_df, zip_col="zip", country="US")

        # Force numeric and drop rows without coords
        for c in ("lat", "lon"):
            demographics_df[c] = pd.to_numeric(demographics_df.get(c), errors="coerce")
        demographics_df = demographics_df.dropna(subset=["zip", "lat", "lon"]).reset_index(drop=True)

        # Deduplicate & de-duplicate columns
        clean_demographics = (
            demographics_df
            .drop_duplicates(subset=["zip"])
            .loc[:, ~demographics_df.columns.duplicated()]
            .reset_index(drop=True)
        )

        pzip = str(dataset["practice_zip"]).strip()
        print(f"[DEBUG] Practice ZIP: {pzip}")
        print(f"[DEBUG] Demographics shape: {clean_demographics.shape}")
        print("[ASSERT] Columns in demographics:", clean_demographics.columns.tolist())
        print("[ASSERT] Missing lat/lon rows:", clean_demographics['lat'].isna().sum(), clean_demographics['lon'].isna().sum())

        # Validate practice ZIP exists and pull coords
        practice_row = clean_demographics[clean_demographics["zip"] == pzip]
        if practice_row.empty:
            # As a last resort, center on weighted centroid of available zips
            lat_centroid = float(clean_demographics["lat"].mean())
            lon_centroid = float(clean_demographics["lon"].mean())
            print(f"[WARN] Practice ZIP {pzip} not found; using centroid lat={lat_centroid:.6f}, lon={lon_centroid:.6f} for distance calc.")

        # Compute distances / accessibility
        zip_features = compute_accessibility_score(
            clean_demographics,
            pzip,
            competitors_df
        ).reset_index(drop=True)

        # Debug the distance results
        print("[DEBUG] Distance calculation results (first 3 rows):")
        for _, row in zip_features.head(3).iterrows():
            print(f"[DEBUG]   ZIP {row.get('zip')}: distance={row.get('distance_miles', 'MISSING')} miles")

        print("[ANALYSIS] Computed accessibility scores")

        # Extract cohort labels from the rule-based segmentation
        cohort_labels = []  # Not needed for behavioral classification

        # STEP 3: Calculate psychographic scores
        try:
            psych_scores = calculate_psychographic_scores(
                patients_df, zip_features, cohort_labels, vertical_config, request.focus
            )
            psych_scores = pd.to_numeric(psych_scores, errors="coerce").fillna(0.5)
            zip_features["psych_score"] = psych_scores

            if zip_features["psych_score"].nunique() == 1:
                # Add small variance based on distance (closer = higher score)
                dist_normalized = 1 - (zip_features["distance_miles"] - zip_features["distance_miles"].min()) / (zip_features["distance_miles"].max() - zip_features["distance_miles"].min() + 0.01)
                zip_features["psych_score"] = 0.5 + (dist_normalized * 0.45)  # Range: 0.5 to 0.95    zip_features["psych_score"] = pd.to_numeric(psych_scores, errors="coerce").fillna(0.5)

                print("[CHECK] psych_score min/max:", 
                    zip_features["psych_score"].min(),
                    zip_features["psych_score"].max())
                    
                print(
        zip_features[["zip", "median_income", "population", "distance_miles"]]
            .assign(ps=zip_features["psych_score"])
            .sort_values("ps", ascending=False)
            .head(10)
            .to_string(index=False)
    )

            print("[ANALYSIS] Calculated psychographic scores successfully")
        except Exception as e:
            print(f"[ERROR] calculate_psychographic_scores failed: {e}")

        # STEP 2: Classify patients by behavior (profile-first)
        patients_df = segment_patients_by_behavior(patients_df)

        # Find dominant profile
        profile_counts = patients_df['behavioral_segment'].value_counts()
        dominant_profile_name = profile_counts.idxmax()
        dominant_count = profile_counts.iloc[0]
        dominant_pct = (dominant_count / len(patients_df)) * 100

        print(f"[PROFILE] Dominant segment: '{dominant_profile_name}' ({dominant_count}/{len(patients_df)} = {dominant_pct:.1f}%)")

        # Map profiles to ZIPs (geography as discovery, not classification)
        zip_profiles = (
            patients_df.groupby('zip_code')['behavioral_segment']
            .agg(lambda x: x.value_counts().index[0] if len(x) > 0 else 'Expansion Opportunity')
            .reset_index()
            .rename(columns={'behavioral_segment': 'cohort'})
        )

        # Merge into zip_features
        zip_features = zip_features.merge(
            zip_profiles, 
            left_on='zip', 
            right_on='zip_code', 
            how='left'
        )

        # Fill missing with "Expansion Opportunity"
    

        print(f"[PROFILE] Mapped profiles to {len(zip_profiles)} ZIPs")

        # Show top ZIPs for dominant profile
        top_zips = (
            patients_df[patients_df['behavioral_segment'] == dominant_profile_name]['zip_code']
            .value_counts()
            .head(10)
        )

        print(f"[PROFILE] Top ZIPs for '{dominant_profile_name}':")
        for zip_code, count in top_zips.items():
            print(f"  ZIP {zip_code}: {count} patients")
        print("")

        # STEP 3: Calculate per-ZIP revenue stats from patient history
        zip_stats = (
            patients_df
            .groupby("zip_code", dropna=False)
            .agg(revenue_sum=("revenue", "sum"), patient_count=("revenue", "count"))
            .reset_index()
            .rename(columns={"zip_code": "zip"})
        )

        # Calculate average ticket per ZIP
        zip_stats["avg_ticket_zip"] = (
            zip_stats["revenue_sum"] / zip_stats["patient_count"].replace(0, np.nan)
        )

        # Merge ZIP stats into zip_features
        zip_features = zip_features.merge(zip_stats, on="zip", how="left")

        # Fill missing values with global average
        global_avg_ticket = float(patients_df["revenue"].mean())
        zip_features["avg_ticket_zip"] = zip_features["avg_ticket_zip"].fillna(global_avg_ticket)
        zip_features["patient_count"] = zip_features["patient_count"].fillna(0).astype(int)

        print(f"[CHECK] Global avg ticket: ${global_avg_ticket:.2f}")
        print(f"[CHECK] Mapped revenue to {len(zip_stats)} ZIPs with patients")

        # Simple ZIP scoring for ranking (not classification)
        zip_features["zip_score"] = 0.5

        # ZIPs with patients: score by actual performance
        has_patients = zip_features["patient_count"] > 0
        if has_patients.any():
            max_patients = zip_features.loc[has_patients, "patient_count"].max()
            max_revenue = zip_features.loc[has_patients, "avg_ticket_zip"].max()
            
            if max_patients > 0 and max_revenue > 0:
                zip_features.loc[has_patients, "zip_score"] = (
                    0.5 * (zip_features.loc[has_patients, "patient_count"] / max_patients) +
                    0.3 * (zip_features.loc[has_patients, "avg_ticket_zip"] / max_revenue) +
                    0.2 * (1.0 / (1.0 + zip_features.loc[has_patients, "distance_miles"] / 10))
                ).clip(0.05, 0.95)

        # ZIPs without patients: score by expansion potential
        no_patients = zip_features["patient_count"] == 0
        if no_patients.any() and has_patients.any():
            avg_income = zip_features.loc[has_patients, "median_income"].median()
            avg_college = zip_features.loc[has_patients, "college_pct"].median()
            
            income_diff = abs(zip_features.loc[no_patients, "median_income"] - avg_income) / (avg_income + 1)
            college_diff = abs(zip_features.loc[no_patients, "college_pct"] - avg_college) / (avg_college + 0.01)
            
            similarity = 1.0 - ((income_diff + college_diff) / 2).clip(0, 1)
            distance_factor = 1.0 / (1.0 + zip_features.loc[no_patients, "distance_miles"] / 10)
            
            zip_features.loc[no_patients, "zip_score"] = (similarity * distance_factor * 0.6).clip(0.05, 0.6)

        # Use zip_score as psych_score for compatibility
        zip_features["psych_score"] = zip_features["zip_score"]

        print(f"[SCORE] Scored {len(zip_features)} ZIPs (patient-based + expansion)")

        # STEP 4: Learn Ridge regression
        ridge_model = learn_ridge_regression(patients_df, zip_features)
        print(f"[ANALYSIS] Ridge model created: {ridge_model is not None}")

        # STEP 5: Build headline metrics
        if "revenue" in patients_df.columns:
            total_revenue = float(patients_df["revenue"].sum())
            avg_revenue = float(patients_df["revenue"].mean())
            high_value_count = int((patients_df["revenue"] >= vertical_config.get("high_value_threshold", 500)).sum())
        else:
            total_revenue = 0.0
            avg_revenue = 0.0
            high_value_count = 0

        headline_metrics = {
            'total_patients': len(patients_df),
            'total_revenue': total_revenue,
            'avg_revenue': avg_revenue,
            'high_value_count': high_value_count,
            'unique_zips': patients_df["zip_code"].nunique()
        }

        print(f"[DEBUG] zip_features shape: {zip_features.shape}")
        print(f"[DEBUG] psych_score values: {zip_features.get('psych_score', 'MISSING').head() if len(zip_features) > 0 else 'EMPTY'}")

        # Rule-based insights generator
        def generate_rule_based_insights(row):
            def pick(options):
                if not options:
                    return ""
                idx = hash(str(row.get("zip", ""))) % len(options)
                return options[idx]

            zip_code   = str(row.get("zip"))
            ms         = float(coerce_float(row.get("psych_score", 0.5), 0.5))
            pct        = f"{ms:.0%}"
            distance   = float(coerce_float(row.get("distance_miles", 0.0), 0.0))
            competitors= int(coerce_float(row.get("competitors", 0), 0))
            income     = float(coerce_float(row.get("median_income", 75000), 75000))
            inc        = f"${income:,.0f}"
            pop        = int(coerce_float(row.get("population", 20000), 20000))
            college    = float(coerce_float(row.get("college_pct", 0.32), 0.32))
            owner      = float(coerce_float(row.get("owner_occ_pct", 0.65), 0.65))

            insights = []

            if competitors == 0:
                insights.append(pick([
                    f"Virgin market in ZIP {zip_code} with zero competition.",
                    f"No direct competitors in {zip_code} — strong first-mover advantage."
                ]))
            elif competitors <= 2:
                insights.append(pick([
                    f"Low competition in ZIP {zip_code} ({competitors} competitors).",
                    f"Favorable competitive set in {zip_code} — room to capture share."
                ]))
            else:
                insights.append(pick([
                    f"Competitive area in ZIP {zip_code} ({competitors} competitors).",
                    f"More crowded field in {zip_code} — emphasize differentiation."
                ]))

            if distance <= 2:
                insights.append(pick([
                    f"Excellent proximity at {distance:.1f} miles from your location.",
                    f"Hyperlocal reach ({distance:.1f} mi) — lean into convenience messaging."
                ]))
            elif distance <= 8:
                insights.append(pick([
                    f"Good access at {distance:.1f} miles from your location.",
                    f"Local service radius ({distance:.1f} mi) — efficient to serve."
                ]))
            elif distance <= 20:
                insights.append(pick([
                    f"Extended service area at {distance:.1f} miles from your location.",
                    f"Regional reach ({distance:.1f} mi) — destination positioning helps."
                ]))
            else:
                insights.append(pick([
                    f"Farther-reach market at {distance:.1f} miles; consider targeted campaigns.",
                    f"Longer travel ({distance:.1f} mi) — focus on high-intent offers."
                ]))

            if ms >= 0.75:
                insights.append(pick([
                    f"Strong demographic alignment ({pct} match).",
                    f"High audience fit ({pct} match) — prioritize this ZIP."
                ]))
            elif ms >= 0.55:
                insights.append(pick([
                    f"Moderate demographic fit ({pct} match).",
                    f"Balanced audience fit ({pct} match) — test mid-budget."
                ]))
            else:
                insights.append(pick([
                    f"Emerging potential ({pct} match); test lower-cost offers first.",
                    f"Early-stage fit ({pct} match) — start with lightweight pilots."
                ]))

            if income >= 120_000:
                insights.append(pick([
                    f"Premium income profile (median {inc}); support higher-ticket procedures.",
                    f"{inc} median income — lean into premium bundles."
                ]))
            elif income >= 90_000:
                insights.append(pick([
                    f"High median income ({inc}); upsell packages and memberships.",
                    f"{inc} median income — strong propensity for elective spend."
                ]))
            else:
                insights.append(pick([
                    f"Mid-market income ({inc}); lead with value-oriented offers.",
                    f"{inc} median income — highlight financing and promos."
                ]))

            insights.append(
                f"{college:.0%} college-educated and {owner:.0%} owner-occupied housing—channels: paid social + search retargeting."
            )
            insights.append(f"Local population ~{pop:,}; calibrate budget to demand density.")
            return insights

        # Build top segments with profile-first ranking
        if "cohort" in zip_features.columns:
            zip_features["lift_index"] = zip_features.groupby("cohort")["psych_score"].transform(
                lambda s: (s / (s.mean() + 1e-6)) * 100
            )
        else:
            zip_features["lift_index"] = 100

        zip_features["profile_score"] = zip_features["lift_index"] * (zip_features["population"] / 1000)

        top_zip_features = zip_features.sort_values(
            ["profile_score", "psych_score"], 
            ascending=False
        ).head(20).reset_index(drop=True)

        expansion_count = int((top_zip_features.get("patient_count", 0) == 0).sum())

        print(f"[SCAN] Evaluated: {len(zip_features)} total ZIPs")
        print(f"[SCAN] Selected: {len(top_zip_features)} top ZIPs")
        print(f"[SCAN] Expansion: {expansion_count} ZIPs with ZERO current patients 🎯")
        
        top_segments = []

        for _, r in top_zip_features.iterrows():
            zip_code = str(r.get("zip"))
            score = float(coerce_float(r.get("psych_score", 0.5), 0.5))
            dist = float(coerce_float(r.get("distance_miles", 0.0), 0.0))
            lat = float(coerce_float(r.get("lat", 0.0), 0.0))
            lon = float(coerce_float(r.get("lon", 0.0), 0.0))
            comp = int(coerce_float(r.get("competitors", 0), 0))
            cohort_label = str(r.get("cohort", "Segment"))
            
            patient_count = int(coerce_float(r.get("patient_count", 0), 0))
            avg_ticket_zip = float(coerce_float(r.get("avg_ticket_zip", 0), 0))
            global_avg = float(coerce_float(patients_df.get("revenue", pd.Series([750])).mean(), 750))
            ticket = avg_ticket_zip if avg_ticket_zip > 0 else global_avg
            
            population = float(r.get('population', 20000))
            market_penetration = patient_count / population if population > 0 else 0.0001
            base_monthly = max(1, int(population * market_penetration * score * 0.1))
            bookings = {
                "p10": max(1, int(base_monthly * 0.5)),
                "p50": base_monthly,
                "p90": max(base_monthly + 1, int(base_monthly * 1.5))
            }
            
            location_name = get_location_name_from_demographics(zip_code, demographics_df)
            demographic_desc = generate_dynamic_demographic_description(r, cohort_label, patients_df, zip_code)
            behavioral_tags = generate_data_driven_tags(r, patients_df, zip_code)
            best_channel = determine_best_channel_from_data(r, cohort_label, patients_df, zip_code)
            
            if comp == 0:
                competition_level = "None"
            elif comp <= 2:
                competition_level = "Low"
            elif comp <= 5:
                competition_level = "Moderate"
            else:
                competition_level = "High"
            
            cpa_target = calculate_dynamic_cpa_target(ticket, score, comp, dist)
            monthly_ad_cap = cpa_target * bookings["p50"]
            target_roas = round(ticket / cpa_target, 1) if cpa_target > 0 else 5.0
            
            row_dict_for_insights = {
                "zip": zip_code,
                "distance_miles": dist,
                "competitors": comp,
                "population": population,
                "expected_bookings": bookings["p50"],
            }
            insights_list = build_strategic_insights_for_row(
                row_dict_for_insights,
                avg_ticket=ticket,
                target_roas=5.0,
            )
            
            seg = {
                "zip": zip_code,
                "match_score": score,
                "expected_bookings": bookings["p50"],
                "expected_monthly_revenue": round(bookings["p50"] * ticket, 2),
                "cpa_target": round(cpa_target, 2),
                "monthly_ad_cap": round(monthly_ad_cap, 2),
                "distance_miles": dist,
                "competitors": comp,
                "competition_level": competition_level,
                "cohort": cohort_label,
                "why": insights_list,
                "strategic_insights": insights_list,
                "lat": lat,
                "lon": lon,
                "historical_patients": patient_count,
                "is_new_market": patient_count == 0,
                "avg_ticket_zip": round(ticket, 2),
                "location_name": location_name,
                "demographic_description": demographic_desc,
                "behavioral_tags": behavioral_tags,
                "best_channel": best_channel,
                "target_roas": target_roas,
                "population": int(population),
                "median_income": int(r.get('median_income', 75000)),
                "college_pct": float(r.get('college_pct', 0.35)),
                "market_penetration": round(market_penetration * 100, 4)
            }
            top_segments.append(seg)

        print(f"[DEBUG] Total segments created: {len(top_segments)}")

        # Generate profile-first analysis
        print(f"[DEBUG] About to call identify_dominant_profile with {len(patients_df)} patients")
        dominant_profile = identify_dominant_profile(
            patients_df, 
            zip_features, 
            top_percentile=0.2
        )
        print(f"[PROFILE] {dominant_profile['profile_summary']}")
        strategic_insights = generate_strategic_insights(
            patients_df=patients_df,
            behavior_patterns=dominant_profile['behavior_patterns'],
            dominant_profile=dominant_profile['dominant_profile'],
            top_segments=top_segments
        )
        print(f"[INSIGHTS] Generated {len(strategic_insights)} strategic insights")
        
        # Calculate actual demographics from uploaded data
        demographics = {
            'avg_age': None,
            'age_range': None,
            'gender_split': None
        }

        procedure_col = None
        for col in ['procedure', 'procedure_norm', 'treatment', 'service', 'treatments_received']:
            if col in patients_df.columns:
                procedure_col = col
                break
        
        age_col = None
        for col in patients_df.columns:
            col_lower = col.lower()
            if any(x in col_lower for x in ['age', 'dob', 'birth']):
                age_col = col
                break

        if age_col:
            try:
                if 'dob' in age_col.lower() or 'birth' in age_col.lower():
                    patients_df['calculated_age'] = pd.to_datetime('today').year - pd.to_datetime(patients_df[age_col], errors='coerce').dt.year
                    age_col = 'calculated_age'
                
                valid_ages = patients_df[age_col].dropna()
                valid_ages = valid_ages[(valid_ages >= 18) & (valid_ages <= 100)]
                
                if len(valid_ages) > 0:
                    demographics['avg_age'] = int(valid_ages.mean())
                    demographics['age_range'] = {
                        'min': int(valid_ages.min()),
                        'max': int(valid_ages.max()),
                        '25th': int(valid_ages.quantile(0.25)),
                        '75th': int(valid_ages.quantile(0.75))
                    }
            except Exception as e:
                logger.warning(f"Could not calculate age: {e}")

        gender_col = None
        for col in patients_df.columns:
            if col.lower() in ['gender', 'sex']:
                gender_col = col
                break

        if gender_col:
            try:
                gender_counts = patients_df[gender_col].value_counts(normalize=True)
                demographics['gender_split'] = {
                    str(gender): round(float(pct) * 100, 1) 
                    for gender, pct in gender_counts.items()
                }
            except Exception as e:
                logger.warning(f"Could not calculate gender split: {e}")

        actual_treatments = {}
        if procedure_col:
            try:
                treatment_counts = patients_df[procedure_col].value_counts()
                actual_treatments = {str(k): int(v) for k, v in treatment_counts.items()}
            except Exception as e:
                logger.warning(f"Could not calculate treatments: {e}")

        actual_revenue_stats = {"total": 0, "mean": 0, "median": 0, "by_treatment": {}}
        if "revenue" in patients_df.columns:
            try:
                actual_revenue_stats = {
                    "total": float(patients_df['revenue'].sum()),
                    "mean": float(patients_df['revenue'].mean()),
                    "median": float(patients_df['revenue'].median())
                }
                
                if procedure_col:
                    by_treatment = patients_df.groupby(procedure_col)['revenue'].agg(['sum', 'mean', 'count'])
                    actual_revenue_stats['by_treatment'] = {
                        str(k): {'total': float(v['sum']), 'average': float(v['mean']), 'count': int(v['count'])}
                        for k, v in by_treatment.iterrows()
                    }
            except Exception as e:
                logger.warning(f"Could not calculate revenue stats: {e}")

        return {
            "headline_metrics": headline_metrics,
            "dominant_profile": dominant_profile,
            "strategic_insights": strategic_insights,
            "top_segments": top_segments,
            "map_points": [],
            "confidence_info": {"level": "early", "message": "Limited data confidence"},
            "patient_count": len(patients_df),
            "actual_total_revenue": total_revenue,
            "demographics": demographics,
            "actual_treatments": actual_treatments,
            "actual_revenue_stats": actual_revenue_stats
        }

    except Exception as e:
        import traceback
        print(f"[ERROR] execute_advanced_analysis failed: {e}")
        print(traceback.format_exc())
        raise e
            
        
@app.post("/api/v1/campaigns/instagram")
@limiter.limit("100/hour")
async def generate_instagram_campaign(
    request: fastapi.Request,
    segment_name: str = Form(...),
    patient_count: int = Form(...),
    avg_ltv: float = Form(...),
    avg_ticket: float = Form(...),
    top_procedures: str = Form(...),  # comma-separated
    target_demographics: str = Form(...),
    practice_name: str = Form("Your Practice"),
    practice_city: str = Form("Your City"),
    avg_visits_per_year: float = Form(2.0),
    retention_rate: float = Form(75.0),
    revenue_contribution_pct: float = Form(20.0),
    risk_level: str = Form("medium")
):
    """
    Generate Instagram ad copy for a patient segment using Claude AI.
    Includes caching and rate limiting.
    """
    
    # Create cache key based on segment characteristics
    cache_key = hashlib.md5(
        f"instagram-v1-{segment_name}-{patient_count}-{avg_ltv}-{top_procedures}".encode()
    ).hexdigest()
    
    # Check cache first
    if CACHE_ENABLED and redis_client:
        try:
            cached = redis_client.get(f"instagram:{cache_key}")
            if cached:
                print(f"[CACHE HIT] Instagram ad for {segment_name}")
                return json.loads(cached)
        except Exception as e:
            print(f"[CACHE ERROR] {e}")
            

    
    # Generate with LLM
    try:
        # Create context for LLM
        context = CampaignContext(
            segment_name=segment_name,
            patient_count=patient_count,
            avg_ltv=avg_ltv,
            avg_ticket=avg_ticket,
            top_procedures=top_procedures.split(','),
            target_zips=[],  # ADD THIS LINE
            target_demographics=target_demographics,
            practice_name=practice_name,
            practice_city=practice_city,
            recommended_budget=avg_ltv * 0.1,
            competition_level="moderate"
        )
        
        print(f"[LLM] Generating Instagram ad for {segment_name}...")
        result = llm_service.generate_instagram_ad(context)
        
        # Cache for 24 hours
        if CACHE_ENABLED and redis_client:
            try:
                redis_client.setex(
                    f"instagram:{cache_key}",
                    86400,  # 24 hours in seconds
                    json.dumps(result)
                )
                print(f"[CACHE] Stored Instagram ad for {segment_name}")
            except Exception as e:
                print(f"[CACHE ERROR] Failed to store: {e}")
        
        print(f"[LLM] Instagram ad generated successfully - Est. cost: $0.01")
        return result
        
    except Exception as e:
        print(f"[LLM ERROR] Instagram generation failed: {e}")
        # Return fallback content if LLM fails
        procedures_list = top_procedures.split(',')
        return {
            "caption": f"✨ Transform your look with {procedures_list[0] if procedures_list else 'expert treatments'}",
            "first_comment": f"Book your free consultation today at {practice_name}. {target_demographics} love our results! 💕",
            "hashtags": ["aesthetics", "beauty", "transformation", practice_city.lower().replace(' ', '')],
            "story_cta": "Swipe up to book your consultation"
        }  
@app.post("/api/v1/campaigns/google")
@limiter.limit("100/hour")
async def generate_google_campaign(
    request: fastapi.Request,
    segment_name: str = Form(...),
    patient_count: int = Form(...),
    avg_ltv: float = Form(...),
    avg_ticket: float = Form(...),
    top_procedures: str = Form(...),
    target_demographics: str = Form(...),
    practice_name: str = Form("Your Practice"),
    practice_city: str = Form("Your City"),
    vertical: str = Form("medspa"),
):
    cache_key = hashlib.md5(
        f"google-v1-{segment_name}-{patient_count}-{avg_ltv}-{top_procedures}".encode()
    ).hexdigest()
    
    if CACHE_ENABLED and redis_client:
        try:
            cached = redis_client.get(f"google:{cache_key}")
            if cached:
                return json.loads(cached)
        except Exception as e:
            print(f"[CACHE ERROR] {e}")
    
    try:
        context = CampaignContext(
            segment_name=segment_name,
            patient_count=patient_count,
            avg_ltv=avg_ltv,
            avg_ticket=avg_ticket,
            top_procedures=top_procedures.split(','),
            target_zips=[],
            target_demographics=target_demographics,
            practice_name=practice_name,
            practice_city=practice_city,
            recommended_budget=avg_ltv * 0.1,
            competition_level="moderate"
        )
        
        result = llm_service.generate_google_ad(context)
        
        if CACHE_ENABLED and redis_client:
            redis_client.setex(f"google:{cache_key}", 86400, json.dumps(result))
        
        return result
        
    except Exception as e:
        procedures_list = top_procedures.split(',')
        return {
            "headlines": [f"Best {procedures_list[0]} in {practice_city}", f"Top-Rated {procedures_list[0]}", "Book Your Free Consult"],
            "descriptions": [f"Expert {procedures_list[0]} treatments. Trusted by {patient_count}+ patients. Book today!"],
            "keywords": [procedures_list[0].lower(), f"{procedures_list[0].lower()} near me", f"{procedures_list[0].lower()} {practice_city.lower()}"]
        }       

@app.post("/api/v1/campaigns/generate-copy")
async def generate_campaign_copy(
    request: fastapi.Request,
    vertical: str = Form("medspa"),
    profile_type: str = Form(""),
    city: str = Form(""),
    avg_ltv: float = Form(0),
    total_clients: int = Form(0),
    top_services: str = Form(""),
):
    """Generate all ad copy based on vertical and data."""
    from services.verticals import get_prompt_context
    
    vertical_context = get_prompt_context(vertical)
    services = top_services if top_services else ("real estate services" if vertical == "real_estate_mortgage" else "aesthetic treatments")
    
    prompt = f"""Generate ad copy for Facebook, Instagram, and Google for this business.

{vertical_context}

BUSINESS DATA:
- Location: {city}
- Client profile: {profile_type}
- Average client value: ${avg_ltv:,.0f}
- Total clients served: {total_clients}
- Top services: {services}

Return ONLY valid JSON:
{{
  "facebook": {{
    "headline": "5-8 words",
    "body": "2-3 sentences, compelling but not salesy"
  }},
  "instagram": {{
    "headline": "5-8 words with one emoji",
    "body": "2-3 sentences, visual and aspirational"
  }},
  "google": {{
    "headlines": ["headline 1", "headline 2", "headline 3"],
    "descriptions": ["description 1", "description 2"]
  }}
}}
"""
    
    try:
        response = await llm_service.generate(prompt, max_tokens=600)
        return json.loads(response)
    except Exception as e:
        print(f"[LLM ERROR] Campaign copy generation failed: {e}")
        if vertical == "real_estate_mortgage":
            return {
                "facebook": {
                    "headline": f"Your Trusted Real Estate Partner in {city}",
                    "body": f"Thinking of buying or selling? Our team has helped {total_clients}+ clients find their perfect home. Get a free consultation today."
                },
                "instagram": {
                    "headline": f"🏡 Real Results in {city}",
                    "body": f"See why {total_clients}+ clients trust us with their biggest investment. Your dream home is closer than you think."
                },
                "google": {
                    "headlines": [f"Top Real Estate Agent {city}", "Buy or Sell With Confidence", "Free Home Valuation"],
                    "descriptions": [f"Trusted by {total_clients}+ clients. Expert guidance for buyers and sellers.", "Get your free consultation today. No obligation."]
                }
            }
        else:
            return {
                "facebook": {
                    "headline": f"Expert Aesthetic Care in {city}",
                    "body": f"Join {total_clients}+ satisfied patients who trust us for natural-looking results. Book your complimentary consultation."
                },
                "instagram": {
                    "headline": f"✨ Real Results in {city}",
                    "body": f"See the transformations our patients love. Natural beauty, expert care."
                },
                "google": {
                    "headlines": [f"Top Med Spa {city}", "Natural-Looking Results", "Free Consultation"],
                    "descriptions": [f"Trusted by {total_clients}+ patients. Expert aesthetic treatments.", "Book your free consultation today."]
                }
            }
        
@app.post("/api/v1/campaigns/email")
@limiter.limit("100/hour")
async def generate_email_campaign(
    request: fastapi.Request,
    segment_name: str = Form(...),
    procedure: str = Form("aesthetic treatments"),
    sequence_type: str = Form("nurture"),  # nurture, reactivation, upsell, post_visit
    practice_name: str = Form("Your Practice"),
    practice_city: str = Form("Your City"),
    vertical: str = Form("medspa"),
):
    """
    Generate email sequence for a patient segment using Claude AI.
    """
    from services.campaign_generator import generate_email_sequence
    
    # Create cache key
    cache_key = hashlib.md5(
        f"email-v1-{segment_name}-{procedure}-{sequence_type}".encode()
    ).hexdigest()
    
    # Check cache first
    if CACHE_ENABLED and redis_client:
        try:
            cached = redis_client.get(f"email:{cache_key}")
            if cached:
                print(f"[CACHE HIT] Email sequence for {segment_name}")
                return json.loads(cached)
        except Exception as e:
            print(f"[CACHE ERROR] {e}")
    
    try:
        print(f"[LLM] Generating {sequence_type} email sequence for {segment_name}...")
        result = generate_email_sequence(
            cohort=segment_name,
            procedure=procedure,
            sequence_type=sequence_type,
            vertical=vertical
        )
        
        # Add practice info to result
        result["practice_name"] = practice_name
        result["practice_city"] = practice_city
        
        # Cache for 24 hours
        if CACHE_ENABLED and redis_client:
            try:
                redis_client.setex(f"email:{cache_key}", 86400, json.dumps(result))
                print(f"[CACHE] Stored email sequence for {segment_name}")
            except Exception as e:
                print(f"[CACHE ERROR] Failed to store: {e}")
        
        return result
        
    except Exception as e:
        print(f"[LLM ERROR] Email generation failed: {e}")
        return {
            "sequence": [
                {
                    "email_number": 1,
                    "send_delay": "immediately",
                    "subject_line": f"Your {procedure} consultation awaits",
                    "preview_text": "See what personalized treatment could do for you",
                    "body": f"Hi,\n\nThank you for your interest in {procedure}. Book a free consultation to discuss your options.\n\nBest,\n{practice_name}",
                    "cta_text": "Book Free Consultation",
                    "cta_type": "book_consultation"
                }
            ],
            "sequence_strategy": "Single touchpoint - expand sequence for better results."
        }


@app.post("/api/v1/campaigns/sms")
@limiter.limit("100/hour")
async def generate_sms_campaign(
    request: fastapi.Request,
    segment_name: str = Form(...),
    procedure: str = Form("your treatment"),
    campaign_type: str = Form("reactivation"),  # appointment_reminder, reactivation, flash_offer, post_visit, waitlist
    practice_name: str = Form("Your Practice"),
    practice_phone: str = Form("[Phone]"),
    vertical: str = Form("medspa"),
):
    """
    Generate SMS messages for a patient segment using Claude AI.
    """
    from services.campaign_generator import generate_sms_campaign as gen_sms
    
    # Create cache key
    cache_key = hashlib.md5(
        f"sms-v1-{segment_name}-{procedure}-{campaign_type}".encode()
    ).hexdigest()
    
    # Check cache first
    if CACHE_ENABLED and redis_client:
        try:
            cached = redis_client.get(f"sms:{cache_key}")
            if cached:
                print(f"[CACHE HIT] SMS campaign for {segment_name}")
                return json.loads(cached)
        except Exception as e:
            print(f"[CACHE ERROR] {e}")
    
    try:
        print(f"[LLM] Generating {campaign_type} SMS campaign for {segment_name}...")
        result = gen_sms(
            cohort=segment_name,
            procedure=procedure,
            campaign_type=campaign_type,
            vertical=vertical
        )
        
        # Replace placeholders with practice info
        for msg in result.get("messages", []):
            msg["text"] = msg["text"].replace("[Business Name]", practice_name)
            msg["text"] = msg["text"].replace("[Phone]", practice_phone)
            msg["character_count"] = len(msg["text"])
        
        # Cache for 24 hours
        if CACHE_ENABLED and redis_client:
            try:
                redis_client.setex(f"sms:{cache_key}", 86400, json.dumps(result))
                print(f"[CACHE] Stored SMS campaign for {segment_name}")
            except Exception as e:
                print(f"[CACHE ERROR] Failed to store: {e}")
        
        return result
        
    except Exception as e:
        print(f"[LLM ERROR] SMS generation failed: {e}")
        return {
            "messages": [
                {
                    "variant": "A",
                    "text": f"{practice_name}: Ready to book {procedure}? Reply YES or call {practice_phone}!",
                    "character_count": 70
                }
            ],
            "recommended_send_time": "Tuesday-Thursday, 10am-2pm",
            "compliance_note": "Ensure patient has opted in to SMS marketing."
        }
        
def reconcile_outreach_returns(db: Session, run_id: str, df: pd.DataFrame):
    """
    Check if any contacted patients have returned based on new upload data.
    Auto-marks them as returned and logs their revenue.
    """
    from datetime import datetime
    
    print(f"[RECONCILE] Starting reconciliation for run {run_id}")
    
    # Only check patients from THIS run (not all runs)
    contacted = db.query(PatientOutreach).filter(
        PatientOutreach.run_id == run_id,
        PatientOutreach.contacted_at.isnot(None),
        PatientOutreach.returned_at.is_(None)
    ).all()
    
    print(f"[RECONCILE] Found {len(contacted)} contacted patients awaiting return")
    
    if not contacted:
        return {"reconciled": 0, "revenue": 0}
    
    # Get column names from current upload
    patient_col = 'patient_id' if 'patient_id' in df.columns else df.columns[0]
    revenue_col = 'revenue' if 'revenue' in df.columns else 'amount' if 'amount' in df.columns else None
    date_col = next((c for c in ['visit_date', 'date', 'last_visit', 'appointment_date'] if c in df.columns), None)
    
    # Parse dates if available
    if date_col:
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    current_patients = set(df[patient_col].astype(str).unique())
    print(f"[RECONCILE] Current upload has {len(current_patients)} patients: {list(current_patients)[:5]}...")
    print(f"[RECONCILE] Looking for matches with: {[c.patient_id for c in contacted]}")
    
    reconciled = 0
    total_revenue = 0
    
    for outreach in contacted:
        if outreach.patient_id not in current_patients:
            continue
            
        patient_rows = df[df[patient_col].astype(str) == outreach.patient_id]
        
        # Only count visits AFTER the contact date
        if date_col and outreach.contacted_at:
            patient_rows = patient_rows[patient_rows[date_col] > outreach.contacted_at]
        
        if patient_rows.empty:
            continue
            
        # Patient returned! Mark them
        outreach.returned_at = datetime.utcnow()
        
    
    db.commit()
    return {"success": True, "contacted_count": len(patient_ids)}


@app.post("/api/v1/runs/{run_id}/outreach/mark-returned")
async def mark_patients_returned(
    run_id: str,
    patient_id: str = Form(...),
    revenue: float = Form(0),
    db: Session = Depends(get_db)
):
    """Mark a patient as returned and log recovered revenue."""
    from datetime import datetime
    
    outreach = db.query(PatientOutreach).filter(
        PatientOutreach.run_id == run_id,
        PatientOutreach.patient_id == patient_id
    ).first()
    
    if outreach:
        outreach.returned_at = datetime.utcnow()
        outreach.revenue_recovered = revenue
        db.commit()
        return {"success": True}
    
    
    
    return {"success": False, "error": "Patient not found in outreach list"}


@app.get("/api/v1/runs/{run_id}/outreach/summary")
async def get_outreach_summary(
    run_id: str,
    db: Session = Depends(get_db)
):
    """Get ROI summary for outreach campaign."""
    outreach_records = db.query(PatientOutreach).filter(
        PatientOutreach.run_id == run_id
    ).all()
    
    contacted = [r for r in outreach_records if r.contacted_at]
    returned = [r for r in outreach_records if r.returned_at]
    total_recovered = sum(r.revenue_recovered or 0 for r in returned)
    
    return {
        "contacted_count": len(contacted),
        "returned_count": len(returned),
        "conversion_rate": round(len(returned) / len(contacted) * 100, 1) if contacted else 0,
        "revenue_recovered": total_recovered,
        "patients": [
            {
                "patient_id": r.patient_id,
                "contacted_at": r.contacted_at.isoformat() if r.contacted_at else None,
                "returned_at": r.returned_at.isoformat() if r.returned_at else None,
                "revenue_recovered": r.revenue_recovered
            }
            for r in outreach_records
        ]
    }

@app.post("/api/v1/runs/{run_id}/outreach/mark-contacted")
async def mark_patients_contacted(
    run_id: str,
    patient_ids: list[str] = Form(...),
    days_stale_list: str = Form(""),
    loan_amount_list: str = Form(""),
    db: Session = Depends(get_db)
):
    """Mark patients as contacted for outreach tracking with context."""
    import uuid
    from datetime import datetime
    
    days_stale = [int(d) for d in days_stale_list.split(",") if d.strip()] if days_stale_list else []
    loan_amounts = [float(a) for a in loan_amount_list.split(",") if a.strip()] if loan_amount_list else []
    
    for i, pid in enumerate(patient_ids):
        existing = db.query(PatientOutreach).filter(
            PatientOutreach.run_id == run_id,
            PatientOutreach.patient_id == pid
        ).first()
        
        if existing:
            existing.contacted_at = datetime.utcnow()
            existing.days_stale_when_contacted = days_stale[i] if i < len(days_stale) else None
            existing.outcome = "pending"
        else:
            outreach = PatientOutreach(
                id=str(uuid.uuid4()),
                run_id=run_id,
                patient_id=pid,
                contacted_at=datetime.utcnow(),
                days_stale_when_contacted=days_stale[i] if i < len(days_stale) else None,
                loan_amount=loan_amounts[i] if i < len(loan_amounts) else None,
                commission=(loan_amounts[i] * 0.01) if i < len(loan_amounts) else None,
                outcome="pending"
            )
            db.add(outreach)
    
    db.commit()
    return {"success": True, "contacted_count": len(patient_ids)}

@app.post("/api/v1/outreach/{outreach_id}/outcome")
async def update_outreach_outcome(
    outreach_id: str,
    outcome: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update outcome: pending, closed, lost, no_answer, callback"""
    outreach = db.query(PatientOutreach).filter(PatientOutreach.id == outreach_id).first()
    if not outreach:
        raise HTTPException(status_code=404, detail="Outreach record not found")
    
    outreach.outcome = outcome
    if outcome == "closed":
        outreach.returned_at = datetime.utcnow()
        outreach.revenue_recovered = outreach.commission or (outreach.loan_amount * 0.01 if outreach.loan_amount else 4000)
    
    db.commit()
    return {"success": True, "outcome": outcome}


@app.get("/api/v1/analytics/recovery-rates")
async def get_recovery_analytics(db: Session = Depends(get_db)):
    """Conversion rates by days-to-contact — the moat data."""
    from sqlalchemy import func, case
    
    results = db.query(
        case(
            (PatientOutreach.days_stale_when_contacted < 7, '0-7 days'),
            (PatientOutreach.days_stale_when_contacted < 30, '8-30 days'),
            (PatientOutreach.days_stale_when_contacted < 60, '31-60 days'),
            else_='60+ days'
        ).label('timing_bucket'),
        func.count(PatientOutreach.id).label('total'),
        func.sum(case((PatientOutreach.outcome == 'closed', 1), else_=0)).label('closed'),
        func.sum(PatientOutreach.revenue_recovered).label('revenue')
    ).filter(
        PatientOutreach.outcome.isnot(None),
        PatientOutreach.days_stale_when_contacted.isnot(None)
    ).group_by('timing_bucket').all()
    
    return {
        "buckets": [
            {
                "timing": r.timing_bucket,
                "total": r.total,
                "closed": r.closed or 0,
                "conversion_rate": round((r.closed / r.total * 100), 1) if r.total > 0 else 0,
                "revenue_recovered": float(r.revenue or 0)
            }
            for r in results
        ]
    }
    
@app.post("/api/v1/runs/{run_id}/outreach/mark-returned")
async def mark_patients_returned(
    run_id: str,
    patient_id: str = Form(...),
    revenue: float = Form(0),
    db: Session = Depends(get_db)
):
    """Mark a patient as returned and log recovered revenue."""
    from datetime import datetime
    
    outreach = db.query(PatientOutreach).filter(
        PatientOutreach.run_id == run_id,
        PatientOutreach.patient_id == patient_id
    ).first()
    
    if outreach:
        outreach.returned_at = datetime.utcnow()
        outreach.revenue_recovered = revenue
        db.commit()
        return {"success": True}
    
    return {"success": False, "error": "Patient not found in outreach list"}


@app.get("/api/v1/runs/{run_id}/outreach/summary")
async def get_outreach_summary(
    run_id: str,
    db: Session = Depends(get_db)
):
    """Get ROI summary for outreach campaign."""
    outreach_records = db.query(PatientOutreach).filter(
        PatientOutreach.run_id == run_id
    ).all()
    
    contacted = [r for r in outreach_records if r.contacted_at]
    returned = [r for r in outreach_records if r.returned_at]
    total_recovered = sum(r.revenue_recovered or 0 for r in returned)
    
    return {
        "contacted_count": len(contacted),
        "returned_count": len(returned),
        "conversion_rate": round(len(returned) / len(contacted) * 100, 1) if contacted else 0,
        "revenue_recovered": total_recovered,
        "patients": [
            {
                "patient_id": r.patient_id,
                "contacted_at": r.contacted_at.isoformat() if r.contacted_at else None,
                "returned_at": r.returned_at.isoformat() if r.returned_at else None,
                "revenue_recovered": r.revenue_recovered
            }
            for r in outreach_records
        ]
    }

@app.get("/api/v1/winback-scripts")
async def get_winback_scripts(
    treatment: str = "appointment",
    days_overdue: int = 90,
    patient_count: int = 1,
    db: Session = Depends(get_db)
):
    """Get best-performing win-back scripts, or generate new ones."""
    from database import WinbackTemplate
    
    existing = db.query(WinbackTemplate).filter(
        WinbackTemplate.treatment == treatment,
        WinbackTemplate.times_used >= 3
    ).all()
    
    top_performers = [t for t in existing if t.times_used > 0 and (t.times_converted / t.times_used) > 0.1]
    
    if len(top_performers) >= 3:
        return {
            "source": "optimized",
            "email_subject": next((t.subject for t in top_performers if t.template_type == "email"), "We miss you!"),
            "email": next((t.body for t in top_performers if t.template_type == "email"), ""),
            "sms": next((t.body for t in top_performers if t.template_type == "sms"), ""),
            "phone": next((t.body for t in top_performers if t.template_type == "phone"), ""),
        }
    
    examples = ""
    if top_performers:
        examples = f"\n\nTemplates that worked well before - use similar tone:\n"
        for t in top_performers[:2]:
            examples += f"- {t.template_type}: {t.body[:100]}...\n"
    
    vertical_context = get_prompt_context(treatment)  # Will use treatment to infer vertical for now
    
    prompt = f"""Write 3 win-back scripts for re-engaging {patient_count} contacts who haven't returned in {days_overdue}+ days.

{vertical_context}

Primary service: {treatment}
{examples}
Return ONLY valid JSON:
{{
  "email_subject": "short subject line",
  "email_body": "2-3 sentences, use [First Name] and [Practice Name]",
  "sms": "under 160 chars with [First Name]",
  "phone": "natural opener for a phone call"
}}

Warm and personal, not salesy."""

    try:
        response = await llm_service.generate(prompt, max_tokens=500)
        scripts = json.loads(response)
    except:
        scripts = {
            "email_subject": "We miss you!",
            "email_body": f"Hi [First Name],\n\nIt's been a while since your last {treatment}. We'd love to see you again.\n\nWarm regards,\n[Practice Name]",
            "sms": f"Hi [First Name]! We miss you - ready to book your next {treatment}? [link]",
            "phone": f"Hi [First Name], this is [Name] from [Practice]. Just checking in since your last {treatment}."
        }
    
    import uuid
    for ttype, body in [("email", scripts.get("email_body", "")), ("sms", scripts.get("sms", "")), ("phone", scripts.get("phone", ""))]:
        template = WinbackTemplate(
            id=str(uuid.uuid4()),
            treatment=treatment,
            template_type=ttype,
            subject=scripts.get("email_subject") if ttype == "email" else None,
            body=body,
            times_used=0,
            times_converted=0
        )
        db.add(template)
    db.commit()
    
    return {
        "source": "generated",
        "email_subject": scripts.get("email_subject", "We miss you!"),
        "email": scripts.get("email_body", ""),
        "sms": scripts.get("sms", ""),
        "phone": scripts.get("phone", "")
    }


@app.post("/api/v1/winback-scripts/track")
async def track_script_usage(
    treatment: str = Form(...),
    template_type: str = Form(...),
    converted: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Track when a template is used and if it converts."""
    from database import WinbackTemplate
    
    template = db.query(WinbackTemplate).filter(
        WinbackTemplate.treatment == treatment,
        WinbackTemplate.template_type == template_type
    ).order_by(WinbackTemplate.created_at.desc()).first()
    
    if template:
        template.times_used += 1
        if converted:
            template.times_converted += 1
        db.commit()
    
    return {"success": True}

# ============================================================================
# ACQUISITION CAMPAIGN ENDPOINTS
# ============================================================================

@app.get("/api/segments/{segment_id}/acquisition-summary")
async def get_acquisition_summary(segment_id: str, db: Session = Depends(get_db)):
    """Get segment summary for acquisition campaign page."""
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == segment_id).first()
    
    if not analysis_run:
        return {
            "segmentId": segment_id,
            "segmentLabel": "VIP patients",
            "neighborhoods": ["Local Area"],
            "procedures": ["All Procedures"],
            "cohort": "Comfort Spenders",
            "patientCount": 50,
            "avgLtv": 850,
            "avgAge": 42,
            "avgVisitsPerYear": 3.2,
            "avgIncome": 95000,
            "profileLabel": "VIP",
        }
    
    dominant_profile_data = getattr(analysis_run, 'dominant_profile', None)
    if isinstance(dominant_profile_data, str):
        try:
            dominant_profile_data = json.loads(dominant_profile_data)
        except:
            dominant_profile_data = {}
    if not dominant_profile_data:
        dominant_profile_data = {}
    
    demographics = dominant_profile_data.get("dominant_profile", {})
    behavior = dominant_profile_data.get("behavior_patterns", {})
    
    top_segments = analysis_run.top_segments
    if isinstance(top_segments, str):
        try:
            top_segments = json.loads(top_segments)
        except:
            top_segments = []
    
    neighborhoods = []
    if top_segments:
        for seg in top_segments[:5]:
            zip_code = seg.get("zip_code", "")
            if zip_code and zip_code not in neighborhoods:
                neighborhoods.append(zip_code)
    if not neighborhoods:
        neighborhoods = ["Local Area"]
    
    procedures = [analysis_run.procedure] if analysis_run.procedure and analysis_run.procedure != "all" else ["All Procedures"]
    
    return {
        "segmentId": segment_id,
        "segmentLabel": f"{dominant_profile_data.get('cohort_descriptor', {}).get('label', 'VIP')} patients",
        "neighborhoods": neighborhoods,
        "procedures": procedures,
        "cohort": demographics.get("combined", "Comfort Spenders"),
        "patientCount": dominant_profile_data.get("segment_patient_count", getattr(analysis_run, 'patient_count', 50)),
        "avgLtv": behavior.get("avg_lifetime_value", 850),
        "avgAge": demographics.get("age", 42),
        "avgVisitsPerYear": behavior.get("avg_visits_per_year", 3.2),
        "avgIncome": demographics.get("income", 95000),
        "profileLabel": dominant_profile_data.get("cohort_descriptor", {}).get("label", "VIP"),
    }


@app.get("/api/acquisition/{segment_id}/projection")
async def get_acquisition_projection(segment_id: str, db: Session = Depends(get_db)):
    """Get projected new patient revenue."""
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == segment_id).first()
    
    avg_ltv = 850
    patient_count = 50
    
    if analysis_run:
        dominant_profile_data = getattr(analysis_run, 'dominant_profile', None)
        if isinstance(dominant_profile_data, str):
            try:
                dominant_profile_data = json.loads(dominant_profile_data)
            except:
                dominant_profile_data = {}
        if dominant_profile_data:
            behavior = dominant_profile_data.get("behavior_patterns", {})
            avg_ltv = behavior.get("avg_lifetime_value", 850)
            patient_count = dominant_profile_data.get("segment_patient_count", 50)
    
    projected_new_patients = max(5, min(20, int(patient_count * 0.15)))
    projected_revenue = projected_new_patients * avg_ltv
    projected_ad_spend = int(projected_revenue * 0.12)
    return_multiple = projected_revenue / projected_ad_spend if projected_ad_spend > 0 else 0
    
    return {
        "projectedRevenueMonthly": projected_revenue,
        "projectedNewPatientsMonthly": projected_new_patients,
        "projectedAdSpendMonthly": projected_ad_spend,
        "projectedReturnMultiple": round(return_multiple, 1),
    }


@app.get("/api/acquisition/{segment_id}/channels")
async def get_acquisition_channels(segment_id: str, db: Session = Depends(get_db)):
    """Get recommended channel mix."""
    projection = await get_acquisition_projection(segment_id, db)
    monthly_spend = projection["projectedAdSpendMonthly"]
    daily_total = monthly_spend / 30
    
    return [
        {
            "id": "facebook",
            "label": "Facebook Ads",
            "role": "New VIP patient acquisition",
            "budgetSharePercent": 45,
            "dailyBudget": round(daily_total * 0.45),
            "description": "Reach VIP-like adults in your target neighborhoods.",
        },
        {
            "id": "instagram",
            "label": "Instagram Ads",
            "role": "Visual proof & brand building",
            "budgetSharePercent": 35,
            "dailyBudget": round(daily_total * 0.35),
            "description": "Show real results and behind-the-scenes visuals.",
        },
        {
            "id": "google",
            "label": "Google Search",
            "role": "High-intent local searches",
            "budgetSharePercent": 20,
            "dailyBudget": round(daily_total * 0.20),
            "description": "Capture high-intent searches before competitors.",
        },
    ]


@app.post("/api/acquisition/{segment_id}/channels/{channel_id}/generate")
async def generate_acquisition_ad_content(segment_id: str, channel_id: str, db: Session = Depends(get_db)):
    """Generate ad copy for a channel."""
    summary = await get_acquisition_summary(segment_id, db)
    targeting_focus = f"Ages 25–54 · Income ${int(summary['avgIncome']/1000)}K+ · {', '.join(summary['neighborhoods'][:3])}"
    
    return {
        "strategy": f"Reach {summary['cohort']} patients through targeted ads in {', '.join(summary['neighborhoods'][:3])}.",
        "targetingFocus": targeting_focus,
        "adCopy": [
            {"headline": "Expert Care in Your Neighborhood", "description": "Premium treatments from experienced specialists. Book your free consultation today."},
            {"headline": "Results That Speak for Themselves", "description": "Join hundreds of satisfied patients. Personalized plans designed around your goals."},
            {"headline": "Your Transformation Starts Here", "description": "Trusted by local VIP clients. Schedule your consultation and discover the difference."},
        ],
        "brief": f"This campaign targets {summary['cohort']} patients in {', '.join(summary['neighborhoods'][:3])}. Focus on premium service and proven results.",
    }


@app.get("/api/acquisition/{segment_id}/export")
async def export_acquisition_plan(segment_id: str, db: Session = Depends(get_db)):
    """Export campaign plan as JSON."""
    summary = await get_acquisition_summary(segment_id, db)
    projection = await get_acquisition_projection(segment_id, db)
    channels = await get_acquisition_channels(segment_id, db)
    
    return {
        "exportedAt": datetime.now().isoformat(),
        "segmentId": segment_id,
        "summary": summary,
        "projection": projection,
        "channels": channels,
    }

@app.get("/api/v1/runs/{run_id}/export-patients")
async def export_labeled_patients(
    run_id: str,
    db: Session = Depends(get_db)
):
    """
    Export patient list with computed labels and scores.
    """
    # Get the run
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run not found or not completed")
    
    # Get the dataset
    dataset = db.query(Dataset).filter(Dataset.id == analysis_run.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load and process patient data
    df = pd.read_csv(dataset.patients_path)
    df = normalize_patients_dataframe(df)
    df = aggregate_visits_to_patients(df)
    # Fix column name if needed
    if 'patient_id_' in df.columns and 'patient_id' not in df.columns:
        df = df.rename(columns={'patient_id_': 'patient_id'})
    df = segment_patients_by_behavior(df)
    
    # Get cohort descriptor from run results
    dominant_profile = getattr(analysis_run, 'dominant_profile', None)
    cohort_label = "Best Patient"
    if dominant_profile:
        try:
            profile_data = json.loads(dominant_profile) if isinstance(dominant_profile, str) else dominant_profile
            cohort_label = profile_data.get("cohort_descriptor", {}).get("label", "Best Patient")
        except:
            pass
    
    # Mark top 20% with cohort label
    top_count = max(1, int(len(df) * 0.2))
    df = df.sort_values('value_score', ascending=False).reset_index(drop=True)
    df['cohort'] = df.index.map(lambda i: cohort_label if i < top_count else "General")
    
    # Select export columns
    export_cols = ['patient_id', 'zip_code', 'behavioral_segment', 'value_score', 'cohort']
    if 'revenue' in df.columns:
        export_cols.append('revenue')
    if 'visits_per_year' in df.columns:
        export_cols.append('visits_per_year')
    
    export_df = df[[c for c in export_cols if c in df.columns]]
    
    # Return as CSV
    from fastapi.responses import StreamingResponse
    import io
    
    stream = io.StringIO()
    export_df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=labeled_patients_{run_id[:8]}.csv"}
    )

@app.post("/api/v1/segments/churn-analysis")
@limiter.limit("100/hour")
async def analyze_segment_churn(
    request: fastapi.Request,
    run_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Analyze churn risk for patients in a completed analysis run.
    """
    from services.churn_scoring import get_churn_summary
    
    # Get the run
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run not found or not completed")
    
    # Get the dataset to load patient data
    dataset = db.query(Dataset).filter(Dataset.id == analysis_run.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load patient data
    df = pd.read_csv(dataset.patients_path)
    df = normalize_patients_dataframe(df)
    df = aggregate_visits_to_patients(df)
    
    # Score and filter to top 20%
    df = segment_patients_by_behavior(df)
    top_count = max(1, int(len(df) * 0.2))
    df = df.sort_values('value_score', ascending=False).head(top_count)
    
    # Run churn analysis on top 20% only
    print(f"[CHURN DEBUG] Columns: {df.columns.tolist()}")
    print(f"[CHURN DEBUG] Sample patient_id: {df['patient_id'].head(3).tolist() if 'patient_id' in df.columns else 'NO PATIENT_ID COL'}")
    summary = get_churn_summary(df)
    
    return {
        "success": True,
        "run_id": run_id,
        **summary
    }


# ============================================================================
# SEGMENT INSIGHTS WITH LLM INTERPRETATION
# ============================================================================

async def generate_segment_insight_llm(segment_type: str, stats: dict, procedures: list, cta_action: str) -> str:
    """
    Generate insight copy for patient segment cards.
    Follows the behavioral truth → risk/opportunity → action bridge pattern.
    CTA action must be explicitly referenced in the copy.
    """
    procedure_list = ", ".join(procedures[:3]) if procedures else "various treatments"
    
    # System prompt with the full pattern
    system_prompt = """You are generating insight copy for patient segment cards in a patient intelligence dashboard.

Your sole responsibility is to generate the insight copy that appears inside each card.

Core intent:
- Insight copy must drive action, not just explain data.
- The copy should feel like a smart, trusted friend advising a medspa owner: calm, human, sharp, practical.
- The insight and the CTA are a single thought — the copy must naturally lead into the CTA action.

Hard rule:
Every insight MUST explicitly reference the CTA action using the same verb or an unmistakable synonym.
If the action is not clear from the copy alone, rewrite.

Insight copy pattern (must follow in order):
1) Behavioral truth - Explain what's really happening beneath the data (habits, trust, timing, friction). One sentence. No stats. No jargon.
2) Risk or opportunity framing - Why this matters now (momentum, drift, trust decay, missed follow-up). Calm urgency only.
3) Action bridge - Name the CTA action in human language and explain what it unlocks. This should make the CTA feel inevitable.

Rules:
- 2-3 sentences total, max.
- Do NOT restate raw stats as prose.
- Do NOT use instructional language ("you should", "best practice").
- Do NOT use corporate or marketing jargon.
- Specific actions beat abstract advice.

Quality check:
- If I hide the CTA button, is the action still obvious from the copy?
- Does this sound natural if said out loud to a practice owner?
- Does this explain why the behavior exists, not just what happened?"""

    prompts = {
        "high_frequency": f"""Segment: HIGH-FREQUENCY PATIENTS (visit 4+ times/year)
Context: {stats.get('count', 0)} patients, ${stats.get('avg_ltv', 0):,.0f} avg LTV, {stats.get('multiplier', 2.4):.1f}x more revenue than average
Top procedures: {procedure_list}
CTA action: {cta_action}

Write the insight copy. Reference "{cta_action}" explicitly in the action bridge.""",

        "referrers": f"""Segment: REFERRAL CHAMPIONS (have referred others before)
Context: ~{stats.get('count', 0)} patients, ${stats.get('avg_referral_value', 1850):,.0f} avg referral value, {stats.get('conversion_rate', 73)}% conversion
CTA action: {cta_action}

Write the insight copy. Reference "{cta_action}" explicitly in the action bridge.""",

        "one_and_done": f"""Segment: ONE-AND-DONE PATIENTS (tried once, never returned)
Context: {stats.get('count', 0)} patients, ${stats.get('potential_ltv', 0):,.0f} lost potential, ~{stats.get('avg_days_since', 90):.0f} days since visit
Common first procedure: {procedure_list}
CTA action: {cta_action}

Write the insight copy. Reference "{cta_action}" explicitly in the action bridge.""",

        "lapsed_regulars": f"""Segment: LAPSED REGULARS (former regulars, 4+ months inactive)
Context: {stats.get('count', 0)} patients, ${stats.get('revenue_at_risk', 0):,.0f} at risk, {stats.get('avg_prev_visits', 3.2):.1f} avg previous visits
CTA action: {cta_action}

Write the insight copy. Reference "{cta_action}" explicitly in the action bridge."""
    }
    
    # Fallbacks using variant A from the approved copy
    fallbacks = {
        "high_frequency": "They figured out what works and built you into their routine. The risk is they start feeling like just another appointment. A VIP reward reminds them they're not — and keeps future visits locked in.",
        "referrers": "They talk about you without being asked — that's your strongest signal. Without structure, word of mouth stays inconsistent. A referral program gives them a reason to do it more.",
        "one_and_done": "They came in curious but left without a clear next step. The window to re-engage is 30–60 days — after that, they've moved on. A win-back text surfaces what held them back.",
        "lapsed_regulars": "They were consistent, then stopped — something changed. After 6 months, win-back rates collapse. Personal outreach finds out what happened and often reopens the door."
    }
    
    prompt = prompts.get(segment_type, "")
    if not prompt:
        return fallbacks.get(segment_type, "No insight available.")
    
    try:
        full_prompt = f"{system_prompt}\n\n{prompt}"
        response = await llm_service.generate(full_prompt, max_tokens=200)
        
        # Validate that CTA action is referenced in response
        cta_keywords = cta_action.lower().split()
        response_lower = response.lower() if response else ""
        
        # Check if at least one significant word from CTA appears
        has_cta_reference = any(keyword in response_lower for keyword in cta_keywords if len(keyword) > 3)
        
        if response and has_cta_reference:
            return response.strip()
        else:
            # LLM didn't follow the pattern, use fallback
            print(f"[LLM] Response didn't reference CTA '{cta_action}', using fallback")
            return fallbacks.get(segment_type, "Analysis pending.")
            
    except Exception as e:
        print(f"[LLM ERROR] Failed to generate insight for {segment_type}: {e}")
        return fallbacks.get(segment_type, "Insight generation temporarily unavailable.")


def compute_segment_details(df: pd.DataFrame, segment_type: str) -> dict:
    """
    Compute detailed stats for a specific segment.
    Returns stats dict + patient list.
    """
    result = {
        "count": 0,
        "patients": [],
        "stats": {},
        "top_procedures": [],
        "peak_booking": "Tue-Thu, 10am-2pm",  # Default, enhance if time data exists
        "common_trait": ""
    }
    
    # Get treatments column if exists
    treatment_col = 'treatments_received' if 'treatments_received' in df.columns else None
    
    if segment_type == "high_frequency":
        # Patients with 4+ visits/year
        visit_col = 'visits_per_year' if 'visits_per_year' in df.columns else 'visit_count'
        if visit_col in df.columns:
            segment_df = df[df[visit_col] >= 4].copy()
        else:
            segment_df = pd.DataFrame()
            
        if len(segment_df) > 0:
            avg_ltv = segment_df['total_revenue'].mean() if 'total_revenue' in segment_df.columns else segment_df['revenue'].mean() if 'revenue' in segment_df.columns else 0
            market_avg = df['total_revenue'].mean() if 'total_revenue' in df.columns else df['revenue'].mean() if 'revenue' in df.columns else 1
            
            result["count"] = len(segment_df)
            result["patients"] = segment_df['patient_id'].tolist()[:100] if 'patient_id' in segment_df.columns else []
            result["stats"] = {
                "avg_ltv": avg_ltv,
                "multiplier": avg_ltv / market_avg if market_avg > 0 else 1,
                "avg_visits": segment_df[visit_col].mean(),
                "count": len(segment_df)
            }
            result["common_trait"] = "Pre-books next appointment"
            
            # Get top procedures
            if treatment_col and treatment_col in segment_df.columns:
                all_treatments = segment_df[treatment_col].dropna().str.split(',').explode().str.strip()
                result["top_procedures"] = all_treatments.value_counts().head(3).index.tolist()
    
    elif segment_type == "referrers":
        # Estimate referrers as ~18% of top patients
        referral_rate = 0.18
        top_count = max(1, int(len(df) * 0.2))
        top_df = df.sort_values('revenue' if 'revenue' in df.columns else 'total_revenue', ascending=False).head(top_count)
        estimated_count = int(len(top_df) * referral_rate)
        
        avg_ltv = top_df['revenue'].mean() if 'revenue' in top_df.columns else 3600
        
        result["count"] = estimated_count
        result["patients"] = top_df['patient_id'].head(estimated_count).tolist() if 'patient_id' in top_df.columns else []
        result["stats"] = {
            "count": estimated_count,
            "avg_referral_value": avg_ltv * 0.5,  # Estimated value per referral
            "conversion_rate": 73,
            "avg_ltv": avg_ltv * 1.4  # Referrers typically have higher LTV
        }
        result["common_trait"] = "Active on social media"
        
        if treatment_col and treatment_col in top_df.columns:
            all_treatments = top_df[treatment_col].dropna().str.split(',').explode().str.strip()
            result["top_procedures"] = all_treatments.value_counts().head(3).index.tolist()
    
    elif segment_type == "one_and_done":
        # Single visit, 90+ days ago
        if 'visit_count' in df.columns and 'days_since_last_visit' in df.columns:
            segment_df = df[(df['visit_count'] == 1) & (df['days_since_last_visit'] >= 90)].copy()
        elif 'visit_count' in df.columns:
            segment_df = df[df['visit_count'] == 1].copy()
        else:
            segment_df = pd.DataFrame()
        
        if len(segment_df) > 0:
            avg_spend = segment_df['revenue'].mean() if 'revenue' in segment_df.columns else 320
            days_since = segment_df['days_since_last_visit'].mean() if 'days_since_last_visit' in segment_df.columns else 120
            
            result["count"] = len(segment_df)
            result["patients"] = segment_df['patient_id'].tolist()[:100] if 'patient_id' in segment_df.columns else []
            result["stats"] = {
                "count": len(segment_df),
                "potential_ltv": len(segment_df) * 500,  # Conservative LTV estimate
                "avg_first_spend": avg_spend,
                "avg_days_since": days_since,
                "win_back_rate": "12-18%"
            }
            result["common_trait"] = "No follow-up booked"
            
            if treatment_col and treatment_col in segment_df.columns:
                all_treatments = segment_df[treatment_col].dropna().str.split(',').explode().str.strip()
                result["top_procedures"] = all_treatments.value_counts().head(3).index.tolist()
    
    elif segment_type == "lapsed_regulars":
        # 3+ visits but 120+ days since last
        if 'visit_count' in df.columns and 'days_since_last_visit' in df.columns:
            segment_df = df[(df['visit_count'] >= 3) & (df['days_since_last_visit'] >= 120)].copy()
        else:
            segment_df = pd.DataFrame()
        
        if len(segment_df) > 0:
            rev_col = 'total_revenue' if 'total_revenue' in segment_df.columns else 'revenue'
            revenue_at_risk = segment_df[rev_col].sum() if rev_col in segment_df.columns else len(segment_df) * 2880
            avg_visits = segment_df['visit_count'].mean()
            days_since = segment_df['days_since_last_visit'].mean() if 'days_since_last_visit' in segment_df.columns else 150
            
            result["count"] = len(segment_df)
            result["patients"] = segment_df['patient_id'].tolist()[:100] if 'patient_id' in segment_df.columns else []
            result["stats"] = {
                "count": len(segment_df),
                "revenue_at_risk": revenue_at_risk,
                "avg_prev_visits": avg_visits,
                "avg_days_since": days_since,
                "recovery_window": "<6 months optimal"
            }
            result["common_trait"] = "Stopped without explanation"
            
            if treatment_col and treatment_col in segment_df.columns:
                all_treatments = segment_df[treatment_col].dropna().str.split(',').explode().str.strip()
                result["top_procedures"] = all_treatments.value_counts().head(3).index.tolist()
    
    return result


@app.post("/api/v1/segments/segment-insights")
@limiter.limit("50/hour")
async def get_segment_insights(
    request: fastapi.Request,
    run_id: str = Form(...),
    generate_llm: bool = Form(default=True),
    db: Session = Depends(get_db)
):
    """
    Get detailed segment insights with optional LLM-generated interpretations.
    Returns everything needed for the 4 insight cards in the frontend.
    """
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run not found or not completed")
    
    dataset = db.query(Dataset).filter(Dataset.id == analysis_run.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load and process data
    df = pd.read_csv(dataset.patients_path)
    df = normalize_patients_dataframe(df)
    df = aggregate_visits_to_patients(df)
    df = segment_patients_by_behavior(df)
    
    # Add days_since_last_visit if not present
    if 'days_since_last_visit' not in df.columns and 'last_visit' in df.columns:
        df['days_since_last_visit'] = (pd.Timestamp.now() - pd.to_datetime(df['last_visit'], errors='coerce')).dt.days.fillna(365)
    
    total_patients = len(df)
    
    # Compute details for each segment
    segments = {
        "high_frequency": compute_segment_details(df, "high_frequency"),
        "referrers": compute_segment_details(df, "referrers"),
        "one_and_done": compute_segment_details(df, "one_and_done"),
        "lapsed_regulars": compute_segment_details(df, "lapsed_regulars")
    }
    
    # CTA actions for each segment (must match frontend)
    cta_actions = {
        "high_frequency": "Send VIP reward",
        "referrers": "Launch referral program",
        "one_and_done": "Send win-back text",
        "lapsed_regulars": "Start personal outreach"
    }
    
    # Generate LLM insights if requested
    if generate_llm:
        for seg_type, seg_data in segments.items():
            if seg_data["count"] > 0:
                insight = await generate_segment_insight_llm(
                    seg_type, 
                    seg_data["stats"], 
                    seg_data["top_procedures"],
                    cta_actions.get(seg_type, "Take action")
                )
                seg_data["llm_insight"] = insight
            else:
                seg_data["llm_insight"] = "No patients in this segment."
    
    # Calculate overall market averages for comparison
    avg_ltv = df['revenue'].mean() if 'revenue' in df.columns else 0
    avg_visits = df['visit_count'].mean() if 'visit_count' in df.columns else 1
    
    return {
        "success": True,
        "run_id": run_id,
        "total_patients": total_patients,
        "market_averages": {
            "avg_ltv": round(avg_ltv, 2),
            "avg_visits": round(avg_visits, 1)
        },
        "segments": {
            "whats_working": [
                {
                    "id": "high_frequency",
                    "title": "High-frequency patients",
                    "count": segments["high_frequency"]["count"],
                    "patient_ids": segments["high_frequency"]["patients"][:20],  # Limit for response size
                    "total_patient_count": len(segments["high_frequency"]["patients"]),
                    "insight": segments["high_frequency"].get("llm_insight", ""),
                    "stats": segments["high_frequency"]["stats"],
                    "top_procedures": segments["high_frequency"]["top_procedures"],
                    "peak_booking": segments["high_frequency"]["peak_booking"],
                    "common_trait": segments["high_frequency"]["common_trait"],
                    "cta": "Send VIP reward",
                    "action": "vip-reward"
                },
                {
                    "id": "referrers",
                    "title": "Referral champions",
                    "count": segments["referrers"]["count"],
                    "patient_ids": segments["referrers"]["patients"][:20],
                    "total_patient_count": len(segments["referrers"]["patients"]),
                    "insight": segments["referrers"].get("llm_insight", ""),
                    "stats": segments["referrers"]["stats"],
                    "top_procedures": segments["referrers"]["top_procedures"],
                    "peak_booking": segments["referrers"]["peak_booking"],
                    "common_trait": segments["referrers"]["common_trait"],
                    "cta": "Launch referral program",
                    "action": "referral-program"
                }
            ],
            "leaking_value": [
                {
                    "id": "one_and_done",
                    "title": "One-and-done patients",
                    "count": segments["one_and_done"]["count"],
                    "patient_ids": segments["one_and_done"]["patients"][:20],
                    "total_patient_count": len(segments["one_and_done"]["patients"]),
                    "insight": segments["one_and_done"].get("llm_insight", ""),
                    "stats": segments["one_and_done"]["stats"],
                    "top_procedures": segments["one_and_done"]["top_procedures"],
                    "peak_booking": segments["one_and_done"]["peak_booking"],
                    "common_trait": segments["one_and_done"]["common_trait"],
                    "cta": "Send win-back text",
                    "action": "win-back"
                },
                {
                    "id": "lapsed_regulars",
                    "title": "Lapsed regulars",
                    "count": segments["lapsed_regulars"]["count"],
                    "patient_ids": segments["lapsed_regulars"]["patients"][:20],
                    "total_patient_count": len(segments["lapsed_regulars"]["patients"]),
                    "insight": segments["lapsed_regulars"].get("llm_insight", ""),
                    "stats": segments["lapsed_regulars"]["stats"],
                    "top_procedures": segments["lapsed_regulars"]["top_procedures"],
                    "peak_booking": segments["lapsed_regulars"]["peak_booking"],
                    "common_trait": segments["lapsed_regulars"]["common_trait"],
                    "cta": "Start personal outreach",
                    "action": "personal-outreach"
                }
            ]
        }
    }


@app.post("/api/v1/segments/behavior-patterns")
@limiter.limit("100/hour")
async def analyze_behavior_patterns(
    request: fastapi.Request,
    run_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Analyze best and worst behavior patterns for a segment.
    """
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not analysis_run or analysis_run.status != "done":
        raise HTTPException(status_code=404, detail="Run not found or not completed")
    
    dataset = db.query(Dataset).filter(Dataset.id == analysis_run.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = pd.read_csv(dataset.patients_path)
    df = normalize_patients_dataframe(df)
    df = aggregate_visits_to_patients(df)
    df = segment_patients_by_behavior(df)
    
    top_count = max(1, int(len(df) * 0.2))
    top_df = df.sort_values('value_score', ascending=False).head(top_count)
    total_patients = len(top_df)
    
    best_patterns = []
    worst_patterns = []
    
    # High-frequency maintainers
    if 'visit_count' in top_df.columns:
        high_freq = top_df[top_df['visit_count'] >= 4]
        if len(high_freq) > 0:
            avg_spend = high_freq['total_revenue'].mean() if 'total_revenue' in high_freq.columns else 0
            market_avg = top_df['total_revenue'].mean() if 'total_revenue' in top_df.columns else 1
            multiplier = avg_spend / market_avg if market_avg > 0 else 1
            best_patterns.append({
                "id": "high_freq_maintainers",
                "label": "High-frequency maintainers",
                "metric": f"{len(high_freq)} patients visit 4+ times/year",
                "insight": f"They spend {multiplier:.1f}x more than average",
                "action": "membership",
                "count": len(high_freq),
                "patient_ids": high_freq['patient_id'].tolist() if 'patient_id' in high_freq.columns else []
            })
    
    # Premium spenders
    if 'total_revenue' in top_df.columns and len(top_df) > 4:
        threshold = top_df['total_revenue'].quantile(0.75)
        premium = top_df[top_df['total_revenue'] >= threshold]
        if len(premium) > 0:
            avg_rev = premium['total_revenue'].mean()
            best_patterns.append({
                "id": "premium_spenders",
                "label": "Premium spenders",
                "metric": f"{len(premium)} patients avg ${avg_rev:,.0f}",
                "insight": "VIP treatment keeps them loyal",
                "action": "vip",
                "count": len(premium),
                "patient_ids": premium['patient_id'].tolist() if 'patient_id' in premium.columns else []
            })
    
    # Referrers estimate
    referral_rate = 0.18
    best_patterns.append({
        "id": "active_referrers",
        "label": "Active referrers",
        "metric": f"~{int(referral_rate * total_patients)} have referred before",
        "insight": "Each referral = $0 acquisition cost",
        "action": "referral",
        "count": int(referral_rate * total_patients),
        "patient_ids": []
    })
    
    # One-and-done
    if 'visit_count' in df.columns and 'days_since_last_visit' in df.columns:
        one_and_done = df[(df['visit_count'] == 1) & (df['days_since_last_visit'] >= 90)]
        if len(one_and_done) > 0:
            potential = len(one_and_done) * 500
            worst_patterns.append({
                "id": "one_and_done",
                "label": "One-and-done trials",
                "metric": f"{len(one_and_done)} patients tried once, never returned",
                "insight": f"${potential:,.0f} in potential LTV walking away",
                "action": "winback",
                "severity": "high" if len(one_and_done) > 20 else "medium",
                "count": len(one_and_done),
                "patient_ids": one_and_done['patient_id'].tolist() if 'patient_id' in one_and_done.columns else []
            })
    
    # Lapsed regulars
    if 'visit_count' in df.columns and 'days_since_last_visit' in df.columns:
        lapsed = df[(df['visit_count'] >= 3) & (df['days_since_last_visit'] >= 120)]
        if len(lapsed) > 0:
            lost = lapsed['total_revenue'].sum() if 'total_revenue' in lapsed.columns else len(lapsed) * 1000
            worst_patterns.append({
                "id": "lapsed_regulars",
                "label": "Lapsed regulars",
                "metric": f"{len(lapsed)} former regulars gone 4+ months",
                "insight": f"${lost:,.0f} in revenue going cold",
                "action": "winback_vip",
                "severity": "high" if len(lapsed) > 10 else "medium",
                "count": len(lapsed),
                "patient_ids": lapsed['patient_id'].tolist() if 'patient_id' in lapsed.columns else []
            })
    
    # Recommended play
    recommended_play = None
    if worst_patterns and worst_patterns[0].get('count', 0) > 5:
        w = worst_patterns[0]
        recommended_play = {
            "id": "winback_trials" if w['id'] == 'one_and_done' else "winback_vip",
            "type": "fix",
            "headline": "Re-engage one-time visitors" if w['id'] == 'one_and_done' else "Win back lapsed regulars",
            "subcopy": f"{w['count']} patients {'tried once and left' if w['id'] == 'one_and_done' else 'were regulars but went quiet'}. A targeted offer typically recovers 12-18%.",
            "cta": "Launch win-back",
            "target_count": w['count'],
            "potential_value": w['count'] * 150
        }
    elif best_patterns:
        b = best_patterns[0]
        recommended_play = {
            "id": "lock_in_maintainers",
            "type": "protect",
            "headline": "Lock in your best patients",
            "subcopy": f"{b['count']} patients are your most valuable. A membership or package locks them in before competitors try.",
            "cta": "Create membership offer",
            "target_count": b['count'],
            "potential_value": b['count'] * 200
        }
    
    return {
        "success": True,
        "best_patterns": best_patterns[:3],
        "worst_patterns": worst_patterns[:2],
        "recommended_play": recommended_play,
        "summary": {
            "total_analyzed": total_patients,
            "one_and_done_count": worst_patterns[0].get('count', 0) if worst_patterns else 0,
            "high_freq_count": best_patterns[0].get('count', 0) if best_patterns else 0
        }
    }

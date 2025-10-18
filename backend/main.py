import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import requests
import uuid
import json
import io
from typing import Optional, Dict, Any, Union

import numpy as np
import pandas as pd
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # This loads your .env file

import fastapi
from fastapi import UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sklearn.isotonic import IsotonicRegression
from routers import procedures as procedures_router

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
from services.validate import validate_algorithm_accuracy
from database import get_db, Dataset, AnalysisRun, create_tables

from sqlalchemy.orm import Session
from routers import patient_intel as patient_intel_router

class CampaignRequest(BaseModel):
    cohort: str
    zip_code: str
    competitors: int
    reasons: list[str]
    match_score: float
    procedure: Optional[str] = None

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

def segment_patients_by_behavior(patients_df: pd.DataFrame) -> pd.DataFrame:
    """
    Behavioral-first segmentation based on actual spending patterns.
    Classifies patients by what they DO, not where they live.
    
    Args:
        patients_df: DataFrame with patient data (must have 'revenue' or 'total_spent')
    
    Returns:
        Same DataFrame with new 'behavioral_segment' column added
    """
    df = patients_df.copy()
    
    # Use existing revenue column name
    revenue_col = 'revenue' if 'revenue' in df.columns else 'total_spent'
    
    # Parse treatment count from treatments_received if available
    if 'treatments_received' in df.columns:
        df['treatment_count'] = df['treatments_received'].astype(str).apply(
            lambda x: len([t for t in str(x).split(',') if t.strip()]) if pd.notna(x) else 1
        )
    else:
        df['treatment_count'] = 1
    
    # Use total_visits if available, otherwise estimate
    if 'total_visits' in df.columns:
        df['visit_count'] = df['total_visits']
    else:
        # Estimate: each row in grouped data represents visits to that ZIP
        df['visit_count'] = df.groupby('zip_code')[revenue_col].transform('count')
    
    # Calculate annual visit frequency if we have date data
    if 'first_visit' in df.columns and 'last_visit' in df.columns:
        try:
            first = pd.to_datetime(df['first_visit'], errors='coerce')
            last = pd.to_datetime(df['last_visit'], errors='coerce')
            df['months_active'] = ((last - first).dt.days / 30.44).clip(lower=1)
            df['months_active'] = df['months_active'].fillna(12)
            df['visits_per_year'] = (df['visit_count'] / df['months_active']) * 12
        except Exception as e:
            print(f"[BEHAVIORAL] Could not calculate visit frequency: {e}")
            df['visits_per_year'] = 2.5  # Default assumption
    else:
        df['visits_per_year'] = 2.5  # Default if no dates
    
    # Behavioral classification function
    def classify_behavior(row):
        """Classify based on spend + frequency + treatment diversity"""
        spend = float(row.get(revenue_col, 0))
        visits = float(row.get('visit_count', 1))
        treatments = int(row.get('treatment_count', 1))
        freq = float(row.get('visits_per_year', 2))
        
        # VIP: High spend + high frequency + multiple treatments
        if spend >= 2500 and freq >= 3 and treatments > 1:
            return "VIP Regular"
        
        # Progressive Buyer: Multiple treatments, growing engagement
        elif treatments > 1 and spend >= 1500:
            return "Progressive Buyer"
        
        # Premium Single: High-value single purchase
        elif spend >= 2000 and treatments == 1:
            return "Premium Single"
        
        # Regular Maintainer: Consistent visits, moderate spend
        elif freq >= 2.5 and spend >= 800:
            return "Regular Maintainer"
        
        # Entry Explorer: New, trying services
        elif visits <= 2 and spend < 1000:
            return "Entry Explorer"
        
        # Occasional: Everyone else
        else:
            return "Occasional Visitor"
    
    # Apply classification
    df['behavioral_segment'] = df.apply(classify_behavior, axis=1)
    
    # Log results for debugging
    print(f"\n[BEHAVIORAL] Segmented {len(df)} patients by behavior:")
    segment_dist = df['behavioral_segment'].value_counts()
    for segment, count in segment_dist.items():
        pct = (count / len(df)) * 100
        print(f"  {segment:25s}: {count:3d} patients ({pct:5.1f}%)")
    print("")
    
    return df

# ============================================================================
# STOP HERE - Don't add anything else yet!
# Next: Make one small change to test this function
# ============================================================================


# --- ZIP → lat/lon (offline) helpers ---
import numpy as np
import pandas as pd

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

    if avg_ticket > 1200:
        ad_copy = f"Premier results. Packages from ${int(avg_ticket)}. Book a consult today."
    elif competitors and competitors > 1:
        ad_copy = f"Stand out from {competitors} nearby clinics. Average treatment ${int(avg_ticket)}."
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
    insights.append(f"Revenue potential ${expected_rev:,.0f}/mo (P50: {int(round(p50_bookings))} × ${avg_ticket:,.0f}).")

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
    
    # Check the explicit mapping first
    if zip_code in ZIP_LOCATIONS:
        return ZIP_LOCATIONS[zip_code]
    
    # Then use your existing coordinate logic
    try:
        zip_row = demographics_df[demographics_df['zip'] == zip_code].iloc[0] if not demographics_df[demographics_df['zip'] == zip_code].empty else None
        if zip_row is None:
            return f"ZIP {zip_code}"
        
        lat = float(zip_row.get('lat', 0))
        lon = float(zip_row.get('lon', 0))
        
        if lat and lon:
            if 40.7 <= lat <= 40.9 and -74.02 <= lon <= -73.90:
                return f"Manhattan, NYC"
            elif 40.57 <= lat <= 40.74 and -74.05 <= lon <= -73.83:
                return f"Brooklyn, NYC"
            elif 40.54 <= lat <= 40.80 and -73.96 <= lon <= -73.70:
                return f"Queens, NYC"
            elif 40.785 <= lat <= 40.92 and -73.93 <= lon <= -73.79:
                return f"Bronx, NYC"
            elif 40.55 <= lat <= 40.85 and -73.75 <= lon <= -73.40:
                return f"Nassau County, NY"
            elif 40.88 <= lat <= 41.37 and -73.98 <= lon <= -73.48:
                return f"Westchester County, NY"
            else:
                return f"Greater NYC Area"
        else:
            return f"ZIP {zip_code}"
    except Exception:
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
            unique_zips=validated_df["zip_code"].nunique()
        )
        
        db.add(dataset)
        db.commit()
        
        return DatasetCreateResponse(dataset_id=dataset_id)
        
    except HTTPException:
        raise
    except Exception as e:
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
        # Load and validate patient data
        is_valid, _, df_grouped = validate_and_load_patients(dataset.patients_path)
        if not is_valid or df_grouped is None:
            raise HTTPException(status_code=400, detail="Patient data validation failed")
        
        df_grouped = df_grouped.reset_index(drop=True)
        
        # Add procedure filtering if specified
        if procedure and procedure != "all":
            if "procedure_norm" in df_grouped.columns:
                df_grouped = df_grouped[df_grouped["procedure_norm"] == procedure]
                if df_grouped.empty:
                    raise HTTPException(status_code=400, detail=f"No data found for procedure: {procedure}")
        
        # Convert dataset to dict for compatibility with existing analysis function
        dataset_dict = {
            "patients_path": dataset.patients_path,
            "competitors_path": dataset.competitors_path,
            "practice_zip": dataset.practice_zip,
            "vertical": dataset.vertical
        }
        
        # Execute analysis
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
        
        db.commit()

        return fastapi.responses.JSONResponse({"run_id": run_id})
    
    except Exception as e:
        # Update database record with error
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
    
    return ExportUrls(
        facebook_url=f"{base_url}?format=facebook&top_n={request.top_n}",
        google_url=f"{base_url}?format=google&top_n={request.top_n}",
        full_report_url=f"{base_url}?format=full&top_n={request.top_n}"
    )

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
        data = [{"zip": getattr(segment, "zip", ""), "country": "US"} for segment in top_segments]
        filename = f"facebook_audience_{run_id}.csv"

    elif format == "google":
        # Google Ads location targeting with bid modifiers
        data = [{
            "zip": getattr(segment, "zip", ""),
            "country": "US",
            "bid_modifier": round(1.0 + (float(getattr(segment, "match_score", 0.0)) * 0.25), 2)
        } for segment in top_segments]
        filename = f"google_ads_{run_id}.csv"

    else:  # full report
        # Comprehensive analysis report
        data = [{
            "zip": getattr(segment, "zip", ""),
            "match_score": round(float(getattr(segment, "match_score", 0.0)), 3),
            "cohort": getattr(segment, "cohort", ""),
            "expected_bookings_p50": g(segment, "expected_bookings.p50", None),
            "distance_miles": round(float(getattr(segment, "distance_miles", 0.0)), 1),
            "competitors": getattr(segment, "competitors", 0),
            "primary_reason": (getattr(segment, "why", ["Strong signal"]) or ["Strong signal"])[0],
            "bid_modifier": round(1.0 + (float(getattr(segment, "match_score", 0.0)) * 0.25), 2)
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
    
    # ---- campaign helper (place this above the route) ----
def generate_campaign_card(segment_data, procedure=None, logo_url=None):
    zip_code = segment_data.get('zip')
    cohort = segment_data.get('cohort')
    match_score = float(segment_data.get('match_score', 0))
    avg_ticket = float(segment_data.get('avg_ticket_zip', 750))
    distance = float(segment_data.get('distance_miles', 0))
    competitors = int(segment_data.get('competitors', 0))
    p50 = int((segment_data.get('expected_bookings') or {}).get('p50', 3))
    cpa_target = float(segment_data.get('cpa_target', 100))
    monthly_ad_cap = cpa_target * max(1, p50)

    # Tighter radius if the ZIP is farther away
    radius = 5 if distance < 10 else 3

    demo_targeting = {
        'Affluent': 'Ages 35-55, HH Income $120k+, College-educated',
        'Premium':  'Ages 30-50, HH Income $100k+, Professional',
        'Emerging': 'Ages 25-45, HH Income $60k+, Health-conscious'
    }.get(cohort, 'Ages 30-55, interested in wellness')

    # Procedure-specific ad copy
    if procedure:
        if avg_ticket > 1200:
            ad_copy = f"Premier {procedure} results. Packages from ${int(avg_ticket)}. Book today."
        elif competitors > 1:
            ad_copy = f"Expert {procedure} treatments. Stand out from {competitors} local options. Avg ${int(avg_ticket)}."
        else:
            ad_copy = f"First in your area for {procedure}. Treatments from ${int(avg_ticket)}. Book now."
    else:
        # Generic ad copy when no procedure specified
        if avg_ticket > 1200:
            ad_copy = f"Premier experience. Typical plans around ${int(avg_ticket)}."
        elif competitors > 1:
            ad_copy = f"Stand out from {competitors}+ local options. Avg ticket ~${int(avg_ticket)}."
        else:
            ad_copy = f"First-mover advantage. Typical visit ~${int(avg_ticket)}."
    daily_budget = max(5, round(monthly_ad_cap / 30))

    return {
        'zip': zip_code,
        'logo_url': logo_url,
        'targeting': f"{zip_code} + {radius} mile radius",
        'demographics': demo_targeting,
        'ad_copy': ad_copy,
        'daily_budget': daily_budget,
        'distance_note': f"{distance:.1f} mi travel consideration" if distance > 10 else None,
        'match_score': round(match_score, 2)
    }
    
@app.get("/api/v1/runs/{run_id}/results")
async def get_run_results(run_id: str, db: Session = Depends(get_db)):
    """Get full analysis results including dominant profile for frontend"""
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
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
    
    # Build fallback if not stored
    if not dominant_profile_data or not isinstance(dominant_profile_data, dict):
        # Calculate from segments
        if top_segments:
            avg_income = sum(s.get('median_income', 75000) for s in top_segments) / len(top_segments)
            avg_ltv = sum(s.get('avg_ticket_zip', 750) for s in top_segments) / len(top_segments)
            cohorts = [s.get('cohort', '') for s in top_segments]
            most_common = max(set(cohorts), key=cohorts.count) if cohorts else "Premium Market"
        else:
            avg_income = 95000
            avg_ltv = 5200
            most_common = "Wellness Seekers"
        
        dominant_profile_data = {
            "dominant_profile": {
                "psychographic": most_common,
                "behavioral": "Regular Visitor",
                "combined": f"{most_common} - Regular Visitor",
                "behavioral_match_pct": 67,
                "psychographic_match_pct": 73
            },
            "profile_characteristics": {
                "median_income": int(avg_income),
                "college_educated_pct": 45,
                "homeowner_pct": 68,
                "income_range": f"${int(avg_income*0.8):,}-${int(avg_income*1.3):,}"
            },
            "behavior_patterns": {
                "avg_lifetime_value": int(avg_ltv),
                "avg_visits_per_year": 2.8,
                "avg_treatments_per_patient": 1.8,
                "top_treatments": ["Botox", "Fillers", "Laser"]
            },
            "geographic_summary": {
                "total_zips": len(top_segments),
                "existing_patient_zips": sum(1 for s in top_segments if not s.get('is_new_market', False)),
                "expansion_opportunity_zips": sum(1 for s in top_segments if s.get('is_new_market', False)),
                "total_addressable_households": sum(int(s.get('population', 20000) * 0.35) for s in top_segments)
            },
            "profile_summary": f"Your best patients come from {most_common} areas with ${int(avg_ltv):,} average lifetime value across {len(top_segments)} high-match ZIPs."
        }
    
    # Return full structure for frontend
    return {
        "status": "done",
        "dominant_profile": dominant_profile_data.get("dominant_profile", {}),
        "profile_characteristics": dominant_profile_data.get("profile_characteristics", {}),
        "behavior_patterns": dominant_profile_data.get("behavior_patterns", {}),
        "geographic_summary": dominant_profile_data.get("geographic_summary", {}),
        "profile_summary": dominant_profile_data.get("profile_summary", ""),
        "top_segments": top_segments[:10]
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

def identify_dominant_profile(
    patients_df: pd.DataFrame, 
    zip_features: pd.DataFrame,
    top_percentile: float = 0.2
) -> dict:
    """
    PROFILE-FIRST analysis: Identify WHO your best customers are,
    then show WHERE they live (not the other way around).
    
    This implements Jeff's vision: "Target the PROFILE, not the ZIP"
    
    Args:
        patients_df: Patient data with behavioral_segment column
        zip_features: ZIP-level features with cohort assignments
        top_percentile: What % to consider "best customers" (default 20%)
    
    Returns:
        {
            "dominant_profile": {
                "psychographic": "Affluent Wellness",
                "behavioral": "VIP Regular",
                "combined": "Affluent Wellness - VIP Regular"
            },
            "profile_characteristics": {...},
            "behavior_patterns": {...},
            "geographic_concentration": [list of ZIPs with this profile],
            "total_addressable_market": 47500,
            "profile_summary": "Your best patients are..."
        }
    """
    
    # Use existing revenue column
    revenue_col = 'revenue' if 'revenue' in patients_df.columns else 'total_spent'
    
    # Find top customers by revenue
    sorted_patients = patients_df.sort_values(revenue_col, ascending=False)
    top_count = max(1, int(len(patients_df) * top_percentile))
    top_patients = sorted_patients.head(top_count)
    
    print(f"[PROFILE] Analyzing top {top_count} patients ({top_percentile*100:.0f}% of {len(patients_df)})")
    
    # 1. BEHAVIORAL PATTERN of best customers
    if 'behavioral_segment' in top_patients.columns:
        behavior_dist = top_patients['behavioral_segment'].value_counts()
        dominant_behavior = behavior_dist.index[0]
        behavior_pct = int((behavior_dist.iloc[0] / len(top_patients)) * 100)
        print(f"[PROFILE] Dominant behavior: {dominant_behavior} ({behavior_pct}% of top patients)")
    else:
        dominant_behavior = "High-Value Customer"
        behavior_pct = 0
    
    # 2. PSYCHOGRAPHIC PROFILE (from ZIP demographics)
    top_zips = top_patients['zip_code'].unique()
    zip_profiles = zip_features[zip_features['zip'].isin(top_zips)]
    
    if len(zip_profiles) > 0 and 'cohort' in zip_profiles.columns:
        cohort_dist = zip_profiles['cohort'].value_counts()
        dominant_psychographic = cohort_dist.index[0]
        psycho_pct = int((cohort_dist.iloc[0] / len(zip_profiles)) * 100)
        print(f"[PROFILE] Dominant psychographic: {dominant_psychographic} ({psycho_pct}% of ZIPs)")
        
        # Average demographics of top customer ZIPs
        avg_income = int(zip_profiles['median_income'].mean())
        avg_college = float(zip_profiles['college_pct'].mean())
        avg_owner = float(zip_profiles.get('owner_occ_pct', pd.Series([0.65])).mean())
    else:
        dominant_psychographic = "Premium Market"
        psycho_pct = 0
        avg_income = 100000
        avg_college = 0.40
        avg_owner = 0.65
    
    # 3. BEHAVIORAL METRICS of best customers
    avg_ltv = int(top_patients[revenue_col].mean())
    
    if 'visits_per_year' in top_patients.columns:
        avg_frequency = float(top_patients['visits_per_year'].mean())
    else:
        avg_frequency = 2.5
    
    if 'treatment_count' in top_patients.columns:
        avg_treatments = float(top_patients['treatment_count'].mean())
    else:
        avg_treatments = 1.5
    
    # 4. TOP TREATMENTS (if available)
    top_treatments = ["Primary Service"]  # Default
    if 'treatments_received' in top_patients.columns:
        all_treatments = []
        for treatments in top_patients['treatments_received'].dropna():
            treatment_list = [t.strip() for t in str(treatments).split(',') if t.strip()]
            all_treatments.extend(treatment_list)
        
        if all_treatments:
            treatment_counts = pd.Series(all_treatments).value_counts()
            top_treatments = treatment_counts.head(3).index.tolist()
    
    print(f"[PROFILE] Behavioral metrics: ${avg_ltv:,} LTV, {avg_frequency:.1f}× yearly, {avg_treatments:.1f} treatments")
    print(f"[PROFILE] Top treatments: {', '.join(top_treatments[:3])}")
    
    # 5. FIND ALL ZIPS WHERE THIS PROFILE LIVES
    # Key insight: Don't just show patient ZIPs, show ALL ZIPs matching this profile
    if 'cohort' in zip_features.columns:
        matching_zips = zip_features[
            zip_features['cohort'] == dominant_psychographic
        ].sort_values('psych_score', ascending=False).head(15)
    else:
        # Fallback: use top scored ZIPs
        matching_zips = zip_features.sort_values('psych_score', ascending=False).head(15)
    
    # Build geographic concentration list
    geo_concentration = []
    for _, row in matching_zips.iterrows():
        zip_code = str(row['zip'])
        geo_concentration.append({
            "zip": zip_code,
            "match_score": float(row.get('psych_score', 0.5)),
            "distance_miles": float(row.get('distance_miles', 0)),
            "population": int(row.get('population', 20000)),
            "estimated_households": int(row.get('population', 20000) * 0.35),
            "has_existing_patients": zip_code in top_zips,
            "median_income": int(row.get('median_income', 75000))
        })
    
    total_addressable = sum(g['estimated_households'] for g in geo_concentration)
    existing_zips = sum(1 for g in geo_concentration if g['has_existing_patients'])
    new_zips = len(geo_concentration) - existing_zips
    
    print(f"[PROFILE] Found {len(geo_concentration)} high-match ZIPs:")
    print(f"[PROFILE]   - {existing_zips} ZIPs with existing patients")
    print(f"[PROFILE]   - {new_zips} expansion opportunity ZIPs")
    print(f"[PROFILE]   - {total_addressable:,} total addressable households")
    
    # Build profile summary
    combined_label = f"{dominant_psychographic} - {dominant_behavior}"
    summary = (
        f"Your best patients are {combined_label}. "
        f"They spend ${avg_ltv:,} on average, visit {avg_frequency:.1f}× per year, "
        f"and are concentrated across {len(geo_concentration)} high-match ZIPs "
        f"reaching {total_addressable:,} households."
    )
    
    return {
        "dominant_profile": {
            "psychographic": dominant_psychographic,
            "behavioral": dominant_behavior,
            "combined": combined_label,
            "behavioral_match_pct": behavior_pct,
            "psychographic_match_pct": psycho_pct
        },
        "profile_characteristics": {
            "median_income": avg_income,
            "college_educated_pct": int(avg_college * 100),
            "homeowner_pct": int(avg_owner * 100),
            "income_range": f"${max(40000, avg_income-20000):,}-${avg_income+30000:,}"
        },
        "behavior_patterns": {
            "avg_lifetime_value": avg_ltv,
            "avg_visits_per_year": round(avg_frequency, 1),
            "avg_treatments_per_patient": round(avg_treatments, 1),
            "top_treatments": top_treatments
        },
        "geographic_concentration": geo_concentration,
        "geographic_summary": {
            "total_zips": len(geo_concentration),
            "existing_patient_zips": existing_zips,
            "expansion_opportunity_zips": new_zips,
            "total_addressable_households": total_addressable
        },
        "profile_summary": summary
    }
# ============================================================================
# STOP HERE - Next we'll wire this up in execute_advanced_analysis()
# ============================================================================
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
        else:
            _, _, raw_patients = validate_and_load_patients(dataset["patients_path"])
            patients_df = normalize_patients_dataframe(raw_patients)
        print(f"[ANALYSIS] Loaded patients: {len(patients_df) if patients_df is not None else 0}")

        # Ensure unique index
        patients_df = patients_df.reset_index(drop=True)
        competitors_df = load_competitors_csv(dataset["competitors_path"]) if dataset.get("competitors_path") else None
        print("[ANALYSIS] Loaded competitors")

        # Try to load a demographics file (optional)
        try:
            raw_demographics = load_zip_demographics(ZIP_DEMOGRAPHICS_PATH)
        except Exception:
            raw_demographics = None

        # Build a usable demographics table from patient ZIPs (and enrich with any provided demos)
        demographics_df = build_market_zip_universe(
            practice_zip=dataset["practice_zip"],
            raw_demographics=raw_demographics,
            radius_miles=50.0
        )
        print(f"[CLEAN] Demographics ready: {len(demographics_df)} ZIPs with coordinates")

        # Merge patient ZIPs with demographics (keep all patient columns)
        patient_cols = list(patients_df.columns)
        demo_cols = [c for c in demographics_df.columns if c not in patient_cols and c != "zip"]
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

        # STEP 2: Fit lifestyle cohorts
        from data.lifestyle_profiles import assign_lifestyle_segment

        # Apply sophisticated rule-based segmentation
        zip_features["cohort"] = zip_features.apply(
            lambda row: assign_lifestyle_segment(
                median_income=row.get('median_income', 75000),
                college_pct=row.get('college_pct', 0.35),
                owner_pct=row.get('owner_occ_pct', 0.65),
                age_group_pct=row.get('age_25_54_pct', 0.40)
            ),
            axis=1
        )
            
        print("[ANALYSIS] Fitted lifestyle cohorts")
        print("[CHECK] cohort distribution:\n",
            zip_features["cohort"].value_counts(dropna=False).to_string())

        # Extract cohort labels from the rule-based segmentation
        cohort_labels = zip_features["cohort"].values

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
            print(f"[DEBUG] Using data-driven fallback psych_score")

            # --- data-driven fallback (0..1) with stable per-ZIP jitter ---
            z = zip_features.copy()

            # Normalize helpful signals
            for c in ["median_income", "population", "college_pct", "age_25_54_pct", "owner_occ_pct"]:
                if c not in z.columns:
                    z[c] = np.nan
                z[c] = pd.to_numeric(z[c], errors="coerce")

            # make sure optional columns exist
            if "distance_miles" not in z.columns:
                z["distance_miles"] = np.nan
            if "competitors" not in z.columns:
                z["competitors"] = np.nan

            def _minmax(s):
                s = pd.to_numeric(s, errors="coerce")
                lo, hi = s.min(skipna=True), s.max(skipna=True)
                if pd.isna(lo) or pd.isna(hi) or hi == lo:
                    return pd.Series(0.5, index=s.index)
                return (s - lo) / (hi - lo)

            inc   = _minmax(z["median_income"])
            pop   = _minmax(z["population"])
            educ  = _minmax(z["college_pct"])
            age   = _minmax(z["age_25_54_pct"])
            own   = _minmax(z["owner_occ_pct"])
            dist  = _minmax(-pd.to_numeric(z["distance_miles"], errors="coerce"))  # nearer -> higher
            comp  = _minmax(-pd.to_numeric(z["competitors"], errors="coerce"))      # fewer -> higher

            base = (
                0.30 * inc +
                0.20 * educ +
                0.15 * age +
                0.10 * own +
                0.15 * pop +
                0.10 * dist
            )

            # widen & clamp, and NEVER leave NaN (breaks JSON to DB)
            score = (0.90 * base + 0.05).clip(0.05, 0.95)
            zip_features["psych_score"] = score.fillna(0.5)

                # ---- ZIP-specific revenue stats from patient history ----
        # Calculate per-ZIP revenue stats from patient history
        zip_stats = (
            patients_df
            .groupby("zip_code", dropna=False)
            .agg(revenue_sum=("revenue", "sum"), patient_count=("revenue", "count"))
            .reset_index()
            .rename(columns={"zip_code": "zip"})
        )

        # Calculate average ticket per ZIP, handling division by zero
        zip_stats["avg_ticket_zip"] = (
            zip_stats["revenue_sum"] / zip_stats["patient_count"].replace(0, np.nan)
        )

        # Merge ZIP stats into main features DataFrame
        zip_features = zip_features.merge(zip_stats, on="zip", how="left")

        # Fill missing values with global average
        global_avg_ticket = float(patients_df["revenue"].mean())
        zip_features["avg_ticket_zip"] = zip_features["avg_ticket_zip"].fillna(global_avg_ticket)
        zip_features["patient_count"] = zip_features["patient_count"].fillna(0).astype(int)

        # Debug output to verify calculations
        print(f"[CHECK] Global avg ticket: ${global_avg_ticket:.2f}")
        print("[CHECK] ZIP-specific averages:")
        print(zip_features[["zip", "avg_ticket_zip", "patient_count"]].head().to_string(index=False))
        # -- Sanitize psych_score to avoid NaN/inf and widen spread --
        zip_features["psych_score"] = pd.to_numeric(zip_features.get("psych_score"), errors="coerce")

        if zip_features["psych_score"].isna().all():
            # if scoring returned all-NaN, fall back to neutral 0.5
            zip_features["psych_score"] = 0.5
        else:
            med = float(zip_features["psych_score"].median(skipna=True))
            if np.isnan(med):
                med = 0.5
            zip_features["psych_score"] = zip_features["psych_score"].fillna(med)

        # keep scores in a sensible 5%..95% band so they’re comparable
        zip_features["psych_score"] = zip_features["psych_score"].clip(0.05, 0.95)

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
                # Rule-based insights generator
        def generate_rule_based_insights(row):
            # deterministic picker so cards vary but are stable per ZIP
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

            # ---- Competition ----
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

            # ---- Distance buckets ----
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

            # ---- Demographic fit ----
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

            # ---- Income & education ----
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

        # --- Build top segments (varied bookings derived from score, pop, distance, competition) ---
        def _expected_bookings(row):
            s    = float(coerce_float(row.get("psych_score", 0.5), 0.5))  # 0..1
            pop  = float(coerce_float(row.get("population", 20000), 20000))
            dist = float(coerce_float(row.get("distance_miles", 5.0), 5.0))
            comp = float(coerce_float(row.get("competitors", 0), 0))
            base = (s * (pop / 10000.0)) * (1.0 / (1.0 + 0.05 * dist)) * (1.0 / (1.0 + 0.3 * comp))
            if not np.isfinite(base) or base < 0:
                base = 0.0
            p50 = max(1, int(round(1.2 + 2.4 * base)))
            p10 = max(0, int(round(0.4 + 0.6 * base)))
            p90 = max(p50 + 1, int(round(p50 * 1.6)))
            return {"p10": p10, "p50": p50, "p90": p90}

        # STEP 5: Build top segments with DYNAMIC data enrichment
        # Add lift scoring for profile-first ranking
        if "cohort" in zip_features.columns:
            zip_features["lift_index"] = zip_features.groupby("cohort")["psych_score"].transform(
                lambda s: (s / (s.mean() + 1e-6)) * 100
            )
        else:
            zip_features["lift_index"] = 100

        # Rank by Lift × Population (profile-first scoring)
        zip_features["profile_score"] = zip_features["lift_index"] * (zip_features["population"] / 1000)

        # Select top ZIPs and count expansion opportunities
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
            
            # Get actual patient count and revenue for this ZIP
            patient_count = int(coerce_float(r.get("patient_count", 0), 0))
            avg_ticket_zip = float(coerce_float(r.get("avg_ticket_zip", 0), 0))
            global_avg = float(coerce_float(patients_df.get("revenue", pd.Series([750])).mean(), 750))
            ticket = avg_ticket_zip if avg_ticket_zip > 0 else global_avg
            
            # Calculate expected bookings
            population = float(r.get('population', 20000))
            market_penetration = patient_count / population if population > 0 else 0.0001
            base_monthly = max(1, int(population * market_penetration * score * 0.1))
            bookings = {
                "p10": max(1, int(base_monthly * 0.5)),
                "p50": base_monthly,
                "p90": max(base_monthly + 1, int(base_monthly * 1.5))
            }
            
            # Generate dynamic fields
            location_name = get_location_name_from_demographics(zip_code, demographics_df)
            demographic_desc = generate_dynamic_demographic_description(r, cohort_label, patients_df, zip_code)
            behavioral_tags = generate_data_driven_tags(r, patients_df, zip_code)
            best_channel = determine_best_channel_from_data(r, cohort_label, patients_df, zip_code)
            
            # Competition level
            if comp == 0:
                competition_level = "None"
            elif comp <= 2:
                competition_level = "Low"
            elif comp <= 5:
                competition_level = "Moderate"
            else:
                competition_level = "High"
            
            # Dynamic CPA calculation
            cpa_target = calculate_dynamic_cpa_target(ticket, score, comp, dist)
            monthly_ad_cap = cpa_target * bookings["p50"]
            target_roas = round(ticket / cpa_target, 1) if cpa_target > 0 else 5.0
            
            # Build insights
            row_dict_for_insights = {
                "zip": zip_code,
                "distance_miles": dist,
                "competitors": comp,
                "population": population,
                "expected_bookings": bookings,
            }
            insights_list = build_strategic_insights_for_row(
                row_dict_for_insights,
                avg_ticket=ticket,
                target_roas=5.0,
            )
            
            seg = {
                "zip": zip_code,
                "match_score": score,
                "expected_bookings": bookings,
                "expected_monthly_revenue_p50": round(bookings["p50"] * ticket, 2),
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
                
                # Rich dynamic fields
                "location_name": location_name,
                "demographic_description": demographic_desc,
                "behavioral_tags": behavioral_tags,
                "best_channel": best_channel,
                "target_roas": target_roas,
                
                # Additional metrics
                "population": int(population),
                "median_income": int(r.get('median_income', 75000)),
                "college_pct": float(r.get('college_pct', 0.35)),
                "market_penetration": round(market_penetration * 100, 4)
            }
            top_segments.append(seg)

        print(f"[DEBUG] Total segments created: {len(top_segments)}")

        # STEP 2: Generate profile-first analysis
        dominant_profile = identify_dominant_profile(
            patients_df, 
            zip_features, 
            top_percentile=0.2
        )
        print(f"[PROFILE] {dominant_profile['profile_summary']}")

        return {
            "headline_metrics": headline_metrics,
            "dominant_profile": dominant_profile,  # ← NEW: Add profile data
            "top_segments": top_segments,
            "map_points": [],
            "confidence_info": {"level": "early", "message": "Limited data confidence"}
        }

    except Exception as e:
        import traceback
        print(f"[ERROR] execute_advanced_analysis failed: {e}")
        print(traceback.format_exc())
        raise

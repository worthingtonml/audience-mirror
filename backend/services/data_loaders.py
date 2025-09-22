import os
import pandas as pd
import numpy as np
import json
from typing import Optional, Tuple, List

# Column requirements (relaxed)
REQUIRED_PATIENT_COLS = ["zip_code"]  # only hard requirement
OPTIONAL_PATIENT_COLS = ["procedure_type", "revenue", "consult_date"]

def validate_and_load_patients(file_path: str) -> Tuple[bool, List[str], Optional[pd.DataFrame]]:
    """Validate and load patient CSV with forgiving checks and sensible defaults.
    Returns (ok, warnings, df_raw). Downstream code will handle grouping/cleaning.
    """
    import logging
    logger = logging.getLogger("audiencemirror.data_loaders")

    # ---- Load ---------------------------------------------------------------
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        logger.error(f"Cannot read CSV file: {str(e)}")
        return False, [f"Cannot read CSV file: {str(e)}"], None

    warnings: List[str] = []

    # ---- Required columns (minimal) ----------------------------------------
    missing_required = [c for c in REQUIRED_PATIENT_COLS if c not in df.columns]
    if missing_required:
        msg = f"Missing required columns: {', '.join(missing_required)}"
        logger.error(msg)
        return False, [msg], None

    # ---- Ensure optional columns exist with defaults -----------------------
    if "procedure_type" not in df.columns:
        df["procedure_type"] = "Unknown"
        warnings.append("procedure_type missing; defaulted to 'Unknown'.")

    if "revenue" not in df.columns:
        df["revenue"] = np.nan
        warnings.append("revenue missing; left as NaN (will be coerced later).")

    # ---- ZIP cleaning / fallback assignment --------------------------------
    original_count = len(df)
    # Extract 5-digit ZIP; keep NaN if not found
    df["zip_code"] = (
        df["zip_code"]
        .astype(str)
        .str.extract(r"(\d{5})", expand=False)
        .str.zfill(5)
    )

    fallback_zips = ["11030", "11743", "11566", "10804"]
    missing_zip_mask = df["zip_code"].isna()
    if missing_zip_mask.any():
        # Assign fallback ZIPs in a round-robin fashion
        assignments = [fallback_zips[i % len(fallback_zips)] for i in range(missing_zip_mask.sum())]
        df.loc[missing_zip_mask, "zip_code"] = assignments
        idxs = df.index[missing_zip_mask].tolist()
        logger.warning(f"Assigned fallback ZIPs {fallback_zips} to rows with missing ZIP codes: {idxs}")
        warnings.append(f"Assigned fallback ZIPs to {len(idxs)} rows without valid ZIPs.")

    # ---- Revenue coercion (do NOT drop rows) -------------------------------
    df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce")

    # Sanity checks as warnings (not hard errors)
    max_rev = df["revenue"].max(skipna=True)
    if pd.notna(max_rev) and max_rev > 50000:
        msg = "Some revenue values seem unusually high (>$50k)."
        logger.warning(msg)
        warnings.append(f"Warning: {msg}")

    if (df["revenue"] < 0).any(skipna=True):
        msg = "Found negative revenue values; they will be treated as NaN."
        logger.warning(msg)
        df.loc[df["revenue"] < 0, "revenue"] = np.nan
        warnings.append(f"Warning: {msg}")

    # ---- Optional lightweight dataset size checks (warnings only) ----------
    if original_count < 10:
        warnings.append("Fewer than 10 patient rows provided — results may be noisy.")
    if df["zip_code"].nunique() < 3:
        warnings.append("Fewer than 3 unique ZIP codes — geographic signals may be weak.")

    # ---- Optional date parsing ---------------------------------------------
    if "consult_date" in df.columns:
        df["consult_date"] = pd.to_datetime(df["consult_date"], errors="coerce")

    logger.info(f"Loaded patients: {len(df)} rows; {df['zip_code'].nunique()} unique ZIPs")
    df = _apply_normalization(df)
    return True, warnings, df

def load_competitors_csv(file_path: Optional[str]) -> pd.DataFrame:
    """Load competitor ZIP codes"""
    if not file_path or not os.path.exists(file_path):
        return pd.DataFrame(columns=["zip_code"])
    
    try:
        # Handle both single column and multi-column CSV formats
        df = pd.read_csv(file_path)
        
        # If only one column, assume it's ZIP codes
        if len(df.columns) == 1:
            df.columns = ["zip_code"]
        elif "zip_code" not in df.columns and "zip" in df.columns:
            df = df.rename(columns={"zip": "zip_code"})
        
        df["zip_code"] = df["zip_code"].astype(str).str.extract(r'(\d{5})', expand=False)
        df = df.dropna(subset=["zip_code"])
        
        return df
    except Exception:
        return pd.DataFrame(columns=["zip_code"])

def load_zip_demographics(file_path: str) -> pd.DataFrame:
    """Load ZIP code demographic data"""
    df = pd.read_csv(file_path)
    df["zip"] = df["zip"].astype(str).str.zfill(5)
    
    # Validate required demographic columns
    required_demo_cols = ["zip", "lat", "lon", "population", "median_income"]
    missing = [col for col in required_demo_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Demographics file missing columns: {missing}")
    
    return df

def load_vertical_config(vertical_name: str) -> dict:
    """Load vertical configuration with fallback"""
    config_path = os.path.join("..", "verticals", f"{vertical_name}.json")
    
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Default medspa configuration
        return {
            "name": "medspa",
            "high_value_threshold": 5000,
            "non_inv_keywords": ["botox", "filler", "laser", "coolsculpt", "hydrafacial"],
            "surgical_keywords": ["rhinoplasty", "tummy", "facelift", "lipo", "augmentation"],
            "cohort_names": ['Luxury Clients', 'Comfort Spenders', 'Budget Conscious']
        }
# === Procedure normalization hook ===
from services.procedures import normalize_procedure

def _apply_normalization(df):
    if "procedure_type" in df.columns and "procedure_norm" not in df.columns:
        df = df.copy()
        df["procedure_norm"] = df["procedure_type"].map(normalize_procedure)
    return df
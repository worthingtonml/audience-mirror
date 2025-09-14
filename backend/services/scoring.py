import numpy as np
import pandas as pd
from math import radians, cos, sin, asin, sqrt
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.isotonic import IsotonicRegression
from typing import Optional, Tuple, List
import warnings
from services.zip_income import get_zip_income_data
warnings.filterwarnings('ignore')

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Haversine distance between two points in miles"""
    R = 3956.0  # Earth's radius in miles

    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    return c * R

def compute_accessibility_score(zip_demographics: pd.DataFrame, practice_zip: str, 
                               competitors_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Compute accessibility score combining geography and competition
    """
    # Clean inputs thoroughly to prevent pandas duplicate label errors
    result = zip_demographics.copy().reset_index(drop=True).drop_duplicates().reset_index(drop=True)
    
    # Get practice location (fallback to center if not found)
    try:
        practice_match = result[result["zip"] == practice_zip]
        if len(practice_match) > 0:
            practice_lat = float(practice_match["lat"].iloc[0])
            practice_lon = float(practice_match["lon"].iloc[0])
        else:
            practice_lat = float(result["lat"].mean())
            practice_lon = float(result["lon"].mean())
    except:
        practice_lat = float(result["lat"].mean())
        practice_lon = float(result["lon"].mean())

    # Calculate distances using Haversine formula
    if 'lat' in result.columns and 'lon' in result.columns:
        result["distance_miles"] = result.apply(
            lambda row: haversine_distance(practice_lat, practice_lon, row["lat"], row["lon"]),
            axis=1
        )
    else:
        result["distance_miles"] = 10.0  # Default distance

    # Geographic proximity with exponential decay beyond threshold
    distance_threshold = 10.0  # miles
    decay_rate = 0.14

    result["proximity"] = np.where(
        result["distance_miles"] <= distance_threshold,
        1.0,  # Full accessibility within threshold
        np.exp(-decay_rate * (result["distance_miles"] - distance_threshold))
    )

        
    # Handle competitor data safely
    if competitors_df is not None and not competitors_df.empty:
        competitor_counts = competitors_df["zip_code"].value_counts()
    # Use merge instead of map for better compatibility
        competitor_df = competitor_counts.reset_index()
        competitor_df.columns = ['zip', 'competitors']
        # Remove duplicate columns before merge
        result = result.loc[:, ~result.columns.duplicated()]
        result = result.merge(competitor_df, on='zip', how='left')
        result['competitors'] = result['competitors'].fillna(0)
    else:
        result["competitors"] = 0

    # Calculate competitors per 10,000 residents (handles zero population)
    result["competitors_per_10k"] = result["competitors"] / (result["population"] / 10000.0)
    result["competitors_per_10k"] = result["competitors_per_10k"].fillna(0)

    # Pressure coefficient (higher beta = more sensitive to competition)
    beta = 0.9
    result["pressure"] = 1.0 / (1.0 + beta * result["competitors_per_10k"])

    # Final accessibility score (geography × competition)
    result["accessibility"] = np.clip(result["proximity"] * result["pressure"], 0, 1)
    
    return result

def fit_lifestyle_cohorts(zip_features):
    """
    Adaptive clustering that handles variable dataset sizes robustly.
    Falls back to simpler methods when clustering isn't viable.
    """
    n_samples = len(zip_features)

    # For very small datasets, use rule-based segmentation instead of clustering
    if n_samples < 3:
        return _create_rule_based_cohorts(zip_features)

    # For small datasets, reduce cluster count appropriately
    if n_samples < 10:
        n_clusters = min(3, n_samples - 1)
    else:
        n_clusters = min(5, len(zip_features))  # Use fewer clusters for small datasets

    features_to_cluster = [
        'population', 'median_income', 'competitors', 'distance_miles'
    ]

    X = zip_features[features_to_cluster].fillna(0)

    # Check for sufficient variance - clustering fails on identical data
    if X.std().sum() < 1e-10:
        return _create_rule_based_cohorts(zip_features)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Use more robust clustering parameters
    kmeans = KMeans(
        n_clusters=n_clusters, 
        random_state=42, 
        n_init=10,
        max_iter=300,
        tol=1e-4
    )

    try:
        cluster_labels = kmeans.fit_predict(X_scaled)
        cohort_names = _assign_cohort_names(zip_features, cluster_labels, n_clusters)
        return kmeans, scaler, cohort_names
    except Exception as e:
        print(f"[WARNING] Clustering failed: {e}. Falling back to rule-based segmentation.")
        return _create_rule_based_cohorts(zip_features)

def _create_rule_based_cohorts(zip_features):
    """
    Rule-based segmentation for when clustering isn't viable.
    Uses income and competition thresholds to assign cohorts.
    """
    cohort_labels = []

    for _, row in zip_features.iterrows():
        income = row.get('median_income', 0)
        competitors = row.get('competitors', 0)

        if income > 75000 and competitors <= 2:
            cohort_labels.append('Premium')
        elif income > 60000:
            cohort_labels.append('Affluent') 
        elif competitors <= 1:
            cohort_labels.append('Emerging')
        else:
            cohort_labels.append('Value')

    return None, None, cohort_labels

def _assign_cohort_names(zip_features, cluster_labels, n_clusters):
    """
    Intelligently assign meaningful names based on cluster characteristics.
    """
    cluster_profiles = []

    for i in range(n_clusters):
        mask = cluster_labels == i
        cluster_data = zip_features[mask]

        avg_income = cluster_data['median_income'].mean()
        avg_competitors = cluster_data['competitors'].mean()

        cluster_profiles.append({
            'cluster': i,
            'income': avg_income,
            'competitors': avg_competitors,
            'size': mask.sum()
        })

    # Sort by income descending to assign names appropriately
    cluster_profiles.sort(key=lambda x: x['income'], reverse=True)

    name_mapping = {}
    available_names = ['Premium', 'Affluent', 'Emerging', 'Value', 'Niche']

    for idx, profile in enumerate(cluster_profiles):
        name_mapping[profile['cluster']] = available_names[idx]

    return [name_mapping[label] for label in cluster_labels]

import numpy as np
import pandas as pd

import numpy as np
import pandas as pd

def calculate_psychographic_scores(
    patients_df: pd.DataFrame,
    zip_demographics: pd.DataFrame,
    cluster_labels: np.ndarray,
    vertical_config: dict,
    focus: str,
) -> pd.Series:
    """
    Data-driven psychographic/affinity score per ZIP in [0,1].
    - Uses patient history at the ZIP level (revenue-weighted focus share)
    - Shrinks ZIP estimates toward its cohort average when data is sparse
    - Falls back to the global average only if both ZIP and cohort have no data
    - Returns a Series whose index matches zip_demographics.index
    """

    # ---------- Prepare patient data ----------
    df = patients_df.copy()
    df["zip_code"] = df.get("zip_code", "").astype(str).str.zfill(5)
    df["revenue"]  = pd.to_numeric(df.get("revenue", 0.0), errors="coerce").fillna(0.0)

    # Procedure classification for focus
    proc = df.get("procedure_type")
    if proc is None:
        df["procedure_type"] = ""
    df["proc_lower"] = df["procedure_type"].astype(str).str.lower()

    non_inv_kw = [k.lower() for k in vertical_config.get("non_inv_keywords", [])]
    surg_kw    = [k.lower() for k in vertical_config.get("surgical_keywords", [])]
    hv_thresh  = float(vertical_config.get("high_value_threshold", 1000))

    if focus == "non_inv":
        df["is_focus"] = df["proc_lower"].apply(lambda x: any(k in x for k in non_inv_kw))
    elif focus == "surgical":
        df["is_focus"] = df["proc_lower"].apply(lambda x: any(k in x for k in surg_kw))
    elif focus == "value":
        df["is_focus"] = df["revenue"] < hv_thresh
    else:  # "high_value" or anything else
        df["is_focus"] = df["revenue"] >= hv_thresh

    # Cohort for each ZIP from zip_demographics + cluster_labels
    zmap = pd.DataFrame({
        "zip": zip_demographics["zip"].astype(str).str.zfill(5),
        "cohort": cluster_labels
    })
    df = df.merge(zmap, left_on="zip_code", right_on="zip", how="left")

    # Revenue-weighted focus signal (use counts if revenue is zero)
    df["focus_rev"] = df["revenue"] * df["is_focus"].astype(float)

    # ZIP-level aggregates
    g_zip = (
        df.groupby("zip_code", dropna=False)
          .agg(rev=("revenue", "sum"),
               focus_rev=("focus_rev", "sum"),
               n=("is_focus", "size"),
               focus_n=("is_focus", "sum"))
          .reset_index()
    )
    g_zip["zip_rate_rev"] = np.where(
        g_zip["rev"] > 0,
        g_zip["focus_rev"] / g_zip["rev"],
        np.nan
    )
    g_zip["zip_rate_cnt"] = np.where(
        g_zip["n"] > 0,
        g_zip["focus_n"] / g_zip["n"],
        np.nan
    )
    # Prefer revenue-weighted rate, fall back to count rate
    g_zip["zip_rate"] = g_zip["zip_rate_rev"].fillna(g_zip["zip_rate_cnt"])

    # Cohort-level aggregates
    g_cohort = (
        df.groupby("cohort", dropna=False)
          .agg(rev=("revenue", "sum"),
               focus_rev=("focus_rev", "sum"),
               n=("is_focus", "size"),
               focus_n=("is_focus", "sum"))
          .reset_index()
    )
    g_cohort["cohort_rate_rev"] = np.where(
        g_cohort["rev"] > 0,
        g_cohort["focus_rev"] / g_cohort["rev"],
        np.nan
    )
    g_cohort["cohort_rate_cnt"] = np.where(
        g_cohort["n"] > 0,
        g_cohort["focus_n"] / g_cohort["n"],
        np.nan
    )
    g_cohort["cohort_rate"] = g_cohort["cohort_rate_rev"].fillna(g_cohort["cohort_rate_cnt"])

    # Global baseline (purely from data)
    if len(df) > 0:
        global_rate = float(
            (df["focus_rev"].sum() / df["revenue"].sum())
            if df["revenue"].sum() > 0
            else (df["is_focus"].mean())
        )
    else:
        global_rate = 0.5  # truly no data

    # Map cohorts/prior to ZIPs
    g_zip = g_zip.merge(zmap, left_on="zip_code", right_on="zip", how="left")
    cohort_rate = g_cohort.set_index("cohort")["cohort_rate"].astype(float).to_dict()
    g_zip["prior"] = g_zip["cohort"].map(cohort_rate)
    g_zip["prior"] = g_zip["prior"].fillna(global_rate)

    # Empirical-Bayes shrinkage toward cohort prior
    # alpha controls strength of prior; tie it to data volume, min=5
    global_n = int(df.shape[0])
    alpha = max(5, int(0.05 * global_n))

    # Effective sample size per ZIP: prefer counts; if all counts are 0 (unlikely), fall back to 1
    eff_n = g_zip["n"].fillna(0).astype(float)
    eff_n = np.where(eff_n > 0, eff_n, 1.0)

    # If zip_rate is missing (no focus signal at all), treat zip_rate as NaN so posterior relies on prior
    g_zip["zip_rate"] = pd.to_numeric(g_zip["zip_rate"], errors="coerce")

    # Posterior mean of Bernoulli with Beta prior
    g_zip["posterior"] = (
        np.where(g_zip["zip_rate"].notna(), g_zip["zip_rate"] * eff_n, 0.0)
        + alpha * g_zip["prior"]
    ) / (eff_n + alpha)

    # Build scores for every ZIP in zip_demographics order
    zdf = pd.DataFrame({"zip": zip_demographics["zip"].astype(str).str.zfill(5)})
    zdf = zdf.merge(g_zip[["zip_code", "posterior"]], left_on="zip", right_on="zip_code", how="left")
    zdf = zdf.drop(columns=["zip_code"])

    # Fill ZIPs with no patient history using their cohort prior or global
    zdf = zdf.merge(zmap, on="zip", how="left")
    zdf["score_raw"] = zdf["posterior"]
    zdf["score_raw"] = zdf["score_raw"].fillna(zdf["cohort"].map(cohort_rate))
    zdf["score_raw"] = zdf["score_raw"].fillna(global_rate)

    # Normalize to [0,1] across current run (keeps purely data-driven ordering)
    s = pd.to_numeric(zdf["score_raw"], errors="coerce")
    lo, hi = float(s.min()), float(s.max())
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        norm = pd.Series(0.5, index=zdf.index)  # truly flat data → neutral
    else:
        norm = (s - lo) / (hi - lo)

    # Return aligned to zip_demographics.index
    norm.index = zip_demographics.index
    return norm


    # ---------- ORIGINAL DOMAIN LOGIC (preserved) ----------
    patients = patients_df.copy()
    patients = _ensure_col(patients, "procedure_type", "unknown")
    patients = _ensure_col(patients, "revenue", 500.0)
    patients["procedure_lower"] = patients["procedure_type"].astype(str).str.lower()

    non_inv_keywords = vertical_config.get("non_inv_keywords", [])
    surgical_keywords = vertical_config.get("surgical_keywords", [])
    high_value_threshold = vertical_config.get("high_value_threshold", 5000)

    patients["is_non_invasive"] = patients["procedure_lower"].apply(
        lambda x: any(k in x for k in non_inv_keywords)
    )
    patients["is_surgical"] = patients["procedure_lower"].apply(
        lambda x: any(k in x for k in surgical_keywords)
    )
    patients["is_high_value"] = pd.to_numeric(patients["revenue"], errors="coerce").fillna(0) >= float(high_value_threshold)

    # Build ZIP->cohort mapping (robust to length mismatch)
    z = zip_demographics.copy()
    z_zip = z.get("zip")
    if z_zip is not None:
        z_zip = z_zip.astype(str).str.zfill(5)
    else:
        # If no 'zip' column, create a dummy so we can still align by index later
        z_zip = pd.Series([None] * len(z), index=z.index)

    if cluster_labels is not None and len(cluster_labels) == len(z):
        zip_cohort_mapping = pd.DataFrame({"zip": z_zip, "cohort": cluster_labels})
    else:
        # Fallback single cohort (0) if labels are missing/misaligned
        zip_cohort_mapping = pd.DataFrame({"zip": z_zip, "cohort": 0})

    # Merge patients with their ZIP's cohort
    if "zip_code" in patients.columns:
        patients["zip_code"] = patients["zip_code"].astype(str).str.zfill(5)
        merged = patients.merge(zip_cohort_mapping, left_on="zip_code", right_on="zip", how="left")
    else:
        # If no zip_code on patients, skip original logic (forces fallback later)
        merged = pd.DataFrame(columns=["cohort", "is_non_invasive", "is_surgical", "is_high_value"])

    # Cohort propensities (neutral if no data)
    if not merged.empty and "cohort" in merged.columns:
        cohort_prop = merged.groupby("cohort", dropna=False).agg(
            is_non_invasive=("is_non_invasive", "mean"),
            is_surgical=("is_surgical", "mean"),
            is_high_value=("is_high_value", "mean"),
        ).fillna(0.5)
    else:
        cohort_prop = pd.DataFrame({"is_non_invasive": [0.5], "is_surgical": [0.5], "is_high_value": [0.5]}, index=[0])

    # Choose propensity column by focus
    prop_col = "is_surgical" if str(focus).lower() == "surgical" else "is_non_invasive"

    # Map cohort propensity to ZIPs (creates Series by ZIP value)
    zip_to_cohort = dict(zip_cohort_mapping[["zip", "cohort"]].itertuples(index=False, name=None))
    cohort_to_prop = cohort_prop[prop_col].to_dict()

    # Build original score per row-position (aligned to z.index)
    orig_scores = []
    for idx in z.index:
        zip_val = z_zip.iloc[idx] if z_zip is not None is not None else None
        cohort = zip_to_cohort.get(zip_val, 0)
        val = cohort_to_prop.get(cohort, 0.5)
        orig_scores.append(val)
    original_scores = pd.Series(orig_scores, index=z.index, dtype=float)

    # Normalize original to 0..1 band (if there is spread)
    lo, hi = original_scores.min(skipna=True), original_scores.max(skipna=True)
    if not (pd.isna(lo) or pd.isna(hi) or hi == lo):
        original_scores = (original_scores - lo) / (hi - lo)
    else:
        # keep neutral if no spread
        original_scores = original_scores.fillna(0.5)

    # ---------- FALLBACK: demographics to fill NaNs only ----------
    needs_fallback = original_scores.isna().any() or original_scores.isin([np.inf, -np.inf]).any()
    if needs_fallback:
        fb = _demographic_fallback(z, focus)
        # fb already aligned to z.index
        original_scores = pd.to_numeric(original_scores, errors="coerce")
        original_scores = original_scores.where(~original_scores.isna(), fb)

    # Final clean/bounds; guarantee same index & 0.05..0.95 range
    original_scores = pd.to_numeric(original_scores, errors="coerce").fillna(0.5).clip(0.05, 0.95)
    original_scores.index = z.index  # explicit: row-position alignment

    return original_scores

def learn_ridge_regression(patients_df: pd.DataFrame, zip_features: pd.DataFrame) -> Optional[Ridge]:
    """
    Learn optimal feature blend using Ridge regression with cross-validation
    Target: revenue per 1K population (market penetration proxy)
    """
    import logging
    logger = logging.getLogger("audiencemirror.scoring")
    try:
        # Aggregate patient outcomes by ZIP
        zip_outcomes = patients_df.groupby("zip_code").agg({
            "revenue": ["sum", "mean", "count"]
        })
        zip_outcomes.columns = ["total_revenue", "avg_revenue", "patient_count"]
        zip_outcomes.reset_index(inplace=True)
        # Merge with ZIP features
        zip_features = zip_features.loc[:, ~zip_features.columns.duplicated()]
        model_data = zip_outcomes.merge(zip_features, left_on="zip_code", right_on="zip", how="inner")
        if len(model_data) < 5:
            logger.warning(f"Ridge regression: Not enough ZIPs for stable model (found {len(model_data)})")
            return None
        # Calculate target variable: revenue per 1K residents (market penetration)
        model_data["revenue_per_1k"] = model_data["total_revenue"] / (model_data["population"] / 1000.0)
        # Feature matrix construction
        base_features = ["accessibility", "median_income", "age_25_54_pct", "college_pct",
                        "owner_occ_pct", "density_per_sqmi"]
        # Add cohort dummy variables
        if "cohort" in model_data.columns:
            cohort_dummies = pd.get_dummies(model_data["cohort"], prefix="cohort")
            model_data = pd.concat([model_data, cohort_dummies], axis=1)
            base_features.extend(cohort_dummies.columns)
        # Add psychographic score if available
        if "psych_score" in model_data.columns:
            base_features.append("psych_score")
        # Prepare feature matrix and target
        X = model_data[base_features].fillna(0)
        y = model_data["revenue_per_1k"]
        if X.shape[0] < 3:
            logger.warning(f"Ridge regression: Not enough samples for model (found {X.shape[0]})")
            return None
        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        # Fit Ridge regression with L2 regularization
        ridge_model = Ridge(alpha=2.0, random_state=42)
        ridge_model.fit(X_scaled, y)
        # Store preprocessing info for later use
        ridge_model.feature_scaler = scaler
        ridge_model.feature_names = base_features
        return ridge_model
    except Exception as e:
        logger.error(f"Ridge regression failed: {str(e)}", exc_info=True)
        return None

def calibrate_booking_predictions(zip_features: pd.DataFrame, 
                                 patients_df: pd.DataFrame) -> Tuple[Optional[IsotonicRegression], dict]:
    """Returns (calibrator, confidence_info) with user-friendly confidence data."""
    
    # Count actual procedures by ZIP
    zip_volumes = patients_df.groupby("zip_code").size()

    # Merge with features
    calib_df = zip_features.merge(
        zip_volumes.rename("actual_procedures"),
        left_on="zip", right_index=True, how="left"
    )
    calib_df["actual_procedures"] = calib_df["actual_procedures"].fillna(0)

    # Keep only ZIPs with actual volume
    active = calib_df[calib_df["actual_procedures"] > 0]
    n_zips = len(active)

    # User-friendly confidence info
    if n_zips >= 15:
        confidence_info = {
            "level": "high",
            "message": f"High confidence - Based on {n_zips} areas where you've had patients",
            "status": "learned",
            "n_zips": n_zips
        }
    elif n_zips >= 7:
        confidence_info = {
            "level": "medium",
            "message": f"Medium confidence - Based on {n_zips} areas where you've had patients",
            "status": "learned",
            "n_zips": n_zips
        }
    else:
        confidence_info = {
            "level": "early",
            "message": "Early estimates - We'll get more accurate as you see patients from these areas",
            "status": "estimated",
            "n_zips": n_zips
        }

    if n_zips < 3:
        return None, confidence_info

    # Convert to monthly bookings and fit calibrator
    active = active.copy()
    active["monthly_bookings"] = active["actual_procedures"] * 0.8

    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(active["match_score"], active["monthly_bookings"])

    return calibrator, confidence_info

def generate_segment_explanations(zip_row: pd.Series, ridge_model: Optional[Ridge], 
                                 top_k: int = 3) -> List[str]:
    """
    Generate human-readable explanations for why a ZIP scored highly
    Uses Ridge regression coefficients to identify top contributing features
    """
    if ridge_model is None:
        # Fallback explanations when no model available
        fallback_reasons = []
        if zip_row.get("accessibility", 0) > 0.7:
            fallback_reasons.append("High accessibility score")
        if zip_row.get("median_income", 0) > 80000:
            fallback_reasons.append("Strong demographics")
        if zip_row.get("distance_miles", 999) < 15:
            fallback_reasons.append("Close proximity")
        return fallback_reasons or ["Good market opportunity"]
    
    # Extract feature values for this ZIP
    feature_values = []
    for feature_name in ridge_model.feature_names:
        feature_values.append(zip_row.get(feature_name, 0))
    
    # Transform using model's scaler
    feature_values = np.array(feature_values).reshape(1, -1)
    scaled_features = ridge_model.feature_scaler.transform(feature_values)[0]
    
    # Calculate feature contributions (coefficient × scaled value)
    contributions = ridge_model.coef_ * scaled_features
    
    # Get indices of top contributing features
    top_feature_indices = np.argsort(np.abs(contributions))[-top_k:][::-1]
    
    # Map feature names to human-readable explanations
    explanation_mapping = {
        "accessibility": "Close with low competition",
        "median_income": "High income area",
        "college_pct": "Highly educated demographics", 
        "age_25_54_pct": "Prime age demographic",
        "owner_occ_pct": "High homeownership rates",
        "density_per_sqmi": "Optimal population density",
        "psych_score": "Lifestyle cohort aligns with focus"
    }
    
    explanations = []
    for idx in top_feature_indices:
        feature_name = ridge_model.feature_names[idx]
        
        # Handle cohort dummy variables
        if feature_name.startswith("cohort_"):
            cohort_name = feature_name.replace("cohort_", "").replace("_", " ")
            explanations.append(f"{cohort_name} lifestyle segment")
        else:
            # Use predefined explanation or generate generic one
            explanation = explanation_mapping.get(feature_name, f"Strong {feature_name}")
            explanations.append(explanation)
    
    return explanations if explanations else ["Strong overall market signal"]

def compute_zip_match_scores(zip_df, avg_patient_revenue):
    """
    Compute composite match score for each ZIP using income alignment and market saturation.
    Adds columns: income_score, match_score (composite).
    """
    zip_codes = zip_df['zip'].astype(str).tolist()
    income_map = get_zip_income_data(zip_codes)
    national_avg_income = 67000
    zip_df['median_income'] = zip_df['zip'].map(income_map).fillna(national_avg_income)
    # New income_score formula
    zip_df['income_score'] = (zip_df['median_income'] / (avg_patient_revenue * 2)).clip(upper=1.0)
    # Use existing_score if present, else accessibility
    if 'existing_score' in zip_df.columns:
        base = zip_df['existing_score']
    elif 'accessibility' in zip_df.columns:
        base = zip_df['accessibility']
    else:
        base = 0.5
    # Composite: 0.6*existing + 0.4*income_score
    zip_df['match_score'] = base * 0.6 + zip_df['income_score'] * 0.4
    return zip_df

def validate_zip_recommendation_accuracy(patients_df: pd.DataFrame, zip_demographics: pd.DataFrame, competitors_df: Optional[pd.DataFrame] = None, avg_patient_revenue: float = 1000.0, top_n: int = 10, random_state: int = 42):
    """
    Splits patients_df into train/test (75/25), runs the algorithm on train, and checks how many test ZIPs appear in top recommendations.
    Returns dict with accuracy metrics.
    """
    if len(patients_df) < 10:
        return {"error": "Not enough patient data for validation."}
    patients_df = patients_df.sample(frac=1, random_state=random_state).reset_index(drop=True)
    split_idx = int(len(patients_df) * 0.75)
    train_patients = patients_df.iloc[:split_idx]
    test_patients = patients_df.iloc[split_idx:]
    # Get ZIPs from train
    train_zips = train_patients['zip_code'].unique()
    # Run scoring pipeline on train ZIPs only
    # Filter demographics to only ZIPs present in data
    zips_to_score = zip_demographics[zip_demographics['zip'].isin(train_zips)].copy()
    # Compute accessibility (if not already present)
    if 'accessibility' not in zips_to_score.columns:
        zips_to_score = compute_accessibility_score(zips_to_score, practice_zip=train_patients['zip_code'].iloc[0], competitors_df=competitors_df)
    # Compute match scores
    zips_to_score = compute_zip_match_scores(zips_to_score, avg_patient_revenue)
    # Get top N recommended ZIPs
    top_zip_recs = set(zips_to_score.sort_values('match_score', ascending=False)['zip'].astype(str).head(top_n))
    # Test set ZIPs
    test_zips = test_patients['zip_code'].astype(str)
    n_test = len(test_zips)
    n_matched = test_zips.isin(top_zip_recs).sum()
    percent_matched = (n_matched / n_test) * 100 if n_test > 0 else 0
    n_test = int(n_test)
    n_matched = int(n_matched)
    percent_matched = float(percent_matched)
    # Ensure all values are native Python types
    top_zip_recs_py = [str(z) for z in top_zip_recs]
    return {
        "n_test_patients": n_test,
        "n_matched": n_matched,
        "percent_matched": round(percent_matched, 1),
        "top_n": int(top_n),
        "top_zip_recs": top_zip_recs_py
    }
    
import requests
import json

import requests
import json

def generate_llm_explanations(zip_code, zip_data, procedure_focus, practice_zip):
    """Generate detailed, actionable business insights"""
    try:
        distance = zip_data.get('distance_miles', 'N/A')
        competitors = zip_data.get('competitors', 0)
        income = zip_data.get('median_income', 0)
        college_pct = zip_data.get('college_pct', 0) * 100
        age_25_54_pct = zip_data.get('age_25_54_pct', 0) * 100
        match_score = zip_data.get('match_score', 0)
        population = zip_data.get('population', 25000)  # Default estimate
        
        # Calculate market size and opportunity metrics
        target_demo_size = int(population * (age_25_54_pct / 100) * 0.6)
        market_penetration = min(target_demo_size * 0.02, 50)
        
        return generate_enhanced_fallback_explanations(
            zip_data, procedure_focus, target_demo_size, market_penetration
        )
            
    except Exception as e:
        print(f"[WARNING] Enhanced explanation failed: {e}")
        return ["Market opportunity identified"]

def generate_enhanced_fallback_explanations(zip_data, procedure_focus, target_demo_size, market_penetration):
    """Generate specific, actionable business recommendations"""
    explanations = []
    
    # Market size insights
    if market_penetration > 20:
        explanations.append(f"Large addressable market: {int(market_penetration)} potential patients")
    elif market_penetration > 10:
        explanations.append(f"Solid market size: {int(market_penetration)} reachable prospects")
    
    # Competition strategy
    competitors = zip_data.get('competitors', 0)
    if competitors == 0:
        explanations.append("Zero competitors - first-mover advantage opportunity")
    elif competitors == 1:
        explanations.append("Single competitor - differentiation strategy viable")
    elif competitors <= 3:
        explanations.append(f"Low competition ({competitors}) - market share available")
    else:
        explanations.append(f"Competitive market - premium positioning required")
    
    # Pricing strategy based on income
    income = zip_data.get('median_income', 0)
    if income > 120000:
        if procedure_focus == 'non_inv':
            explanations.append("High income supports 15-20% premium pricing")
        else:
            explanations.append("Affluent demographics - luxury package opportunity")
    elif income > 80000:
        explanations.append("Strong income base - standard premium viable")
    else:
        explanations.append("Price-sensitive - volume-based strategy optimal")
    
    # Marketing channel recommendations
    college_pct = zip_data.get('college_pct', 0)
    if college_pct > 0.6:
        explanations.append("Educated demographic - research-driven content strategy")
    elif college_pct > 0.4:
        explanations.append("Professional audience - authority-based messaging")
    
    # Geographic positioning
    distance = zip_data.get('distance_miles', 999)
    if distance < 10:
        explanations.append("Close proximity - convenience messaging effective")
    elif distance < 20:
        explanations.append("Moderate distance - destination positioning strategy")
    
    # Algorithm confidence
    match_score = zip_data.get('match_score', 0)
    if match_score > 0.7:
        explanations.append("High algorithm confidence - fast acquisition expected")
    
    return explanations[:3] if explanations else ["Viable market opportunity"]


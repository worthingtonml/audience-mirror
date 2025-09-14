# backend/services/simulation.py
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple, Literal
from .scoring import haversine_distance, fit_lifestyle_cohorts

Focus = Literal["non_inv", "surgical"]

def _seasonality(month: int, proc_type: str) -> float:
    # simple medspa-ish seasonality priors
    if proc_type == "non_inv":
        # peaks pre-summer & holidays
        bumps = {5: 1.2, 6: 1.25, 11: 1.15, 12: 1.25}
    else:
        # surgical more in winter/spring
        bumps = {1: 1.2, 2: 1.15, 3: 1.1}
    return bumps.get(month, 1.0)

def simulate_dataset(
    demo_df: pd.DataFrame,
    practice_zip: str,
    n_patients: int = 1000,
    econ_index: float = 1.0,   # <1 downcycle, >1 boom
    seed: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Returns (patients_df, competitors_df, oracle_zip_df)
    - Fabricates patients with oracle (true) zip scores that combine:
      distance-decay, competitor pressure, income/education, cohort preference, seasonality, noise.
    """
    rng = np.random.default_rng(seed)
    df = demo_df.copy()
    df["zip"] = df["zip"].astype(str).str.zfill(5)

    # practice lat/lon
    p = df.loc[df["zip"] == practice_zip]
    if p.empty:
        p_lat, p_lon = df["lat"].mean(), df["lon"].mean()
    else:
        p_lat, p_lon = float(p["lat"].iloc[0]), float(p["lon"].iloc[0])

    # distance & proximity
    df["distance_miles"] = df.apply(lambda r: haversine_distance(p_lat, p_lon, r["lat"], r["lon"]), axis=1)
    thresh, decay = 10.0, 0.14
    df["proximity"] = np.where(
        df["distance_miles"] <= thresh,
        1.0,
        np.exp(-decay * (df["distance_miles"] - thresh))
    )

    # synthetic competitor counts (richer, denser → more comps)
    base_lambda = (df["median_income"]/df["median_income"].median()) * (df["density_per_sqmi"]/df["density_per_sqmi"].median())
    base_lambda = np.clip(base_lambda, 0.2, 3.0)
    df["competitors"] = rng.poisson(lam=base_lambda)
    df["competitors_per_10k"] = df["competitors"] / (df["population"]/10000.0).replace(0, np.nan)
    df["competitors_per_10k"] = df["competitors_per_10k"].fillna(0)
    beta = 0.9
    df["pressure"] = 1.0 / (1.0 + beta * df["competitors_per_10k"])

    # lifestyle cohorts
    kmeans, scaler, labels = fit_lifestyle_cohorts(df, n_clusters=5)
    df["cohort"] = labels

    # cohort preferences (oracle propensities)
    cohort_stats = df.groupby("cohort")[["median_income","college_pct","density_per_sqmi","age_25_54_pct"]].mean()
    ci = (cohort_stats["median_income"] / cohort_stats["median_income"].max())
    ce = cohort_stats["college_pct"]
    cd = (cohort_stats["density_per_sqmi"] / cohort_stats["density_per_sqmi"].max())
    ca = cohort_stats["age_25_54_pct"]

    surgical_pref = (0.55*ci + 0.25*ce + 0.10*(1-cd) + 0.10*(1-ca))
    noninv_pref   = (0.20*ci + 0.20*ce + 0.35*cd + 0.25*ca)
    # normalize to [0,1]
    s_min, s_max = surgical_pref.min(), surgical_pref.max()
    n_min, n_max = noninv_pref.min(), noninv_pref.max()
    surgical_pref = (surgical_pref - s_min)/(s_max - s_min + 1e-9)
    noninv_pref   = (noninv_pref - n_min)/(n_max - n_min + 1e-9)

    df = df.join(surgical_pref.rename("cohort_surg_pref"), on="cohort")
    df = df.join(noninv_pref.rename("cohort_noninv_pref"), on="cohort")

    # demographic normalization
    inc = (df["median_income"] - df["median_income"].min())/(df["median_income"].max() - df["median_income"].min() + 1e-9)
    edu = df["college_pct"]

    # economic tilt: downturn penalizes surgical demand more
    econ_surg   = econ_index
    econ_noninv = 2 - econ_index

    # oracle true zip-level score
    df["oracle_score"] = (
        0.40 * df["proximity"] * df["pressure"] +
        0.20 * inc +
        0.15 * edu +
        0.10 * df["cohort_surg_pref"] * econ_surg +
        0.10 * df["cohort_noninv_pref"] * econ_noninv +
        0.05 * rng.normal(0.5, 0.15, size=len(df))
    )
    df["oracle_score"] = df["oracle_score"].clip(0, 1)

    # choose each patient's ZIP proportional to oracle_score * population
    weights = (df["oracle_score"] * (df["population"].clip(lower=1))).values
    weights = weights / weights.sum()
    chosen = rng.choice(df["zip"].values, size=n_patients, p=weights)

    # procedure type driven by cohort prop + seasonality + noise
    patients = []
    start = datetime(2024,1,1)
    for z in chosen:
        row = df.loc[df["zip"] == z].iloc[0]
        p_surg = float(np.clip(0.35*row["cohort_surg_pref"] + 0.15*inc[df["zip"]==z].iloc[0], 0.05, 0.85))
        dt = start + timedelta(days=int(rng.integers(0, 365)))
        month = dt.month
        p_surg *= _seasonality(month, "surgical")
        p_non  = (1-p_surg) * _seasonality(month, "non_inv")
        norm = p_surg + p_non
        p_surg = p_surg / norm
        proc = "surgical" if rng.random() < p_surg else "non_inv"
        if proc == "surgical":
            revenue = float(np.clip(rng.normal(7500, 1800), 3000, 15000))
            label = np.random.choice(["Facelift","Tummy Tuck","Breast Augmentation","Rhinoplasty","Lipo"], p=[0.24,0.22,0.20,0.18,0.16])
        else:
            revenue = float(np.clip(rng.normal(550, 220), 120, 1500))
            label = np.random.choice(["Botox","Fillers","Laser Hair Removal","Hydrafacial","CoolSculpting"], p=[0.33,0.25,0.18,0.14,0.10])
        patients.append({
            "zip_code": z,
            "procedure_type": label,
            "revenue": round(revenue, 2),
            "consult_date": dt.date().isoformat()
        })

    patients_df = pd.DataFrame(patients)

    # build competitors csv from counts
    comps_rows = []
    for _, r in df.iterrows():
        for _ in range(int(r["competitors"])):
            comps_rows.append({"zip_code": r["zip"]})
    competitors_df = pd.DataFrame(comps_rows) if comps_rows else pd.DataFrame(columns=["zip_code"])

    oracle_zip_df = df[["zip","oracle_score","distance_miles","proximity","pressure","competitors"]].copy()
    oracle_zip_df = oracle_zip_df.rename(columns={"zip":"zip_code"})

    return patients_df, competitors_df, oracle_zip_df


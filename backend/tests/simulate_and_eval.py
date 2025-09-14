# backend/tests/simulate_and_eval.py
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import numpy as np
import pandas as pd

from services.simulation import simulate_dataset
from services.data_loaders import load_zip_demographics
from main import execute_advanced_analysis
from schemas import RunCreateRequest

BASE = os.path.dirname(__file__)
DATA = os.path.join(os.path.dirname(BASE), "data")
DEMO = os.path.join(DATA, "zip_demographics.sample.csv")

def precision_at_k(pred_df: pd.DataFrame, oracle_df: pd.DataFrame, k: int = 10) -> float:
    """
    pred_df: DataFrame with columns ["zip", "match_score"] sorted desc by match_score
    oracle_df: DataFrame with columns ["zip", "oracle_score"] sorted desc by oracle_score
    """
    k = min(k, len(pred_df))
    top_pred = set(pred_df.head(k)["zip"].astype(str))
    # oracle "top decile" (or at least 1 row)
    top_n_oracle = max(1, int(len(oracle_df) * 0.1))
    top_truth = set(oracle_df.head(top_n_oracle)["zip"].astype(str))
    denom = max(1, len(top_pred))
    return len(top_pred & top_truth) / denom

def main(n_patients=800, focus="non_inv", econ_index=1.0):
    demo_df = load_zip_demographics(DEMO)
    practice_zip = str(demo_df["zip"].iloc[0]).zfill(5)

    # 1) Simulate data
    patients_df, competitors_df, oracle_df = simulate_dataset(
        demo_df,
        practice_zip=practice_zip,
        n_patients=n_patients,
        econ_index=econ_index,
        seed=7
    )

    # save temp files to mimic the real flow
    tmp_dir = os.path.join(os.path.dirname(BASE), "uploads", "_synth")
    os.makedirs(tmp_dir, exist_ok=True)
    patients_path = os.path.join(tmp_dir, "patients.csv")
    comps_path = os.path.join(tmp_dir, "competitors.csv")
    patients_df.to_csv(patients_path, index=False)
    competitors_df.to_csv(comps_path, index=False)

    # 2) Run the pipeline (no HTTP)
    dataset = {
        "patients_path": patients_path,
        "competitors_path": comps_path,
        "practice_zip": practice_zip,
        "vertical": "medspa"
    }
    req = RunCreateRequest(dataset_id="synth", focus=focus, market_trend=1.0, capacity_per_week=None)
    result = execute_advanced_analysis(dataset, req)

    # predictions from top_segments (MVP returns top ~20)
    pred = pd.DataFrame([{"zip": s.zip, "match_score": s.match_score} for s in result.top_segments])
    if pred.empty:
        print("No predictions returned. Check pipeline.")
        return

    # merge with oracle
    oracle_ranked = oracle_df.rename(columns={"zip_code": "zip"})[["zip","oracle_score"]].copy()
    # rank sort copies
    pred_ranked = pred.sort_values("match_score", ascending=False).copy()
    oracle_ranked = oracle_ranked.sort_values("oracle_score", ascending=False).copy()

    merged = pred_ranked.merge(oracle_ranked, on="zip", how="left").dropna(subset=["oracle_score"])
    if merged.empty:
        print("No overlap between predicted zips and oracle – increase n_patients or widen top_n.")
        return

    # ensure numeric types
    merged["match_score"] = pd.to_numeric(merged["match_score"], errors="coerce")
    merged["oracle_score"] = pd.to_numeric(merged["oracle_score"], errors="coerce")
    merged = merged.dropna(subset=["match_score","oracle_score"])

    # 3) Metrics
    rho = merged["match_score"].corr(merged["oracle_score"], method="spearman")

    k_cap = min(10, len(pred_ranked))
    prec10 = precision_at_k(pred_ranked, oracle_ranked, k=k_cap)

    # Calibration by decile (guard against low unique counts)
    uniq = merged["match_score"].nunique()
    if uniq >= 3:
        bins = min(10, uniq)
        merged["bin"] = pd.qcut(merged["match_score"], q=bins, duplicates="drop")
        calib = merged.groupby("bin", observed=True)[["match_score", "oracle_score"]].mean().reset_index()
    else:
        calib = pd.DataFrame({
            "match_score": [merged["match_score"].mean()],
            "oracle_score": [merged["oracle_score"].mean()]
        })

    # Report
    print("\n=== Synthetic Accuracy Report ===")
    print(f"Patients: {len(patients_df)} | Focus: {focus} | Econ index: {econ_index}")
    print(f"Spearman rank correlation (pred vs oracle): {rho:.3f}")
    print(f"Precision@{k_cap} (overlap with oracle top decile): {prec10:.2f}")
    print("\nCalibration (by decile of predicted score):")
    print(calib.to_string(index=False))

    print("\nTop 5 by predicted score (with oracle):")
    print(merged.sort_values("match_score", ascending=False)[["zip","match_score","oracle_score"]].head(5).to_string(index=False))

    print("\nTip: Spearman ≥ 0.4 and Precision@10 ≥ 0.5 are solid for MVP on synthetic data.")

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--patients", type=int, default=800)
    p.add_argument("--focus", choices=["non_inv", "surgical"], default="non_inv")
    p.add_argument("--econ", type=float, default=1.0)
    args = p.parse_args()
    main(n_patients=args.patients, focus=args.focus, econ_index=args.econ)




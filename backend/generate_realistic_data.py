#!/usr/bin/env python3
import argparse, random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from math import radians, cos, sin, asin, sqrt

random.seed(7)
np.random.seed(7)

NON_INV = [
    ("Botox", 300, 600),
    ("Dermal Fillers", 500, 1200),
    ("Hydrafacial", 150, 300),
    ("CoolSculpting", 600, 1200),
    ("Laser Hair Removal", 200, 800),
    ("IPL Photofacial", 300, 600),
    ("Chemical Peel", 150, 400),
    ("Microneedling", 300, 600),
]

SURGICAL = [
    ("Facelift", 8000, 15000),
    ("Rhinoplasty", 6000, 12000),
    ("Breast Augmentation", 6500, 10000),
    ("Tummy Tuck", 7000, 12000),
    ("Liposuction", 4000, 8000),
    ("Blepharoplasty", 4000, 7000),
]

def haversine(lat1, lon1, lat2, lon2):
    R = 3956.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1,lon1,lat2,lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2*R*asin(sqrt(a))

def surgical_propensity(row, econ_index=1.0):
    inc      = np.tanh((row["median_income"] - 85_000) / 35_000)
    age      = (row["age_25_54_pct"] - 0.35) / 0.20
    owner    = (row["owner_occ_pct"] - 0.55) / 0.25
    density  = -np.tanh((row["density_per_sqmi"] - 15_000) / 15_000)
    college  = (row["college_pct"] - 0.6) / 0.25

    z = (0.90*inc + 0.45*age + 0.35*owner + 0.50*density + 0.20*college)
    base = 1 / (1 + np.exp(-z))
    base = np.clip(base * (0.85 + 0.30*(econ_index-1.0) + 1.0), 0.05, 0.75)
    return float(base)

def main(args):
    demo_path = args.demographics
    df = pd.read_csv(demo_path)
    df["zip"] = df["zip"].astype(str).str.zfill(5)

    p = df[df["zip"]==args.practice_zip]
    if p.empty:
        p_lat, p_lon = df["lat"].mean(), df["lon"].mean()
    else:
        p_lat, p_lon = float(p.iloc[0]["lat"]), float(p.iloc[0]["lon"])

    df["miles"] = df.apply(lambda r: haversine(p_lat, p_lon, r["lat"], r["lon"]), axis=1)
    w = np.where(df["miles"]<=10, 1.0, np.exp(-0.14*(df["miles"]-10)))
    pop = df["population"].clip(lower=5_000)
    df["sample_w"] = 0.3*w + 0.7*(pop / pop.max())  # Reduced distance weighting
    df["p_surg"] = df.apply(lambda r: surgical_propensity(r, econ_index=args.econ), axis=1)

    if args.focus == "surgical":
        df["p_surg"] = np.clip(df["p_surg"] + 0.08, 0.05, 0.85)
    else:
        df["p_surg"] = np.clip(df["p_surg"] - 0.05, 0.02, 0.75)

    zips = df["zip"].tolist()
    weights = (df["sample_w"] / df["sample_w"].sum()).values
    start_date = datetime(2024,1,1)

    rows = []
    for _ in range(args.rows):
        z = np.random.choice(zips, p=weights)
        row = df[df["zip"]==z].iloc[0]
        if np.random.rand() < row["p_surg"]:
            proc, lo, hi = random.choice(SURGICAL)
        else:
            proc, lo, hi = random.choice(NON_INV)
        
        # Add revenue variability
        rev = np.random.uniform(lo, hi)
        rev *= np.random.normal(1.0, 0.15)
        rev = max(rev, lo * 0.5)
        
        dt = start_date + timedelta(days=int(np.random.uniform(0, 180)))
        rows.append({
            "zip_code": z,
            "procedure_type": proc,
            "revenue": round(float(rev), 2),
            "consult_date": dt.date().isoformat()
        })

    patients = pd.DataFrame(rows)
    patients = patients.sample(frac=1, random_state=7).reset_index(drop=True)
    patients.to_csv(args.out_patients, index=False)

    # Generate competitors
    comp_rows = []
    for _, r in df.iterrows():
        n = int(np.clip((r["median_income"]-70_000)/25_000, 0, 4))
        for _ in range(n):
            comp_rows.append({"zip_code": r["zip"]})
    pd.DataFrame(comp_rows).to_csv(args.out_competitors, index=False)

    print(f"Wrote {len(patients)} rows to {args.out_patients}")
    print(f"Wrote {len(comp_rows)} rows to {args.out_competitors}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--demographics", default="data/zip_demographics.sample.csv")
    ap.add_argument("--rows", type=int, default=300)
    ap.add_argument("--practice-zip", default="10021")
    ap.add_argument("--focus", choices=["non_inv","surgical"], default="non_inv")
    ap.add_argument("--econ", type=float, default=1.0)
    ap.add_argument("--out-patients", default="patients_demo.csv")
    ap.add_argument("--out-competitors", default="competitors_demo.csv")
    args = ap.parse_args()
    main(args)
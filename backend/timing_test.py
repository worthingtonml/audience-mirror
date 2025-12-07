import time
import pandas as pd
from main import (
    validate_and_load_patients,
    normalize_patients_dataframe,
    load_vertical_config,
    build_market_zip_universe,
    ensure_zip_latlon,
    compute_accessibility_score,
    segment_patients_by_behavior,
    calculate_psychographic_scores
)

# Test with sample data
CSV_PATH = "sample_medspa_data_los_angeles.csv"
PRACTICE_ZIP = "90210"

def timed(label, fn):
    start = time.time()
    result = fn()
    print(f"{label}: {time.time() - start:.2f}s")
    return result

print("=== TIMING TEST ===\n")

# Step 1: Load & validate
_, _, df = timed("1. Load CSV", lambda: validate_and_load_patients(CSV_PATH))

# Step 2: Normalize
df = timed("2. Normalize", lambda: normalize_patients_dataframe(df))

# Step 3: Load config
config = timed("3. Vertical config", lambda: load_vertical_config("medspa"))

# Step 4: Build market universe
demo_df = timed("4. Build market ZIP universe", lambda: build_market_zip_universe(PRACTICE_ZIP, None, 50.0))

# Step 5: Ensure lat/lon
demo_df = timed("5. Ensure ZIP lat/lon", lambda: ensure_zip_latlon(demo_df, "zip", "US"))

# Step 6: Segment patients
df = timed("6. Segment patients", lambda: segment_patients_by_behavior(df))

print("\n=== DONE ===")

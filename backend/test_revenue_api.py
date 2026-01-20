#!/usr/bin/env python3
"""
Test script to check what revenue values are being returned by the API
"""
import requests
import json

API_URL = "http://localhost:8000"

# Get list of datasets
print("="*80)
print("STEP 1: Get latest dataset")
print("="*80)

datasets_response = requests.get(f"{API_URL}/api/v1/datasets")
if datasets_response.status_code != 200:
    print(f"❌ Failed to get datasets: {datasets_response.status_code}")
    exit(1)

datasets = datasets_response.json()
if not datasets:
    print("❌ No datasets found")
    exit(1)

# Get the most recent dataset
latest_dataset = datasets[0]
dataset_id = latest_dataset['dataset_id']
print(f"✅ Latest dataset: {dataset_id}")
print(f"   Uploaded: {latest_dataset.get('created_at', 'unknown')}")

# Get runs for this dataset
print("\n" + "="*80)
print("STEP 2: Get runs for this dataset")
print("="*80)

runs_response = requests.get(f"{API_URL}/api/v1/datasets/{dataset_id}/runs")
if runs_response.status_code != 200:
    print(f"❌ Failed to get runs: {runs_response.status_code}")
    exit(1)

runs = runs_response.json()
if not runs:
    print("❌ No runs found - need to create a run first")
    # Create a run
    print("\nCreating a new run...")
    run_data = {"dataset_id": dataset_id, "focus": "acquisition"}
    run_response = requests.post(f"{API_URL}/api/v1/runs", json=run_data)
    if run_response.status_code != 200:
        print(f"❌ Failed to create run: {run_response.status_code}")
        exit(1)
    run_id = run_response.json()['run_id']
    print(f"✅ Created run: {run_id}")
else:
    latest_run = runs[0]
    run_id = latest_run['run_id']
    print(f"✅ Latest run: {run_id}")

# Get the analysis data
print("\n" + "="*80)
print("STEP 3: Get analysis data")
print("="*80)

analysis_response = requests.get(f"{API_URL}/api/v1/runs/{run_id}/analysis")
if analysis_response.status_code != 200:
    print(f"❌ Failed to get analysis: {analysis_response.status_code}")
    print(analysis_response.text)
    exit(1)

analysis_data = analysis_response.json()

# Extract revenue fields
print("\n" + "="*80)
print("REVENUE VALUES IN API RESPONSE")
print("="*80)

revenue_fields = {
    'filtered_revenue': analysis_data.get('filtered_revenue'),
    'actual_total_revenue': analysis_data.get('actual_total_revenue'),
    'filtered_patient_count': analysis_data.get('filtered_patient_count'),
    'patient_count': analysis_data.get('patient_count'),
}

for field, value in revenue_fields.items():
    if value is not None:
        if 'revenue' in field:
            print(f"{field:30s}: ${value:,.0f}")
        else:
            print(f"{field:30s}: {value}")
    else:
        print(f"{field:30s}: None")

# Check segment data
if 'patient_segments' in analysis_data:
    print("\n" + "="*80)
    print("PATIENT SEGMENTS")
    print("="*80)

    segments = analysis_data['patient_segments']
    for seg_name, seg_data in segments.items():
        if isinstance(seg_data, dict) and 'count' in seg_data:
            revenue = seg_data.get('revenue', seg_data.get('avg_ltv', 0) * seg_data.get('count', 0))
            print(f"{seg_name:30s}: {seg_data['count']} patients, ${revenue:,.0f} revenue")

print("\n" + "="*80)
print("WHAT THE FRONTEND CALCULATES")
print("="*80)

# This is what the frontend does (line 840-843 in patient-insights.tsx)
totalRevenue = (
    revenue_fields.get('filtered_revenue') or
    revenue_fields.get('actual_total_revenue') or
    43000
)

print(f"Frontend totalRevenue calculation:")
print(f"  filtered_revenue: ${revenue_fields.get('filtered_revenue', 0):,.0f}")
print(f"  actual_total_revenue: ${revenue_fields.get('actual_total_revenue', 0):,.0f}")
print(f"  → Final totalRevenue: ${totalRevenue:,.0f}")

print("\n✅ This is the value you should see in the UI: ${:,.0f}".format(totalRevenue))

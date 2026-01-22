#!/usr/bin/env python3
"""
Upload test file with patient_id and trigger analysis to test:
1. Journey comparison (WHERE PATIENTS DROP OFF card)
2. Churn calculation with days_since_last_visit fix
"""
import requests
import time

API_URL = "http://localhost:8000"
TEST_FILE = "test_medspa_visits_with_patient_ids.csv"

print("="*80)
print("TESTING: Journey Comparison + Churn Fix")
print("="*80)

# Step 1: Upload dataset
print("\n1. Uploading test dataset with patient_id...")
with open(TEST_FILE, 'rb') as f:
    files = {'patients': (TEST_FILE, f, 'text/csv')}
    data = {'practice_zip': '90210'}
    response = requests.post(f"{API_URL}/api/v1/datasets", files=files, data=data)

if response.status_code != 200:
    print(f"❌ Upload failed: {response.status_code}")
    print(response.text)
    exit(1)

dataset = response.json()
dataset_id = dataset['dataset_id']
print(f"✅ Dataset uploaded: {dataset_id}")

# Step 2: Create analysis run
print("\n2. Creating analysis run...")
run_data = {"dataset_id": dataset_id, "focus": "retention"}
response = requests.post(f"{API_URL}/api/v1/runs", json=run_data)

if response.status_code != 200:
    print(f"❌ Run creation failed: {response.status_code}")
    print(response.text)
    exit(1)

run = response.json()
run_id = run['run_id']
print(f"✅ Run created: {run_id}")

# Step 3: Wait for analysis to complete
print("\n3. Waiting for analysis to complete...")
max_attempts = 30
for attempt in range(max_attempts):
    response = requests.get(f"{API_URL}/api/v1/runs/{run_id}")
    if response.status_code == 200:
        run_status = response.json()
        status = run_status.get('status')
        print(f"   Status: {status}")

        if status == 'done':
            print("✅ Analysis complete!")
            break
        elif status == 'failed':
            print(f"❌ Analysis failed: {run_status.get('error_message')}")
            exit(1)

    time.sleep(2)
else:
    print("❌ Timeout waiting for analysis")
    exit(1)

# Step 4: Get analysis results
print("\n4. Fetching analysis results...")
response = requests.get(f"{API_URL}/api/v1/runs/{run_id}/analysis")
if response.status_code != 200:
    print(f"❌ Failed to get analysis: {response.status_code}")
    exit(1)

analysis = response.json()

# Check for journey comparison
print("\n" + "="*80)
print("JOURNEY COMPARISON CHECK")
print("="*80)
if 'journeyComparison' in analysis and analysis['journeyComparison']:
    journey = analysis['journeyComparison']
    print("✅ Journey comparison exists!")
    print(f"   VIP retention: {journey.get('vip', {}).get('retention')}")
    print(f"   All retention: {journey.get('all', {}).get('retention')}")
    print(f"   VIP patients: {journey.get('vip', {}).get('patientCount')}")
    print(f"   All patients: {journey.get('all', {}).get('patientCount')}")
else:
    print("❌ Journey comparison missing!")
    print(f"   Available keys: {list(analysis.keys())}")

# Check for patient segments (one-and-done data)
print("\n" + "="*80)
print("PATIENT SEGMENTS CHECK")
print("="*80)
if 'patient_segments' in analysis:
    segments = analysis['patient_segments']
    one_and_done = segments.get('one_and_done', {})
    print(f"✅ One-and-done segment:")
    print(f"   Count: {one_and_done.get('count', 0)}")
    print(f"   Potential recovery: ${one_and_done.get('potential_recovery', 0):,}")
else:
    print("❌ Patient segments missing!")

# Step 5: Trigger churn analysis
print("\n" + "="*80)
print("CHURN ANALYSIS CHECK")
print("="*80)
print("5. Triggering churn analysis...")

form_data = {'run_id': run_id}
response = requests.post(f"{API_URL}/api/v1/segments/churn-analysis", data=form_data)

if response.status_code != 200:
    print(f"❌ Churn analysis failed: {response.status_code}")
    print(response.text)
else:
    churn = response.json()
    print("✅ Churn analysis complete!")
    print(f"   At risk percent: {churn.get('at_risk_percent')}%")
    print(f"   Total patients: {churn.get('total_patients')}")
    print(f"   Critical: {churn.get('critical_count')}")
    print(f"   High: {churn.get('high_count')}")
    print(f"   Medium: {churn.get('medium_count')}")
    print(f"   Low: {churn.get('low_count')}")
    print(f"   On schedule: {churn.get('on_schedule_count')}")

print("\n" + "="*80)
print("CHECK SERVER LOGS FOR [CHURN DEBUG] AND [JOURNEY] MESSAGES")
print("="*80)

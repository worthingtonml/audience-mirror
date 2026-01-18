#!/usr/bin/env python3
"""
Test script to simulate frontend API calls and show actual responses
"""
import requests
import json
import os

API_URL = "http://localhost:8000"

# Step 1: Upload a dataset
print("=" * 80)
print("STEP 1: Uploading test dataset")
print("=" * 80)

# Find a CSV file to test with
test_csv = None
for f in os.listdir('.'):
    if f.endswith('.csv') and 'patient' in f.lower():
        test_csv = f
        break

if not test_csv:
    print("❌ No patient CSV file found in current directory")
    print("Please provide path to your test CSV:")
    test_csv = input().strip()

if not os.path.exists(test_csv):
    print(f"❌ File not found: {test_csv}")
    exit(1)

with open(test_csv, 'rb') as f:
    files = {'patients': f}
    data = {'practice_zip': '90210', 'vertical': 'medspa'}

    response = requests.post(f"{API_URL}/api/v1/datasets", files=files, data=data)

    if response.status_code != 200:
        print(f"❌ Dataset upload failed: {response.status_code}")
        print(response.text)
        exit(1)

    dataset_response = response.json()
    print(f"✅ Dataset uploaded successfully")
    print(f"Dataset ID: {dataset_response['dataset_id']}")
    dataset_id = dataset_response['dataset_id']

# Step 2: Create a run
print("\n" + "=" * 80)
print("STEP 2: Creating analysis run")
print("=" * 80)

run_data = {
    "dataset_id": dataset_id,
    "focus": "acquisition"
}

response = requests.post(f"{API_URL}/api/v1/runs", json=run_data)

if response.status_code != 200:
    print(f"❌ Run creation failed: {response.status_code}")
    print(response.text)
    exit(1)

run_response = response.json()
print(f"✅ Run created successfully")
print(f"Run ID: {run_response['run_id']}")
run_id = run_response['run_id']

# Step 3: Get patient intel
print("\n" + "=" * 80)
print("STEP 3: Fetching patient intel data")
print("=" * 80)

response = requests.get(f"{API_URL}/api/v1/patient-intel/{dataset_id}")

if response.status_code != 200:
    print(f"❌ Patient intel fetch failed: {response.status_code}")
    print(response.text)
    exit(1)

intel_data = response.json()

print("\n" + "🔍 PATIENT INTEL API RESPONSE:")
print("=" * 80)
print(json.dumps(intel_data, indent=2))

# Check for the 3 features
print("\n" + "=" * 80)
print("FEATURE CHECK:")
print("=" * 80)

has_provider_risk = 'providerRisk' in intel_data
has_service_rebooking = 'serviceRebooking' in intel_data
has_gateway_services = 'gatewayServices' in intel_data

print(f"✓ providerRisk:     {'✅ PRESENT' if has_provider_risk else '❌ MISSING'}")
if has_provider_risk:
    print(f"  → {json.dumps(intel_data['providerRisk'], indent=4)}")

print(f"\n✓ serviceRebooking: {'✅ PRESENT' if has_service_rebooking else '❌ MISSING'}")
if has_service_rebooking:
    print(f"  → {json.dumps(intel_data['serviceRebooking'], indent=4)}")

print(f"\n✓ gatewayServices:  {'✅ PRESENT' if has_gateway_services else '❌ MISSING'}")
if has_gateway_services:
    print(f"  → {json.dumps(intel_data['gatewayServices'], indent=4)}")

if not (has_provider_risk or has_service_rebooking or has_gateway_services):
    print("\n❌ NONE OF THE 3 FEATURES ARE IN THE API RESPONSE")
    print("This means the backend is NOT calculating them.")
else:
    print(f"\n✅ Found {sum([has_provider_risk, has_service_rebooking, has_gateway_services])}/3 features")

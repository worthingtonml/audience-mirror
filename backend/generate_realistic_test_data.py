#!/usr/bin/env python3
"""
Generate realistic medspa visit-level test data with patient IDs
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

# Define treatments with typical prices
TREATMENTS = {
    'Botox': {'price': 450, 'rebooking_days': 120},
    'Filler': {'price': 650, 'rebooking_days': 180},
    'Laser': {'price': 800, 'rebooking_days': 60},
    'CoolSculpting': {'price': 2500, 'rebooking_days': 90},
    'Facial': {'price': 200, 'rebooking_days': 45},
}

# ZIP codes
ZIPS = ['10021', '10065', '11030', '11566', '11743', '10704', '11801', '11234', '10453', '10805', '11385', '10022', '10583', '10804', '11706']

# Generate patient cohorts
patients = []
visits = []

patient_id = 1
start_date = datetime(2023, 1, 1)

# Cohort 1: VIP Regulars (5 patients, 4-6 visits each)
print("Generating VIP regulars...")
for i in range(5):
    pid = f"P{patient_id:03d}"
    zip_code = np.random.choice(ZIPS[:5])  # Higher-income ZIPs
    first_visit = start_date + timedelta(days=np.random.randint(0, 60))

    # VIPs get 4-6 treatments
    num_visits = np.random.randint(4, 7)
    visit_date = first_visit

    for v in range(num_visits):
        treatment = np.random.choice(list(TREATMENTS.keys()), p=[0.3, 0.3, 0.2, 0.15, 0.05])
        price = TREATMENTS[treatment]['price']
        rebooking = TREATMENTS[treatment]['rebooking_days']

        # Add some price variation
        price = int(price * np.random.uniform(0.9, 1.1))

        visits.append({
            'patient_id': pid,
            'visit_date': visit_date.strftime('%Y-%m-%d'),
            'treatment': treatment,
            'revenue': price,
            'zip_code': zip_code
        })

        # Next visit after typical rebooking window (± 30 days)
        visit_date += timedelta(days=int(rebooking * np.random.uniform(0.8, 1.2)))

    patient_id += 1

# Cohort 2: Regular Visitors (7 patients, 2-3 visits each)
print("Generating regular visitors...")
for i in range(7):
    pid = f"P{patient_id:03d}"
    zip_code = np.random.choice(ZIPS)
    first_visit = start_date + timedelta(days=np.random.randint(0, 90))

    num_visits = np.random.randint(2, 4)
    visit_date = first_visit

    for v in range(num_visits):
        treatment = np.random.choice(list(TREATMENTS.keys()), p=[0.4, 0.2, 0.2, 0.1, 0.1])
        price = TREATMENTS[treatment]['price']
        rebooking = TREATMENTS[treatment]['rebooking_days']
        price = int(price * np.random.uniform(0.9, 1.1))

        visits.append({
            'patient_id': pid,
            'visit_date': visit_date.strftime('%Y-%m-%d'),
            'treatment': treatment,
            'revenue': price,
            'zip_code': zip_code
        })

        visit_date += timedelta(days=int(rebooking * np.random.uniform(0.9, 1.5)))

    patient_id += 1

# Cohort 3: One-and-Done (8 patients, 1 visit each)
print("Generating one-and-done patients...")
for i in range(8):
    pid = f"P{patient_id:03d}"
    zip_code = np.random.choice(ZIPS)
    first_visit = start_date + timedelta(days=np.random.randint(0, 180))

    treatment = np.random.choice(list(TREATMENTS.keys()), p=[0.3, 0.1, 0.1, 0.05, 0.45])  # More facials
    price = TREATMENTS[treatment]['price']
    price = int(price * np.random.uniform(0.9, 1.1))

    visits.append({
        'patient_id': pid,
        'visit_date': first_visit.strftime('%Y-%m-%d'),
        'treatment': treatment,
        'revenue': price,
        'zip_code': zip_code
    })

    patient_id += 1

# Create DataFrame
df = pd.DataFrame(visits)
df = df.sort_values(['patient_id', 'visit_date'])

print("\n" + "="*80)
print("DATASET SUMMARY")
print("="*80)
print(f"Total patients: {df['patient_id'].nunique()}")
print(f"Total visits: {len(df)}")
print(f"Total revenue: ${df['revenue'].sum():,.0f}")
print(f"Average revenue per patient: ${df.groupby('patient_id')['revenue'].sum().mean():,.0f}")
print(f"Average visits per patient: {len(df) / df['patient_id'].nunique():.1f}")

# Show patient distribution
visit_counts = df.groupby('patient_id').size().value_counts().sort_index()
print(f"\nVisit distribution:")
for visits, count in visit_counts.items():
    print(f"  {visits} visit(s): {count} patients")

# Save to CSV
output_file = 'test_medspa_visits_with_patient_ids.csv'
df.to_csv(output_file, index=False)
print(f"\n✅ Saved to {output_file}")
print(f"\nFirst 10 rows:")
print(df.head(10))

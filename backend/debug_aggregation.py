#!/usr/bin/env python3
"""
Debug script to trace revenue aggregation and patient segmentation
"""
import pandas as pd
import numpy as np
from main import aggregate_visits_to_patients

# Load test data
print("="*80)
print("LOADING TEST DATA")
print("="*80)
df = pd.read_csv('visit_level_test_data.csv')
print(f"Loaded {len(df)} rows")
print(f"Columns: {df.columns.tolist()}")
print(f"\nFirst 5 rows:")
print(df.head())

# Check patient counts
print(f"\nUnique patients: {df['patient_id'].nunique()}")
print(f"Total visits: {len(df)}")
print(f"Total revenue: ${df['revenue'].sum():,.0f}")

# Test aggregation
print("\n" + "="*80)
print("TESTING AGGREGATION")
print("="*80)
aggregated = aggregate_visits_to_patients(df)
print(f"\nAggregated to {len(aggregated)} rows")
print(f"Columns: {aggregated.columns.tolist()}")

if 'revenue' in aggregated.columns:
    print(f"\nTotal revenue after aggregation: ${aggregated['revenue'].sum():,.0f}")
    print(f"Average revenue per patient: ${aggregated['revenue'].mean():,.0f}")
    print(f"Min revenue: ${aggregated['revenue'].min():,.0f}")
    print(f"Max revenue: ${aggregated['revenue'].max():,.0f}")

    print(f"\nTop 5 patients by revenue:")
    top_5 = aggregated.nlargest(5, 'revenue')[['patient_id', 'revenue', 'visit_count']]
    print(top_5)

if 'visit_count' in aggregated.columns:
    print(f"\nTotal visits tracked: {aggregated['visit_count'].sum()}")
    print(f"Average visits per patient: {aggregated['visit_count'].mean():.1f}")

# Check for patient segmentation logic
print("\n" + "="*80)
print("CHECKING PATIENT SEGMENTATION")
print("="*80)

# Calculate VIP threshold (top 20%)
if 'revenue' in aggregated.columns:
    vip_threshold = aggregated['revenue'].quantile(0.80)
    print(f"VIP threshold (80th percentile): ${vip_threshold:,.0f}")

    vips = aggregated[aggregated['revenue'] >= vip_threshold]
    print(f"VIPs: {len(vips)} patients")
    print(f"VIP average revenue: ${vips['revenue'].mean():,.0f}")

    non_vips = aggregated[aggregated['revenue'] < vip_threshold]
    print(f"Non-VIPs: {len(non_vips)} patients")
    print(f"Non-VIP average revenue: ${non_vips['revenue'].mean():,.0f}")

# Check for lapsed regulars (2+ visits, no recent visit)
if 'visit_count' in aggregated.columns and 'last_visit' in aggregated.columns:
    regulars = aggregated[aggregated['visit_count'] >= 2]
    print(f"\nRegulars (2+ visits): {len(regulars)} patients")

    # Convert last_visit to datetime
    aggregated['last_visit'] = pd.to_datetime(aggregated['last_visit'])
    days_since = (pd.Timestamp.now() - aggregated['last_visit']).dt.days
    aggregated['days_since_last'] = days_since

    lapsed = aggregated[(aggregated['visit_count'] >= 2) & (aggregated['days_since_last'] > 90)]
    print(f"Lapsed regulars (90+ days): {len(lapsed)} patients")

    if len(lapsed) > 0:
        print(f"\nLapsed regulars sample:")
        print(lapsed[['patient_id', 'revenue', 'visit_count', 'days_since_last']].head())

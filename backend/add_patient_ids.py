#!/usr/bin/env python3
"""
Add patient_id column to existing visit-level CSV data.

This script intelligently assigns patient IDs by grouping visits from the same
ZIP code that occur close together in time, simulating real patient behavior.
"""
import pandas as pd
import sys

def add_patient_ids(input_file, output_file):
    """
    Add patient_id column to visit data.

    Strategy:
    - Group visits by ZIP code
    - Within each ZIP, assign patient IDs based on temporal proximity
    - Patients typically visit every 30-120 days
    - Create realistic visit patterns (some one-time, some regular)
    """
    print(f"Reading {input_file}...")
    df = pd.read_csv(input_file)

    # Rename consult_date to visit_date for consistency
    if 'consult_date' in df.columns:
        df.rename(columns={'consult_date': 'visit_date'}, inplace=True)

    # Rename procedure_type to treatment for consistency
    if 'procedure_type' in df.columns:
        df.rename(columns={'procedure_type': 'treatment'}, inplace=True)

    # Convert to datetime
    df['visit_date'] = pd.to_datetime(df['visit_date'])
    df = df.sort_values(['zip_code', 'visit_date'])

    # Assign patient IDs
    patient_id = 1
    df['patient_id'] = None

    for zip_code in df['zip_code'].unique():
        zip_visits = df[df['zip_code'] == zip_code].index

        # Strategy: group visits within 120 days as same patient
        # But also create some one-time patients
        i = 0
        while i < len(zip_visits):
            idx = zip_visits[i]
            current_date = df.loc[idx, 'visit_date']

            # Assign patient ID
            df.loc[idx, 'patient_id'] = f'P{patient_id:03d}'

            # Check if next visit(s) in this ZIP could be same patient
            j = i + 1
            visit_count = 1

            # 60% chance patient returns (creates mix of one-time and repeat)
            import random
            will_return = random.random() < 0.6

            if will_return:
                while j < len(zip_visits) and visit_count < 5:  # Max 5 visits per patient
                    next_idx = zip_visits[j]
                    next_date = df.loc[next_idx, 'visit_date']
                    days_diff = (next_date - current_date).days

                    # If within 120 days, could be same patient
                    if days_diff <= 120 and random.random() < 0.7:
                        df.loc[next_idx, 'patient_id'] = f'P{patient_id:03d}'
                        current_date = next_date
                        visit_count += 1
                        j += 1
                    else:
                        break

            patient_id += 1
            i = j if will_return and j > i else i + 1

    # Reorder columns: patient_id first
    cols = ['patient_id'] + [c for c in df.columns if c != 'patient_id']
    df = df[cols]

    # Stats
    total_visits = len(df)
    unique_patients = df['patient_id'].nunique()
    avg_visits = total_visits / unique_patients

    print(f"\n✅ Processed {total_visits} visits")
    print(f"   Created {unique_patients} unique patients")
    print(f"   Average visits per patient: {avg_visits:.1f}")

    # Show visit distribution
    visit_counts = df.groupby('patient_id').size()
    print(f"\n   Visit distribution:")
    print(f"   1 visit: {(visit_counts == 1).sum()} patients ({(visit_counts == 1).sum() / unique_patients * 100:.0f}%)")
    print(f"   2 visits: {(visit_counts == 2).sum()} patients ({(visit_counts == 2).sum() / unique_patients * 100:.0f}%)")
    print(f"   3+ visits: {(visit_counts >= 3).sum()} patients ({(visit_counts >= 3).sum() / unique_patients * 100:.0f}%)")

    # Save
    print(f"\n💾 Saving to {output_file}...")
    df.to_csv(output_file, index=False)
    print(f"✅ Done! Your data is ready with patient_id column.")

    return df


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python add_patient_ids.py <input_csv> [output_csv]")
        print("\nExample:")
        print("  python add_patient_ids.py synthetic_medspa_patients.csv patients_with_ids.csv")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.csv', '_with_ids.csv')

    add_patient_ids(input_file, output_file)

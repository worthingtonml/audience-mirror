"""
Patient Journey Analysis for Audience Mirror
Calculates retention funnels and service progression paths
"""

import pandas as pd
import numpy as np
from collections import defaultdict


def analyze_patient_journey(df, vip_patient_ids=None, min_patients=20, min_vips=3):
    """
    Analyze patient journey comparing VIPs vs all patients.

    Args:
        df: Visit-level dataframe (one row per visit)
        vip_patient_ids: Set of VIP patient IDs (top 20% by revenue)
        min_patients: Minimum total patients to show (default 20)
        min_vips: Minimum VIP patients to show (default 3)

    Returns:
        dict with journey comparison data, or None if insufficient data
    """

    # Find required columns
    patient_id_col = next((c for c in ['patient_id'] if c in df.columns), None)
    date_col = next((c for c in ['visit_date', 'date', 'appointment_date'] if c in df.columns), None)
    treatment_col = next((c for c in ['treatment', 'procedure', 'service', 'procedure_type'] if c in df.columns), None)

    if not all([patient_id_col, date_col]):
        return None

    # Clean data
    df = df[[patient_id_col, date_col] + ([treatment_col] if treatment_col else [])].copy()
    df = df[df[patient_id_col].notna()].copy()
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df = df[df[date_col].notna()]

    if len(df) == 0:
        return None

    # Sort by patient and date
    df = df.sort_values([patient_id_col, date_col])

    # Get unique patient counts
    total_patient_count = df[patient_id_col].nunique()
    vip_count = len(vip_patient_ids) if vip_patient_ids else 0

    print(f"[JOURNEY DEBUG] Total patients: {total_patient_count}, VIP count: {vip_count}, Min patients: {min_patients}, Min VIPs: {min_vips}")

    # Check minimum thresholds
    if total_patient_count < min_patients or vip_count < min_vips:
        print(f"[JOURNEY DEBUG] Insufficient data: need {min_patients} patients (have {total_patient_count}) and {min_vips} VIPs (have {vip_count})")
        return None

    # Calculate VIP retention
    vip_retention, vip_avg_days = calculate_visit_retention(df, vip_patient_ids, patient_id_col, date_col)

    # Calculate all patients retention
    all_patient_ids = set(df[patient_id_col].unique())
    all_retention, all_avg_days = calculate_visit_retention(df, all_patient_ids, patient_id_col, date_col)

    # Check for meaningful difference (>15% gap at any stage)
    retention_gaps = [vip_retention[i] - all_retention[i] for i in range(len(vip_retention))]
    max_gap_idx = np.argmax(retention_gaps)
    max_gap = retention_gaps[max_gap_idx]

    print(f"[JOURNEY DEBUG] Retention gaps: {retention_gaps}, Max gap: {max_gap}% at stage {max_gap_idx}")

    if max_gap < 15:
        print(f"[JOURNEY DEBUG] Gap too small ({max_gap}%), need at least 15%")
        return None  # Not meaningful enough difference

    # Calculate service paths if treatment column exists
    vip_service_path = None
    all_service_path = None

    if treatment_col:
        vip_service_path = calculate_service_path(df, vip_patient_ids, patient_id_col, date_col, treatment_col)
        all_service_path = calculate_service_path(df, all_patient_ids, patient_id_col, date_col, treatment_col)

    # Determine biggest drop-off
    stage_names = ['Visit 1 → 2', 'Visit 2 → 3', 'Visit 3 → 4+']
    biggest_drop_off = {
        'stage': stage_names[max_gap_idx] if max_gap_idx < len(stage_names) else 'Visit 1 → 2',
        'vipRate': int(vip_retention[max_gap_idx + 1]) if max_gap_idx + 1 < len(vip_retention) else int(vip_retention[1]),
        'allRate': int(all_retention[max_gap_idx + 1]) if max_gap_idx + 1 < len(all_retention) else int(all_retention[1]),
        'gap': int(max_gap)
    }

    return {
        'vip': {
            'retention': [int(r) for r in vip_retention],
            'avgDaysToV2': int(vip_avg_days) if pd.notna(vip_avg_days) else None,
            'patientCount': vip_count,
            'servicePath': vip_service_path
        },
        'all': {
            'retention': [int(r) for r in all_retention],
            'avgDaysToV2': int(all_avg_days) if pd.notna(all_avg_days) else None,
            'patientCount': total_patient_count,
            'servicePath': all_service_path
        },
        'biggestDropOff': biggest_drop_off
    }


def calculate_visit_retention(df, patient_ids, patient_id_col, date_col):
    """
    Calculate retention percentages at each visit milestone.

    Returns:
        tuple: (retention_list, avg_days_to_v2)
    """

    # Filter to specific patients
    patient_df = df[df[patient_id_col].isin(patient_ids)].copy()

    if len(patient_df) == 0:
        return [100, 0, 0, 0], 0

    total_patients = len(patient_ids)

    # Count visits per patient
    visit_counts = patient_df.groupby(patient_id_col).size()

    # Calculate retention at each milestone
    retention = [
        100,  # Visit 1 (always 100%)
        round((visit_counts >= 2).sum() / total_patients * 100, 1),
        round((visit_counts >= 3).sum() / total_patients * 100, 1),
        round((visit_counts >= 4).sum() / total_patients * 100, 1)
    ]

    # Calculate average days between first and second visit
    patient_df = patient_df.sort_values([patient_id_col, date_col])

    days_to_v2_list = []
    for patient_id, visits in patient_df.groupby(patient_id_col):
        if len(visits) >= 2:
            visits_sorted = visits.sort_values(date_col)
            first_visit = visits_sorted.iloc[0][date_col]
            second_visit = visits_sorted.iloc[1][date_col]
            days_diff = (second_visit - first_visit).days
            if days_diff > 0:
                days_to_v2_list.append(days_diff)

    avg_days_to_v2 = np.mean(days_to_v2_list) if days_to_v2_list else 0

    return retention, avg_days_to_v2


def calculate_service_path(df, patient_ids, patient_id_col, date_col, treatment_col):
    """
    Calculate most common service progression path.

    Returns:
        list of service names in order
    """

    # Filter to specific patients
    patient_df = df[df[patient_id_col].isin(patient_ids)].copy()
    patient_df = patient_df[patient_df[treatment_col].notna()].copy()

    if len(patient_df) == 0:
        return None

    # Sort by patient and date
    patient_df = patient_df.sort_values([patient_id_col, date_col])

    # Get first, second, third services (most common)
    first_services = []
    second_services = []
    third_services = []

    for patient_id, visits in patient_df.groupby(patient_id_col):
        visits_sorted = visits.sort_values(date_col)
        services = visits_sorted[treatment_col].astype(str).str.strip().tolist()

        if len(services) >= 1:
            first_services.append(services[0])
        if len(services) >= 2:
            second_services.append(services[1])
        if len(services) >= 3:
            third_services.append(services[2])

    # Find most common at each position
    path = []

    if first_services:
        most_common_first = pd.Series(first_services).mode()
        if len(most_common_first) > 0:
            path.append(most_common_first[0])

    if second_services:
        most_common_second = pd.Series(second_services).mode()
        if len(most_common_second) > 0:
            path.append(most_common_second[0])

    if third_services:
        most_common_third = pd.Series(third_services).mode()
        if len(most_common_third) > 0:
            path.append(most_common_third[0])

    return path if path else None

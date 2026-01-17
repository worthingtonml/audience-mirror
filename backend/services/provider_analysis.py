"""
Provider Concentration Analysis for Audience Mirror
Identifies key person risk when revenue is concentrated with specific providers
"""

import pandas as pd
from collections import defaultdict


def analyze_provider_concentration(df, vip_patients=None, min_risk_threshold=50):
    """
    Analyze revenue concentration by provider/injector.

    Args:
        df: Patient dataframe (one row per patient or visit)
        vip_patients: Set of VIP patient IDs (optional, to check VIP concentration)
        min_risk_threshold: % threshold to flag as high risk (default 50%)

    Returns:
        dict with provider metrics, or None if no provider data exists
    """

    # Find provider column (prioritize most common naming conventions)
    provider_col = next((c for c in ['provider', 'injector', 'practitioner', 'staff', 'employee']
                        if c in df.columns), None)

    if not provider_col:
        return None

    # Find essential columns
    patient_id_col = 'patient_id' if 'patient_id' in df.columns else None
    revenue_col = next((c for c in ['revenue', 'amount', 'total'] if c in df.columns), None)

    if not revenue_col:
        return None

    # Clean provider names and filter out nulls
    df_clean = df[df[provider_col].notna()].copy()
    df_clean[provider_col] = df_clean[provider_col].astype(str).str.strip()

    if len(df_clean) == 0:
        return None

    # Calculate revenue per provider
    provider_revenue = defaultdict(float)
    provider_patients = defaultdict(set)
    provider_vip_patients = defaultdict(set)

    for _, row in df_clean.iterrows():
        provider = row[provider_col]
        rev = float(row[revenue_col]) if pd.notna(row[revenue_col]) else 0
        patient_id = row.get(patient_id_col) if patient_id_col else None

        provider_revenue[provider] += rev

        if patient_id:
            provider_patients[provider].add(patient_id)

            # Track VIP concentration
            if vip_patients and patient_id in vip_patients:
                provider_vip_patients[provider].add(patient_id)

    # Calculate total revenue
    total_revenue = sum(provider_revenue.values())

    if total_revenue == 0:
        return None

    # Build provider stats
    providers = []
    for provider, rev in sorted(provider_revenue.items(), key=lambda x: x[1], reverse=True):
        revenue_pct = (rev / total_revenue * 100) if total_revenue > 0 else 0
        patient_count = len(provider_patients[provider])
        vip_count = len(provider_vip_patients[provider])

        providers.append({
            'name': provider,
            'revenue': int(rev),
            'revenue_pct': round(revenue_pct, 1),
            'patient_count': patient_count,
            'vip_count': vip_count,
            'avg_revenue_per_patient': int(rev / patient_count) if patient_count > 0 else 0
        })

    # Check if we have concentration risk
    top_provider = providers[0] if providers else None
    has_risk = top_provider and top_provider['revenue_pct'] >= min_risk_threshold

    # Calculate VIP concentration if applicable
    vip_concentration = None
    if vip_patients and top_provider and top_provider['vip_count'] > 0:
        total_vips = len(vip_patients)
        vip_pct = (top_provider['vip_count'] / total_vips * 100) if total_vips > 0 else 0

        if vip_pct >= min_risk_threshold:
            vip_concentration = {
                'provider': top_provider['name'],
                'vip_count': top_provider['vip_count'],
                'vip_pct': round(vip_pct, 1),
                'total_vips': total_vips
            }

    return {
        'has_provider_data': True,
        'total_providers': len(providers),
        'providers': providers,
        'top_provider': top_provider,
        'has_concentration_risk': has_risk,
        'vip_concentration': vip_concentration,
        'risk_threshold': min_risk_threshold
    }

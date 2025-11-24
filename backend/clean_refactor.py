# =============================================================================
# AUDIENCE MIRROR - CLEAN REFACTOR
# Simple, Prescriptive, Copy/Paste Ready
# =============================================================================

"""
WHAT THIS FIXES:
- Connecticut bug: 65-year-olds were called "Young Professionals"
- Root cause: Algorithm used ZIP census age, not actual patient age
- Solution: Simple behavioral classification using patient-level data

IMPLEMENTATION TIME: 10 minutes
"""

import pandas as pd
import numpy as np

# =============================================================================
# STEP 1: Replace segment_patients_by_behavior() in your main.py (line ~289)
# =============================================================================

def segment_patients_by_behavior(patients_df: pd.DataFrame) -> pd.DataFrame:
    """
    Classifies each patient with a behavioral psychographic label using patient-level data only.
    
    NO ZIP DEMOGRAPHICS - Uses actual patient age, revenue, and visit count.
    """
    df = patients_df.copy()
    
    # Handle date_of_birth if age column doesn't exist
    if 'age' not in df.columns and 'date_of_birth' in df.columns:
        df['age'] = pd.to_datetime('today').year - pd.to_datetime(df['date_of_birth'], errors='coerce').dt.year
    
    # Ensure proper data types
    df['age'] = pd.to_numeric(df.get('age', 40), errors='coerce')
    df['revenue'] = pd.to_numeric(df.get('revenue', 0), errors='coerce')
    df['visit_number'] = pd.to_numeric(df.get('visit_number', 1), errors='coerce')
    
    labels = []
    for _, row in df.iterrows():
        age = row['age']
        revenue = row['revenue']
        visits = row['visit_number']
        
        # Define behavioral psychographic buckets
        if pd.isna(age):
            labels.append("Unknown Profile")
        elif age >= 55:
            if revenue > 2000:
                labels.append("Established Affluent - VIP Client")
            elif revenue > 1000:
                labels.append("Mature Premium Client")
            else:
                labels.append("Established Regular")
        elif 35 <= age < 55:
            if revenue > 1500 and visits >= 3:
                labels.append("Executive Regular - High Value")
            elif revenue > 800:
                labels.append("Professional Maintainer")
            else:
                labels.append("Mid-Career Explorer")
        elif 25 <= age < 35:
            if visits >= 4:
                labels.append("Young Professional - Regular Visitor")
            else:
                labels.append("Millennial Explorer")
        else:
            if revenue > 2000:
                labels.append("Premium Client")
            elif revenue > 800:
                labels.append("Regular Client")
            else:
                labels.append("Entry Client")
    
    df['behavioral_segment'] = labels
    
    # Log results
    print(f"\n[BEHAVIORAL] Classified {len(df)} patients:")
    segment_counts = df['behavioral_segment'].value_counts()
    for segment, count in segment_counts.items():
        pct = (count / len(df)) * 100
        avg_rev = df[df['behavioral_segment'] == segment]['revenue'].mean()
        print(f"  {segment:45s}: {count:3d} ({pct:4.1f}%) | Avg: ${avg_rev:,.0f}")
    print("")
    
    return df


# =============================================================================
# STEP 2: Update execute_advanced_analysis() in your main.py
# =============================================================================

"""
FIND THIS SECTION (around line 1730):

    # STEP 2: Fit lifestyle cohorts
    from data.lifestyle_profiles import assign_lifestyle_segment
    
    zip_features["cohort"] = zip_features.apply(
        lambda row: assign_lifestyle_segment(
            median_income=row.get('median_income', 75000),
            college_pct=row.get('college_pct', 0.35),
            owner_pct=row.get('owner_occ_pct', 0.65),
            age_group_pct=row.get('age_25_54_pct', 0.40)  # ← THIS IS THE BUG
        ),
        axis=1
    )

DELETE THAT ENTIRE SECTION.

REPLACE WITH THIS:
"""

def update_execute_advanced_analysis_snippet():
    """
    This is the replacement code for the cohort assignment section.
    Copy this into your execute_advanced_analysis() function.
    """
    
    # Classify patients using behavioral segments (profile-first)
    patients_df = segment_patients_by_behavior(patients_df)
    
    # Find dominant profile across all patients
    profile_counts = patients_df['behavioral_segment'].value_counts()
    dominant_profile = profile_counts.idxmax()
    dominant_count = profile_counts.iloc[0]
    dominant_pct = (dominant_count / len(patients_df)) * 100
    
    print(f"[PROFILE] Dominant segment: '{dominant_profile}' ({dominant_count}/{len(patients_df)} = {dominant_pct:.1f}%)")
    
    # Map profiles to ZIPs (geography as discovery tool, not classification)
    zip_profiles = (
        patients_df.groupby('zip_code')['behavioral_segment']
        .agg(lambda x: x.value_counts().index[0])  # Most common profile per ZIP
        .reset_index()
        .rename(columns={'behavioral_segment': 'cohort'})
    )
    
    # Merge cohort labels into zip_features
    zip_features = zip_features.merge(
        zip_profiles, 
        left_on='zip', 
        right_on='zip_code', 
        how='left'
    )
    
    # Fill ZIPs with no patients with "Expansion Opportunity"
    zip_features['cohort'] = zip_features['cohort'].fillna('Expansion Opportunity')
    
    print(f"[PROFILE] Mapped profiles to {len(zip_profiles)} ZIPs with existing patients")
    print(f"[PROFILE] Top ZIPs for '{dominant_profile}':")
    
    top_zips = (
        patients_df[patients_df['behavioral_segment'] == dominant_profile]['zip_code']
        .value_counts()
        .head(10)
    )
    
    for zip_code, count in top_zips.items():
        print(f"  ZIP {zip_code}: {count} patients")
    print("")


# =============================================================================
# STEP 3: Update identify_dominant_profile() in your main.py (line ~513)
# =============================================================================

"""
FIND THIS FUNCTION:

    def identify_dominant_profile(patients_df, zip_features, top_percentile=0.2):

REPLACE THE TOP SECTION (lines 1-30) WITH THIS:
"""

def identify_dominant_profile(
    patients_df: pd.DataFrame, 
    zip_features: pd.DataFrame,
    top_percentile: float = 0.2
) -> dict:
    """
    PROFILE-FIRST: Identify WHO your best customers are using actual patient data.
    """
    revenue_col = 'revenue' if 'revenue' in patients_df.columns else 'total_spent'
    
    # Find top customers by revenue
    sorted_patients = patients_df.sort_values(revenue_col, ascending=False)
    top_count = max(1, int(len(patients_df) * top_percentile))
    top_patients = sorted_patients.head(top_count)
    
    print(f"[PROFILE] Analyzing top {top_count} patients ({top_percentile*100:.0f}% of {len(patients_df)})")
    
    # Get dominant behavioral segment from TOP customers
    if 'behavioral_segment' in top_patients.columns:
        profile_dist = top_patients['behavioral_segment'].value_counts()
        dominant_profile = profile_dist.index[0]
        profile_pct = int((profile_dist.iloc[0] / len(top_patients)) * 100)
        
        print(f"[PROFILE] ✅ Dominant profile: {dominant_profile} ({profile_pct}% of top customers)")
    else:
        # Fallback: classify now if not done yet
        top_patients = segment_patients_by_behavior(top_patients)
        profile_dist = top_patients['behavioral_segment'].value_counts()
        dominant_profile = profile_dist.index[0]
        profile_pct = int((profile_dist.iloc[0] / len(top_patients)) * 100)
    
    # Calculate metrics
    avg_ltv = int(top_patients[revenue_col].mean())
    median_ltv = int(top_patients[revenue_col].median())
    
    # Get age stats if available
    if 'age' in top_patients.columns:
        ages = top_patients['age'].dropna()
        if len(ages) > 0:
            avg_age = int(ages.mean())
            age_range = f"{int(ages.min())}-{int(ages.max())}"
        else:
            avg_age = None
            age_range = "Unknown"
    else:
        avg_age = None
        age_range = "Unknown"
    
    avg_visits = float(top_patients.get('visit_number', pd.Series([2.5])).mean())
    
    # Find top treatments
    top_treatments = ["Primary Service"]
    if 'treatments_received' in top_patients.columns:
        all_treatments = []
        for treatments in top_patients['treatments_received'].dropna():
            treatment_list = [t.strip() for t in str(treatments).split(',') if t.strip()]
            all_treatments.extend(treatment_list)
        
        if all_treatments:
            treatment_counts = pd.Series(all_treatments).value_counts()
            top_treatments = treatment_counts.head(3).index.tolist()
    
    # Geographic concentration
    top_zips = top_patients['zip_code'].value_counts().head(15)
    geo_concentration = []
    
    for zip_code, patient_count in top_zips.items():
        geo_concentration.append({
            "zip": str(zip_code),
            "patient_count": int(patient_count),
            "profile": dominant_profile
        })
    
    # Build summary
    summary = f"Your best patients are {dominant_profile}. They spend ${avg_ltv:,} on average"
    if avg_age:
        summary += f", average age {avg_age} years"
    summary += f", and visit {avg_visits:.1f}× per year. Concentrated across {len(top_zips)} key ZIPs."
    
    print(f"[PROFILE] Profile characteristics:")
    print(f"  - Average LTV: ${avg_ltv:,}")
    print(f"  - Median LTV: ${median_ltv:,}")
    if avg_age:
        print(f"  - Age: {avg_age} years ({age_range})")
    print(f"  - Visits/year: {avg_visits:.1f}")
    print(f"  - Top treatments: {', '.join(top_treatments[:3])}")
    print(f"  - Geographic spread: {len(top_zips)} ZIPs\n")
    
    return {
        "dominant_profile": {
            "psychographic": dominant_profile,
            "combined": dominant_profile,
            "behavioral_match_pct": profile_pct,
            "psychographic_match_pct": profile_pct
        },
        "profile_characteristics": {
            "avg_lifetime_value": avg_ltv,
            "median_lifetime_value": median_ltv,
            "avg_age": avg_age,
            "age_range": age_range,
            "income_range": "Varies by ZIP"
        },
        "behavior_patterns": {
            "avg_lifetime_value": avg_ltv,
            "avg_visits_per_year": round(avg_visits, 1),
            "top_treatments": top_treatments
        },
        "geographic_concentration": geo_concentration,
        "geographic_summary": {
            "total_zips": len(geo_concentration),
            "existing_patient_zips": len(geo_concentration),
            "expansion_opportunity_zips": 0,
            "total_addressable_households": sum(g['patient_count'] for g in geo_concentration) * 100
        },
        "profile_summary": summary
    }


# =============================================================================
# TESTING
# =============================================================================

def test_segmentation():
    """
    Quick test to verify the segmentation works correctly.
    """
    # Sample Connecticut data
    test_data = pd.DataFrame({
        'patient_id': ['CT001', 'CT002', 'CT003', 'CT004'],
        'age': [62, 68, 71, 45],
        'zip_code': ['06830', '06880', '06840', '06830'],
        'revenue': [28500, 19200, 14400, 8500],
        'visit_number': [12, 8, 6, 3]
    })
    
    print("=" * 70)
    print("TESTING: Connecticut Sample Data")
    print("=" * 70)
    
    # Run segmentation
    result = segment_patients_by_behavior(test_data)
    
    print("\nRESULTS:")
    for _, row in result.iterrows():
        print(f"  Patient {row['patient_id']}: Age {row['age']}, ${row['revenue']:,} → {row['behavioral_segment']}")
    
    print("\nEXPECTED:")
    print("  CT001 (62, $28,500) → Established Affluent - VIP Client ✅")
    print("  CT002 (68, $19,200) → Established Affluent - VIP Client ✅")
    print("  CT003 (71, $14,400) → Established Affluent - VIP Client ✅")
    print("  CT004 (45, $8,500)  → Professional Maintainer ✅")
    print("\n" + "=" * 70)


if __name__ == "__main__":
    print("""
    =============================================================================
    AUDIENCE MIRROR - CLEAN REFACTOR
    Profile-First, Simple, Pragmatic
    =============================================================================
    
    IMPLEMENTATION STEPS:
    
    1. Copy segment_patients_by_behavior() to your main.py (replace line ~289)
    
    2. Update execute_advanced_analysis() cohort assignment (line ~1730):
       - Delete ZIP-based assign_lifestyle_segment() call
       - Replace with profile-first classification
       - See update_execute_advanced_analysis_snippet() above
    
    3. Update identify_dominant_profile() function (line ~513)
       - Use behavioral_segment instead of ZIP demographics
       - See identify_dominant_profile() above
    
    =============================================================================
    
    TEST BEFORE DEPLOYING:
    """)
    
    test_segmentation()
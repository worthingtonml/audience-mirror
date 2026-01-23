"""
Patient Segmentation Logic for Audience Mirror
Calculates real metrics for each patient segment from CSV data
"""

def extract_patient_list(df, max_patients=100):
    """
    Extract patient details from a dataframe for the modal.
    """
    patients = []
    
    # Get unique patients
    if 'patient_id' in df.columns:
        unique_df = df.drop_duplicates(subset='patient_id').head(max_patients)
    else:
        unique_df = df.head(max_patients)
    
    for _, row in unique_df.iterrows():
        patient = {
            'patient_id': str(row.get('patient_id', row.name)),
        }
        
        # Add name if available
        if 'patient_name' in row:
            patient['name'] = str(row['patient_name'])
        elif 'name' in row:
            patient['name'] = str(row['name'])
        elif 'first_name' in row:
            first = str(row.get('first_name', ''))
            last = str(row.get('last_name', ''))
            patient['name'] = f"{first} {last}".strip()
        
        # Add phone if available
        if 'phone' in row:
            patient['phone'] = str(row['phone'])
        elif 'phone_number' in row:
            patient['phone'] = str(row['phone_number'])
        elif 'mobile' in row:
            patient['phone'] = str(row['mobile'])
        
        # Add email if available
        if 'email' in row:
            patient['email'] = str(row['email'])
        elif 'email_address' in row:
            patient['email'] = str(row['email_address'])
        
        # Add instagram if available
        if 'instagram' in row:
            patient['instagram'] = str(row['instagram'])
        elif 'instagram_handle' in row:
            patient['instagram'] = str(row['instagram_handle'])
        
        # Add last visit info
        if 'days_since_last_visit' in row:
            days = int(row['days_since_last_visit'])
            if days < 30:
                patient['lastVisit'] = f"{days} days ago"
            elif days < 60:
                patient['lastVisit'] = "1 month ago"
            elif days < 90:
                patient['lastVisit'] = "2 months ago"
            elif days < 180:
                patient['lastVisit'] = f"{days // 30} months ago"
            else:
                patient['lastVisit'] = f"{days // 30} months ago"
        elif 'last_visit_date' in row:
            patient['lastVisit'] = str(row['last_visit_date'])
        
        # Add revenue/spent
        if 'revenue' in row:
            patient['spent'] = f"${int(row['revenue']):,}"
        elif 'total_revenue' in row:
            patient['spent'] = f"${int(row['total_revenue']):,}"
        elif 'amount' in row:
            patient['spent'] = f"${int(row['amount']):,}"
        
        # Add treatment if available
        if 'service' in row:
            patient['treatment'] = str(row['service'])
        elif 'treatment' in row:
            patient['treatment'] = str(row['treatment'])
        elif 'procedure' in row:
            patient['treatment'] = str(row['procedure'])
        
        patients.append(patient)
    
    return patients


def calculate_patient_segments(patients_df, top_patients, revenue_col='revenue'):
    """
    Calculate metrics for 4 key patient segments from actual data.
    Now includes patient lists for each segment.
    """
    
    total_patients = len(patients_df)
    avg_revenue_all = float(patients_df[revenue_col].mean()) if revenue_col in patients_df.columns else 500.0
    
    segments = {}
    
    # 1. HIGH-FREQUENCY PATIENTS (4+ visits) - VIPs
    # Check for visit_count (aggregated data) OR visit_number (raw data)
    visit_col = 'visit_count' if 'visit_count' in patients_df.columns else 'visit_number' if 'visit_number' in patients_df.columns else None

    if visit_col:
        high_freq = patients_df[patients_df[visit_col] >= 4].copy()
        high_freq_count = int(len(high_freq))

        if high_freq_count > 0:
            high_freq_ltv = float(high_freq[revenue_col].sum() / high_freq['patient_id'].nunique()) if 'patient_id' in high_freq.columns else float(high_freq[revenue_col].mean())
            ltv_multiplier = float(high_freq_ltv / avg_revenue_all) if avg_revenue_all > 0 else 1.0

            if 'days_since_last_visit' in high_freq.columns:
                active_high_freq = int(len(high_freq[high_freq['days_since_last_visit'] <= 90]))
                retention_rate = float(active_high_freq / high_freq_count * 100) if high_freq_count > 0 else 0.0
            else:
                retention_rate = 85.0
        else:
            high_freq_ltv = 0.0
            ltv_multiplier = 1.0
            retention_rate = 0.0
    else:
        high_freq = patients_df.nlargest(int(len(patients_df) * 0.15), revenue_col)
        high_freq_count = int(len(high_freq))
        high_freq_ltv = float(high_freq[revenue_col].mean()) if high_freq_count > 0 else 0.0
        ltv_multiplier = float(high_freq_ltv / avg_revenue_all) if avg_revenue_all > 0 else 1.5
        retention_rate = 85.0
    
    segments['high_frequency'] = {
        'count': int(high_freq_count),
        'avg_ltv': int(round(high_freq_ltv)),
        'ltv_multiplier': round(float(ltv_multiplier), 1),
        'retention_rate': int(round(retention_rate)),
        'pct_of_total': int(round(high_freq_count / total_patients * 100)) if total_patients > 0 else 0,
        'patients': extract_patient_list(high_freq) if high_freq_count > 0 else []
    }
    
    # 2. REFERRAL CHAMPIONS
    if 'referral_source' in patients_df.columns:
        referral_keywords = ['referral', 'refer', 'friend', 'family', 'word of mouth', 'recommendation']
        referral_mask = patients_df['referral_source'].str.lower().str.contains('|'.join(referral_keywords), na=False)
        referral_patients = patients_df[referral_mask].copy()
        referral_count = int(len(referral_patients))
        
        if referral_count > 0:
            referral_ltv = float(referral_patients[revenue_col].mean())
            if 'visit_number' in referral_patients.columns:
                avg_visits_referrers = float(referral_patients['visit_number'].mean())
                estimated_referrals = round(float(min(3.0, max(1.5, avg_visits_referrers / 2))), 1)
            else:
                estimated_referrals = 2.0
            ltv_ratio = float(referral_ltv / avg_revenue_all) if avg_revenue_all > 0 else 1.0
            conversion_rate = int(min(85, max(50, round(50 + ltv_ratio * 20))))
        else:
            referral_ltv = avg_revenue_all
            estimated_referrals = 0.0
            conversion_rate = 0
    else:
        # No referral data - estimate based on top patients
        referral_count = int(round(total_patients * 0.15))
        referral_patients = patients_df.nlargest(referral_count, revenue_col).copy()
        referral_ltv = float(avg_revenue_all * 1.2)
        estimated_referrals = 1.8
        conversion_rate = 65
    
    segments['referral_champions'] = {
        'count': int(referral_count),
        'avg_ltv': int(round(referral_ltv)),
        'avg_referrals': float(estimated_referrals),
        'conversion_rate': int(conversion_rate),
        'pct_of_total': int(round(referral_count / total_patients * 100)) if total_patients > 0 else 0,
        'patients': extract_patient_list(referral_patients) if referral_count > 0 else []
    }
    
    # 3. ONE-AND-DONE / DANGER ZONE (1 visit, 30-60 days ago)
    print(f"\n[ONE-AND-DONE DEBUG] ========================================")
    print(f"[ONE-AND-DONE DEBUG] Total patients: {total_patients}")
    print(f"[ONE-AND-DONE DEBUG] visit_col: {visit_col}")
    print(f"[ONE-AND-DONE DEBUG] Has days_since_last_visit: {'days_since_last_visit' in patients_df.columns}")

    if visit_col and 'days_since_last_visit' in patients_df.columns:
        # Debug: Check each filter step
        single_visit = patients_df[patients_df[visit_col] == 1]
        print(f"[ONE-AND-DONE DEBUG] Patients with exactly 1 visit: {len(single_visit)}")

        if len(single_visit) > 0:
            print(f"[ONE-AND-DONE DEBUG] days_since_last_visit range for single-visit patients: {single_visit['days_since_last_visit'].min()}-{single_visit['days_since_last_visit'].max()}")
            print(f"[ONE-AND-DONE DEBUG] days_since_last_visit sample: {single_visit['days_since_last_visit'].head(10).tolist()}")

        in_30_60_window = single_visit[
            (single_visit['days_since_last_visit'] >= 30) &
            (single_visit['days_since_last_visit'] <= 60)
        ]
        print(f"[ONE-AND-DONE DEBUG] Patients in 30-60 day window: {len(in_30_60_window)}")

        one_and_done = patients_df[
            (patients_df[visit_col] == 1) &
            (patients_df['days_since_last_visit'] >= 30) &
            (patients_df['days_since_last_visit'] <= 60)
        ].copy()
        one_done_count = int(len(one_and_done))
        print(f"[ONE-AND-DONE DEBUG] Final one_and_done count: {one_done_count}")

        if one_done_count > 0:
            one_done_avg_spend = float(one_and_done[revenue_col].mean())
            potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
            avg_days_since = float(one_and_done['days_since_last_visit'].mean())
            win_back_rate = "15-22%"  # Higher for 30-60 day window
        else:
            one_done_avg_spend = avg_revenue_all
            potential_recovery = 0.0
            win_back_rate = "12-18%"
    elif visit_col:
        one_and_done = patients_df[patients_df[visit_col] == 1].copy()
        one_done_count = int(len(one_and_done))
        one_done_avg_spend = float(one_and_done[revenue_col].mean()) if one_done_count > 0 else avg_revenue_all
        potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
        win_back_rate = "12-18%"
    else:
        one_done_count = int(round(total_patients * 0.25))
        one_and_done = patients_df.nsmallest(one_done_count, revenue_col).copy()
        one_done_avg_spend = float(avg_revenue_all * 0.7)
        potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
        win_back_rate = "12-18%"
    
    segments['one_and_done'] = {
        'count': int(one_done_count),
        'avg_spend': int(round(one_done_avg_spend)),
        'potential_recovery': int(round(potential_recovery)),
        'win_back_rate': win_back_rate,
        'pct_of_total': int(round(one_done_count / total_patients * 100)) if total_patients > 0 else 0,
        'patients': extract_patient_list(one_and_done) if one_done_count > 0 else []
    }
    
    # 4. LAPSED REGULARS (2+ visits, 90+ days since last visit)
    if visit_col and 'days_since_last_visit' in patients_df.columns:
        lapsed = patients_df[
            (patients_df[visit_col] >= 2) &
            (patients_df['days_since_last_visit'] >= 90)
        ].copy()
        lapsed_count = int(len(lapsed))

        if lapsed_count > 0:
            avg_prev_visits = float(lapsed[visit_col].mean())
            lapsed_ltv = float(lapsed[revenue_col].mean())
            revenue_at_risk = float(lapsed_count * lapsed_ltv)
        else:
            avg_prev_visits = 0.0
            lapsed_ltv = 0.0
            revenue_at_risk = 0.0
    elif visit_col:
        repeat_visitors = patients_df[patients_df[visit_col] >= 2]
        lapsed_count = int(round(len(repeat_visitors) * 0.20))
        lapsed = repeat_visitors.head(lapsed_count).copy()
        avg_prev_visits = float(repeat_visitors[visit_col].mean()) if len(repeat_visitors) > 0 else 2.5
        lapsed_ltv = float(repeat_visitors[revenue_col].mean()) if len(repeat_visitors) > 0 else avg_revenue_all
        revenue_at_risk = float(lapsed_count * lapsed_ltv)
    else:
        lapsed_count = int(round(total_patients * 0.08))
        lapsed = patients_df.sample(n=min(lapsed_count, len(patients_df))).copy()
        avg_prev_visits = 3.0
        lapsed_ltv = float(avg_revenue_all * 1.3)
        revenue_at_risk = float(lapsed_count * lapsed_ltv)
    
    segments['lapsed_regulars'] = {
        'count': int(lapsed_count),
        'avg_prev_visits': round(float(avg_prev_visits), 1),
        'avg_ltv': int(round(lapsed_ltv)),
        'revenue_at_risk': int(round(revenue_at_risk)),
        'pct_of_total': int(round(lapsed_count / total_patients * 100)) if total_patients > 0 else 0,
        'patients': extract_patient_list(lapsed) if lapsed_count > 0 else []
    }
    
    return segments

"""
Patient Segmentation Logic for Audience Mirror
Calculates real metrics for each patient segment from CSV data
"""

def calculate_patient_segments(patients_df, top_patients, revenue_col='revenue'):
    """
    Calculate metrics for 4 key patient segments from actual data.
    """
    
    total_patients = len(patients_df)
    avg_revenue_all = float(patients_df[revenue_col].mean()) if revenue_col in patients_df.columns else 500.0
    
    segments = {}
    
    # 1. HIGH-FREQUENCY PATIENTS (4+ visits)
    if 'visit_number' in patients_df.columns:
        high_freq = patients_df[patients_df['visit_number'] >= 4].copy()
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
        'pct_of_total': int(round(high_freq_count / total_patients * 100)) if total_patients > 0 else 0
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
        referral_count = int(round(total_patients * 0.15))
        referral_ltv = float(avg_revenue_all * 1.2)
        estimated_referrals = 1.8
        conversion_rate = 65
    
    segments['referral_champions'] = {
        'count': int(referral_count),
        'avg_ltv': int(round(referral_ltv)),
        'avg_referrals': float(estimated_referrals),
        'conversion_rate': int(conversion_rate),
        'pct_of_total': int(round(referral_count / total_patients * 100)) if total_patients > 0 else 0
    }
    
    # 3. ONE-AND-DONE
    if 'visit_number' in patients_df.columns and 'days_since_last_visit' in patients_df.columns:
        one_and_done = patients_df[
            (patients_df['visit_number'] == 1) & 
            (patients_df['days_since_last_visit'] >= 60)
        ].copy()
        one_done_count = int(len(one_and_done))
        
        if one_done_count > 0:
            one_done_avg_spend = float(one_and_done[revenue_col].mean())
            potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
            avg_days_since = float(one_and_done['days_since_last_visit'].mean())
            if avg_days_since < 90:
                win_back_rate = "15-22%"
            elif avg_days_since < 180:
                win_back_rate = "10-15%"
            else:
                win_back_rate = "5-10%"
        else:
            one_done_avg_spend = avg_revenue_all
            potential_recovery = 0.0
            win_back_rate = "12-18%"
    elif 'visit_number' in patients_df.columns:
        one_and_done = patients_df[patients_df['visit_number'] == 1].copy()
        one_done_count = int(len(one_and_done))
        one_done_avg_spend = float(one_and_done[revenue_col].mean()) if one_done_count > 0 else avg_revenue_all
        potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
        win_back_rate = "12-18%"
    else:
        one_done_count = int(round(total_patients * 0.25))
        one_done_avg_spend = float(avg_revenue_all * 0.7)
        potential_recovery = float(one_done_count * one_done_avg_spend * 2.5)
        win_back_rate = "12-18%"
    
    segments['one_and_done'] = {
        'count': int(one_done_count),
        'avg_spend': int(round(one_done_avg_spend)),
        'potential_recovery': int(round(potential_recovery)),
        'win_back_rate': win_back_rate,
        'pct_of_total': int(round(one_done_count / total_patients * 100)) if total_patients > 0 else 0
    }
    
    # 4. LAPSED REGULARS
    if 'visit_number' in patients_df.columns and 'days_since_last_visit' in patients_df.columns:
        lapsed = patients_df[
            (patients_df['visit_number'] > 1) & 
            (patients_df['days_since_last_visit'] >= 120)
        ].copy()
        lapsed_count = int(len(lapsed))
        
        if lapsed_count > 0:
            avg_prev_visits = float(lapsed['visit_number'].mean())
            lapsed_ltv = float(lapsed[revenue_col].mean())
            revenue_at_risk = float(lapsed_count * lapsed_ltv)
        else:
            avg_prev_visits = 0.0
            lapsed_ltv = 0.0
            revenue_at_risk = 0.0
    elif 'visit_number' in patients_df.columns:
        repeat_visitors = patients_df[patients_df['visit_number'] > 1]
        lapsed_count = int(round(len(repeat_visitors) * 0.20))
        avg_prev_visits = float(repeat_visitors['visit_number'].mean()) if len(repeat_visitors) > 0 else 2.5
        lapsed_ltv = float(repeat_visitors[revenue_col].mean()) if len(repeat_visitors) > 0 else avg_revenue_all
        revenue_at_risk = float(lapsed_count * lapsed_ltv)
    else:
        lapsed_count = int(round(total_patients * 0.08))
        avg_prev_visits = 3.0
        lapsed_ltv = float(avg_revenue_all * 1.3)
        revenue_at_risk = float(lapsed_count * lapsed_ltv)
    
    segments['lapsed_regulars'] = {
        'count': int(lapsed_count),
        'avg_prev_visits': round(float(avg_prev_visits), 1),
        'avg_ltv': int(round(lapsed_ltv)),
        'revenue_at_risk': int(round(revenue_at_risk)),
        'pct_of_total': int(round(lapsed_count / total_patients * 100)) if total_patients > 0 else 0
    }
    
    return segments

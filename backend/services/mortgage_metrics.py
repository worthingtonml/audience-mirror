# backend/services/mortgage_metrics.py
"""
Mortgage-specific metrics and detection logic.
"""

import pandas as pd
from datetime import datetime
from typing import Dict, Any


def detect_stale_preapprovals(
    df: pd.DataFrame,
    stale_days: int = 60,
    status_column: str = 'status',
    date_column: str = 'preapproval_date',
    last_contact_column: str = 'last_contact'
) -> Dict[str, Any]:
    """
    Detect pre-approvals going cold (60+ days with no activity).
    """
    today = pd.Timestamp.now()
    
    preapproved_statuses = ['preapproved', 'pre-approved', 'active', 'shopping', 'pending']
    
    if status_column in df.columns:
        active_df = df[df[status_column].str.lower().isin(preapproved_statuses)].copy()
    else:
        active_df = df.copy()
    
    if len(active_df) == 0:
        return {
            'stale_count': 0,
            'stale_borrowers': [],
            'total_preapproved': 0,
            'stale_percent': 0.0,
            'commission_at_risk': 0.0,
            'avg_days_stale': 0.0
        }
    
    if date_column in active_df.columns:
        active_df['preapproval_date_parsed'] = pd.to_datetime(active_df[date_column], errors='coerce')
        active_df['days_since_preapproval'] = (today - active_df['preapproval_date_parsed']).dt.days.fillna(90)
    else:
        active_df['days_since_preapproval'] = 90
    
    if last_contact_column in active_df.columns:
        active_df['last_contact_parsed'] = pd.to_datetime(active_df[last_contact_column], errors='coerce')
        active_df['days_since_contact'] = (today - active_df['last_contact_parsed']).dt.days.fillna(90)
    else:
        active_df['days_since_contact'] = active_df['days_since_preapproval']
    
    stale_mask = (
        (active_df['days_since_preapproval'] >= stale_days) & 
        (active_df['days_since_contact'] >= 14)
    )
    
    stale_df = active_df[stale_mask]
    
    commission_rate = 0.01
    if 'preapproval_amount' in stale_df.columns:
        commission_at_risk = float(pd.to_numeric(stale_df['preapproval_amount'], errors='coerce').sum() * commission_rate)
    elif 'loan_amount' in stale_df.columns:
        commission_at_risk = float(pd.to_numeric(stale_df['loan_amount'], errors='coerce').sum() * commission_rate)
    elif 'revenue' in stale_df.columns:
        commission_at_risk = float(stale_df['revenue'].sum() * commission_rate)
    else:
        commission_at_risk = float(len(stale_df) * 4500)
    
    stale_borrowers = []
    id_col = 'contact_id' if 'contact_id' in stale_df.columns else 'patient_id' if 'patient_id' in stale_df.columns else None
    name_col = next((c for c in ['name', 'full_name', 'borrower_name', 'contact_name', 'first_name'] if c in stale_df.columns), None)
    loan_col = 'preapproval_amount' if 'preapproval_amount' in stale_df.columns else 'loan_amount' if 'loan_amount' in stale_df.columns else None
    
    for idx, row in stale_df.head(20).iterrows():
        borrower_id = str(row[id_col]) if id_col else f"Borrower {idx}"
        
        # Get borrower name
        if name_col:
            borrower_name = str(row[name_col]) if pd.notna(row.get(name_col)) else borrower_id
        else:
            borrower_name = borrower_id
            
        # Get loan amount
        loan_amount = float(row.get('preapproval_amount', 0) or row.get('loan_amount', 0) or 0)
        
        borrower = {
            'borrower_id': borrower_id,
            'name': borrower_name,
            'days_since_preapproval': int(row.get('days_since_preapproval', 0) or 0),
            'days_since_contact': int(row.get('days_since_contact', 0) or 0),
            'days_stale': int(row.get('days_since_preapproval', 0) or 0),
            'loan_amount': loan_amount,
            'commission': loan_amount * 0.01 if loan_amount > 0 else 4000,
            'disc_type': str(row.get('disc_type', '')) if pd.notna(row.get('disc_type')) else None,
            'source': str(row.get('source', 'unknown')) if pd.notna(row.get('source')) else 'unknown',
            'zip': str(row.get('zip', row.get('zip_code', ''))) if pd.notna(row.get('zip', row.get('zip_code'))) else None
        }
        stale_borrowers.append(borrower)
    
    # Sort by days stale for the default list
    stale_borrowers.sort(key=lambda x: x['days_since_preapproval'], reverse=True)
    
    # Create top_by_loan_amount list (sorted by loan amount descending)
    top_by_loan_amount = sorted(stale_borrowers, key=lambda x: x['loan_amount'], reverse=True)[:10]
    
    avg_days = float(stale_df['days_since_preapproval'].mean()) if len(stale_df) > 0 else 0.0
    
    # Calculate avg_loan_amount
    if loan_col and loan_col in stale_df.columns:
        avg_loan_amount = float(pd.to_numeric(stale_df[loan_col], errors='coerce').mean() or 0)
    else:
        avg_loan_amount = 350000.0  # Default estimate
    
    # Calculate avg_commission
    avg_commission = avg_loan_amount * 0.01 if avg_loan_amount > 0 else 4000.0
    
    return {
        'stale_count': int(len(stale_df)),
        'stale_borrowers': stale_borrowers,
        'top_by_loan_amount': top_by_loan_amount,
        'total_preapproved': int(len(active_df)),
        'stale_percent': float((len(stale_df) / len(active_df) * 100) if len(active_df) > 0 else 0),
        'commission_at_risk': commission_at_risk,
        'avg_days_stale': avg_days,
        'avg_loan_amount': avg_loan_amount,
        'avg_commission': avg_commission
    }


def calculate_channel_roi(df: pd.DataFrame, source_column: str = 'source') -> Dict[str, Any]:
    """
    Calculate conversion and ROI by source/channel.
    """
    if source_column not in df.columns:
        return {
            'channels': [],
            'total_leads': int(len(df)),
            'total_funded': 0,
            'overall_conversion': 0.0,
            'top_channel': None,
            'top_conversion': 0.0
        }
    
    funded_statuses = ['funded', 'closed', 'completed']
    
    df = df.copy()
    if 'status' in df.columns:
        df['is_funded'] = df['status'].str.lower().isin(funded_statuses)
    else:
        df['is_funded'] = False
    
    channel_stats = []
    
    for source, group in df.groupby(source_column):
        if pd.isna(source) or source == '':
            source = 'Unknown'
        
        total = len(group)
        funded = int(group['is_funded'].sum())
        conversion = float((funded / total * 100) if total > 0 else 0)
        
        if 'preapproval_amount' in group.columns:
            total_commission = float(pd.to_numeric(group[group['is_funded']]['preapproval_amount'], errors='coerce').sum() * 0.01)
        elif 'revenue' in group.columns:
            total_commission = float(group[group['is_funded']]['revenue'].sum() * 0.01)
        else:
            total_commission = float(funded * 4500)
        
        channel_stats.append({
            'source': str(source),
            'total_leads': int(total),
            'funded_count': funded,
            'conversion_rate': round(conversion, 1),
            'total_commission': round(total_commission, 2),
            'avg_commission': round(total_commission / funded, 2) if funded > 0 else 0.0
        })
    
    channel_stats.sort(key=lambda x: x['conversion_rate'], reverse=True)
    total_funded = sum(c['funded_count'] for c in channel_stats)
    
    return {
        'channels': channel_stats,
        'total_leads': int(len(df)),
        'total_funded': int(total_funded),
        'overall_conversion': float((total_funded / len(df) * 100) if len(df) > 0 else 0),
        'top_channel': channel_stats[0]['source'] if channel_stats else None,
        'top_conversion': float(channel_stats[0]['conversion_rate']) if channel_stats else 0.0
    }


def get_mortgage_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Master function to run all mortgage-specific analysis.
    """
    stale_preapprovals = detect_stale_preapprovals(df)
    channel_roi = calculate_channel_roi(df)
    
    return {
        'preapproval_metrics': stale_preapprovals,
        'channel_roi': channel_roi,
        'churn': {
            'at_risk_count': stale_preapprovals['stale_count'],
            'at_risk_percent': stale_preapprovals['stale_percent'],
            'at_risk_revenue': stale_preapprovals['commission_at_risk']
        }
    }
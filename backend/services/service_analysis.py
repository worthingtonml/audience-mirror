"""
Service Analysis for Audience Mirror
Calculates service co-occurrence, bundles, and cross-sell opportunities
"""

from collections import defaultdict
import pandas as pd


def analyze_services(df, treatment_col='treatment', revenue_col='revenue', patient_id_col='patient_id'):
    """
    Analyze service patterns to identify bundle and cross-sell opportunities.
    """
    
    result = {
        'top_services': [],
        'service_revenue': {},
        'service_patient_count': {},
        'co_occurrence': {},
        'bundle_opportunity': None,
        'upsell_opportunity': None,
        'category_penetration': {},
        'primary_opportunity': None
    }
    
    # Find treatment column
    treatment_col = next((c for c in ['treatment', 'procedure', 'service'] if c in df.columns), None)
    if not treatment_col:
        return result
    
    # Find revenue column
    revenue_col = next((c for c in ['revenue', 'amount', 'total'] if c in df.columns), None)
    
    # Parse treatments (may be comma-separated if aggregated)
    def parse_treatments(val):
        if pd.isna(val):
            return []
        treatments = str(val).split(',')
        return [t.strip() for t in treatments if t.strip()]
    
    df = df.copy()
    df['parsed_treatments'] = df[treatment_col].apply(parse_treatments)
    
    # Count patients per service and revenue per service
    service_patients = defaultdict(set)
    service_revenue = defaultdict(float)
    
    for idx, row in df.iterrows():
        treatments = row['parsed_treatments']
        patient_id = row.get(patient_id_col, idx)
        patient_revenue = row.get(revenue_col, 0) if revenue_col else 0
        
        revenue_per_treatment = patient_revenue / len(treatments) if treatments else 0
        
        for treatment in treatments:
            service_patients[treatment].add(patient_id)
            service_revenue[treatment] += revenue_per_treatment
    
    service_patient_count = {s: len(patients) for s, patients in service_patients.items()}
    
    sorted_services = sorted(service_revenue.items(), key=lambda x: x[1], reverse=True)
    top_services = [s[0] for s in sorted_services[:5]]
    
    result['top_services'] = top_services
    result['service_revenue'] = dict(service_revenue)
    result['service_patient_count'] = service_patient_count
    
    # Calculate co-occurrence matrix
    significant_services = [s for s, count in service_patient_count.items() if count >= 5]
    
    co_occurrence = {}
    for i, service_a in enumerate(significant_services):
        patients_a = service_patients[service_a]
        for service_b in significant_services[i+1:]:
            patients_b = service_patients[service_b]
            
            overlap = len(patients_a & patients_b)
            if overlap > 0:
                smaller_count = min(len(patients_a), len(patients_b))
                overlap_pct = round(overlap / smaller_count * 100)
                
                if overlap_pct >= 20:
                    pair_key = f"{service_a}|{service_b}"
                    co_occurrence[pair_key] = {
                        'service_a': service_a,
                        'service_b': service_b,
                        'overlap_count': overlap,
                        'overlap_pct': overlap_pct,
                        'patients_a': len(patients_a),
                        'patients_b': len(patients_b)
                    }
    
    result['co_occurrence'] = co_occurrence
    
    # Find best bundle opportunity
    if co_occurrence:
        best_bundle = max(co_occurrence.values(), key=lambda x: (x['overlap_pct'], x['overlap_count']))
        if best_bundle['overlap_pct'] >= 50:
            avg_revenue_per_patient = df[revenue_col].mean() if revenue_col else 200
            potential_increase = round(best_bundle['overlap_count'] * avg_revenue_per_patient * 0.15)
            
            result['bundle_opportunity'] = {
                'type': 'bundle',
                'title': f"{best_bundle['service_a']} + {best_bundle['service_b']} patients",
                'description': f"{best_bundle['overlap_pct']}% of your {best_bundle['service_a']} patients also get {best_bundle['service_b']}, but most book separately. A package deal increases avg ticket by 15-20%.",
                'potential_revenue': potential_increase,
                'patient_count': best_bundle['overlap_count'],
                'cta': 'Create bundle offer',
                'services': [best_bundle['service_a'], best_bundle['service_b']],
                'overlap_pct': best_bundle['overlap_pct']
            }
    
    # Calculate category penetration
    categories = {
        'injectables': ['botox', 'filler', 'dysport', 'juvederm', 'restylane', 'sculptra', 'kybella', 'jeuveau'],
        'laser': ['laser', 'ipl', 'bbl', 'halo', 'moxi', 'fraxel', 'clear + brilliant', 'co2'],
        'skincare': ['facial', 'hydrafacial', 'peel', 'microneedling', 'dermaplaning', 'skincare'],
        'body': ['coolsculpting', 'emsculpt', 'body', 'cellulite', 'skin tightening']
    }
    
    total_patients = len(df)
    category_patients = defaultdict(set)
    
    for idx, row in df.iterrows():
        treatments = row['parsed_treatments']
        patient_id = row.get(patient_id_col, idx)
        
        for treatment in treatments:
            treatment_lower = treatment.lower()
            for category, keywords in categories.items():
                if any(kw in treatment_lower for kw in keywords):
                    category_patients[category].add(patient_id)
    
    category_penetration = {}
    for category in categories.keys():
        count = len(category_patients[category])
        category_penetration[category] = {
            'count': count,
            'pct': round(count / total_patients * 100) if total_patients > 0 else 0
        }
    
    result['category_penetration'] = category_penetration
    
    # Find upsell opportunity
    industry_benchmarks = {
        'skincare': {'expected_pct': 35, 'upsell_value': 150},
        'body': {'expected_pct': 20, 'upsell_value': 500},
    }
    
    if not result['bundle_opportunity'] or result['bundle_opportunity']['overlap_pct'] < 60:
        for category, benchmark in industry_benchmarks.items():
            current_pct = category_penetration.get(category, {}).get('pct', 0)
            if current_pct < 10 and benchmark['expected_pct'] > 20:
                injectable_patients = category_patients.get('injectables', set())
                category_patients_set = category_patients.get(category, set())
                eligible_patients = injectable_patients - category_patients_set
                
                if len(eligible_patients) >= 10:
                    potential_revenue = round(len(eligible_patients) * benchmark['upsell_value'] * 0.2)

                    # Extract patient details for eligible patients
                    patient_list = []
                    for pid in list(eligible_patients)[:100]:  # Limit to 100
                        patient_row = df[df[patient_id_col] == pid].iloc[0] if patient_id_col and len(df[df[patient_id_col] == pid]) > 0 else None
                        if patient_row is not None:
                            patient_list.append({
                                'patient_id': str(pid),
                                'name': str(patient_row.get('name', patient_row.get('first_name', ''))) if 'name' in patient_row or 'first_name' in patient_row else str(pid),
                                'phone': str(patient_row.get('phone', '')) if 'phone' in patient_row else '',
                                'email': str(patient_row.get('email', '')) if 'email' in patient_row else '',
                            })

                    result['upsell_opportunity'] = {
                        'type': 'upsell',
                        'title': f"Introduce {category} to injectable patients",
                        'description': f"{current_pct}% of your patients buy {category}, but industry average is {benchmark['expected_pct']}% when offered alongside injectables.",
                        'potential_revenue': potential_revenue,
                        'patient_count': len(eligible_patients),
                        'patients': patient_list,
                        'cta': f'Launch {category} intro',
                        'category': category,
                        'current_pct': current_pct,
                        'benchmark_pct': benchmark['expected_pct']
                    }
                    break
    
    # Set primary opportunity
    if result['bundle_opportunity']:
        result['primary_opportunity'] = result['bundle_opportunity']
    elif result['upsell_opportunity']:
        result['primary_opportunity'] = result['upsell_opportunity']
    
    return result

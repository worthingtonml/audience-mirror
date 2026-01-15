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
    
    # Helper function to extract patient info
    def extract_patient_info(patient_ids, df, patient_id_col, limit=500):
        patients = []
        for pid in list(patient_ids)[:limit]:
            rows = df[df[patient_id_col] == pid] if patient_id_col else pd.DataFrame()
            if len(rows) > 0:
                row = rows.iloc[0]
                patients.append({
                    'patient_id': str(pid),
                    'name': str(row.get('name', row.get('patient_name', row.get('first_name', '')))),
                    'phone': str(row.get('phone', row.get('mobile', ''))),
                    'email': str(row.get('email', '')),
                })
        return patients

    # Calculate co-occurrence matrix
    significant_services = [s for s, count in service_patient_count.items() if count >= 5]

    co_occurrence = {}
    for i, service_a in enumerate(significant_services):
        patients_a = service_patients[service_a]
        for service_b in significant_services[i+1:]:
            patients_b = service_patients[service_b]

            overlap = len(patients_a & patients_b)
            if overlap > 0:
                # Calculate overlap in both directions
                pct_a_also_b = round(overlap / len(patients_a) * 100)  # % of A patients who also get B
                pct_b_also_a = round(overlap / len(patients_b) * 100)  # % of B patients who also get A

                # Calculate untapped potential
                a_only_count = len(patients_a - patients_b)
                b_only_count = len(patients_b - patients_a)

                # Only include if at least one direction has 20%+ overlap
                if max(pct_a_also_b, pct_b_also_a) >= 20:
                    # Calculate average revenue per service
                    rev_a = service_revenue.get(service_a, 0) / max(len(patients_a), 1)
                    rev_b = service_revenue.get(service_b, 0) / max(len(patients_b), 1)
                    avg_bundle_value = rev_a + rev_b

                    # Revenue score: prioritize high-value bundles with good overlap
                    revenue_score = overlap * avg_bundle_value

                    pair_key = f"{service_a}|{service_b}"
                    co_occurrence[pair_key] = {
                        'service_a': service_a,
                        'service_b': service_b,
                        'overlap_count': overlap,
                        'pct_a_also_b': pct_a_also_b,
                        'pct_b_also_a': pct_b_also_a,
                        'patients_a': len(patients_a),
                        'patients_b': len(patients_b),
                        'a_only_count': a_only_count,
                        'b_only_count': b_only_count,
                        'total_opportunity': a_only_count + b_only_count,
                        'avg_bundle_value': round(avg_bundle_value),
                        'revenue_score': round(revenue_score),
                        # Keep old field for backward compatibility
                        'overlap_pct': max(pct_a_also_b, pct_b_also_a)
                    }

    result['co_occurrence'] = co_occurrence

    # Find best bundle opportunity
    if co_occurrence:
        # Pick by revenue potential, not just overlap percentage
        best_bundle = max(co_occurrence.values(), key=lambda x: x['revenue_score'])

        # Check if this is a viable opportunity
        has_bundle_opportunity = (
            best_bundle['overlap_count'] >= 10 and
            max(best_bundle['pct_a_also_b'], best_bundle['pct_b_also_a']) >= 40
        )

        has_crosssell_opportunity = (
            best_bundle['total_opportunity'] >= 20  # At least 20 patients to target
        )

        if has_bundle_opportunity or has_crosssell_opportunity:
            service_a = best_bundle['service_a']
            service_b = best_bundle['service_b']

            # Get patient lists
            both_patients = service_patients[service_a] & service_patients[service_b]
            a_only = service_patients[service_a] - service_patients[service_b]
            b_only = service_patients[service_b] - service_patients[service_a]

            bundle_patients = extract_patient_info(both_patients, df, patient_id_col)
            crosssell_a_to_b = extract_patient_info(a_only, df, patient_id_col)
            crosssell_b_to_a = extract_patient_info(b_only, df, patient_id_col)

            # Calculate revenue potential for each segment
            rev_a_per_patient = service_revenue.get(service_a, 0) / max(best_bundle['patients_a'], 1)
            rev_b_per_patient = service_revenue.get(service_b, 0) / max(best_bundle['patients_b'], 1)

            bundle_potential = round(best_bundle['overlap_count'] * best_bundle['avg_bundle_value'] * 0.15)
            crosssell_a_potential = round(best_bundle['a_only_count'] * rev_b_per_patient * 0.15)
            crosssell_b_potential = round(best_bundle['b_only_count'] * rev_a_per_patient * 0.15)

            # Determine the primary insight direction (higher overlap percentage)
            if best_bundle['pct_a_also_b'] >= best_bundle['pct_b_also_a']:
                insight = f"{best_bundle['pct_a_also_b']}% of {service_a} patients also get {service_b}"
            else:
                insight = f"{best_bundle['pct_b_also_a']}% of {service_b} patients also get {service_a}"

            result['bundle_opportunity'] = {
                'type': 'bundle',
                'title': f"{service_a} + {service_b} Package",
                'insight': insight,
                'avg_bundle_value': best_bundle['avg_bundle_value'],
                'services': [service_a, service_b],

                # Patients who get BOTH - target for package pricing
                'bundle_patients': {
                    'count': best_bundle['overlap_count'],
                    'patients': bundle_patients,
                    'action': 'Offer package discount',
                    'potential': bundle_potential,
                },

                # Patients who get A only - target to add B
                'crosssell_a_to_b': {
                    'count': best_bundle['a_only_count'],
                    'patients': crosssell_a_to_b,
                    'action': f"Introduce {service_b}",
                    'potential': crosssell_a_potential,
                },

                # Patients who get B only - target to add A
                'crosssell_b_to_a': {
                    'count': best_bundle['b_only_count'],
                    'patients': crosssell_b_to_a,
                    'action': f"Introduce {service_a}",
                    'potential': crosssell_b_potential,
                },

                # Backward compatibility fields
                'patient_count': best_bundle['overlap_count'],
                'potential_revenue': bundle_potential + crosssell_a_potential + crosssell_b_potential,
                'cta': 'Create bundle offer',
                'overlap_pct': best_bundle['overlap_pct'],
                'description': f"{insight}. Target {best_bundle['overlap_count']} patients for packages, plus {best_bundle['total_opportunity']} for cross-sell.",
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
                    for pid in list(eligible_patients)[:500]:  # Limit to 500
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

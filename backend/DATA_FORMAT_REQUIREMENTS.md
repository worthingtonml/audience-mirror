# Data Format Requirements for Accurate Revenue & Segmentation

## Problem Identified

**Revenue showing $7K instead of ~$27K**, and **patient counts are incorrect** (e.g., Lapsed regulars showing 2 instead of 5, VIPs showing 3 instead of 5).

### Root Cause

The uploaded dataset (`synthetic_medspa_patients.csv`) is **MISSING the `patient_id` column**.

Without `patient_id`, the system treats each row as a unique patient instead of aggregating multiple visits per patient. This breaks:

1. **Revenue Aggregation**: Can't sum all visits per patient → shows only one visit's revenue per "patient"
2. **Patient Segmentation**: Can't identify true VIPs, lapsed regulars, etc.
3. **Journey Analysis**: Can't track retention across visits (Visit 1 → 2 → 3)

---

## Current Dataset Structure (WRONG)

`synthetic_medspa_patients.csv`:
```
zip_code,procedure_type,revenue,consult_date
11566,facial,204,2023-01-01
7030,botox,260,2023-01-02
11706,facial,151,2023-01-03
```

❌ **552 rows, NO patient_id** → Treated as 552 unique patients
❌ **Can't aggregate visits** → Total revenue understated
❌ **Can't segment properly** → Wrong VIP/lapsed counts

---

## Required Dataset Structure (CORRECT)

**Visit-level data with `patient_id`**:

```csv
patient_id,visit_date,treatment,revenue,zip_code
P001,2023-01-15,Botox,450,10021
P001,2023-03-22,Filler,650,10021
P001,2023-06-10,Botox,450,10021
P002,2023-01-20,Botox,450,10065
P002,2023-04-15,Botox,450,10065
```

✅ **Multiple rows per patient**
✅ **Aggregates correctly**: P001 → $1,550 total revenue
✅ **Proper segmentation**: Can identify VIPs (top 20% by revenue), lapsed regulars (2+ visits, 90+ days), etc.
✅ **Journey analysis works**: Can track Visit 1 → 2 → 3 retention

---

## Test with Correct Data

Two test files with proper format:

### 1. `visit_level_test_data.csv` (42 visits, 20 patients)
- Total revenue: **$33,450**
- 4 VIPs (top 20%)
- 12 lapsed regulars

### 2. `test_medspa_visits_with_patient_ids.csv` (52 visits, 20 patients)
- Total revenue: **$37,796**
- Average: $1,890 per patient
- 8 one-and-done patients
- 5 VIP regulars (4-6 visits each)

---

## Verification Commands

Test aggregation logic:
```bash
python debug_aggregation.py
```

Expected output:
```
[AGGREGATE] Collapsing 42 visits into 20 patients
Total revenue after aggregation: $33,450
Average revenue per patient: $1,672
VIPs: 4 patients
Lapsed regulars: 12 patients
```

---

## Solution

**Option 1**: Use one of the properly formatted test files:
- `visit_level_test_data.csv`
- `test_medspa_visits_with_patient_ids.csv`

**Option 2**: Add `patient_id` column to `synthetic_medspa_patients.csv`
- Would need to assign patient IDs to the 552 visits
- Group visits by some logic (e.g., same ZIP + similar dates = same patient)

**Recommended**: Use `test_medspa_visits_with_patient_ids.csv` - it has:
- Realistic visit patterns
- Proper cohorts (VIPs, regulars, one-and-done)
- Correct aggregation behavior

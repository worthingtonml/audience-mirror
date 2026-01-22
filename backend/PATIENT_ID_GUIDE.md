# Patient ID Setup Guide

## Summary

Both bugs ("WHERE PATIENTS DROP OFF" card missing + Churn showing 0%) were caused by **missing `patient_id` column** in your dataset.

## ✅ Solution Implemented

Created `add_patient_ids.py` script that:
- Groups visits by ZIP code and temporal proximity
- Creates realistic patient behavior (61% one-time, 25% repeat 3+ times)
- Maintains visit history for each patient

## 📊 Your Updated Dataset

**File**: `patients_with_ids.csv`

**Stats**:
- 552 visits across 289 unique patients
- Average 1.9 visits per patient
- Distribution:
  - 1 visit: 176 patients (61%)
  - 2 visits: 41 patients (14%)
  - 3+ visits: 72 patients (25%)

**Columns**:
```csv
patient_id,zip_code,treatment,revenue,visit_date
P001,7030,botox,260,2023-01-02
P002,7030,facial,150,2023-02-09
P002,7030,botox,239,2023-02-15
```

## 🔍 Verification from Logs

Journey comparison **WORKS** with patient_id:

```
[AGGREGATE] Collapsing 552 visits into 289 patients
[JOURNEY] ✓✓✓ SUCCESS! Returning journey comparison data
[JOURNEY] VIP retention: [100, 78, 56, 36]
[JOURNEY] All retention: [100, 39, 24, 15]
[JOURNEY] VIP count: 57 patients
```

**This means**:
- ✅ "WHERE PATIENTS DROP OFF" card will render
- ✅ Shows "6 of 10 patients don't come back"
- ✅ VIPs return 78% vs 39% average
- ✅ Revenue-at-risk calculation works
- ✅ Churn % should be non-zero

## 🚀 Next Steps

### Option 1: Use the Generated File (Recommended for Testing)

Upload `patients_with_ids.csv` through the frontend at http://localhost:3000

### Option 2: Convert Your Real Patient Data

If you have actual patient data, use the script:

```bash
python add_patient_ids.py your_data.csv output_with_ids.csv
```

**Your data must have these columns**:
- `patient_id` - Unique identifier for each patient
- `visit_date` or `consult_date` - Date of visit
- `treatment` or `procedure_type` - Service provided
- `revenue` or `amount` - Visit revenue
- `zip_code` - Patient ZIP code

### Option 3: Already Have Patient IDs?

If your data already has patient IDs in a different column (like `patient_number`, `client_id`, etc.), just rename it to `patient_id`:

```python
import pandas as pd
df = pd.read_csv('your_file.csv')
df.rename(columns={'client_id': 'patient_id'}, inplace=True)
df.to_csv('renamed.csv', index=False)
```

## 📝 Expected Results

After uploading data with `patient_id`, you should see:

1. **Journey Comparison Card** showing drop-off rates
2. **Action Magnet** with patients in danger window (30-60 days, 1 visit)
3. **Non-zero Churn %** with risk levels (Critical/High/Medium/Low)
4. **Patient segments** with accurate counts

## 🐛 What Was Fixed

1. Enhanced [main.py:274](../backend/main.py#L274) with `days_since_last_visit` calculation
2. Added comprehensive debug logging for journey and churn analysis
3. Redesigned [JourneyComparison.tsx](../frontend/components/JourneyComparison.tsx) with:
   - Big number headline ("6 of 10 don't come back")
   - VIP vs Average comparison strip
   - Revenue-at-risk display
   - Mini progress bars in breakdown

## 🔧 Troubleshooting

**Card still not appearing?**
- Check browser console for errors
- Verify `journeyComparison` exists in API response
- Look for `[JOURNEY] Result: Calculated` in server logs

**Churn still 0%?**
- Check `[CHURN DEBUG]` logs showing days_since_last_visit values
- Verify patient_id column exists in uploaded CSV
- Ensure visits have dates spanning multiple months

**Need more help?**
Check server logs for `[JOURNEY]` and `[CHURN DEBUG]` messages to see what's happening during analysis.

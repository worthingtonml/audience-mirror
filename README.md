# Audience Mirror

Advanced patient targeting platform for medical spas using machine learning to identify high-value expansion opportunities.

## Algorithm Approach
- **Geographic**: Distance accessibility with competitor pressure modeling
- **Demographic**: Census data analysis (income, education, homeownership)  
- **Psychographic**: KMeans lifestyle cohorts learned from patient behavior

## Tech Stack
- Backend: FastAPI, scikit-learn, pandas
- Frontend: Next.js, TypeScript, Tailwind CSS
- ML: Ridge regression, KMeans clustering, isotonic calibration

## Features
- ZIP-code scoring with booking predictions
- Export audiences for Facebook/Google Ads
- HIPAA-compliant (ZIP-only, no PII)
- Uncertainty quantification with confidence intervals

## Status
MVP with algorithm framework. Requires 200+ patient records for reliable predictions.
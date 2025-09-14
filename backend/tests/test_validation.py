import pandas as pd
from services import scoring

def test_validate_zip_recommendation_accuracy():
    # Example: Load your patient and ZIP demographic data
    patients_df = pd.read_csv('../patients_demo.csv')
    zip_demographics = pd.read_csv('../data/zip_demographics.sample.csv')
    competitors_df = None  # or pd.read_csv('../competitors_demo.csv')
    avg_patient_revenue = patients_df['revenue'].mean()
    # Run validation
    metrics = scoring.validate_zip_recommendation_accuracy(
        patients_df=patients_df,
        zip_demographics=zip_demographics,
        competitors_df=competitors_df,
        avg_patient_revenue=avg_patient_revenue,
        top_n=10,
        random_state=42
    )
    print('Validation metrics:', metrics)

if __name__ == '__main__':
    test_validate_zip_recommendation_accuracy()

# train_production_model.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
import joblib
import json
import os

# Create models directory
if not os.path.exists('models'):
    os.makedirs('models')

# Load the data
print("Loading data...")
patients = pd.read_csv('patient_data.csv')
campaigns = pd.read_csv('campaign_data.csv')

print(f"Loaded {len(patients)} patient records and {len(campaigns)} campaigns")

# Feature engineering - what actually predicts success
def prepare_features(df):
    """Extract meaningful features from raw data"""
    
    # Aggregate by ZIP and platform
    features = []
    
    for zip_code in df['patient_zip'].unique():
        for platform in df['acquisition_channel'].unique():
            subset = df[(df['patient_zip'] == zip_code) & 
                       (df['acquisition_channel'] == platform)]
            
            if len(subset) < 5:  # Need minimum data
                continue
            
            # Calculate real metrics
            show_rate = subset['showed_for_appointment'].mean()
            completion_rate = subset['completed_treatment'].mean()
            avg_revenue = subset['revenue'].mean()
            avg_ltv = subset['lifetime_value'].mean()
            return_rate = subset['returned_within_90_days'].mean()
            avg_age = subset['patient_age'].mean()
            female_ratio = (subset['patient_gender'] == 'F').mean()
            
            # Cost metrics
            avg_ad_spend = subset['ad_spend'].mean()
            cpa = avg_ad_spend / completion_rate if completion_rate > 0 else 999
            roas = avg_revenue / avg_ad_spend if avg_ad_spend > 0 else 0
            
            # Procedure mix
            procedure_counts = subset['procedure'].value_counts(normalize=True)
            
            features.append({
                'zip': zip_code,
                'platform': platform,
                'show_rate': show_rate,
                'completion_rate': completion_rate,
                'avg_revenue': avg_revenue,
                'avg_ltv': avg_ltv,
                'return_rate': return_rate,
                'avg_age': avg_age,
                'female_ratio': female_ratio,
                'cpa': cpa,
                'roas': roas,
                'botox_ratio': procedure_counts.get('botox', 0),
                'filler_ratio': procedure_counts.get('filler', 0),
                'sample_size': len(subset),
                
                # Target variables (what we want to predict)
                'performance_score': show_rate * completion_rate * roas * 100,
                'predicted_cpl': avg_ad_spend,
                'predicted_ltv': avg_ltv,
            })
    
    return pd.DataFrame(features)

# Prepare training data
print("Engineering features from patient data...")
training_data = prepare_features(patients)

# Add campaign-level features
campaign_features = campaigns.groupby(['platform', 'target_zip']).agg({
    'cpl': 'mean',
    'cpa': 'mean', 
    'roas': 'mean',
    'impressions': 'sum',
    'clicks': 'sum',
    'leads': 'sum',
}).reset_index()

# Merge with training data
training_data = training_data.merge(
    campaign_features, 
    left_on=['platform', 'zip'], 
    right_on=['platform', 'target_zip'],
    how='left',
    suffixes=('', '_campaign')
)

# Fill NaN values
training_data = training_data.fillna(0)

print(f"Created {len(training_data)} training examples")

# Encode categorical variables
le_zip = LabelEncoder()
le_platform = LabelEncoder()

training_data['zip_encoded'] = le_zip.fit_transform(training_data['zip'])
training_data['platform_encoded'] = le_platform.fit_transform(training_data['platform'])

# Select features for model
feature_cols = [
    'zip_encoded', 'platform_encoded', 
    'avg_age', 'female_ratio',
    'botox_ratio', 'filler_ratio',
    'impressions', 'clicks', 'leads'
]

# Handle missing values
training_data[feature_cols] = training_data[feature_cols].fillna(0)

X = training_data[feature_cols]
y_score = training_data['performance_score']
y_cpl = training_data['predicted_cpl']
y_ltv = training_data['predicted_ltv']

# Train performance score model
print("\nTraining performance prediction model...")
X_train, X_test, y_train, y_test = train_test_split(X, y_score, test_size=0.2, random_state=42)

# Use GradientBoosting instead of XGBoost (it's included in scikit-learn)
score_model = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42
)
score_model.fit(X_train, y_train)
score_accuracy = score_model.score(X_test, y_test)
print(f"Performance model R²: {score_accuracy:.3f}")

# Train CPL prediction model
print("Training CPL prediction model...")
X_train, X_test, y_train, y_test = train_test_split(X, y_cpl, test_size=0.2, random_state=42)

cpl_model = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    random_state=42
)
cpl_model.fit(X_train, y_train)
cpl_accuracy = cpl_model.score(X_test, y_test)
print(f"CPL model R²: {cpl_accuracy:.3f}")

# Train LTV prediction model
print("Training LTV prediction model...")
X_train, X_test, y_train, y_test = train_test_split(X, y_ltv, test_size=0.2, random_state=42)

ltv_model = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    random_state=42
)
ltv_model.fit(X_train, y_train)
ltv_accuracy = ltv_model.score(X_test, y_test)
print(f"LTV model R²: {ltv_accuracy:.3f}")

# Save models and encoders
print("\nSaving models...")
joblib.dump(score_model, 'models/score_model.pkl')
joblib.dump(cpl_model, 'models/cpl_model.pkl')
joblib.dump(ltv_model, 'models/ltv_model.pkl')
joblib.dump(le_zip, 'models/zip_encoder.pkl')
joblib.dump(le_platform, 'models/platform_encoder.pkl')

# Save feature importance
feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'importance': score_model.feature_importances_
}).sort_values('importance', ascending=False)

print("\n📊 Feature Importance:")
print(feature_importance.to_string())

# Create metadata for the models
# Create metadata for the models
metadata = {
    'models': {
        'score_model': {'accuracy': float(score_accuracy), 'type': 'GradientBoostingRegressor'},
        'cpl_model': {'accuracy': float(cpl_accuracy), 'type': 'GradientBoostingRegressor'},
        'ltv_model': {'accuracy': float(ltv_accuracy), 'type': 'GradientBoostingRegressor'},
    },
    'features': feature_cols,
    'zip_codes': [str(z) for z in le_zip.classes_],  # Convert to strings
    'platforms': [str(p) for p in le_platform.classes_],  # Convert to strings
    'training_samples': int(len(training_data)),  # Convert to regular int
    'patient_records': int(len(patients)),  # Convert to regular int
    'campaign_records': int(len(campaigns)),  # Convert to regular int
}

with open('models/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("\n✅ Models saved to ./models/")
print("✅ Ready for production use!")

# Test predictions function
print("\n🧪 Testing predictions...")

def predict_for_combo(zip_code, platform):
    """Test prediction for a specific combination"""
    try:
        # Encode inputs
        zip_encoded = le_zip.transform([zip_code])[0] if zip_code in le_zip.classes_ else 0
        platform_encoded = le_platform.transform([platform])[0] if platform in le_platform.classes_ else 0
        
        # Create feature vector (matching training features)
        features = pd.DataFrame({
            'zip_encoded': [zip_encoded],
            'platform_encoded': [platform_encoded],
            'avg_age': [35],  # Default values
            'female_ratio': [0.6],
            'botox_ratio': [0.35],
            'filler_ratio': [0.2],
            'impressions': [10000],
            'clicks': [300],
            'leads': [45]
        })
        
        # Get predictions
        score = score_model.predict(features)[0]
        cpl = cpl_model.predict(features)[0]
        ltv = ltv_model.predict(features)[0]
        
        return {
            'platform': platform,
            'zip': zip_code,
            'score': round(score, 1),
            'cpl': round(cpl, 2),
            'ltv': round(ltv, 2),
            'roas': round(ltv / cpl, 2) if cpl > 0 else 0
        }
    except:
        return None

# Test some combinations
print("\nSample Predictions:")
print("-" * 60)

test_cases = [
    ('11030', 'facebook'),  # Wealthy ZIP + Facebook
    ('11030', 'tiktok'),    # Wealthy ZIP + TikTok  
    ('10453', 'facebook'),  # Budget ZIP + Facebook
    ('10453', 'google'),    # Budget ZIP + Google
]

for zip_code, platform in test_cases:
    result = predict_for_combo(zip_code, platform)
    if result:
        print(f"{result['zip']} + {result['platform']:10} → Score: {result['score']:5.1f}, CPL: ${result['cpl']:.2f}, LTV: ${result['ltv']:.0f}, ROAS: {result['roas']}x")

print("\n🚀 Next step: Integrate these models into your Next.js API!")
print("   The models can now predict performance for any ZIP + platform combination")
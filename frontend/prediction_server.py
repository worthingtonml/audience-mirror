# prediction_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # Allow requests from your Next.js app

# Load models once at startup
print("Loading models...")
score_model = joblib.load('models/score_model.pkl')
cpl_model = joblib.load('models/cpl_model.pkl')
ltv_model = joblib.load('models/ltv_model.pkl')
zip_encoder = joblib.load('models/zip_encoder.pkl')
platform_encoder = joblib.load('models/platform_encoder.pkl')
print("Models loaded!")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        zip_code = data['zip']
        procedure = data['procedure']
        cohort = data['cohort']
        
        # Predict for all platforms
        platforms = ['facebook', 'instagram', 'google', 'tiktok']
        predictions = []
        
        for platform in platforms:
            # Encode inputs
            zip_encoded = zip_encoder.transform([zip_code])[0] if zip_code in zip_encoder.classes_ else 0
            platform_encoded = platform_encoder.transform([platform])[0] if platform in platform_encoder.classes_ else 0
            
            # Create feature vector
            features = pd.DataFrame({
                'zip_encoded': [zip_encoded],
                'platform_encoded': [platform_encoded],
                'avg_age': [35],
                'female_ratio': [0.6],
                'botox_ratio': [0.35 if procedure == 'botox' else 0.15],
                'filler_ratio': [0.2 if procedure == 'filler' else 0.1],
                'impressions': [10000],
                'clicks': [300],
                'leads': [45]
            })
            
            # Get predictions
            score = float(score_model.predict(features)[0])
            cpl = float(cpl_model.predict(features)[0])
            ltv = float(ltv_model.predict(features)[0])
            
            # Adjust for cohort
            cohort_multipliers = {
                'premium_aesthetics': {'score': 1.1, 'cpl': 1.3, 'ltv': 1.5},
                'value_shoppers': {'score': 0.9, 'cpl': 0.8, 'ltv': 0.7},
                'first_timers': {'score': 0.85, 'cpl': 1.1, 'ltv': 0.6},
                'loyal_clients': {'score': 1.15, 'cpl': 0.7, 'ltv': 2.0}
            }
            
            multiplier = cohort_multipliers.get(cohort, {'score': 1, 'cpl': 1, 'ltv': 1})
            
            predictions.append({
                'platform': platform,
                'score': min(100, max(0, score * multiplier['score'])),
                'cpl': max(5, cpl * multiplier['cpl']),
                'ltv': ltv * multiplier['ltv'],
                'roas': (ltv * multiplier['ltv']) / (cpl * multiplier['cpl']) if cpl > 0 else 0
            })
        
        # Sort by score
        predictions.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify(predictions)
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'models_loaded': True})

if __name__ == '__main__':
    print("Starting ML prediction server on http://localhost:5001")
    # At the bottom of the file, change this line:
    app.run(port=5001, debug=True)  # Changed from 5000 to 5001
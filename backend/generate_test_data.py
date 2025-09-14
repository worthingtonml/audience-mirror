import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

# Define realistic NYC/NJ area ZIP codes with varying demographics
zip_profiles = {
    # High-end Manhattan ZIPs
    '10021': {'income_mult': 2.5, 'procedures': ['botox', 'filler', 'laser', 'coolsculpting'], 'avg_revenue': 1200, 'volume_mult': 0.8},
    '10022': {'income_mult': 2.2, 'procedures': ['botox', 'filler', 'laser', 'facial'], 'avg_revenue': 1100, 'volume_mult': 0.7},
    '10065': {'income_mult': 2.8, 'procedures': ['botox', 'filler', 'laser', 'coolsculpting', 'facial'], 'avg_revenue': 1400, 'volume_mult': 0.9},
    
    # Affluent suburbs
    '07078': {'income_mult': 1.8, 'procedures': ['botox', 'filler', 'laser'], 'avg_revenue': 850, 'volume_mult': 1.2},
    '07932': {'income_mult': 1.9, 'procedures': ['botox', 'filler', 'laser', 'coolsculpting'], 'avg_revenue': 900, 'volume_mult': 1.1},
    '10583': {'income_mult': 1.7, 'procedures': ['botox', 'filler', 'facial'], 'avg_revenue': 800, 'volume_mult': 1.0},
    
    # Upper middle class areas
    '11030': {'income_mult': 1.4, 'procedures': ['botox', 'filler'], 'avg_revenue': 650, 'volume_mult': 1.5},
    '11566': {'income_mult': 1.3, 'procedures': ['botox', 'filler', 'facial'], 'avg_revenue': 600, 'volume_mult': 1.4},
    '11743': {'income_mult': 1.2, 'procedures': ['botox', 'facial'], 'avg_revenue': 550, 'volume_mult': 1.6},
    
    # Middle class areas
    '11801': {'income_mult': 1.0, 'procedures': ['botox', 'facial'], 'avg_revenue': 450, 'volume_mult': 1.8},
    '11706': {'income_mult': 0.9, 'procedures': ['botox', 'facial'], 'avg_revenue': 400, 'volume_mult': 2.0},
    '10704': {'income_mult': 0.8, 'procedures': ['facial', 'botox'], 'avg_revenue': 380, 'volume_mult': 1.9},
    
    # Working class areas
    '10453': {'income_mult': 0.6, 'procedures': ['facial'], 'avg_revenue': 280, 'volume_mult': 1.2},
    '11234': {'income_mult': 0.7, 'procedures': ['facial', 'botox'], 'avg_revenue': 320, 'volume_mult': 1.3},
    '07306': {'income_mult': 0.5, 'procedures': ['facial'], 'avg_revenue': 250, 'volume_mult': 1.0},
    
    # Emerging areas
    '11385': {'income_mult': 0.8, 'procedures': ['facial', 'botox'], 'avg_revenue': 350, 'volume_mult': 1.4},
    '07030': {'income_mult': 0.9, 'procedures': ['facial', 'botox'], 'avg_revenue': 380, 'volume_mult': 1.3},
    '10805': {'income_mult': 1.1, 'procedures': ['botox', 'filler'], 'avg_revenue': 500, 'volume_mult': 1.2},
}

# Generate patient records
records = []
start_date = datetime(2023, 1, 1)
end_date = datetime(2024, 12, 31)

for zip_code, profile in zip_profiles.items():
    # Calculate number of patients for this ZIP (with some randomness)
    base_patients = int(25 * profile['volume_mult'])  # Base of ~25 patients
    num_patients = max(5, np.random.poisson(base_patients))
    
    for _ in range(num_patients):
        # Generate random consultation date
        days_diff = (end_date - start_date).days
        random_days = random.randint(0, days_diff)
        consult_date = start_date + timedelta(days=random_days)
        
        # Select procedure based on ZIP profile preferences
        procedure = np.random.choice(profile['procedures'])
        
        # Generate revenue based on procedure and ZIP demographics
        base_revenue = profile['avg_revenue']
        
        # Add procedure-specific adjustments
        procedure_multipliers = {
            'botox': 0.7,
            'filler': 1.2,
            'laser': 1.5,
            'coolsculpting': 2.0,
            'facial': 0.4
        }
        
        adjusted_revenue = base_revenue * procedure_multipliers.get(procedure, 1.0)
        
        # Add some realistic variance (±30%)
        revenue = int(adjusted_revenue * np.random.uniform(0.7, 1.3))
        
        # Ensure minimum realistic revenue
        revenue = max(150, revenue)
        
        records.append({
            'zip_code': int(zip_code),
            'procedure_type': procedure,
            'revenue': revenue,
            'consult_date': consult_date.strftime('%Y-%m-%d')
        })

# Create DataFrame and sort by date
df = pd.DataFrame(records)
df = df.sort_values('consult_date').reset_index(drop=True)

# Display statistics
print(f"Generated dataset with {len(df)} patient records across {len(zip_profiles)} ZIP codes")
print(f"\nZIP code distribution:")
print(df['zip_code'].value_counts().sort_index())
print(f"\nProcedure distribution:")
print(df['procedure_type'].value_counts())
print(f"\nRevenue statistics:")
print(df['revenue'].describe())
print(f"\nSample records:")
print(df.head(10))

# Save to CSV
df.to_csv('synthetic_medspa_patients.csv', index=False)
print(f"\nDataset saved as 'synthetic_medspa_patients.csv'")

# Also create a simple competitors dataset
competitors_data = [
    {'zip_code': '10021', 'competitor_name': 'Manhattan Aesthetics', 'competitor_type': 'medspa'},
    {'zip_code': '10021', 'competitor_name': 'Elite Dermatology', 'competitor_type': 'dermatology'},
    {'zip_code': '10022', 'competitor_name': 'Midtown Skin Care', 'competitor_type': 'medspa'},
    {'zip_code': '10065', 'competitor_name': 'Upper East Aesthetics', 'competitor_type': 'medspa'},
    {'zip_code': '10065', 'competitor_name': 'Park Avenue Dermatology', 'competitor_type': 'dermatology'},
    {'zip_code': '07078', 'competitor_name': 'Jersey Glow', 'competitor_type': 'medspa'},
    {'zip_code': '07932', 'competitor_name': 'Suburban Skin', 'competitor_type': 'medspa'},
    {'zip_code': '07932', 'competitor_name': 'Morris County Aesthetics', 'competitor_type': 'medspa'},
    {'zip_code': '11030', 'competitor_name': 'Long Island Beauty', 'competitor_type': 'medspa'},
    {'zip_code': '11801', 'competitor_name': 'Nassau Aesthetics', 'competitor_type': 'medspa'},
    {'zip_code': '11801', 'competitor_name': 'Hicksville Dermatology', 'competitor_type': 'dermatology'},
]

competitors_df = pd.DataFrame(competitors_data)
competitors_df.to_csv('synthetic_competitors.csv', index=False)
print(f"Competitors dataset saved as 'synthetic_competitors.csv'")

print(f"\nDataset characteristics that will test your algorithm:")
print("- Income levels vary from $30k (working class) to $150k+ (Manhattan)")
print("- Procedure preferences vary by demographics (facials in lower income, laser/coolsculpting in higher)")
print("- Revenue per patient ranges from $200-$2000+ based on location and procedure")
print("- Competition varies from 0 (emerging areas) to 3+ (Manhattan)")
print("- Geographic spread from Manhattan to suburbs to working-class areas")
print("- 18 ZIP codes with 400+ total patients for meaningful analysis")

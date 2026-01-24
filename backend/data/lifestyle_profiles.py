# backend/data/lifestyle_profiles.py
"""
PRIZM-style lifestyle segment definitions for medspa patients
Based on income, education, homeownership, age, and location patterns
"""

LIFESTYLE_SEGMENTS = {
    "Luxury Seekers": {
        "label": "Luxury Seekers",
        "tagline": "Affluent early adopters with premium aesthetics focus",
        "income_range": "$150K+",
        "age_range": "40-60",
        "characteristics": [
            "High disposable income",
            "College educated",
            "Homeowners in premium areas",
            "Regular aesthetic maintenance"
        ],
        "color": "#8B5CF6",  # Purple
        "icon": "crown"
    },
    "Affluent Wellness": {
        "label": "Affluent Wellness",
        "tagline": "Health-conscious professionals with preventative focus",
        "income_range": "$100K-$150K",
        "age_range": "35-55",
        "characteristics": [
            "Upper-middle income",
            "Career professionals",
            "Preventative care mindset",
            "Value quality over price"
        ],
        "color": "#3B82F6",  # Blue
        "icon": "heart"
    },
    "Young Professionals": {
        "label": "Young Professionals",
        "tagline": "Emerging aesthetic consumers, digitally native",
        "income_range": "$60K-$100K",
        "age_range": "25-40",
        "characteristics": [
            "Growing income trajectory",
            "Social media influenced",
            "First-time aesthetic patients",
            "Responsive to digital marketing"
        ],
        "color": "#10B981",  # Green
        "icon": "trending-up"
    },
    "Budget Conscious": {
        "label": "Budget Conscious",
        "tagline": "Value-focused, occasion-based aesthetic consumers",
        "income_range": "$40K-$80K",
        "age_range": "30-50",
        "characteristics": [
            "Price sensitive",
            "Occasion-based treatments",
            "Responsive to promotions",
            "Limited frequency"
        ],
        "color": "#F59E0B",  # Orange
        "icon": "dollar-sign"
    },
    "Premium Lifestyle": {
        "label": "Premium Lifestyle",
        "tagline": "High-frequency aesthetic enthusiasts",
        "income_range": "$120K+",
        "age_range": "30-50",
        "characteristics": [
            "Regular treatment schedule",
            "Multi-procedure patients",
            "Brand conscious",
            "Referral sources"
        ],
        "color": "#EC4899",  # Pink
        "icon": "star"
    }
}

def assign_lifestyle_segment(median_income: float, college_pct: float, 
                             owner_pct: float, age_group_pct: float) -> str:
    """
    Assign lifestyle segment based on demographics
    More sophisticated than simple clustering - uses rule-based logic
    """
    
    # Luxury Seekers: High income + high education + high homeownership
    if median_income >= 150000 and college_pct >= 0.45 and owner_pct >= 0.65:
        return "Luxury Seekers"
    
    # Premium Lifestyle: Very high income + educated
    elif median_income >= 120000 and college_pct >= 0.40:
        return "Premium Lifestyle"
    
    # Affluent Wellness: Upper-middle income + professional demographic
    elif median_income >= 90000 and college_pct >= 0.35:
        return "Affluent Wellness"
    
    # Young Professionals: Moderate income + younger age profile
    elif median_income >= 60000 and age_group_pct >= 0.35:
        return "Young Professionals"
    
    # Budget Conscious: Everyone else
    else:
        return "Budget Conscious"

def get_segment_details(segment_name: str) -> dict:
    """Get full profile details for a segment"""
    return LIFESTYLE_SEGMENTS.get(segment_name, LIFESTYLE_SEGMENTS["Budget Conscious"])

def get_cluster_for_zip(zip_code: str) -> str:
    """
    Get psychographic cluster for a ZIP code based on income data.
    Uses simplified logic based on median income from zip_income.csv.
    Returns cluster name or "Budget Conscious" as fallback.
    """
    if not zip_code or zip_code == "00000":
        return "Budget Conscious"

    try:
        # Import here to avoid circular dependency
        from services.zip_income import get_zip_income_data

        # Get income data for this ZIP
        income_data = get_zip_income_data([zip_code])
        median_income = income_data.get(str(zip_code), 67000)

        # Simplified assignment based primarily on income
        # (In production, could enhance with full demographic data)
        if median_income >= 150000:
            return "Luxury Seekers"
        elif median_income >= 120000:
            return "Premium Lifestyle"
        elif median_income >= 90000:
            return "Affluent Wellness"
        elif median_income >= 60000:
            return "Young Professionals"
        else:
            return "Budget Conscious"
    except Exception as e:
        # Fallback on any error
        return "Budget Conscious"
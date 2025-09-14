import pandas as pd
from .zip_income import get_zip_income_data

def validate_algorithm_accuracy(patients_df: pd.DataFrame, zip_scores: pd.DataFrame) -> dict:
    """
    Test predictions against known patient ZIP codes to measure algorithm performance.
    Returns accuracy metrics (e.g., correlation, MAE).
    """
    # Merge patient ZIPs with scores
    merged = patients_df.merge(zip_scores, left_on="zip_code", right_on="zip", how="inner")
    if 'match_score' not in merged.columns:
        return {"error": "No match_score in zip_scores"}
    
    # True: patient count or revenue, Pred: match_score
    grouped = merged.groupby("zip_code").agg({"revenue": "sum", "match_score": "mean"})
    if len(grouped) < 3:
        return {"error": "Not enough data for validation"}
    
    # Correlation and MAE
    corr = grouped["revenue"].corr(grouped["match_score"])
    mae = (grouped["revenue"] - grouped["match_score"]).abs().mean()
    
    # Convert correlation to accuracy percentage
    accuracy_score = (abs(corr) * 100) if not pd.isna(corr) else 0
    
    # Confidence level based on sample size and correlation
    if len(grouped) >= 10 and abs(corr) > 0.7:
        confidence = "High"
    elif len(grouped) >= 5 and abs(corr) > 0.5:
        confidence = "Medium"  
    else:
        confidence = "Low"
    
    # Business metrics
    top_predicted_zips = grouped.nlargest(3, 'match_score').index.tolist()
    top_revenue_zips = grouped.nlargest(3, 'revenue').index.tolist()
    overlap = len(set(top_predicted_zips) & set(top_revenue_zips))
    
    return {
        "correlation": corr, 
        "mae": mae, 
        "n_zip": len(grouped),
        "accuracy_percentage": f"{accuracy_score:.1f}%",
        "confidence_level": confidence,                    
        "top_zip_accuracy": f"{overlap}/3 correct",       
        "status": "Model is working!" if accuracy_score > 60 else "Needs improvement"
    }

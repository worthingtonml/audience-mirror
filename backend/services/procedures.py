import pandas as pd
from typing import List, Dict, Tuple
from config import CANON_MAP, normalize_procedure

def detect_procedures(df: pd.DataFrame) -> List[Dict[str, any]]:
    """
    Detect all procedure types in the dataset with counts and normalization.
    
    Returns list of procedures with name, count, and raw_variants.
    """
    if "procedure_type" not in df.columns:
        raise ValueError("Missing 'procedure_type' column in dataset")
    
    # Apply normalization
    df_copy = df.copy()
    df_copy["procedure_norm"] = df_copy["procedure_type"].apply(normalize_procedure)
    
    # Get counts by normalized name
    norm_counts = df_copy["procedure_norm"].dropna().value_counts()
    
    # Group raw variants by normalized name
    variant_groups = df_copy.groupby("procedure_norm")["procedure_type"].apply(
        lambda x: list(x.unique())
    ).to_dict()
    
    # Build result list
    procedures = []
    for norm_name in sorted(norm_counts.index):
        procedures.append({
            "name": norm_name,
            "count": int(norm_counts[norm_name]),
            "raw_variants": variant_groups.get(norm_name, [])
        })
    
    return procedures

def apply_procedure_normalization(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add procedure_norm column to dataframe for consistent filtering.
    """
    if "procedure_type" not in df.columns:
        raise ValueError("Missing 'procedure_type' column in dataset")
    
    df_normalized = df.copy()
    df_normalized["procedure_norm"] = df_normalized["procedure_type"].apply(normalize_procedure)
    return df_normalized

def filter_by_procedure(df: pd.DataFrame, procedure: str) -> pd.DataFrame:
    """
    Filter dataframe to specific procedure. Use 'all' for no filtering.
    """
    if procedure in ("", "all", "all_procedures"):
        return df
    
    if "procedure_norm" not in df.columns:
        df = apply_procedure_normalization(df)
    
    return df[df["procedure_norm"] == procedure].copy()

def get_procedure_summary(df: pd.DataFrame) -> Dict[str, any]:
    """
    Get summary statistics for all procedures in dataset.
    """
    if "procedure_norm" not in df.columns:
        df = apply_procedure_normalization(df)
    
    summary = df.groupby("procedure_norm").agg({
        "revenue": ["count", "sum", "mean"],
        "zip_code": "nunique"
    }).round(2)
    
    # Flatten column names
    summary.columns = ["patient_count", "total_revenue", "avg_revenue", "unique_zips"]
    summary = summary.reset_index()
    
    return {
        "total_procedures": len(summary),
        "total_patients": int(df["revenue"].count()),
        "procedures": summary.to_dict("records")
    }
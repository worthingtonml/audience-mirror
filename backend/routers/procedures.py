from fastapi import APIRouter, HTTPException
from services.data_loaders import validate_and_load_patients

router = APIRouter(prefix="/procedures", tags=["procedures"])

@router.get("")
def list_procedures(dataset_id: str):
    # For now, we'll use a file path - you may need to adjust this based on how you handle dataset_id
    file_path = f"{dataset_id}.csv"  # Adjust this path as needed
    
    success, warnings, df = validate_and_load_patients(file_path)
    
    if not success or df is None:
        raise HTTPException(400, "Failed to load dataset or missing 'procedure_type' column.")
    
    if "procedure_norm" not in df.columns:
        raise HTTPException(400, "Dataset missing procedure normalization step.")
    
    vc = df["procedure_norm"].dropna().value_counts()
    items = [{"name": k, "count": int(vc[k])} for k in sorted(vc.index)]
    return {"procedures": items}
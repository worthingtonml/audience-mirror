from fastapi import APIRouter, HTTPException, Depends
from services.data_loaders import validate_and_load_patients
from database import get_db, Dataset
from sqlalchemy.orm import Session

router = APIRouter(prefix="/procedures", tags=["procedures"])

@router.get("")
def list_procedures(dataset_id: str, db: Session = Depends(get_db)):
    # For now, we'll use a file path - you may need to adjust this based on how you handle dataset_id
    # Get the actual file path from database
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    file_path = dataset.patients_path
    
    success, warnings, df = validate_and_load_patients(file_path)
    
    if not success or df is None:
        raise HTTPException(400, "Failed to load dataset or missing 'procedure_type' column.")
    
    if "procedure_norm" not in df.columns:
        raise HTTPException(400, "Dataset missing procedure normalization step.")
    
    vc = df["procedure_norm"].dropna().value_counts()
    items = [{"name": k, "count": int(vc[k])} for k in sorted(vc.index)]
    return {"procedures": items}
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.compare import CompareResponse
from app.services.compare import compare_ranges
from app.schemas.common import validate_date_format

router = APIRouter(prefix="/compare", tags=["compare"])

@router.get("", response_model=CompareResponse)
def compare_date_ranges(
    a_from: str = Query(...),
    a_to: str = Query(...),
    b_from: str = Query(...),
    b_to: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        validate_date_format(a_from)
        validate_date_format(a_to)
        validate_date_format(b_from)
        validate_date_format(b_to)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if a_from > a_to or b_from > b_to:
        raise HTTPException(status_code=422, detail="Start date must be before or equal to end date in ranges")

    return compare_ranges(db, a_from, a_to, b_from, b_to)

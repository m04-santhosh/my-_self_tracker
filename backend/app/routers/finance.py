from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.finance import Transaction
from app.schemas.finance import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    FinanceSummaryResponse, FIProgressResponse
)
from app.services.finance import get_finance_summary, get_fi_progress
from app.services.scheduler import format_date

router = APIRouter(tags=["finance"])

@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if from_date:
        query = query.filter(Transaction.date >= from_date)
    if to_date:
        query = query.filter(Transaction.date <= to_date)
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)
    return query.order_by(Transaction.date.desc(), Transaction.id.desc()).all()

@router.post("/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(tx_in: TransactionCreate, db: Session = Depends(get_db)):
    now_iso = datetime.now().isoformat()
    tx = Transaction(
        type=tx_in.type.value,
        amount_paise=tx_in.amount_paise,
        category=tx_in.category,
        date=tx_in.date,
        note=tx_in.note,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.patch("/transactions/{id}", response_model=TransactionResponse)
def update_transaction(id: int, update_in: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    now_iso = datetime.now().isoformat()
    data = update_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        if hasattr(tx, k):
            val = v.value if hasattr(v, "value") else v
            setattr(tx, k, val)

    tx.updated_at = now_iso
    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/transactions/{id}", status_code=204)
def delete_transaction(id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return None

@router.get("/finance/summary", response_model=FinanceSummaryResponse)
def finance_summary(db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    return get_finance_summary(db, today_str)

@router.get("/finance/fi-progress", response_model=FIProgressResponse)
def fi_progress(db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    return get_fi_progress(db, today_str)

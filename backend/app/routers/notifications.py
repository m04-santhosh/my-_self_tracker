from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.notification import NotificationItem
from app.services.notifications import get_upcoming_notifications
from app.services.scheduler import format_date

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/upcoming", response_model=List[NotificationItem])
def get_upcoming(
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db)
):
    target_date = date_str or format_date(date.today())
    return get_upcoming_notifications(db, target_date)

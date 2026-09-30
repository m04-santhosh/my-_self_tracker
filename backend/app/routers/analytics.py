from datetime import date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.analytics import (
    DailyTrendPoint, CategoryPerformance, WeeklyBarPoint,
    MonthlyComparisonPoint, ConsistencyStats
)
from app.services.analytics import (
    get_daily_analytics, get_category_analytics,
    get_weekly_analytics, get_monthly_analytics
)
from app.services.scoring import (
    compute_consistency, get_setting_value
)
from app.services.scheduler import format_date

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/daily", response_model=List[DailyTrendPoint])
def daily_analytics(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    start_setting = get_setting_value(db, "start_date", "2026-10-01")
    f_date = from_date or start_setting
    t_date = to_date or today_str
    return get_daily_analytics(db, f_date, t_date, today_str)

@router.get("/categories", response_model=List[CategoryPerformance])
def category_analytics(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    start_setting = get_setting_value(db, "start_date", "2026-10-01")
    f_date = from_date or start_setting
    t_date = to_date or today_str
    return get_category_analytics(db, f_date, t_date)

@router.get("/weekly", response_model=List[WeeklyBarPoint])
def weekly_analytics(
    weeks: int = Query(4, ge=1, le=26),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    return get_weekly_analytics(db, weeks, today_str)

@router.get("/monthly", response_model=List[MonthlyComparisonPoint])
def monthly_analytics(db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    return get_monthly_analytics(db, today_str)

@router.get("/consistency", response_model=ConsistencyStats)
def consistency_analytics(db: Session = Depends(get_db)):
    today_str = format_date(date.today())
    start_setting = get_setting_value(db, "start_date", "2026-10-01")
    end_setting = get_setting_value(db, "end_date", "2026-12-31")
    threshold = get_setting_value(db, "success_threshold", 70)
    data = compute_consistency(db, start_setting, end_setting, today_str, threshold)
    return ConsistencyStats(**data)

@router.get("/summary")
def analytics_summary(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    start_setting = get_setting_value(db, "start_date", "2026-10-01")
    end_setting = get_setting_value(db, "end_date", "2026-12-31")
    threshold = get_setting_value(db, "success_threshold", 70)

    f_date = from_date or start_setting
    t_date = to_date or today_str

    daily = get_daily_analytics(db, f_date, t_date, today_str)
    categories = get_category_analytics(db, f_date, t_date)
    consistency = compute_consistency(db, start_setting, end_setting, today_str, threshold)

    return {
        "from": f_date,
        "to": t_date,
        "daily": daily,
        "categories": categories,
        "consistency": consistency,
    }

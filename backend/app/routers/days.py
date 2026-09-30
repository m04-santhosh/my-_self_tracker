from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.activity import ActivityInstance
from app.models.review import DailyReview
from app.schemas.days import DayDetailResponse, DaySummaryResponse, DayCounts, DayNumberInfo
from app.schemas.review import DailyReviewUpsert, DailyReviewResponse, ResolvePendingRequest
from app.schemas.activity import ActivityInstanceResponse
from app.services.scheduler import ensure_instances, format_date, parse_date
from app.services.scoring import (
    compute_day_info, compute_day_scores, get_setting_value
)

router = APIRouter(prefix="/days", tags=["days"])

@router.get("", response_model=List[DaySummaryResponse])
def get_days_summary(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db)
):
    today_str = format_date(date.today())
    f_date = from_date or today_str
    t_date = to_date or today_str

    ensure_instances(db, f_date, t_date)

    start_date_setting = get_setting_value(db, "start_date", "2026-10-01")
    end_date_setting = get_setting_value(db, "end_date", "2026-12-31")
    success_threshold = get_setting_value(db, "success_threshold", 70)

    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date >= f_date,
        ActivityInstance.date <= t_date
    ).all()

    reviews = {r.date: r for r in db.query(DailyReview).filter(
        DailyReview.date >= f_date,
        DailyReview.date <= t_date
    ).all()}

    insts_by_date = {}
    for inst in instances:
        insts_by_date.setdefault(inst.date, []).append(inst)

    results: List[DaySummaryResponse] = []
    curr = parse_date(f_date)
    end = parse_date(t_date)

    while curr <= end:
        curr_str = format_date(curr)
        day_insts = insts_by_date.get(curr_str, [])
        rev = reviews.get(curr_str)
        is_rest = rev.is_rest_day if rev else False
        is_closed = (curr < date.today()) or (rev.closed_at is not None if rev else False)

        score, live_progress, is_succ, counts = compute_day_scores(
            day_insts, is_closed=is_closed, is_rest_day=is_rest, success_threshold=success_threshold
        )
        day_info = compute_day_info(curr_str, start_date_setting, end_date_setting)

        # Unlogged count: pending items on past dates
        unlogged = counts["pending"] if curr < date.today() else 0

        f_min = sum(i.duration_minutes or 0 for i in day_insts if i.counts_as == "focus" and i.status in ("completed", "partial"))
        e_min = sum(i.duration_minutes or 0 for i in day_insts if i.counts_as == "exercise" and i.status in ("completed", "partial"))

        results.append(
            DaySummaryResponse(
                date=curr_str,
                day_number=day_info["day_number"],
                score=score,
                live_progress=live_progress,
                is_closed=is_closed,
                is_successful=is_succ,
                is_rest_day=is_rest,
                counts=DayCounts(**counts),
                unlogged_count=unlogged,
                day_rating=rev.day_rating if rev else None,
                focus_minutes=f_min,
                exercise_minutes=e_min,
            )
        )
        curr += timedelta(days=1)

    return results

@router.get("/{date_str}", response_model=DayDetailResponse)
def get_day_detail(date_str: str, db: Session = Depends(get_db)):
    # Ensure instances are generated for this date
    ensure_instances(db, date_str, date_str)

    today = date.today()
    target_d = parse_date(date_str)

    start_date_setting = get_setting_value(db, "start_date", "2026-10-01")
    end_date_setting = get_setting_value(db, "end_date", "2026-12-31")
    success_threshold = get_setting_value(db, "success_threshold", 70)

    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date == date_str
    ).order_by(ActivityInstance.planned_start).all()

    rev = db.query(DailyReview).filter(DailyReview.date == date_str).first()
    is_rest = rev.is_rest_day if rev else False
    is_closed = (target_d < today) or (rev.closed_at is not None if rev else False)

    score, live_progress, is_succ, counts = compute_day_scores(
        instances, is_closed=is_closed, is_rest_day=is_rest, success_threshold=success_threshold
    )
    day_info = compute_day_info(date_str, start_date_setting, end_date_setting)

    unlogged = counts["pending"] if target_d < today else 0

    f_min = sum(i.duration_minutes or 0 for i in instances if i.counts_as == "focus" and i.status in ("completed", "partial"))
    e_min = sum(i.duration_minutes or 0 for i in instances if i.counts_as == "exercise" and i.status in ("completed", "partial"))

    return DayDetailResponse(
        date=date_str,
        day_info=DayNumberInfo(**day_info),
        score=score,
        live_progress=live_progress,
        is_closed=is_closed,
        is_successful=is_succ,
        counts=DayCounts(**counts),
        unlogged_count=unlogged,
        instances=[ActivityInstanceResponse.model_validate(i) for i in instances],
        review=DailyReviewResponse.model_validate(rev) if rev else None,
        focus_minutes=f_min,
        exercise_minutes=e_min,
    )

@router.put("/{date_str}/review", response_model=DailyReviewResponse)
def upsert_daily_review(
    date_str: str,
    rev_in: DailyReviewUpsert,
    db: Session = Depends(get_db)
):
    now_iso = datetime.now().isoformat()
    rev = db.query(DailyReview).filter(DailyReview.date == date_str).first()

    closed_at_val = None
    if rev_in.close_day:
        closed_at_val = now_iso

    if not rev:
        rev = DailyReview(
            date=date_str,
            went_well=rev_in.went_well,
            went_wrong=rev_in.went_wrong,
            change_tomorrow=rev_in.change_tomorrow,
            day_rating=rev_in.day_rating,
            is_rest_day=rev_in.is_rest_day,
            closed_at=closed_at_val,
            created_at=now_iso,
            updated_at=now_iso,
        )
        db.add(rev)
    else:
        rev.went_well = rev_in.went_well
        rev.went_wrong = rev_in.went_wrong
        rev.change_tomorrow = rev_in.change_tomorrow
        rev.day_rating = rev_in.day_rating
        rev.is_rest_day = rev_in.is_rest_day
        if rev_in.close_day and not rev.closed_at:
            rev.closed_at = now_iso
        rev.updated_at = now_iso

    db.commit()
    db.refresh(rev)
    return rev

@router.post("/{date_str}/resolve-pending")
def resolve_pending_instances(
    date_str: str,
    req: ResolvePendingRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk action to mark all remaining pending instances on date as missed or skipped
    """
    now_iso = datetime.now().isoformat()
    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date == date_str,
        ActivityInstance.status == "pending"
    ).all()

    resolved_count = 0
    for inst in instances:
        inst.status = req.status
        inst.logged_at = now_iso
        inst.updated_at = now_iso
        resolved_count += 1

    db.commit()
    return {"date": date_str, "resolved_count": resolved_count, "new_status": req.status}

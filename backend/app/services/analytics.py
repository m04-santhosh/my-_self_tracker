from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.activity import ActivityInstance
from app.models.review import DailyReview
from app.models.finance import Transaction
from app.schemas.analytics import (
    DailyTrendPoint, CategoryPerformance, WeeklyBarPoint,
    MonthlyComparisonPoint, ConsistencyStats
)
from app.services.scoring import (
    parse_date, format_date, compute_day_info, compute_day_scores,
    compute_consistency, get_setting_value
)
from app.services.compare import calculate_sleep_hours_for_date

def get_daily_analytics(db: Session, from_date_str: str, to_date_str: str, today_str: str) -> List[DailyTrendPoint]:
    start_d = parse_date(from_date_str)
    end_d = parse_date(to_date_str)
    today_d = parse_date(today_str)

    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date >= from_date_str,
        ActivityInstance.date <= to_date_str
    ).all()

    reviews = {r.date: r for r in db.query(DailyReview).filter(
        DailyReview.date >= from_date_str,
        DailyReview.date <= to_date_str
    ).all()}

    insts_by_date: Dict[str, List[ActivityInstance]] = {}
    for inst in instances:
        insts_by_date.setdefault(inst.date, []).append(inst)

    results: List[DailyTrendPoint] = []
    curr = start_d
    success_threshold = get_setting_value(db, "success_threshold", 70)
    start_date_setting = get_setting_value(db, "start_date", "2026-10-01")
    end_date_setting = get_setting_value(db, "end_date", "2026-12-31")

    while curr <= end_d:
        curr_str = format_date(curr)
        day_insts = insts_by_date.get(curr_str, [])
        rev = reviews.get(curr_str)
        is_rest = rev.is_rest_day if rev else False
        is_closed = (curr < today_d) or (rev.closed_at is not None if rev else False)

        score, live_progress, is_succ, counts = compute_day_scores(day_insts, is_closed, is_rest, success_threshold)
        day_info = compute_day_info(curr_str, start_date_setting, end_date_setting)

        # Sleep hours
        sleep_h = calculate_sleep_hours_for_date(db, curr_str)

        # Focus & exercise minutes
        f_min = sum(i.duration_minutes or 0 for i in day_insts if i.counts_as == "focus" and i.status in ("completed", "partial"))
        e_min = sum(i.duration_minutes or 0 for i in day_insts if i.counts_as == "exercise" and i.status in ("completed", "partial"))

        if is_rest:
            status_tag = "rest"
        elif is_closed:
            status_tag = "closed"
        elif counts["pending"] > 0 and curr < today_d:
            status_tag = "unlogged"
        else:
            status_tag = "live"

        results.append(
            DailyTrendPoint(
                date=curr_str,
                day_number=day_info["day_number"],
                score=score,
                live_progress=live_progress,
                sleep_hours=sleep_h,
                rating=rev.day_rating if rev else None,
                exercise_minutes=e_min,
                focus_minutes=f_min,
                is_rest_day=is_rest,
                status=status_tag,
            )
        )
        curr += timedelta(days=1)

    return results

def get_category_analytics(db: Session, from_date_str: str, to_date_str: str) -> List[CategoryPerformance]:
    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date >= from_date_str,
        ActivityInstance.date <= to_date_str
    ).all()

    cats = ["mind", "body", "career", "money", "life", "discipline"]
    data = {c: {"total": 0, "completed": 0, "partial": 0, "missed": 0, "skipped": 0} for c in cats}

    for inst in instances:
        c = inst.category.lower()
        if c not in data:
            data[c] = {"total": 0, "completed": 0, "partial": 0, "missed": 0, "skipped": 0}
        data[c]["total"] += 1
        st = inst.status.lower()
        if st == "completed":
            data[c]["completed"] += 1
        elif st == "partial":
            data[c]["partial"] += 1
        elif st == "missed":
            data[c]["missed"] += 1
        elif st == "skipped":
            data[c]["skipped"] += 1

    results = []
    for c in cats:
        d = data[c]
        denom = d["completed"] + d["partial"] + d["missed"]
        if denom > 0:
            rate = round(((d["completed"] + 0.5 * d["partial"]) / denom) * 100, 1)
        else:
            rate = None

        results.append(
            CategoryPerformance(
                category=c,
                total_planned=d["total"],
                completed=d["completed"],
                partial=d["partial"],
                missed=d["missed"],
                skipped=d["skipped"],
                completion_rate=rate,
            )
        )

    return results

def get_weekly_analytics(db: Session, weeks: int, today_str: str) -> List[WeeklyBarPoint]:
    today_d = parse_date(today_str)
    # Start of current week (Monday)
    curr_mon = today_d - timedelta(days=today_d.weekday())

    results: List[WeeklyBarPoint] = []
    for w in range(weeks - 1, -1, -1):
        w_start = curr_mon - timedelta(weeks=w)
        w_end = w_start + timedelta(days=6)
        w_start_str = format_date(w_start)
        w_end_str = format_date(w_end)

        insts = db.query(ActivityInstance).filter(
            ActivityInstance.date >= w_start_str,
            ActivityInstance.date <= w_end_str
        ).all()

        reviews = {r.date: r for r in db.query(DailyReview).filter(
            DailyReview.date >= w_start_str,
            DailyReview.date <= w_end_str
        ).all()}

        # Scores by date
        by_d: Dict[str, List[ActivityInstance]] = {}
        for i in insts:
            by_d.setdefault(i.date, []).append(i)

        scores = []
        for d_key, d_insts in by_d.items():
            r = reviews.get(d_key)
            is_rest = r.is_rest_day if r else False
            sc, _, _, _ = compute_day_scores(d_insts, is_closed=True, is_rest_day=is_rest)
            if sc is not None:
                scores.append(sc)

        e_min = sum(i.duration_minutes or 0 for i in insts if i.counts_as == "exercise" and i.status in ("completed", "partial"))
        f_min = sum(i.duration_minutes or 0 for i in insts if i.counts_as == "focus" and i.status in ("completed", "partial"))
        completed = sum(1 for i in insts if i.status == "completed")
        avg_sc = round(sum(scores) / len(scores), 1) if scores else None

        week_label = f"W{w_start.isocalendar()[1]} ({w_start.strftime('%b %d')}-{w_end.strftime('%b %d')})"

        results.append(
            WeeklyBarPoint(
                week_label=week_label,
                start_date=w_start_str,
                end_date=w_end_str,
                avg_score=avg_sc,
                exercise_minutes=e_min,
                focus_minutes=f_min,
                total_completed=completed,
            )
        )

    return results

def get_monthly_analytics(db: Session, today_str: str) -> List[MonthlyComparisonPoint]:
    """Oct, Nov, Dec 2026 90-day comparison"""
    months = [
        ("October", 2026, 10, "2026-10-01", "2026-10-31"),
        ("November", 2026, 11, "2026-11-01", "2026-11-30"),
        ("December", 2026, 12, "2026-12-01", "2026-12-31"),
    ]

    today_d = parse_date(today_str)
    results: List[MonthlyComparisonPoint] = []

    for name, year, m_num, m_start_str, m_end_str in months:
        m_start = parse_date(m_start_str)
        m_end = parse_date(m_end_str)

        if today_d < m_start:
            days_elapsed = 0
        elif today_d > m_end:
            days_elapsed = (m_end - m_start).days + 1
        else:
            days_elapsed = (today_d - m_start).days + 1

        insts = db.query(ActivityInstance).filter(
            ActivityInstance.date >= m_start_str,
            ActivityInstance.date <= m_end_str
        ).all()

        reviews = {r.date: r for r in db.query(DailyReview).filter(
            DailyReview.date >= m_start_str,
            DailyReview.date <= m_end_str
        ).all()}

        by_d: Dict[str, List[ActivityInstance]] = {}
        for i in insts:
            by_d.setdefault(i.date, []).append(i)

        scores = []
        for d_key, d_insts in by_d.items():
            r = reviews.get(d_key)
            is_rest = r.is_rest_day if r else False
            sc, _, _, _ = compute_day_scores(d_insts, is_closed=True, is_rest_day=is_rest)
            if sc is not None:
                scores.append(sc)

        e_min = sum(i.duration_minutes or 0 for i in insts if i.counts_as == "exercise" and i.status in ("completed", "partial"))
        f_min = sum(i.duration_minutes or 0 for i in insts if i.counts_as == "focus" and i.status in ("completed", "partial"))
        completed = sum(1 for i in insts if i.status == "completed")
        avg_sc = round(sum(scores) / len(scores), 1) if scores else None

        inc = db.query(func.sum(Transaction.amount_paise)).filter(
            Transaction.type == "income",
            Transaction.date >= m_start_str,
            Transaction.date <= m_end_str
        ).scalar() or 0

        exp = db.query(func.sum(Transaction.amount_paise)).filter(
            Transaction.type == "expense",
            Transaction.date >= m_start_str,
            Transaction.date <= m_end_str
        ).scalar() or 0

        results.append(
            MonthlyComparisonPoint(
                month_name=name,
                year=year,
                month=m_num,
                days_elapsed=days_elapsed,
                avg_score=avg_sc,
                total_completed=completed,
                exercise_minutes=e_min,
                focus_minutes=f_min,
                income_paise=inc,
                expense_paise=exp,
                net_paise=inc - exp,
            )
        )

    return results

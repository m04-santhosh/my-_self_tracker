from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.activity import ActivityInstance
from app.models.review import DailyReview
from app.models.finance import Transaction
from app.schemas.compare import CompareResponse, CompareRangeData, MetricComparison, MetricWithAverage
from app.services.scoring import parse_date, format_date, compute_day_scores, get_setting_value

def calculate_sleep_hours_for_date(db: Session, date_str: str) -> Optional[float]:
    d = parse_date(date_str)
    prev_d = d - timedelta(days=1)
    prev_str = format_date(prev_d)

    wake_inst = db.query(ActivityInstance).filter(
        ActivityInstance.date == date_str,
        ActivityInstance.special_role == "wake",
        ActivityInstance.actual_start.isnot(None)
    ).first()

    bed_inst = db.query(ActivityInstance).filter(
        ActivityInstance.date == prev_str,
        ActivityInstance.special_role == "bedtime",
        ActivityInstance.actual_start.isnot(None)
    ).first()

    if not wake_inst or not bed_inst or not wake_inst.actual_start or not bed_inst.actual_start:
        return None

    try:
        # Handle HH:MM or ISO
        def to_dt(d_obj: date, val: str) -> datetime:
            val = val.strip()
            if "T" in val:
                return datetime.fromisoformat(val)
            parts = val.split(":")
            return datetime(d_obj.year, d_obj.month, d_obj.day, int(parts[0]), int(parts[1]))

        dt_wake = to_dt(d, wake_inst.actual_start)
        dt_bed = to_dt(prev_d, bed_inst.actual_start)

        diff_seconds = (dt_wake - dt_bed).total_seconds()
        if 0 < diff_seconds < 24 * 3600:
            return round(diff_seconds / 3600.0, 2)
    except Exception:
        return None

    return None

def compute_range_data(db: Session, label: str, from_date_str: str, to_date_str: str) -> CompareRangeData:
    start_d = parse_date(from_date_str)
    end_d = parse_date(to_date_str)
    days_in_range = max(0, (end_d - start_d).days + 1)

    instances = db.query(ActivityInstance).filter(
        ActivityInstance.date >= from_date_str,
        ActivityInstance.date <= to_date_str
    ).all()

    reviews = db.query(DailyReview).filter(
        DailyReview.date >= from_date_str,
        DailyReview.date <= to_date_str
    ).all()
    review_by_date = {r.date: r for r in reviews}
    reviews_written = sum(1 for r in reviews if (r.went_well or r.went_wrong or r.change_tomorrow or r.day_rating))

    # Days with data: has at least one logged instance (not pending) or a review
    dates_with_data = set()
    for inst in instances:
        if inst.status != "pending":
            dates_with_data.add(inst.date)
    for r in reviews:
        if r.went_well or r.went_wrong or r.change_tomorrow or r.day_rating:
            dates_with_data.add(r.date)

    days_with_data = len(dates_with_data)

    # Activity counts and scores
    completed_count = 0
    partial_count = 0
    missed_count = 0
    skipped_count = 0
    exercise_minutes_total = 0
    focus_minutes_total = 0
    metrics_by_name_raw: Dict[str, float] = {}

    insts_by_date: Dict[str, List[ActivityInstance]] = {}
    for inst in instances:
        insts_by_date.setdefault(inst.date, []).append(inst)
        st = inst.status.lower()
        dur = inst.duration_minutes or 0

        if st == "completed":
            completed_count += 1
            if inst.counts_as == "exercise":
                exercise_minutes_total += dur
            elif inst.counts_as == "focus":
                focus_minutes_total += dur
        elif st == "partial":
            partial_count += 1
            if inst.counts_as == "exercise":
                exercise_minutes_total += dur
            elif inst.counts_as == "focus":
                focus_minutes_total += dur
        elif st == "missed":
            missed_count += 1
        elif st == "skipped":
            skipped_count += 1

        if inst.metric_name and inst.metric_value is not None and st in ("completed", "partial"):
            m_name = inst.metric_name.strip()
            metrics_by_name_raw[m_name] = metrics_by_name_raw.get(m_name, 0.0) + float(inst.metric_value)

    # Calculate average score over days with scored data
    day_scores: List[int] = []
    curr = start_d
    sleep_hours_list: List[float] = []
    ratings_list: List[int] = []

    while curr <= end_d:
        curr_str = format_date(curr)
        rev = review_by_date.get(curr_str)
        is_rest = rev.is_rest_day if rev else False
        curr_insts = insts_by_date.get(curr_str, [])

        score, _, _, _ = compute_day_scores(curr_insts, is_closed=True, is_rest_day=is_rest)
        if score is not None:
            day_scores.append(score)

        if rev and rev.day_rating is not None:
            ratings_list.append(rev.day_rating)

        # Sleep hours
        sh = calculate_sleep_hours_for_date(db, curr_str)
        if sh is not None:
            sleep_hours_list.append(sh)

        curr += timedelta(days=1)

    avg_score = round(sum(day_scores) / len(day_scores), 1) if day_scores else None
    avg_rating = round(sum(ratings_list) / len(ratings_list), 1) if ratings_list else None
    avg_sleep = round(sum(sleep_hours_list) / len(sleep_hours_list), 2) if sleep_hours_list else None
    days_with_sleep = len(sleep_hours_list)

    # Per-day averages based on days_in_range
    divisor = days_in_range if days_in_range > 0 else 1
    exercise_per_day = round(exercise_minutes_total / divisor, 1) if days_in_range > 0 else None
    focus_per_day = round(focus_minutes_total / divisor, 1) if days_in_range > 0 else None

    metrics_formatted: Dict[str, MetricWithAverage] = {}
    for m_name, total_val in metrics_by_name_raw.items():
        metrics_formatted[m_name] = MetricWithAverage(
            sum=round(total_val, 2),
            per_day_avg=round(total_val / divisor, 2) if days_in_range > 0 else None
        )

    # Finance
    inc = db.query(func.sum(Transaction.amount_paise)).filter(
        Transaction.type == "income",
        Transaction.date >= from_date_str,
        Transaction.date <= to_date_str
    ).scalar() or 0

    exp = db.query(func.sum(Transaction.amount_paise)).filter(
        Transaction.type == "expense",
        Transaction.date >= from_date_str,
        Transaction.date <= to_date_str
    ).scalar() or 0

    net = inc - exp

    return CompareRangeData(
        label=label,
        from_date=from_date_str,
        to_date=to_date_str,
        days_in_range=days_in_range,
        days_with_data=days_with_data,
        avg_score=avg_score,
        completed_count=completed_count,
        partial_count=partial_count,
        missed_count=missed_count,
        skipped_count=skipped_count,
        exercise_minutes_total=exercise_minutes_total,
        exercise_minutes_per_day=exercise_per_day,
        focus_minutes_total=focus_minutes_total,
        focus_minutes_per_day=focus_per_day,
        avg_sleep_hours=avg_sleep,
        days_with_sleep_data=days_with_sleep,
        avg_rating=avg_rating,
        metrics_by_name=metrics_formatted,
        income_paise=inc,
        expenses_paise=exp,
        net_paise=net,
        reviews_written=reviews_written,
    )

def compare_ranges(db: Session, a_from: str, a_to: str, b_from: str, b_to: str) -> CompareResponse:
    a_data = compute_range_data(db, "Range A", a_from, a_to)
    b_data = compute_range_data(db, "Range B", b_from, b_to)

    warnings: List[str] = []
    if a_data.days_in_range != b_data.days_in_range:
        warnings.append("Ranges differ in length; compare daily averages rather than totals.")

    if a_data.days_with_data > 0 and b_data.days_with_data > 0:
        ratio = abs(a_data.days_with_data - b_data.days_with_data) / max(a_data.days_with_data, b_data.days_with_data)
        if ratio > 0.20:
            warnings.append("Days with data differ by more than 20% between ranges.")

    def make_comp(key: str, label: str, a_val: Optional[float], b_val: Optional[float], is_curr: bool = False, unit: Optional[str] = None) -> MetricComparison:
        delta = None
        pct_delta = None
        if a_val is not None and b_val is not None:
            delta = round(b_val - a_val, 2)
            if a_val != 0:
                pct_delta = round((delta / abs(a_val)) * 100, 1)

        return MetricComparison(
            key=key,
            label=label,
            a_value=a_val,
            b_value=b_val,
            delta=delta,
            percent_delta=pct_delta,
            is_currency=is_curr,
            unit=unit
        )

    comparisons: List[MetricComparison] = [
        make_comp("avg_score", "Average Score", a_data.avg_score, b_data.avg_score, unit="%"),
        make_comp("completed_count", "Completed Activities", float(a_data.completed_count), float(b_data.completed_count)),
        make_comp("focus_minutes_total", "Total Focus Minutes", float(a_data.focus_minutes_total), float(b_data.focus_minutes_total), unit="min"),
        make_comp("focus_minutes_per_day", "Daily Focus Avg", a_data.focus_minutes_per_day, b_data.focus_minutes_per_day, unit="min/day"),
        make_comp("exercise_minutes_total", "Total Exercise Minutes", float(a_data.exercise_minutes_total), float(b_data.exercise_minutes_total), unit="min"),
        make_comp("exercise_minutes_per_day", "Daily Exercise Avg", a_data.exercise_minutes_per_day, b_data.exercise_minutes_per_day, unit="min/day"),
        make_comp("avg_sleep_hours", "Average Sleep Hours", a_data.avg_sleep_hours, b_data.avg_sleep_hours, unit="hrs"),
        make_comp("avg_rating", "Average Day Rating", a_data.avg_rating, b_data.avg_rating, unit="/5"),
        make_comp("income_paise", "Income", float(a_data.income_paise), float(b_data.income_paise), is_curr=True),
        make_comp("expenses_paise", "Expenses", float(a_data.expenses_paise), float(b_data.expenses_paise), is_curr=True),
        make_comp("net_paise", "Net", float(a_data.net_paise), float(b_data.net_paise), is_curr=True),
        make_comp("reviews_written", "Reviews Written", float(a_data.reviews_written), float(b_data.reviews_written)),
    ]

    return CompareResponse(
        a=a_data,
        b=b_data,
        comparisons=comparisons,
        warnings=warnings
    )

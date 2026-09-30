import json
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.activity import ActivityInstance
from app.models.review import DailyReview
from app.models.settings import Setting
from app.config import DEFAULT_SETTINGS

def parse_date(date_str: str) -> date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()

def format_date(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def get_setting_value(db: Session, key: str, default: Any = None) -> Any:
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            return setting.value
    return DEFAULT_SETTINGS.get(key, default)

def compute_day_info(date_str: str, start_date_str: str = "2026-10-01", end_date_str: str = "2026-12-31") -> Dict[str, Any]:
    curr = parse_date(date_str)
    start = parse_date(start_date_str)
    end = parse_date(end_date_str)
    total_days = (end - start).days + 1

    if curr < start:
        return {
            "day_number": None,
            "total_days": total_days,
            "state": "before",
            "days_until_start": (start - curr).days,
            "days_remaining": total_days,
        }
    elif curr > end:
        return {
            "day_number": None,
            "total_days": total_days,
            "state": "finished",
            "days_until_start": 0,
            "days_remaining": 0,
        }
    else:
        day_num = (curr - start).days + 1
        days_rem = (end - curr).days
        return {
            "day_number": day_num,
            "total_days": total_days,
            "state": "active",
            "days_until_start": 0,
            "days_remaining": days_rem,
        }

def compute_day_scores(
    instances: List[ActivityInstance],
    is_closed: bool,
    is_rest_day: bool,
    success_threshold: int = 70
) -> Tuple[Optional[int], Optional[int], bool, Dict[str, int]]:
    """
    Computes (score, live_progress, is_successful, counts_dict)
    """
    total = len(instances)
    completed = 0
    partial = 0
    missed = 0
    skipped = 0
    pending = 0

    for inst in instances:
        st = inst.status.lower()
        if st == "completed":
            completed += 1
        elif st == "partial":
            partial += 1
        elif st == "missed":
            missed += 1
        elif st == "skipped":
            skipped += 1
        else: # pending
            pending += 1

    counts = {
        "total": total,
        "completed": completed,
        "partial": partial,
        "missed": missed,
        "skipped": skipped,
        "pending": pending,
    }

    # Day score: (completed + 0.5*partial) / (completed + partial + missed)
    scored_denominator = completed + partial + missed
    if scored_denominator > 0:
        score = int(round(((completed + 0.5 * partial) / scored_denominator) * 100))
    else:
        score = None

    # Today's live progress: (completed + 0.5*partial) / (all non-skipped instances incl. pending)
    live_denominator = completed + partial + missed + pending
    if live_denominator > 0:
        live_progress = int(round(((completed + 0.5 * partial) / live_denominator) * 100))
    else:
        live_progress = None

    # Successful day: score >= threshold and not rest day
    is_successful = False
    if not is_rest_day and score is not None:
        is_successful = (score >= success_threshold)

    return score, live_progress, is_successful, counts

def compute_consistency(
    db: Session,
    start_date_str: str,
    end_date_str: str,
    today_str: str,
    success_threshold: int = 70
) -> Dict[str, Any]:
    """
    Computes streaks, bounce-back rate, average completion, category consistency.
    Null-score days and rest days are neutral (neither extend nor break streak).
    """
    start = parse_date(start_date_str)
    today = parse_date(today_str)
    end = parse_date(end_date_str)

    # Days elapsed is bounded by start and min(today, end)
    calc_end = min(today, end)
    if calc_end < start:
        return {
            "current_streak": 0,
            "best_streak": 0,
            "successful_days": 0,
            "days_elapsed": 0,
            "success_rate": None,
            "average_completion": None,
            "bounce_back_rate": None,
            "never_missed_twice_count": 0,
            "category_consistency": {},
        }

    days_elapsed = (calc_end - start).days + 1

    # Fetch all instances and reviews up to calc_end
    reviews = {r.date: r for r in db.query(DailyReview).filter(
        DailyReview.date >= start_date_str,
        DailyReview.date <= format_date(calc_end)
    ).all()}

    instances_by_date: Dict[str, List[ActivityInstance]] = {}
    all_instances = db.query(ActivityInstance).filter(
        ActivityInstance.date >= start_date_str,
        ActivityInstance.date <= format_date(calc_end)
    ).all()

    category_counts: Dict[str, Dict[str, int]] = {}
    for inst in all_instances:
        instances_by_date.setdefault(inst.date, []).append(inst)
        cat = inst.category
        if cat not in category_counts:
            category_counts[cat] = {"planned": 0, "completed": 0, "partial": 0}
        category_counts[cat]["planned"] += 1
        if inst.status == "completed":
            category_counts[cat]["completed"] += 1
        elif inst.status == "partial":
            category_counts[cat]["partial"] += 1

    category_consistency = {}
    for cat, c_data in category_counts.items():
        if c_data["planned"] > 0:
            category_consistency[cat] = round(((c_data["completed"] + 0.5 * c_data["partial"]) / c_data["planned"]) * 100, 1)
        else:
            category_consistency[cat] = None

    # Track day outcomes in chronological order
    # outcome: "success", "fail", or "neutral" (rest or no score)
    day_outcomes: List[str] = []
    day_scores: List[int] = []

    curr = start
    while curr <= calc_end:
        d_str = format_date(curr)
        rev = reviews.get(d_str)
        is_rest = rev.is_rest_day if rev else False
        is_closed = (curr < today) or (rev.closed_at is not None if rev else False)
        insts = instances_by_date.get(d_str, [])

        score, _, is_succ, _ = compute_day_scores(insts, is_closed, is_rest, success_threshold)

        if score is not None:
            day_scores.append(score)

        if is_rest or score is None:
            day_outcomes.append("neutral")
        elif is_succ:
            day_outcomes.append("success")
        else:
            day_outcomes.append("fail")

        curr += timedelta(days=1)

    # Compute streaks
    # Null-score days and rest days are neutral (they neither extend nor break)
    current_streak = 0
    best_streak = 0
    running_streak = 0

    for outcome in day_outcomes:
        if outcome == "success":
            running_streak += 1
            if running_streak > best_streak:
                best_streak = running_streak
        elif outcome == "fail":
            running_streak = 0
        elif outcome == "neutral":
            pass # neutral: neither extends nor breaks

    # Current streak from end
    for outcome in reversed(day_outcomes):
        if outcome == "success":
            current_streak += 1
        elif outcome == "fail":
            break
        elif outcome == "neutral":
            pass

    successful_days = sum(1 for o in day_outcomes if o == "success")
    success_rate = round((successful_days / days_elapsed) * 100, 1) if days_elapsed > 0 else None
    avg_comp = round(sum(day_scores) / len(day_scores), 1) if day_scores else None

    # Bounce-back rate & never missed twice:
    # Of days that followed a non-successful closed day ("fail"), the share that were successful
    failed_prior_count = 0
    bounced_back_count = 0
    never_missed_twice_count = 0

    # Consider evaluated non-neutral pairs
    filtered_outcomes = [o for o in day_outcomes if o != "neutral"]
    for i in range(1, len(filtered_outcomes)):
        prev = filtered_outcomes[i - 1]
        curr_o = filtered_outcomes[i]
        if prev == "fail":
            failed_prior_count += 1
            if curr_o == "success":
                bounced_back_count += 1
                never_missed_twice_count += 1

    bounce_back_rate = (
        round((bounced_back_count / failed_prior_count) * 100, 1)
        if failed_prior_count > 0 else None
    )

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "successful_days": successful_days,
        "days_elapsed": days_elapsed,
        "success_rate": success_rate,
        "average_completion": avg_comp,
        "bounce_back_rate": bounce_back_rate,
        "never_missed_twice_count": never_missed_twice_count,
        "category_consistency": category_consistency,
    }

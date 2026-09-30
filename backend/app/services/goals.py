import json
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.goal import Goal, GoalEntry
from app.models.activity import ActivityInstance
from app.models.finance import Transaction
from app.models.review import DailyReview
from app.schemas.goal import GoalResponse, GoalEntryResponse
from app.services.scoring import parse_date, compute_day_scores, get_setting_value

def compute_goal_progress(db: Session, goal: Goal, today_str: str) -> Dict[str, Any]:
    today = parse_date(today_str)
    deadline = parse_date(goal.deadline)
    start_date = parse_date(goal.start_date)

    base_computed_value = 0.0

    eval_to = max(today_str, goal.deadline)

    if goal.goal_type == "activity_metric_sum":
        if goal.linked_template_id:
            res = db.query(func.sum(ActivityInstance.metric_value)).filter(
                ActivityInstance.template_id == goal.linked_template_id,
                ActivityInstance.status.in_(["completed", "partial"]),
                ActivityInstance.date >= goal.start_date,
                ActivityInstance.date <= eval_to,
                ActivityInstance.metric_value.isnot(None)
            ).scalar()
            base_computed_value = float(res or 0.0)

    elif goal.goal_type == "activity_completion_count":
        if goal.linked_template_id:
            count = db.query(ActivityInstance).filter(
                ActivityInstance.template_id == goal.linked_template_id,
                ActivityInstance.status == "completed",
                ActivityInstance.date >= goal.start_date,
                ActivityInstance.date <= eval_to
            ).count()
            base_computed_value = float(count)

    elif goal.goal_type == "income_sum":
        query = db.query(func.sum(Transaction.amount_paise)).filter(
            Transaction.type == "income",
            Transaction.date >= goal.start_date,
            Transaction.date <= eval_to
        )
        if goal.income_categories:
            try:
                cats = json.loads(goal.income_categories)
                if isinstance(cats, list) and len(cats) > 0:
                    query = query.filter(Transaction.category.in_(cats))
            except Exception:
                pass
        income_paise = query.scalar() or 0
        base_computed_value = float(income_paise)

    elif goal.goal_type == "days_logged":
        # Days with at least one logged instance or a review
        logged_instance_dates = set(
            d[0] for d in db.query(ActivityInstance.date).filter(
                ActivityInstance.status.in_(["completed", "partial", "missed", "skipped"]),
                ActivityInstance.date >= goal.start_date,
                ActivityInstance.date <= eval_to
            ).distinct().all()
        )
        review_dates = set(
            d[0] for d in db.query(DailyReview.date).filter(
                DailyReview.date >= goal.start_date,
                DailyReview.date <= eval_to
            ).distinct().all()
        )
        union_dates = logged_instance_dates.union(review_dates)
        base_computed_value = float(len(union_dates))

    elif goal.goal_type == "successful_days":
        # Days with score >= threshold and not rest day
        success_threshold = get_setting_value(db, "success_threshold", 70)
        reviews = {r.date: r for r in db.query(DailyReview).filter(
            DailyReview.date >= goal.start_date,
            DailyReview.date <= eval_to
        ).all()}
        instances = db.query(ActivityInstance).filter(
            ActivityInstance.date >= goal.start_date,
            ActivityInstance.date <= eval_to
        ).all()
        by_date: Dict[str, List[ActivityInstance]] = {}
        for inst in instances:
            by_date.setdefault(inst.date, []).append(inst)

        successful_count = 0
        for d_str, inst_list in by_date.items():
            rev = reviews.get(d_str)
            is_rest = rev.is_rest_day if rev else False
            score, _, is_succ, _ = compute_day_scores(inst_list, is_closed=True, is_rest_day=is_rest, success_threshold=success_threshold)
            if is_succ:
                successful_count += 1
        base_computed_value = float(successful_count)

    elif goal.goal_type == "manual":
        base_computed_value = 0.0

    # Add manual goal entries
    manual_entries_sum = sum(entry.value for entry in goal.entries)
    total_current_value = base_computed_value + manual_entries_sum

    # Progress percent
    target = goal.target_value if goal.target_value > 0 else 1.0
    progress_percent = min(100.0, round((total_current_value / target) * 100, 1))
    remaining = max(0.0, target - total_current_value)

    # Days left
    days_left = max(0, (deadline - today).days)
    required_per_day = round(remaining / days_left, 2) if days_left > 0 else None

    # Determine status
    status = goal.status
    if total_current_value >= goal.target_value and goal.status == "active":
        status = "completed"

    income_cats_list = None
    if goal.income_categories:
        try:
            income_cats_list = json.loads(goal.income_categories)
        except Exception:
            income_cats_list = None

    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "category": goal.category,
        "goal_type": goal.goal_type,
        "linked_template_id": goal.linked_template_id,
        "income_categories": income_cats_list,
        "target_value": goal.target_value,
        "unit": goal.unit,
        "start_date": goal.start_date,
        "deadline": goal.deadline,
        "status": status,
        "current_value": round(total_current_value, 2),
        "progress_percent": progress_percent,
        "remaining_value": round(remaining, 2),
        "days_left": days_left,
        "required_per_day": required_per_day,
        "entries": [GoalEntryResponse.model_validate(e) for e in goal.entries],
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }

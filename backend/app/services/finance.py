from datetime import datetime, date, timedelta
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.finance import Transaction
from app.services.scoring import parse_date, format_date, get_setting_value

def get_week_bounds(d: date) -> Tuple[str, str]:
    # Monday = 0
    start = d - timedelta(days=d.weekday())
    end = start + timedelta(days=6)
    return format_date(start), format_date(end)

def get_month_bounds(d: date) -> Tuple[str, str]:
    start = date(d.year, d.month, 1)
    if d.month == 12:
        end = date(d.year, 12, 31)
    else:
        next_month = date(d.year, d.month + 1, 1)
        end = next_month - timedelta(days=1)
    return format_date(start), format_date(end)

def compute_period_finance(db: Session, from_date: str, to_date: str) -> Dict[str, Any]:
    income = db.query(func.sum(Transaction.amount_paise)).filter(
        Transaction.type == "income",
        Transaction.date >= from_date,
        Transaction.date <= to_date
    ).scalar() or 0

    expense = db.query(func.sum(Transaction.amount_paise)).filter(
        Transaction.type == "expense",
        Transaction.date >= from_date,
        Transaction.date <= to_date
    ).scalar() or 0

    net = income - expense
    net_rate = round(net / income, 4) if income > 0 else None

    return {
        "income_paise": income,
        "expense_paise": expense,
        "net_paise": net,
        "net_rate": net_rate,
    }

def get_finance_summary(db: Session, today_str: str) -> Dict[str, Any]:
    today_d = parse_date(today_str)
    week_start, week_end = get_week_bounds(today_d)
    month_start, month_end = get_month_bounds(today_d)

    today_data = compute_period_finance(db, today_str, today_str)
    week_data = compute_period_finance(db, week_start, week_end)
    month_data = compute_period_finance(db, month_start, month_end)

    total_income = db.query(func.sum(Transaction.amount_paise)).filter(Transaction.type == "income").scalar() or 0
    total_expense = db.query(func.sum(Transaction.amount_paise)).filter(Transaction.type == "expense").scalar() or 0
    total_net = total_income - total_expense
    total_net_rate = round(total_net / total_income, 4) if total_income > 0 else None

    total_data = {
        "income_paise": total_income,
        "expense_paise": total_expense,
        "net_paise": total_net,
        "net_rate": total_net_rate,
    }

    # Category breakdown (expenses and income)
    cat_rows = db.query(Transaction.category, func.sum(Transaction.amount_paise)).group_by(Transaction.category).all()
    by_category = {cat: amount for cat, amount in cat_rows}

    return {
        "today": today_data,
        "this_week": week_data,
        "this_month": month_data,
        "total": total_data,
        "by_category": by_category,
    }

def get_fi_progress(db: Session, today_str: str) -> Dict[str, Any]:
    today_d = parse_date(today_str)
    month_start, month_end = get_month_bounds(today_d)

    current_month_income = db.query(func.sum(Transaction.amount_paise)).filter(
        Transaction.type == "income",
        Transaction.date >= month_start,
        Transaction.date <= month_end
    ).scalar() or 0

    target = get_setting_value(db, "fi_target_monthly_income_paise", None)
    if target and target > 0:
        progress_pct = round((current_month_income / target) * 100, 1)
        remaining = max(0, target - current_month_income)
    else:
        progress_pct = None
        remaining = None

    return {
        "current_month_income_paise": current_month_income,
        "target_monthly_income_paise": target,
        "progress_percent": progress_pct,
        "remaining_paise": remaining,
    }

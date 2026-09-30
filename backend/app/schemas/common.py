import re
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, field_validator

class CategoryEnum(str, Enum):
    mind = "mind"
    body = "body"
    career = "career"
    money = "money"
    life = "life"
    discipline = "discipline"

class KindEnum(str, Enum):
    block = "block"
    checkpoint = "checkpoint"

class CountsAsEnum(str, Enum):
    none = "none"
    focus = "focus"
    exercise = "exercise"

class SpecialRoleEnum(str, Enum):
    none = "none"
    wake = "wake"
    bedtime = "bedtime"

class StatusEnum(str, Enum):
    pending = "pending"
    completed = "completed"
    partial = "partial"
    missed = "missed"
    skipped = "skipped"

class GoalTypeEnum(str, Enum):
    activity_metric_sum = "activity_metric_sum"
    activity_completion_count = "activity_completion_count"
    income_sum = "income_sum"
    days_logged = "days_logged"
    successful_days = "successful_days"
    manual = "manual"

class GoalStatusEnum(str, Enum):
    active = "active"
    completed = "completed"
    paused = "paused"
    abandoned = "abandoned"

class TransactionTypeEnum(str, Enum):
    income = "income"
    expense = "expense"

TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
DATE_REGEX = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")

def validate_time_format(v: Optional[str]) -> Optional[str]:
    if v is not None and not TIME_REGEX.match(v):
        raise ValueError("Time must be in HH:MM format (00:00 to 23:59)")
    return v

def validate_date_format(v: Optional[str]) -> Optional[str]:
    if v is not None and not DATE_REGEX.match(v):
        raise ValueError("Date must be in YYYY-MM-DD format")
    return v

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail

from typing import List, Optional, Dict
from pydantic import BaseModel
from app.schemas.activity import ActivityInstanceResponse
from app.schemas.review import DailyReviewResponse

class DayNumberInfo(BaseModel):
    day_number: Optional[int]
    total_days: int
    state: str  # "active", "before", "finished"
    days_until_start: Optional[int] = None
    days_remaining: Optional[int] = None

class DayCounts(BaseModel):
    total: int
    completed: int
    partial: int
    missed: int
    skipped: int
    pending: int

class DayDetailResponse(BaseModel):
    date: str
    day_info: DayNumberInfo
    score: Optional[int]
    live_progress: Optional[int]
    is_closed: bool
    is_successful: bool
    counts: DayCounts
    unlogged_count: int
    instances: List[ActivityInstanceResponse]
    review: Optional[DailyReviewResponse]
    focus_minutes: int
    exercise_minutes: int

class DaySummaryResponse(BaseModel):
    date: str
    day_number: Optional[int]
    score: Optional[int]
    live_progress: Optional[int]
    is_closed: bool
    is_successful: bool
    is_rest_day: bool
    counts: DayCounts
    unlogged_count: int
    day_rating: Optional[int]
    focus_minutes: int
    exercise_minutes: int

from typing import Dict, List, Optional
from pydantic import BaseModel

class DailyTrendPoint(BaseModel):
    date: str
    day_number: Optional[int]
    score: Optional[int]
    live_progress: Optional[int]
    sleep_hours: Optional[float]
    rating: Optional[int]
    exercise_minutes: int
    focus_minutes: int
    is_rest_day: bool
    status: str # "closed", "live", "rest", "unlogged"

class CategoryPerformance(BaseModel):
    category: str
    total_planned: int
    completed: int
    partial: int
    missed: int
    skipped: int
    completion_rate: Optional[float]

class WeeklyBarPoint(BaseModel):
    week_label: str # e.g. "W40 (Oct 1 - Oct 4)"
    start_date: str
    end_date: str
    avg_score: Optional[float]
    exercise_minutes: int
    focus_minutes: int
    total_completed: int

class MonthlyComparisonPoint(BaseModel):
    month_name: str # October, November, December
    year: int
    month: int
    days_elapsed: int
    avg_score: Optional[float]
    total_completed: int
    exercise_minutes: int
    focus_minutes: int
    income_paise: int
    expense_paise: int
    net_paise: int

class ConsistencyStats(BaseModel):
    current_streak: int
    best_streak: int
    successful_days: int
    days_elapsed: int
    success_rate: Optional[float] # successful_days / days_elapsed
    average_completion: Optional[float]
    bounce_back_rate: Optional[float] # share of days following non-successful day that were successful
    never_missed_twice_count: int
    category_consistency: Dict[str, Optional[float]]

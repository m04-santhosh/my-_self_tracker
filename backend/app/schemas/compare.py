from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class MetricWithAverage(BaseModel):
    sum: float
    per_day_avg: Optional[float]

class CompareRangeData(BaseModel):
    label: str
    from_date: str
    to_date: str
    days_in_range: int
    days_with_data: int
    avg_score: Optional[float]
    completed_count: int
    partial_count: int
    missed_count: int
    skipped_count: int
    exercise_minutes_total: int
    exercise_minutes_per_day: Optional[float]
    focus_minutes_total: int
    focus_minutes_per_day: Optional[float]
    avg_sleep_hours: Optional[float]
    days_with_sleep_data: int
    avg_rating: Optional[float]
    metrics_by_name: Dict[str, MetricWithAverage]
    income_paise: int
    expenses_paise: int
    net_paise: int
    reviews_written: int

class MetricComparison(BaseModel):
    key: str
    label: str
    a_value: Optional[float]
    b_value: Optional[float]
    delta: Optional[float]
    percent_delta: Optional[float]
    is_currency: bool = False
    unit: Optional[str] = None

class CompareResponse(BaseModel):
    a: CompareRangeData
    b: CompareRangeData
    comparisons: List[MetricComparison]
    warnings: List[str]

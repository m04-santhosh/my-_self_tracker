from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.common import validate_date_format

class DailyReviewUpsert(BaseModel):
    went_well: Optional[str] = None
    went_wrong: Optional[str] = None
    change_tomorrow: Optional[str] = None
    day_rating: Optional[int] = Field(default=None, ge=1, le=5)
    is_rest_day: bool = False
    close_day: bool = False  # If true, sets closed_at to current timestamp

class DailyReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: str
    went_well: Optional[str]
    went_wrong: Optional[str]
    change_tomorrow: Optional[str]
    day_rating: Optional[int]
    is_rest_day: bool
    closed_at: Optional[str]
    created_at: str
    updated_at: str

class ResolvePendingRequest(BaseModel):
    status: str = Field(..., pattern="^(missed|skipped)$")

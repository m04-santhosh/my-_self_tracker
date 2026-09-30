from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.common import CategoryEnum, GoalTypeEnum, GoalStatusEnum, validate_date_format

class GoalEntryCreate(BaseModel):
    date: str
    value: float
    note: Optional[str] = None

    @field_validator("date")
    @classmethod
    def check_date(cls, v: str) -> str:
        return validate_date_format(v) # type: ignore

class GoalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    date: str
    value: float
    note: Optional[str]
    created_at: str

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category: CategoryEnum
    goal_type: GoalTypeEnum
    linked_template_id: Optional[int] = None
    income_categories: Optional[List[str]] = None
    target_value: float = Field(..., gt=0)
    unit: str
    start_date: str
    deadline: str
    status: GoalStatusEnum = GoalStatusEnum.active

    @field_validator("start_date", "deadline")
    @classmethod
    def check_date(cls, v: str) -> str:
        return validate_date_format(v) # type: ignore

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[CategoryEnum] = None
    linked_template_id: Optional[int] = None
    income_categories: Optional[List[str]] = None
    target_value: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[GoalStatusEnum] = None

    @field_validator("start_date", "deadline")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_date_format(v)

class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    category: str
    goal_type: str
    linked_template_id: Optional[int]
    income_categories: Optional[List[str]]
    target_value: float
    unit: str
    start_date: str
    deadline: str
    status: str
    # Computed fields
    current_value: float
    progress_percent: float
    remaining_value: float
    days_left: int
    required_per_day: Optional[float]
    entries: List[GoalEntryResponse]
    created_at: str
    updated_at: str

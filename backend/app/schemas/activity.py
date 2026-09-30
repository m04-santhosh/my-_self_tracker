from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from app.schemas.common import (
    CategoryEnum, KindEnum, CountsAsEnum, SpecialRoleEnum, StatusEnum,
    validate_time_format, validate_date_format
)

def validate_days_of_week(v: str) -> str:
    parts = [p.strip() for p in v.split(",") if p.strip()]
    if not parts:
        raise ValueError("days_of_week cannot be empty")
    for p in parts:
        if not p.isdigit() or int(p) < 0 or int(p) > 6:
            raise ValueError(f"Invalid day in days_of_week: {p}. Must be 0 (Mon) to 6 (Sun)")
    # Normalize sorted unique
    unique_sorted = sorted(list(set(int(p) for p in parts)))
    return ",".join(str(d) for d in unique_sorted)

class ActivityTemplateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category: CategoryEnum
    kind: KindEnum = KindEnum.block
    start_time: str
    end_time: Optional[str] = None
    days_of_week: str = "0,1,2,3,4,5,6"
    active_from: Optional[str] = None  # default to today in service/router
    active_until: Optional[str] = None
    metric_name: Optional[str] = None
    metric_unit: Optional[str] = None
    counts_as: CountsAsEnum = CountsAsEnum.none
    special_role: SpecialRoleEnum = SpecialRoleEnum.none
    notify: bool = True
    ask_on_end: bool = False
    sort_order: int = 0

    @field_validator("start_time", "end_time")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        return validate_time_format(v)

    @field_validator("active_from", "active_until")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_date_format(v)

    @field_validator("days_of_week")
    @classmethod
    def check_days(cls, v: str) -> str:
        return validate_days_of_week(v)

    @model_validator(mode="after")
    def check_kind_and_times(self):
        if self.kind == KindEnum.checkpoint:
            self.end_time = None
        elif self.kind == KindEnum.block:
            if not self.end_time:
                raise ValueError("end_time is required for block activities")
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be strictly after start_time for a block activity")
        if self.active_from and self.active_until and self.active_until < self.active_from:
            raise ValueError("active_until must be on or after active_from")
        return self

class ActivityTemplateUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[CategoryEnum] = None
    kind: Optional[KindEnum] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[str] = None
    active_from: Optional[str] = None
    active_until: Optional[str] = None
    metric_name: Optional[str] = None
    metric_unit: Optional[str] = None
    counts_as: Optional[CountsAsEnum] = None
    special_role: Optional[SpecialRoleEnum] = None
    notify: Optional[bool] = None
    ask_on_end: Optional[bool] = None
    sort_order: Optional[int] = None
    apply_from: Optional[str] = None # Defaults to today

    @field_validator("start_time", "end_time")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        return validate_time_format(v)

    @field_validator("active_from", "active_until", "apply_from")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_date_format(v)

    @field_validator("days_of_week")
    @classmethod
    def check_days(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_days_of_week(v)
        return v

class ActivityTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    category: str
    kind: str
    start_time: str
    end_time: Optional[str]
    days_of_week: str
    active_from: str
    active_until: Optional[str]
    is_paused: bool
    is_archived: bool
    metric_name: Optional[str]
    metric_unit: Optional[str]
    counts_as: str
    special_role: str
    notify: bool
    ask_on_end: bool
    sort_order: int
    created_at: str
    updated_at: str

# Instance schemas
class ActivityInstanceCreateOneOff(BaseModel):
    date: str
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category: CategoryEnum = CategoryEnum.life
    kind: KindEnum = KindEnum.block
    planned_start: str
    planned_end: Optional[str] = None
    metric_name: Optional[str] = None
    metric_unit: Optional[str] = None
    counts_as: CountsAsEnum = CountsAsEnum.none
    special_role: SpecialRoleEnum = SpecialRoleEnum.none
    notify: bool = True
    ask_on_end: bool = False

    @field_validator("date")
    @classmethod
    def check_date(cls, v: str) -> str:
        return validate_date_format(v) # type: ignore

    @field_validator("planned_start", "planned_end")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        return validate_time_format(v)

    @model_validator(mode="after")
    def check_kind(self):
        if self.kind == KindEnum.checkpoint:
            self.planned_end = None
        elif self.kind == KindEnum.block:
            if not self.planned_end:
                raise ValueError("planned_end is required for block activities")
            if self.planned_end <= self.planned_start:
                raise ValueError("planned_end must be strictly after planned_start")
        return self

class ActivityInstanceUpdatePlan(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[CategoryEnum] = None
    kind: Optional[KindEnum] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    metric_name: Optional[str] = None
    metric_unit: Optional[str] = None
    counts_as: Optional[CountsAsEnum] = None
    special_role: Optional[SpecialRoleEnum] = None
    notify: Optional[bool] = None
    ask_on_end: Optional[bool] = None

    @field_validator("planned_start", "planned_end")
    @classmethod
    def check_time(cls, v: Optional[str]) -> Optional[str]:
        return validate_time_format(v)

class ActivityInstanceLog(BaseModel):
    status: StatusEnum
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    metric_value: Optional[float] = Field(default=None, ge=0)

class ActivityInstanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: Optional[int]
    date: str
    title: str
    description: Optional[str]
    category: str
    kind: str
    planned_start: str
    planned_end: Optional[str]
    metric_name: Optional[str]
    metric_unit: Optional[str]
    counts_as: str
    special_role: str
    notify: bool
    ask_on_end: bool
    overridden: bool
    status: str
    actual_start: Optional[str]
    actual_end: Optional[str]
    duration_minutes: Optional[int]
    rating: Optional[int]
    notes: Optional[str]
    metric_value: Optional[float]
    logged_at: Optional[str]
    created_at: str
    updated_at: str

from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import validate_time_format, validate_date_format

class SettingsSchema(BaseModel):
    start_date: str = "2026-10-01"
    end_date: str = "2026-12-31"
    timezone: str = "Asia/Kolkata"
    user_name: str = "Santhosh"
    notifications_enabled: bool = True
    reminder_minutes_before: int = Field(default=5, ge=0, le=60)
    end_reminder_enabled: bool = True
    quiet_hours_start: str = "23:30"
    quiet_hours_end: str = "06:00"
    sound_enabled: bool = False
    success_threshold: int = Field(default=70, ge=1, le=100)
    fi_target_monthly_income_paise: Optional[int] = Field(default=None, ge=0)
    schema_version: int = 1

    @field_validator("start_date", "end_date")
    @classmethod
    def check_dates(cls, v: str) -> str:
        return validate_date_format(v) # type: ignore

    @field_validator("quiet_hours_start", "quiet_hours_end")
    @classmethod
    def check_times(cls, v: str) -> str:
        return validate_time_format(v) # type: ignore

class SettingsUpdateSchema(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timezone: Optional[str] = None
    user_name: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    reminder_minutes_before: Optional[int] = Field(default=None, ge=0, le=60)
    end_reminder_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    sound_enabled: Optional[bool] = None
    success_threshold: Optional[int] = Field(default=None, ge=1, le=100)
    fi_target_monthly_income_paise: Optional[int] = Field(default=None, ge=0)

    @field_validator("start_date", "end_date")
    @classmethod
    def check_dates(cls, v: Optional[str]) -> Optional[str]:
        return validate_date_format(v)

    @field_validator("quiet_hours_start", "quiet_hours_end")
    @classmethod
    def check_times(cls, v: Optional[str]) -> Optional[str]:
        return validate_time_format(v)

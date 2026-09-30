from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.common import TransactionTypeEnum, validate_date_format

INCOME_CATEGORIES = {"freelancing", "business", "salary", "other"}
EXPENSE_CATEGORIES = {"food", "travel", "education", "business", "entertainment", "shopping", "other"}

class TransactionCreate(BaseModel):
    type: TransactionTypeEnum
    amount_paise: int = Field(..., gt=0)
    category: str
    date: str
    note: Optional[str] = None

    @field_validator("date")
    @classmethod
    def check_date(cls, v: str) -> str:
        return validate_date_format(v) # type: ignore

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str, info):
        cat = v.lower().strip()
        t = info.data.get("type")
        if t == TransactionTypeEnum.income or t == "income":
            if cat not in INCOME_CATEGORIES:
                raise ValueError(f"Invalid income category: {v}. Must be one of {sorted(list(INCOME_CATEGORIES))}")
        elif t == TransactionTypeEnum.expense or t == "expense":
            if cat not in EXPENSE_CATEGORIES:
                raise ValueError(f"Invalid expense category: {v}. Must be one of {sorted(list(EXPENSE_CATEGORIES))}")
        return cat

class TransactionUpdate(BaseModel):
    type: Optional[TransactionTypeEnum] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    category: Optional[str] = None
    date: Optional[str] = None
    note: Optional[str] = None

    @field_validator("date")
    @classmethod
    def check_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_date_format(v)

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    amount_paise: int
    category: str
    date: str
    note: Optional[str]
    created_at: str
    updated_at: str

class PeriodFinance(BaseModel):
    income_paise: int
    expense_paise: int
    net_paise: int
    net_rate: Optional[float]  # net / income

class FinanceSummaryResponse(BaseModel):
    today: PeriodFinance
    this_week: PeriodFinance
    this_month: PeriodFinance
    total: PeriodFinance
    by_category: Dict[str, int] # category -> amount_paise

class FIProgressResponse(BaseModel):
    current_month_income_paise: int
    target_monthly_income_paise: Optional[int]
    progress_percent: Optional[float]
    remaining_paise: Optional[int]
